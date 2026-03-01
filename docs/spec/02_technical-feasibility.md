# 02 — 技術可行性評估 (Technical Feasibility Assessment)

> **文件版本**: v2.0  
> **建立日期**: 2026-02-27  
> **狀態**: Draft  
> **對應流程**: Phase 1 — Research & Analysis

---

## 1. 評估目標

驗證以下技術方案的可行性：

- 純前端架構（無後端）能否完成所有需求
- opentype.js 能否正確解析 CJK 字體並提取 glyph path
- pdf-lib 能否繪製向量路徑並產生高品質 PDF
- Glyph Path 方案能否解決字體 metrics 差異問題
- 字體單一來源架構（目前使用字體）+ 留白格缺字策略的可行性
- JSON 設定檔解析/匯出的瀏覽器端實作

---

## 2. 核心技術評估

### 2.1 opentype.js

| 評估項目 | 結論 |
|---------|------|
| 專案狀態 | 活躍維護，GitHub 4.5k+ stars |
| 支援格式 | .ttf, .otf, .woff (滿足需求) |
| CJK 支援 | 完整支援 CJK Unified Ideographs |
| Glyph Path 提取 | `font.charToGlyph(char).getPath(x, y, fontSize)` 可取得完整路徑 |
| Bounding Box | `glyph.getBoundingBox()` 回傳 `{x1, y1, x2, y2}` (Ink BBox) |
| Path Commands | 支援 M, L, C, Q, Z 指令 (MoveTo, LineTo, CurveTo, QuadCurveTo, Close) |
| 瀏覽器支援 | 純 JavaScript，所有現代瀏覽器皆可執行 |
| 檔案大小 | ~170KB (gzipped ~55KB) |
| 大型字體解析 | CJK 字體通常 5-20MB，解析時間約 0.5-2 秒 |

**結論**: **可行**。opentype.js 完全滿足 glyph path 提取需求。

### 2.2 pdf-lib

| 評估項目 | 結論 |
|---------|------|
| 專案狀態 | 穩定，GitHub 6.5k+ stars |
| 向量繪製 | 支援 moveTo, lineTo, cubicCurveTo, closePath |
| 填充/描邊 | 支援 fill, stroke, opacity 設定 |
| CJK 字體嵌入 | 支援 (但本方案不需要，改用 path 繪製) |
| 頁面尺寸 | 可自訂任意尺寸 (A4 = 595.28 x 841.89 points) |
| 瀏覽器支援 | 純 JavaScript，所有現代瀏覽器皆可執行 |
| 檔案大小 | ~300KB (gzipped ~100KB) |
| 多頁支援 | 完整支援 |

**結論**: **可行**。pdf-lib 提供足夠的向量繪製能力。

### 2.3 opentype.js → pdf-lib 路徑轉換

opentype.js 的 path commands 需轉換為 pdf-lib 的繪圖指令：

```
opentype.js Path Command    pdf-lib PDFPage Method
────────────────────────    ─────────────────────────
{ type: 'M', x, y }        page.moveTo(x, y)
{ type: 'L', x, y }        page.lineTo(x, y)
{ type: 'C', x1,y1,        page.cubicCurveTo(
             x2,y2, x,y }    x1,y1, x2,y2, x,y)
{ type: 'Q', x1,y1, x,y }  需轉換為 cubic bezier*
{ type: 'Z' }               page.closePath()
```

**注意**: pdf-lib 不直接支援 quadratic bezier (Q command)。需將 quadratic 轉換為 cubic bezier：

```
Quadratic: Q(cx, cy, x, y) from current point (px, py)
    ↓ 轉換公式
Cubic: C(px + 2/3*(cx-px), py + 2/3*(cy-py),
         x + 2/3*(cx-x),   y + 2/3*(cy-y),
         x, y)
```

此轉換為精確數學轉換，無精度損失。

**結論**: **可行**。路徑轉換為純數學運算，實作直接。

### 2.4 PDF 座標系統

pdf-lib 使用 PDF 標準座標系（原點在左下角，Y 軸向上）：

```
PDF 座標系:               字帖邏輯座標系:
  y ↑                       (0,0) ────→ x
    │                         │
    │                         │
    └────→ x                  ▼ y
  (0,0)

轉換: pdfY = pageHeight - logicalY
```

opentype.js 的 glyph path 也使用 Y 軸向上的座標系，因此 glyph path 與 PDF 座標系天然相容，僅需平移和縮放，不需翻轉。

**結論**: **座標系相容**。

---

## 3. Glyph Path 方案驗證

### 3.1 問題定義

不同字體在相同 fontSize 下，實際筆劃大小與位置差異顯著：

| 字體 | unitsPerEm | 典型中文字 Ink 比例 | 內部 padding |
|------|-----------|-------------------|-------------|
| 標楷體 (DFKai-SB) | 1000 | ~85% | ~15% |
| 微軟正黑體 (JhengHei) | 2048 | ~78% | ~22% |
| 思源宋體 (Source Han Serif) | 1000 | ~88% | ~12% |
| 華康行書體 | 1000 | ~75% | ~25% |

傳統排版以 Em Square 為基準，筆劃佔 Em Square 比例不同，導致同 fontSize 下字的視覺大小不一致。

### 3.2 方案原理

Glyph Path 方案直接以**實際筆劃邊界 (Ink BBox)** 為縮放基準：

```
傳統方式:                    Glyph Path 方式:
fontSize → Em Square → 筆劃  字格尺寸 → Ink BBox → scale → 筆劃
           (不可控)                     (精確可控)

結果:                        結果:
不同字體大小不一致             任何字體大小一致
```

### 3.3 邊界情況分析

| 情況 | 處理方式 |
|------|---------|
| 字形極寬 (如「凹」) | min(scaleX, scaleY) 確保等比縮放不溢出 |
| 字形極窄 (如「一」) | 等比縮放後垂直置中，不會拉伸變形 |
| 字形含大量留白 (如「ㄧ」) | Ink BBox 只包含實際筆劃，留白被排除 |
| 複合字形 (如帶聲調的注音) | getBoundingBox 包含所有組件，整體縮放 |
| 字體缺字 (glyph 不存在) | 不繪製任何筆劃，該格僅顯示 3x3 格線 (留白練習格)，並記錄於缺字清單與 UI 警告中 |

### 3.4 效能估算

以單頁 16 字、無說明列模式為例：

```
每頁需處理的 glyph path:
  範字:  4 段 x 4 字 x 1 次 = 16 次
  引導字: 4 段 x 4 字 x (6行x2欄 - 1) = 4 x 4 x 11 = 176 次
  ──────────────────────────
  總計:  192 次 glyph path 繪製

但實際上每個不同字只需解析一次 path，再重複使用:
  唯一字: 16 個
  path 解析: 16 次 (< 10ms)
  path 變換 + 繪製: 192 次 (< 50ms)
  ──────────────────────────
  單頁總計: < 100ms
```

**結論**: **效能完全可接受**。

---

## 4. 字體方案 (單字體 + 留白格缺字策略)

### 4.1 架構設計

系統在任一時刻僅有一個「目前使用字體」，避免複雜的多字體 fallback 邏輯：

```
┌─────────────────────────────────────────────┐
│  單字體架構                                   │
│                                               │
│  Current Font (目前使用字體)                  │
│  ├─ 使用者上傳字體 (若有)                     │
│  └─ 未上傳時 = 預設書寫字體                   │
│                                               │
│  預設書寫字體 = 可合法分發的 CJK 書寫字體      │
│  ├─ App 啟動時預先載入                        │
│  └─ 僅在「未上傳字體」時作為 Current Font      │
│                                               │
│  缺字處理:                                    │
│    currentFont.hasGlyph(char) ? 繪製 glyph    │
│      : 留白格 (僅顯示格線，無任何筆劃)         │
└─────────────────────────────────────────────┘
```

### 4.2 預設書寫字體評估

| 評估項目 | 結論 |
|---------|------|
| 字元覆蓋 | 完整繁體中文常用字 + 大量罕用字 (依所選預設字體) |
| 風格 | 楷體，最適合硬筆書法練習 |
| 檔案大小 | ~5-8MB |
| 授權 | 採用 OFL 等開源授權，可合法散佈 |

**授權風險緩解**: 
- 不在應用中內建或散佈 Windows 內建之標楷體字檔
- 預設書寫字體改用 OFL 等開源授權楷體，如 cwTeX-Q-Kai
- 若使用者偏好標楷體，由使用者自行上傳本機授權字檔

### 4.3 字體載入策略

- 預設書寫字體在 App 啟動時預先載入 (async)
- 使用者上傳自訂字體後，取代預設書寫字體成為 Current Font
- 記憶體中只常駐一個目前使用字體物件（預設 or 自訂）
- 字體資料保存於記憶體中 (ArrayBuffer)，不持久化

### 4.4 JSON 設定檔技術可行性

| 項目 | 評估 |
|------|------|
| JSON 解析 | `JSON.parse()` 原生支援，無需額外依賴 |
| 檔案讀取 | FileReader API 讀取上傳 .json |
| JSON 匯出 | `JSON.stringify()` + Blob + URL.createObjectURL |
| 結構驗證 | 手寫 type guard 或輕量驗證 (無需 JSON Schema 庫) |
| 效能 | JSON 設定檔極小 (<100KB)，解析 <1ms |

**結論**: **完全可行**，不需額外依賴。

---

## 5. 瀏覽器 API 依賴

| API | 用途 | Chrome | Firefox | Safari | Edge |
|-----|------|--------|---------|--------|------|
| File API | 讀取上傳字體檔 | 90+ | 90+ | 15+ | 90+ |
| ArrayBuffer | 字體資料處理 | 90+ | 90+ | 15+ | 90+ |
| Blob / URL.createObjectURL | PDF 下載 | 90+ | 90+ | 15+ | 90+ |
| ES2020 (optional chaining, etc.) | 程式碼語法 | 80+ | 74+ | 13.1+ | 80+ |

**結論**: 所有必要 API 在目標瀏覽器中均有完整支援。

---

## 6. 風險評估

### 6.1 低風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| opentype.js 無法解析某些字體 | 個別字體不可用 | 提供錯誤提示，建議換字體 |
| PDF 檔案過大 | 下載/列印變慢 | 向量路徑天然較小，預估 < 2MB/頁 |

### 6.2 中風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| CJK 字體檔過大 (>20MB) | 解析時間長，記憶體壓力 | 設定檔案大小上限，顯示進度條 |
| 特殊字形 (異體字) glyph path 異常 | 個別字元渲染錯誤 | 加入 glyph 驗證，異常時該格留白並提示 |

### 6.3 已排除的風險

| 原本的風險 | 為何已排除 |
|-----------|-----------|
| 字體 metrics 差異導致定位錯誤 | Glyph Path 方案完全繞過 metrics |
| 不同瀏覽器字體渲染不一致 | 不使用瀏覽器文字渲染，直接繪製向量 |
| fontSize 在不同字體下大小不一 | 基於 Ink BBox 縮放，與 fontSize 無關 |

---

## 7. 可行性結論

```
┌─────────────────────────────────────────────────┐
│                                                   │
│   結論: 技術方案完全可行                           │
│                                                   │
│   核心技術鏈:                                     │
│   opentype.js (字體解析 + path 提取)              │
│        ↓                                          │
│   數學變換 (Ink BBox → Scale + Translate)          │
│        ↓                                          │
│   pdf-lib (向量路徑繪製 + PDF 產生)               │
│                                                   │
│   關鍵優勢:                                       │
│   ✓ 字體無關性: 任何字體精準渲染                   │
│   ✓ 純前端: 無伺服器依賴                          │
│   ✓ 向量品質: 無限縮放，列印品質極佳              │
│   ✓ 效能: 單頁 < 100ms                           │
│                                                   │
│   唯一額外依賴:                                   │
│   opentype.js (~55KB gzipped)                     │
│   pdf-lib (~100KB gzipped)                        │
│   預設書寫用楷體 (~5-8MB, 採開源授權)             │
│                                                   │
│   建議: 進入 Phase 2 架構設計階段                  │
│                                                   │
└─────────────────────────────────────────────────┘
```
