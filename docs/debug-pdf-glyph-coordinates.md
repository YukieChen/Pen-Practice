# PDF 字形除錯：架構與流程

## 一、核心概念總覽

**本質**：從「邏輯版面（左上原點、Y 向下、mm）」到「PDF 頁面（左下原點、Y 向上、pt）」的座標與 path 轉換鏈，任一環節的 Y 方向或縮放不一致都會導致字形顛倒或錯位。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        座標與 Path 轉換鏈（全貌）                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【字體】           【Glyph Renderer】        【Path 字串】      【pdf-lib】   │
│  OpenType          邏輯 mm                   邏輯 mm → 數字      drawSvgPath  │
│  Y 向上            左上原點 Y 向下           轉成 pt + Y 翻轉   scale 後繪製  │
│  font units        cell.x, cell.y (mm)      path d 座標        最終 PDF      │
│       │                    │                       │                │      │
│       ▼                    ▼                       ▼                ▼      │
│  getPath()  ──►  transform  ──►  PathCommand[]  ──►  pathToSvg  ──► scale   │
│  bbox             (Y 翻轉)        (邏輯 mm)           (pt)          (1,-1)  │
│                                                                    或(-1,1)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、現況分析（修正 scale: -1 之後）

### 2.1 目前實作

| 環節 | 檔案 | 行為 | 備註 |
|------|------|------|------|
| 邏輯→PDF Y | coordinate.ts | logicalYToPdfY(y) = (pageH - y) × MM_TO_PT | 左上→左下，正確 |
| 字形→邏輯 | glyph-renderer.ts | y' = offsetY + scaledH - scale×(y - bbox.y1) | 字體 Y 向上 → 邏輯 Y 向下，字在邏輯空間為「正向」 |
| Path→d 字串 | pdf-engine.ts | x = -mmToPt(cmd.x), y = logicalYToPdfY(cmd.y) | 為配合 scale(-1,1) 對 x 取負 |
| 繪製 | pdf-engine.ts | drawSvgPath(d, { scale: -1 }) | pdf-lib 套用 scale(-1, 1) |

### 2.2 pdf-lib drawSvgPath 行為（節錄 operations.js）

```
註解："SVG path Y axis is opposite pdf-lib's"
options.scale ? scale(options.scale, -options.scale) : scale(1, -1)
```

- **未傳 scale**：scale(1, -1) → path 的 y 會被翻轉，適合「SVG 座標（Y 向下）」。
- **傳 scale: -1**：scale(-1, 1) → 只翻轉 x、不翻轉 y；path 須以「PDF 座標（Y 向上）」解讀，且 x 需預先取負以補償鏡射。

### 2.3 問題推論

```
┌──────────────────────────────────────────────────────────────────┐
│ 問題 A：字形仍然上下顛倒                                            │
├──────────────────────────────────────────────────────────────────┤
│ • 若 scale(-1, 1) 正確套用，邏輯空間「正向」字形不應在 PDF 顛倒。       │
│ • 可能原因：                                                        │
│   (1) 傳入的 path 座標被解讀成「SVG 慣例」再被 scale 影響，產生二次翻轉。 │
│   (2) 改回「預設 scale(1,-1) + path 傳 y = -logicalYToPdfY」較穩。   │
│   (3) 或字體 bbox / getPath 的 Y 方向與假設相反，需在 renderer 反轉。   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 問題 B：字體未放入 3×3 格子內                                        │
├──────────────────────────────────────────────────────────────────┤
│ • 格子：drawCellGrid 用 charCellSizeMm = 11.1mm（3×3.7mm），           │
│   cell.x / cell.y 來自 grid-engine，單位 mm，為格子左上角。           │
│ • 字形：renderGlyph 用 targetSize = charCellSizeMm × fillRatio，     │
│   offset 置中於 cell。理論上應落在同一格子內。                         │
│ • 可能原因：                                                        │
│   (1) 座標轉換錯誤：邏輯 mm → PDF pt 時 x 取負導致整塊 path 水平位移。   │
│   (2) 單位混用：某處用了 pt 當 mm 或反之。                             │
│   (3) 格線與 cell 的基準不一致（例如格線用 cellSize、cell 用 charCellSizeMm）。│
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、流程圖（Path 從邏輯到 PDF）

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  Glyph Renderer 輸出 PathCommand[]（邏輯 mm）                      │
  │  字頂 ≈ 小 logical Y，字底 ≈ 大 logical Y（Y 向下）                 │
  └───────────────────────────┬─────────────────────────────────────┘
                              │
                              ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  pathToSvgInPdfCoords(commands, pageHeightMm)                     │
  │  對每個 M/L/C：x_pt = ? mmToPt(cmd.x)   y_pt = ? logicalYToPdfY  │
  └───────────────────────────┬─────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
  ┌───────────────────────┐     ┌───────────────────────┐
  │ 方案 A：scale: -1      │     │ 方案 B：不傳 scale     │
  │ x = -mmToPt(cmd.x)    │     │ x = mmToPt(cmd.x)     │
  │ y = logicalYToPdfY(y) │     │ y = -logicalYToPdfY(y) │
  │ → scale(-1, 1)       │     │ → scale(1, -1)        │
  │ 結果：(+x, y) 正確位置 │     │ 結果：(x, +y) 正確位置 │
  │ 但 path 被水平鏡射    │     │ 無水平鏡射            │
  └───────────────────────┘     └───────────────────────┘
```

---

## 四、架構關係圖（組件與座標）

```
  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
  │ config       │     │ grid-engine       │     │ glyph-renderer  │
  │ charCellSizeMm│────▶│ cell.x, cell.y   │────▶│ offsetX, offsetY│
  │ fillRatio    │     │ (邏輯 mm)         │     │ scale (mm/unit) │
  └──────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
  │ coordinate   │     │ pdf-engine        │     │ PathCommand[]   │
  │ logicalYToPdfY│◀───│ pathToSvgInPdfCoords│◀──│ (邏輯 mm)       │
  │ mmToPt       │     │ drawGlyphPaths    │     │                 │
  └──────────────┘     └────────┬─────────┘     └─────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │ pdf-lib       │
                        │ drawSvgPath   │
                        │ translate(0,0)│
                        │ scale(?)      │
                        └───────────────┘
```

---

## 五、實施建議（修正方向）

1. **字形顛倒**  
   - 已採用 **預設 scale(1, -1)**，path 傳入 **x = mmToPt(cmd.x)**、**y = -logicalYToPdfY(cmd.y)**。  
   - 若字形仍上下反向，可能是字體 bbox 為 y-down（y2 < y1）。**glyph-renderer** 已支援：以 `glyphH = Math.abs(bbox.y2 - bbox.y1)` 計算高度，並以 `yDown = bbox.y2 < bbox.y1` 切換 transform：y-down 時使用 `y' = offsetY + scale*(y - bbox.y2)`，使字頂對應小 logical y，與 pdf-engine 的 y = -logicalYToPdfY 搭配後字形正向。

2. **3×3 格子錯位**  
   - drawCellGrid 與 grid-engine 均使用同一 `config.charCellSizeMm`（11.1mm = 3×3.7mm），格線與 cell 基準一致。  
   - 字形置中於 cell：offsetX/Y = cell + (charCellSizeMm - scaled)/2，targetSize = charCellSizeMm × fillRatio，理論上應落在格子內。若仍錯位，檢查 path 是否全程使用 mm → pt 轉換、無額外 translate。

3. **驗證**  
   - 產出 PDF 後檢查：字為正向、不鏡射、且落在格子內。

## 六、字形大小流程與 2×2 根因

### 6.1 字形大小資料流

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  字形大小決定鏈（單一因素都會影響最終視覺大小）                                 │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │  【1】字體 getPath(0, 0, unitsPerEm)                                          │
  │       → path 座標範圍 = bbox ∪ pathBounds = glyphW × glyphH (font units)     │
  │       → 若字體 bbox/path 含大量留白，glyphW/glyphH 會很大 → scale 變小        │
  │                                                                             │
  │  【2】config.rendering                                                        │
  │       → contentPaddingMm：可用區 = charCellSizeMm - 2×pad                      │
  │       → cellFillRatio：effective = available × cellFillRatio                  │
  │       → glyphScaleUp（見下）：補償字體 bbox 過大時視覺偏小                      │
  │                                                                             │
  │  【3】glyph-renderer renderGlyph()                                           │
  │       → scale = min(effective/glyphW, effective/glyphH) × glyphScaleUp         │
  │       → PathCommand[] 為邏輯 mm，scaled = glyph×scale (mm)                      │
  │                                                                             │
  │  【4】pdf-engine pathToSvgInPdfCoords()                                       │
  │       → x_pt = mmToPt(cmd.x)，僅單位轉換，無額外縮放                           │
  │                                                                             │
  │  【5】pdf-lib drawSvgPath(d, { x:0, y:0 })                                   │
  │       → 預設 scale(1,-1)，無額外 scale → 不會改變大小                          │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 為何會出現 2×2（字偏小）

| 可能原因 | 說明 | 對策 |
|----------|------|------|
| 字體 path/bbox 範圍大 | 路徑座標跨很大（如 0～3000），實際筆畫只佔中間一塊；scale = available/glyphH 會變小，整字被縮小 | 使用 **glyphScaleUp** > 1 強制放大，或依字體調整 contentPaddingMm |
| 可用區過小 | contentPaddingMm 大、或 cellFillRatio < 1，effective 小 → scale 小 | 調小 contentPaddingMm、cellFillRatio 設為 1 |
| 單位一致 | 邏輯 mm → pt 僅 mmToPt，PDF 無再縮放；若仍偏小，問題在【1】【2】 | 確認 build 為最新、config 有被讀取 |

### 6.3 實施：glyphScaleUp

- 在 **config.rendering** 新增 **glyphScaleUp**（預設 1.5）。
- **renderGlyph** 內：`scale = min(effective/glyphW, effective/glyphH) * glyphScaleUp`。
- 不另做上限：字形可能略超出格線，但可強制接近 3×3；若超出太多可將 glyphScaleUp 調回 1.2～1.3。

## 七、參考程式位置

| 項目 | 檔案 | 函式/常數 |
|------|------|-----------|
| 邏輯 Y → PDF Y | src/utils/coordinate.ts | logicalYToPdfY |
| 字形 Y 翻轉 | src/engine/glyph-renderer.ts | transformPoint (y' = offsetY + scaledH - ...) |
| Path → path d | src/engine/pdf-engine.ts | pathToSvgInPdfCoords |
| 繪製 | src/engine/pdf-engine.ts | drawGlyphPaths, drawSvgPath(..., { scale }) |
| 格子與 cell | src/engine/grid-engine.ts, config.ts | charCellSizeMm, cellX, cellY |
