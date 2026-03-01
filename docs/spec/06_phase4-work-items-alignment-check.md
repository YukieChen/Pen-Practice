# 06 — Phase 4 工作項目與 docs/spec 對齊查核報告 (Red Team)

> **查核日期**: 2026-02-27  
> **查核依據**: `@utilities/security-testing/agents/red-team.mdc`  
> **目標**: 06_phase4-work-items.md 與 01–05 規格對齊、缺漏識別

---

## 1. 評估結論 (Triage)

| 項目 | 結果 |
|------|------|
| **結構完整性** | 06 與 01/04/05 大方向一致，可視為 >40% 對齊 |
| **缺漏類型** | 情境編號不一致、05 步驟/產出未完全對應、04 檔案結構未全列 |
| **建議** | 標準演化 (Rewrite < 30%)：補齊缺項、不重寫既有結構 |

---

## 2. 與 03_scenarios.md 對齊

### 2.1 情境編號對照

| 03 情境 | 06 對應 | 備註 |
|--------|---------|------|
| S01 無說明列基本產生 | S1 | ✓ |
| S02 有說明列基本產生 | S2 | ✓ |
| S03 自訂字體上傳 | S5 | ✓ |
| S04 多頁產生(無說明) | S1 / Domain | ✓ |
| S05 不足 16 字 | S1 / Domain | ✓ |
| S06 僅 1 字 | S1 | ✓ |
| S07 拖曳上傳字體 | S5 | ✓ |
| S08 有說明字池>4 隨機挑 4 | S2 | ✓ |
| S09 無說明字池>4 全部印出 | Domain/邏輯 | ✓ 邏輯已含，未單列情境名 |
| S10 上傳 JSON 設定檔 | S3 | ✓ |
| S11 下載設定檔 | S6 | ✓ |
| S12 系統預設 92 法 | S4 | ✓ |
| **S13 無說明+設定檔有說明→忽略說明** | **未單列** | ⚠ 缺 |
| S14 缺字留白+提示 | S5 | ✓ |
| E01 空白輸入按鈕禁用 | 6.9/6.10 部分 | ⚠ 未單列測試項 |
| E02 無效字體檔 | S5 | ✓ |
| E03 字體>20MB | S5 | ✓ |
| E04 JSON 格式錯誤 | S3 | ✓ |
| E05 說明文字過長 50 字 | 5.2 截斷 | ⚠ 未單列情境/測試 |
| **E06 模式切換保留輸入** | **未列** | ⚠ 缺 |
| **EC01 混合字元過濾** | **未列** | ⚠ 缺 |
| **EC02 重複字元接受** | **未列** | ⚠ 缺 |
| **EC03 舊瀏覽器提示** | **未列** | ⚠ 缺 |
| **EC04 PDF 產生錯誤處理** | **未列** | ⚠ 缺 |
| EC05 有說明多頁分頁 | S2 | ✓ |
| EC06 設定檔上傳後手動修改 | S6 E2E 部分 | ✓ 可再明確 |

### 2.2 缺漏摘要 (03 → 06)

- **未列為獨立工作/測試項**: S13, E01, E05, E06, EC01, EC02, EC03, EC04  
- **建議**: 在 06 中補上「Error/Edge 情境對應測試」區塊，或於 E2E/品質閘門中明確寫出「03 全情境 S01–S14, E01–E06, EC01–EC06 對照驗收」。

---

## 3. 與 04_technical-architecture.md 對齊

### 3.1 模組與產出

| 04 模組/產出 | 06 對應 | 備註 |
|--------------|---------|------|
| types.ts (PracticeConfig, SectionConfig, GridLayout, ScaledPath, AppState, SectionInput…) | Domain §2、部分散見 | ⚠ 06 未單列「types.ts 與 04 §2 對齊」 |
| config.ts (AppConfig) | 未列 | ⚠ 缺 |
| Grid Engine | §3 PDF/格線引擎 | ✓ |
| Glyph Renderer | §4 Glyph 渲染 | ✓ |
| Font Manager | §4 字體處理 | ✓ |
| Config Manager | §5 JSON/Preset I/O | ✓ |
| PDF Engine | §3 + §4 | ✓ |
| path-converter.ts | §4 路徑轉換 | 僅隱含，未單列 |
| coordinate.ts | §3 座標 | 僅隱含，未單列 |
| validators.ts | §5 parser/validator | 部分含，未單列 validators |
| random.ts | S2 隨機挑字 | 未單列 random 工具 |
| data/presets.ts | §5 preset | ✓ |
| UI: mode-selector, content-source, section-editor, font-uploader, action-buttons, preset-selector | §6 UI 元件 | ✓ 命名略異但對應 |

### 3.2 缺漏摘要 (04 → 06)

- **AppConfig / config.ts** 未列為獨立工作項。  
- **types.ts 與 04 §2 型別對齊** 未列。  
- **path-converter.ts, coordinate.ts, validators.ts, random.ts** 未以獨立產出項列出。  
- **建議**: 在 06 的 Domain / 實作順序中補「專案初始化 + types + config」與「utils 產出 (path-converter, coordinate, validators, random)」。

---

## 4. 與 05_implementation-plan.md 對齊

### 4.1 Phase / Step 對照

| 05 Step | 產出 | 06 對應 | 備註 |
|---------|------|---------|------|
| A1 | 專案初始化、types.ts、config.ts | Domain §2 有 AppState，缺 A1 與 config | ⚠ 缺專案初始化 + config |
| A2 | grid-engine.ts | §2 Domain + §3 PDF/格線 | ✓ |
| A3 | font-manager.ts | §4 字體 | ✓ |
| A4 | glyph-renderer.ts, path-converter.ts | §4 Glyph | path-converter 未單列 |
| B1 | config-manager 解析/匯出 | §5 | ✓ |
| B2 | presets.ts, loadPresetBatch | §5 | ✓ |
| B3 | random.ts | 未列 | ⚠ 缺 |
| C1 | coordinate.ts | 未列 | ⚠ 缺 |
| C2 | PDF 格線 | §3 | ✓ |
| C3 | PDF 字元+說明 | §3 + §4 | ✓ |
| C4 | 端到端引擎測試 | §7 E2E 部分 | ✓ |
| D1 | HTML + CSS | 未列 | ⚠ 缺 |
| D2 | state.ts 狀態管理 | Domain 有 AppState，未列 state.ts | ⚠ 缺 state 產出 |
| D3 | UI 元件 | §6 | ✓ |
| D4 | 整合 + 手動測試清單 | §7 | 手動清單 28 項未在 06 逐項列出 |

### 4.2 里程碑 M1–M8

- 06 未列出「與 05 里程碑 M1–M8 對應驗收」。  
- **建議**: 在品質閘門或彙總處增加一項「05 里程碑 M1–M8 對應驗收」。

### 4.3 手動測試清單 (05 Phase D4)

- 05 列有 S01–S14, E01–E06, EC01–EC06 共 28 項手動測試。  
- 06 §7 E2E 僅 6 條 (S1–S6 各一)。  
- **建議**: 06 增加「與 05 手動測試清單 28 情境對照驗收」或將 28 項收錄為附錄/勾選清單。

---

## 5. 與 01_product-requirements.md 對齊

- 格線、兩種模式、字元渲染、缺字、輸入、PDF、非功能需求均在 06 有對應（透過 S1–S6、Domain、§8 品質閘門）。  
- **結論**: 無明顯缺漏；06 已涵蓋 01 要點。

---

## 6. 與 02_technical-feasibility.md 對齊

- 02 為可行性評估，不產生工作項。  
- **結論**: 不需對齊工作項。

---

## 7. 演化建議 (Genetic Superposition)

### [Preserved Strengths]

- 06 的 S1–S6 情境分組、Domain → PDF → Glyph → I/O → UI 順序與 05 Phase A–D 一致。  
- 06 品質閘門 (§8) 與 production_flow / engineering-boss 一致。  
- 06 勾選格式利於追蹤，保留不變。

### [Modified Weaknesses]（建議補齊）

1. **情境/測試對齊**  
   - 補「03 全情境 (S01–S14, E01–E06, EC01–EC06) 對照驗收」工作項或閘門。  
   - 或補列 S13, E01, E05, E06, EC01–EC04 為明確測試/工作項。

2. **05/04 產出對齊**  
   - 補「專案初始化 + types.ts + config.ts (AppConfig) 與 04 §2 對齊」。  
   - 補「path-converter.ts, coordinate.ts, validators.ts, random.ts」為可勾選產出。  
   - 補「state.ts 狀態管理與 computed 欄位」。  
   - 補「HTML 結構 + CSS 與設計文件對齊」(或併入 §6)。  
   - 補「與 05 里程碑 M1–M8 對應驗收」及「與 05 手動測試清單 28 項對照驗收」。

### [Rewrite Percentage]

- 僅新增與補遺，未改寫既有 06 結構。  
- 估計新增約 15–20 條勾選項，佔原 72 項約 20–25%，符合標準演化 ≤30%。

---

## 8. 結論

| 項目 | 結果 |
|------|------|
| **與 03 對齊** | 缺 S13, E01, E05, E06, EC01–EC04 之明確項或全情境驗收 |
| **與 04 對齊** | 缺 config.ts、types 對齊、utils 四檔產出 |
| **與 05 對齊** | 缺 A1/B3/C1/D1/D2、里程碑 M1–M8、手動清單 28 項 |
| **與 01/02** | 無缺漏 / 不適用 |
| **建議** | 於 06_phase4-work-items.md 補齊上述缺項，並於同文件或本報告標註「已與 docs/spec 對齊」 |
