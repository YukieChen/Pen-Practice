# 05 — 實作計畫 (Implementation Plan)

> **文件版本**: v2.0  
> **建立日期**: 2026-02-27  
> **狀態**: Draft  
> **對應流程**: Phase 2 — Architecture & Planning  
> **鐵律**: TDD — 沒有失敗測試前，不寫生產程式碼

---

## 1. 實作策略

### 1.1 原則

- **由內而外**: 先實作核心引擎 (無 UI 依賴)，再接 UI
- **TDD**: 每個模組先寫測試，再寫實作
- **資料結構優先**: 先定義 types.ts + config.ts，再寫邏輯
- **最小可驗證**: 每個階段產出可獨立測試的成果

### 1.2 實作順序

```
Phase A                Phase B               Phase C               Phase D
(核心引擎)              (設定檔+字池)          (PDF 輸出)             (UI + 整合)
─────────              ─────────             ─────────             ─────────
types.ts        ──→    config-manager  ──→   pdf-engine.ts   ──→   UI 元件
config.ts       ──→    presets.ts      ──→   path-converter  ──→   狀態管理
grid-engine.ts  ──→    random.ts       ──→   coordinate.ts   ──→   整合測試
font-manager.ts        validators.ts
glyph-renderer.ts

可獨立測試 ✓           可獨立測試 ✓          可獨立測試 ✓          端到端測試 ✓
```

---

## 2. Phase A: 核心引擎 (預估 2-3 天)

### Step A1: 專案初始化 + 型別定義

**產出**: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/types.ts`, `src/config.ts`

**工作內容**:
- 初始化 Vite + TypeScript 專案
- 安裝依賴: `opentype.js`, `pdf-lib`
- 安裝開發依賴: `vitest` (測試框架)
- 定義所有 TypeScript interface (見 04_technical-architecture.md §2):
  - 含 `PracticeConfig`, `SectionConfig` (核心資料模型)
  - 含 `SectionInput`, `PresetInfo` (新增型別)
- 定義 AppConfig 常數 (含 `maxCharsPerSection`)

**驗收標準**:
- `npm run build` 成功
- 所有 interface 可被 import 使用

### Step A2: Grid Engine

**產出**: `src/engine/grid-engine.ts` + 測試

**TDD 循環**:

```
RED:  測試 "無說明列模式，16 字，應產生正確的 GridLayout"
      → 驗證 pages.length == 1
      → 驗證 sections.length == 4
      → 驗證每段 practiceRows.length == 6
      → 驗證每段 descriptionRow == null
      → 驗證座標計算正確

GREEN: 實作 calculateGridLayout()

RED:  測試 "有說明列模式，16 字"
      → 驗證每段 practiceRows.length == 5
      → 驗證每段 descriptionRow != null
      → 驗證說明列座標正確

GREEN: 擴充 calculateGridLayout() 處理有說明模式

RED:  測試 "不足 16 字" → 驗證空白字組 character == null
RED:  測試 "20 字 → 2 頁 (無說明)" → 驗證 pages.length == 2
RED:  測試 "1 字" → 驗證只有第 1 段第 1 組有字
RED:  測試 "座標精確度" → 驗證 cellX/cellY 計算結果 (±0.01mm)

RED:  測試 "有說明模式，字池 >4 字 → 隨機挑 4 字"
      → 驗證每段實際字元 <= 4
      → 驗證挑出的字都來自原字池

RED:  測試 "無說明模式，字池 >4 字 → 全部印出"
      → 合併所有段落字池為扁平清單
      → 驗證所有字都在 layout 中

RED:  測試 "有說明模式，超過 4 段 → 分頁"
      → 驗證 pages.length == ceil(sections / 4)

RED:  測試 "頁面永遠畫滿 (不足字數仍為 4 段)"
      → 驗證 pages[0].sections.length == 4 (含空白段)

REFACTOR: 消除重複，確保無特殊情況
```

### Step A3: Font Manager (單字體 + 缺字留白格)

**產出**: `src/engine/font-manager.ts` + 測試

**TDD 循環**:

```
RED:  測試 "載入預設書寫字體" → 回傳 opentype.Font
GREEN: 實作 loadDefaultFont()

RED:  測試 "載入合法自訂 TTF 檔案" → 回傳 opentype.Font 物件
GREEN: 實作 loadCustomFont()

RED:  測試 "載入不合法檔案" → 回傳錯誤
GREEN: 加入錯誤處理

RED:  測試 "缺字檢查" → 回傳缺字清單 (僅標記，不替代)
GREEN: 實作 validateFont()

RED:  測試 "getCurrentFont() — 未上傳" → 回傳預設書寫字體
RED:  測試 "getCurrentFont() — 已上傳" → 回傳自訂字體
RED:  測試 "缺字時渲染" → 該格留白，不呼叫其他字體
GREEN: 實作 getCurrentFont()，Glyph Renderer 缺字時產生留白格

RED:  測試 "檔案大小超過限制" → 回傳錯誤
GREEN: 加入大小驗證
```

**測試用字體**: 使用一個小型測試用 TTF 檔 (可用 opentype.js 內建工具產生)

### Step A4: Glyph Renderer

**產出**: `src/engine/glyph-renderer.ts`, `src/utils/path-converter.ts` + 測試

**TDD 循環**:

```
RED:  測試 "提取 glyph path 並取得 Ink BBox"
      → 給定字體 + 字元
      → 回傳 path commands + bbox

GREEN: 實作 prepareGlyphs()

RED:  測試 "縮放到目標尺寸"
      → 給定 11.1mm 字格 + 90% fill ratio
      → 驗證縮放後 path 的 bounding box ≈ 9.99mm
      → 驗證路徑置中於字格

GREEN: 實作 renderGlyph()

RED:  測試 "Quadratic → Cubic 轉換正確性"
      → 驗證轉換後曲線端點不變
      → 驗證控制點計算正確

GREEN: 實作 convertQ2C()

RED:  測試 "範字 vs 引導字 opacity 不同"
      → 'model' type → opacity 1.0
      → 'guide' type → opacity 0.25

GREEN: 在 renderGlyph() 中依 cell.type 設定 opacity

RED:  測試 "極寬字形（如 凹）等比縮放不溢出"
RED:  測試 "極窄字形（如 一）等比縮放不拉伸"

REFACTOR: 確保 path 變換無特殊分支
```

---

## 3. Phase B: 設定檔 + 字池處理 (預估 1-2 天)

### Step B1: Config Manager — 解析與匯出

**產出**: `src/engine/config-manager.ts` + 測試

```
RED:  測試 "解析合法 JSON 設定檔" → 回傳 PracticeConfig
GREEN: 實作 parseConfig()

RED:  測試 "解析不合法 JSON (缺 sections)" → 回傳錯誤
RED:  測試 "解析不合法 JSON (characters 非陣列)" → 回傳錯誤
GREEN: 實作 validateConfig()

RED:  測試 "匯出 SectionInput[] → JSON Blob"
      → 結構符合 PracticeConfig 格式
      → characters >4 字完整保存
GREEN: 實作 exportConfig()
```

### Step B2: 系統預設 — 黃自元間架結構九十二法

**產出**: `src/data/presets.ts`, `src/engine/config-manager.ts` (預設部分) + 測試

```
RED:  測試 "HUANG_92_PRESETS 包含 92 個 sections"
      → sections.length == 92
      → 每個 section 有 description + characters

RED:  測試 "getPresetBatches() 回傳 6 個批次"
      → 批次 0-4: sectionCount == 16, pageCount == 4
      → 批次 5:   sectionCount == 12, pageCount == 3
GREEN: 實作 getPresetBatches()

RED:  測試 "loadPresetBatch(0) 回傳第 1-16 法 (16 段)"
RED:  測試 "loadPresetBatch(5) 回傳第 81-92 法 (12 段)"
RED:  測試 "loadPresetBatch('all') 回傳全部 92 段"
GREEN: 實作 loadPresetBatch()
```

**備註**: 92 法的完整資料 (說明 + 練習字) 由使用者提供 JSON，嵌入 `presets.ts` 為常數。

### Step B3: 隨機挑字工具

**產出**: `src/utils/random.ts` + 測試

```
RED:  測試 "randomPick(8字, 4) → 回傳 4 字，都在原陣列中"
RED:  測試 "randomPick(3字, 4) → 回傳 3 字 (不足不補)"
RED:  測試 "randomPick(4字, 4) → 回傳 4 字 (原封不動)"
GREEN: 實作 randomPick() (Fisher-Yates shuffle + slice)
```

---

## 4. Phase C: PDF 輸出 (預估 2 天)

### Step C1: 座標轉換工具

**產出**: `src/utils/coordinate.ts` + 測試

```
RED:  測試 "mm → points 轉換" → 1mm = 2.8346pt
RED:  測試 "邏輯座標 Y 翻轉" → 邏輯 (0,0) 左上 → PDF (0, pageH) 左下
GREEN: 實作 mmToPt(), logicalToPdf()
```

### Step C2: PDF Engine — 格線繪製

**產出**: `src/engine/pdf-engine.ts` (格線部分) + 測試

```
RED:  測試 "產生空白格線 PDF"
      → 給定 AppConfig
      → 產生 1 頁 PDF
      → PDF 包含 fine grid 線條
      → PDF 包含 cell grid 線條
      → PDF 包含 section dividers

GREEN: 實作 drawFineGrid(), drawCellGrid(), drawSectionDividers()

驗證方式: 產生 PDF 後以 PDF viewer 肉眼檢查格線
         (精確數值驗證在座標轉換測試中已覆蓋)
```

### Step C3: PDF Engine — 字元繪製

**產出**: `src/engine/pdf-engine.ts` (字元部分)

```
RED:  測試 "繪製單個 ScaledPath 到 PDF"
      → 給定一組 path commands
      → 產生 PDF
      → PDF 包含對應的向量路徑

GREEN: 實作 drawGlyphPaths()

RED:  測試 "繪製說明文字"
GREEN: 實作 drawDescriptions()

RED:  測試 "完整 1 頁 PDF 產生 (格線 + 字元)"
GREEN: 組裝 generatePDF()

RED:  測試 "多頁 PDF 產生"
GREEN: 擴充 generatePDF() 支援多頁
```

### Step C4: 端到端引擎測試

```
RED:  測試 "從 AppState → PDF Uint8Array 完整流程"
      → 給定 16 字 + 預設書寫字體 + 無說明模式
      → 呼叫完整流程
      → 產生合法 PDF
      → PDF 頁數正確

GREEN: 串接所有模組

RED:  測試 "有說明模式 + 字池 >4 字完整流程"
GREEN: 確認隨機挑字 + 說明列正確繪製

RED:  測試 "缺字留白格完整流程"
      → 自訂字體缺某些字
      → 缺字對應格子僅顯示格線，無筆劃
      → UI 顯示缺字警告
GREEN: 確認單字體 + 留白格行為正確
```

---

## 5. Phase D: UI + 整合 (預估 3-4 天)

### Step D1: HTML 結構 + CSS

**產出**: `index.html`, `styles/main.css`

**工作內容**:
- 按照 UI/UX 設計文件實作 HTML 結構
- 實作 CSS 樣式 (色彩、間距、動畫)
- 響應式佈局
- 無 JavaScript 的靜態頁面先完成

**驗收標準**:
- 頁面結構符合設計文件
- 桌面/平板佈局正確
- 所有元件視覺符合規範

### Step D2: 狀態管理

**產出**: `src/state.ts`

```
RED:  測試 "初始狀態正確 (4 空段, 預設書寫字體, 無說明模式)"
RED:  測試 "切換模式 → 更新 state.mode，保留段落內容"
RED:  測試 "更新段落練習字 → 自動過濾非中文"
RED:  測試 "增減段落 → 動態調整 sections 長度"
RED:  測試 "computed: totalChars, effectiveChars, pageCount, isReady"
      → 有說明模式: effectiveChars = 每段 min(chars, 4) 之和
      → 無說明模式: effectiveChars = totalChars
GREEN: 實作 AppState 管理
```

### Step D3: UI 元件實作

**產出**: `src/ui/*.ts`

按照 UI 設計文件依序實作:

1. **mode-selector.ts**: 模式選擇卡片
   - 點擊切換 + 動畫
   - 切換時顯示/隱藏說明欄位

2. **content-source.ts**: 內容來源切換
   - Tab: 手動輸入 / 上傳設定檔 / 系統預設
   - 設定檔拖曳/點擊上傳
   - 預設下拉選單

3. **section-editor.ts**: 段落編輯 (核心 UI 變更)
   - 每段: 說明 input + 練習字 input
   - 即時過濾 + 字數統計
   - >4 字提示 (隨機/全部印出)
   - 增減段落按鈕
   - 設定檔/預設載入後自動填入

4. **preset-selector.ts**: 系統預設選擇器
   - 下拉選單 (含「全部載入」選項)
   - 選擇後填入段落

5. **font-uploader.ts**: 字體上傳
   - 拖曳 + 點擊上傳
   - 進度顯示
   - 缺字警告 (列出缺字，說明將顯示為空白格)
   - 字體預覽 (Canvas)

6. **action-buttons.ts**: 動作按鈕
   - 產生 PDF 按鈕 (進度條)
   - 下載設定檔按鈕

### Step D4: 整合 + 端到端測試

**產出**: `src/main.ts` (串接所有模組)

```
手動測試清單:

Happy Path:
□ S01: 無說明列 + 預設字體 + 16 字 → PDF 正確
□ S02: 有說明列 + 預設字體 + 16 字 + 說明 → PDF 正確
□ S03: 上傳微軟正黑體 → 字不溢出格線
□ S04: 無說明 20 字 → 2 頁 PDF
□ S05: 6 字 → 空白區僅格線 + 整頁畫滿
□ S06: 1 字 → 整頁格線完整
□ S07: 拖曳上傳字體 → 視覺回饋
□ S08: 有說明 + 字池 8 字 → 隨機挑 4 字
□ S09: 無說明 + 字池 8 字 → 全部印出
□ S10: 上傳 JSON 設定檔 → 自動填入段落
□ S11: 下載設定檔 → JSON 格式正確，字池完整
□ S12: 系統預設 → 選擇並產生 PDF
□ S13: 無說明 + 有說明設定檔 → 忽略說明
□ S14: 缺字 → 留白格 + 缺字警告

Error Path:
□ E01: 空白輸入 → 按鈕禁用
□ E02: 非字體檔 → 錯誤訊息
□ E03: >20MB → 錯誤訊息
□ E04: 不合法 JSON → 錯誤訊息
□ E05: 超長說明 → 截斷
□ E06: 模式切換 → 保留輸入

Edge Case:
□ EC01: 混合字元 → 自動過濾
□ EC02: 重複字元 → 接受不去重
□ EC03: 舊瀏覽器 → 提示
□ EC04: 產生錯誤 → 錯誤提示
□ EC05: 有說明 + 6 段 → 2 頁
□ EC06: 設定檔上傳後手動修改 → 正常運作
```

---

## 6. 測試策略

### 5.1 測試工具

- **單元測試**: Vitest (與 Vite 整合)
- **端到端測試**: 手動 + 瀏覽器開發者工具
- **PDF 驗證**: 產生後以 PDF viewer 開啟確認

### 6.2 測試覆蓋重點

```
┌──────────────────────┬──────────────┬─────────────┐
│ 模組                  │ 測試類型      │ 優先級       │
├──────────────────────┼──────────────┼─────────────┤
│ Grid Engine          │ 單元測試      │ 最高 (P0)   │
│ Glyph Renderer       │ 單元測試      │ 最高 (P0)   │
│ Config Manager       │ 單元測試      │ 最高 (P0)   │
│ Font Manager (雙字體) │ 單元測試      │ 最高 (P0)   │
│ Path Converter       │ 單元測試      │ 高 (P1)     │
│ Coordinate Utils     │ 單元測試      │ 高 (P1)     │
│ Random Utils         │ 單元測試      │ 高 (P1)     │
│ PDF Engine           │ 整合測試      │ 高 (P1)     │
│ Validators           │ 單元測試      │ 中 (P2)     │
│ UI Components        │ 手動測試      │ 中 (P2)     │
│ 端到端流程            │ 手動測試      │ 最高 (P0)   │
└──────────────────────┴──────────────┴─────────────┘
```

### 6.3 測試指令

```bash
npm run test              # 執行所有測試
npm run test -- --watch   # 監視模式
npm run test:coverage     # 覆蓋率報告
```

---

## 7. 里程碑

```
M1: 專案骨架 + 型別定義                → Step A1
    驗收: npm run build 成功

M2: Grid Engine 通過所有測試            → Step A2
    驗收: vitest 全綠 (含字池邏輯)

M3: Font Manager + Glyph Renderer       → Step A3, A4
    驗收: vitest 全綠 (含雙字體 resolveFont)

M4: Config Manager + 92法預設            → Step B1, B2, B3
    驗收: vitest 全綠 (解析/匯出/92法批次/隨機)

M5: PDF 產生成功 (空白格線)             → Step C1, C2
    驗收: 可開啟的格線 PDF

M6: PDF 產生成功 (格線 + 字元 + 缺字留白) → Step C3, C4
    驗收: 完整字帖 PDF (含單字體 + 缺字留白格 + 字池處理)

M7: UI 完成 + 端到端可用                → Step D1-D4
    驗收: 全部情境通過

M8: 最終檢查 + 部署準備
    驗收: Linter 通過 + Build 成功 + 手動測試全通過
```

---

## 8. Agent 分工

| 階段 | Agent | 職責 |
|------|-------|------|
| Phase A: 核心引擎 | Frontend Developer | Grid Engine, Glyph Renderer, Font Manager (雙字體) |
| Phase B: 設定檔 | Frontend Developer | Config Manager, 預設, 隨機挑字 |
| Phase C: PDF 輸出 | Frontend Developer | PDF Engine, 座標轉換, 路徑轉換 |
| Phase D: UI | Frontend Developer (Jony Ive) | 段落編輯器, 設定檔上傳/下載, 預設選擇器 |
| 全程: 品質閘門 | Engineering Boss (Linus) | Code Review, 架構一致性檢查 |
| Phase 完成後 | Red Team | 設計紅隊 (Phase 3) 或程式碼紅隊 (Phase 5) |

---

## 9. 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| opentype.js 對某些字體解析失敗 | 個別字體不可用 | 清晰錯誤訊息；缺字時留白格 + 警告 |
| pdf-lib 向量路徑效能 (大量 path) | PDF 產生變慢 | Glyph Cache + 每頁 yield |
| 預設書寫字體授權 | 需可合法散佈 | 採用 OFL 等開源授權楷體 |
| CJK 字體檔過大影響使用體驗 | 等待時間長 | 進度條 + 上傳大小限制 |
| JSON 設定檔格式演進 | 舊版設定檔不相容 | 在 JSON 中加入 version 欄位 |
| 隨機挑字結果不如使用者預期 | 使用者體驗不佳 | 每次產生可能不同，使用者可重複產生 |
