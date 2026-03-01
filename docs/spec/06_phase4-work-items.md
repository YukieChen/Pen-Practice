# 06 — Phase 4 工作項目清單 (Execution Checklist)

> **文件版本**: v1.0  
> **建立日期**: 2026-02-27  
> **對應流程**: Phase 4 — Execution (production_flow)  
> **使用方式**: 完成項目後將 `[ ]` 改為 `[x]`，方便工作追蹤

---

## 1. 情境 → 測試設計（Scenario–Test 對齊）

### S1 基本產生（無說明列 + 手動 + 預設字體 → 1 頁 PDF）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 1.1 | [ ] 撰寫 S1 Given-When-Then 情境條文並納入文件 | |
| 1.2 | [ ] Unit: 字池→字格分配（8 字無說明列 → 1 頁、每字 24 slot） | |
| 1.3 | [ ] Unit: 頁數計算（12/16/20 字 → 1/1/2 頁） | |
| 1.4 | [ ] Integration: sections → PDF buffer，驗證頁數與 slot 數量 | |
| 1.5 | [ ] E2E: 載入→輸入→產生→下載流程，按鈕與 progress 狀態 | |

### S2 有說明列 + 多字池 + 多頁

| # | 工作項目 | 狀態 |
|---|----------|------|
| 2.1 | [ ] 撰寫 S2 Given-When-Then 情境條文並納入文件 | |
| 2.2 | [ ] Unit: 有說明列模式段落截取（字池 >4 取 4，可注入 random seed） | |
| 2.3 | [ ] Unit: 說明列高度與座標配置（每段第 1 行為 description slot） | |
| 2.4 | [ ] Integration: PDF 中說明列無 glyph、字只在 5 行 | |
| 2.5 | [ ] E2E: 模式切換顯示/隱藏說明 input、>4 字提示、頁數統計 | |

### S3 設定檔上傳（JSON 合法 / 非法 / 超量）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 3.1 | [ ] 撰寫 S3A/S3B Given-When-Then 情境條文並納入文件 | |
| 3.2 | [ ] Unit: JSON parser + validator（截斷 200 段、64 字、description 50 字） | |
| 3.3 | [ ] Unit: 錯誤對應（Illegal JSON、>5MB → 明確錯誤型別） | |
| 3.4 | [ ] Integration: 檔案 input → parse → state 更新，與 Domain 一致 | |
| 3.5 | [ ] E2E: 錯誤檔案 → 錯誤 UI、原段落不變；正確檔案 → Step3 自動填入 | |

### S4 系統預設（黃自元 92 法）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 4.1 | [ ] 撰寫 S4 Given-When-Then 情境條文並納入文件 | |
| 4.2 | [ ] Unit: presetId → SectionConfig[]，數量與內容與 spec 一致 | |
| 4.3 | [ ] Unit: 頁數計算與 PRD 6.5.1 表格對齊（批次 1–7、全部） | |
| 4.4 | [ ] Integration: 載入批次 → 正確頁數/總字數；切換 mode 只改 derived state | |
| 4.5 | [ ] E2E: 點選「全部 92 法/23 頁」→ 統計列顯示 92 段 / 23 頁 | |

### S5 字體處理（正常 / 缺字 / 解析失敗）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 5.1 | [ ] 撰寫 S5A/S5B/S5C Given-When-Then 情境條文並納入文件 | |
| 5.2 | [ ] Unit: checkFontCoverage(font, characters[]) → { missingChars[] } | |
| 5.3 | [ ] Unit: glyph bounding box → scaling transform（PRD 5.3 公式） | |
| 5.4 | [ ] Integration: mock font 缺字 → PDF 中對應格無 path、僅格線 | |
| 5.5 | [ ] E2E: 正常字體預覽更新；缺字字體出現警告、PDF 對應格空白 | |

### S6 下載設定檔（JSON 匯出）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 6.1 | [ ] 撰寫 S6 Given-When-Then 情境條文並納入文件 | |
| 6.2 | [ ] Unit: AppState → ConfigJson 序列化，chars >4 不截斷 | |
| 6.3 | [ ] Unit: round-trip 測試（serialize → parse → 狀態一致） | |
| 6.4 | [ ] E2E: 填段落 → 下載設定檔 → 再上傳 → 段落內容一致 | |

### 與 03 情境全覆蓋（S01–S14, E01–E06, EC01–EC06）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 0.1 | [ ] 03 S13: 無說明模式 + 設定檔有說明 → 忽略說明、字池合併印出 | |
| 0.2 | [ ] 03 E01: 空白輸入 → 兩按鈕禁用、tooltip 提示 | |
| 0.3 | [ ] 03 E05: 說明文字 >50 字 → 截斷與字數警告 | |
| 0.4 | [ ] 03 E06: 模式切換 → 說明欄收合/展開且保留輸入值 | |
| 0.5 | [ ] 03 EC01: 混合字元輸入 → 自動過濾非中文 | |
| 0.6 | [ ] 03 EC02: 重複字元 → 接受不去重 | |
| 0.7 | [ ] 03 EC03: 舊瀏覽器 (如 IE11) → 相容性提示 | |
| 0.8 | [ ] 03 EC04: PDF 產生過程錯誤 → 進度停止、錯誤訊息、按鈕恢復 | |
| 0.9 | [ ] 與 03 全情境 28 項 (S01–S14, E01–E06, EC01–EC06) 對照驗收 | |

---

## 2. Domain 層（資料結構與計算）

| # | 工作項目 | 狀態 |
|---|----------|------|
| 2.0 | [x] 專案初始化：package.json, tsconfig, vite, vitest；types.ts + config.ts 與 04 §2 對齊 (含 AppConfig、PracticeConfig、GridLayout 等) | |
| 2.1 | [x] 定義 AppState 結構（對齊 UI/UX §5.1：mode, contentSource, sections, fontSource 等） | |
| 2.2 | [x] 實作 sections → flat characters（有/無說明模式差異） | |
| 2.3 | [x] 實作 pageCount 計算（無說明：16 字/頁；有說明：4 段/頁） | |
| 2.4 | [ ] 實作 SectionConfig → EffectiveSection（description、字池截斷、模式） | |
| 2.5 | [ ] 實作「一字 → N 個練習 slot」映射（有說明 20 / 無說明 24） | |
| 2.6 | [ ] 定義「字在第幾 page / section / row / col」的資料結構並實作 | |
| 2.7 | [x] 所有 Domain 函式通過對應 Unit 測試（S1/S2/S4 頁數與字數場景） | |
| 2.8 | [x] state.ts：狀態管理與 computed（totalChars, effectiveChars, pageCount, isReady） | |

---

## 3. PDF / 格線與版面引擎

| # | 工作項目 | 狀態 |
|---|----------|------|
| 3.0 | [x] utils/coordinate.ts：mm→pt、邏輯 Y 翻轉（與 04/05 C1 對齊） | |
| 3.1 | [x] 實作 72×48 fine-grid 座標計算（PRD §3） | |
| 3.2 | [x] 實作 24×16 character-cell grid 與 section 分段 | |
| 3.3 | [x] 實作說明列 slot 配置（有說明列模式） | |
| 3.4 | [x] Integration 測試：給定 slot 布局 → 產出 PDF → 驗證頁數與物件數量 | |
| 3.5 | [ ] 對齊 Phase 2 架構圖：執行路徑與圖表一致、無 ghost path | |

---

## 4. Glyph 渲染與字體處理

| # | 工作項目 | 狀態 |
|---|----------|------|
| 4.0 | [x] utils/path-converter.ts：opentype path → pdf-lib（含 Q→C 轉換） | |
| 4.1 | [x] 實作 glyph scaling 演算法（PRD 5.3：bbox → scale + translate） | |
| 4.2 | [x] Unit 測試：bounding box → transform 公式正確 | |
| 4.3 | [x] 實作缺字時不繪製 glyph、僅留格線 | |
| 4.4 | [ ] Integration：mock font 缺字 → PDF 對應格無 path | |
| 4.5 | [ ] 字體解析失敗時回退預設字體並顯示錯誤 UI | |

---

## 5. JSON / Preset I/O 模組

| # | 工作項目 | 狀態 |
|---|----------|------|
| 5.0 | [x] utils/validators.ts：字元過濾（CJK）、JSON 結構驗證 | |
| 5.0b | [x] utils/random.ts：randomPick（Fisher-Yates），有說明模式字池 >4 取 4 | |
| 5.1 | [x] 實作 parseConfig(jsonString) → Result<AppState 部分> | |
| 5.2 | [x] 實作 200 段 / 64 字 / 50 字說明 截斷與 UI 提醒 | |
| 5.3 | [x] 實作 5MB 上限與格式錯誤處理（錯誤型別與訊息） | |
| 5.4 | [x] 實作 presetId → sections（黃自元批次與全部） | |
| 5.5 | [x] 實作 AppState → 下載 JSON（version, sections[]，字池完整） | |
| 5.6 | [x] 所有 I/O 通過 S3 / S4 / S6 對應測試 | |

---

## 6. UI 元件實作

| # | 工作項目 | 狀態 |
|---|----------|------|
| 6.0 | [x] HTML 結構 + CSS 與設計文件對齊（index.html, styles/main.css；05 D1） | |
| 6.1 | [x] Step 1: ModeSelector（兩張卡片、綁定 mode） | |
| 6.2 | [x] Step 2: ContentSourceTabs（手動 / 上傳 / 預設） | |
| 6.3 | [x] Step 2: 上傳區（拖曳 + 點擊、5MB 檢查、錯誤顯示） | |
| 6.4 | [x] Step 2: 系統預設按鈕群組（7 批次 + 全部、選中樣式） | |
| 6.5 | [x] Step 3: SectionEditorList（accordion、說明/練習字、最多 200 段） | |
| 6.6 | [x] Step 3: 每段字數統計與 >4 字提示、全局統計列 | |
| 6.7 | [x] Step 3: 新增/移除段落（最少 1 段、最多 200 段阻止與提示） | |
| 6.8 | [x] Step 4: FontSelector（預設/上傳、預覽、缺字警告） | |
| 6.9 | [x] 動作區：產生 PDF 按鈕（disabled 邏輯、progress、完成下載） | |
| 6.10 | [x] 動作區：下載設定檔按鈕（disabled 邏輯、檔名格式） | |
| 6.11 | [x] 所有使用者輸入/設定檔文字以純文字節點渲染（無 innerHTML） | |

---

## 7. E2E 與整合驗證

| # | 工作項目 | 狀態 |
|---|----------|------|
| 7.1 | [x] E2E S1: 無說明列 + 手動 8 字 + 產生 → 下載 1 頁 PDF | |
| 7.2 | [x] E2E S2: 有說明列 + 多段多字 + 產生 → 頁數與說明列正確 | |
| 7.3 | [x] E2E S3: 上傳合法/非法/超量 JSON → 對應 UI 與狀態 | |
| 7.4 | [x] E2E S4: 選擇預設批次/全部 → 統計與產生正確 | |
| 7.5 | [x] E2E S5: 上傳字體（正常/缺字/損壞）→ 預覽與警告 | |
| 7.6 | [x] E2E S6: 下載設定檔 → 再上傳 → 內容一致 | |

---

## 8. Phase 4 品質閘門（驗收前必過）

| # | 閘門項目 | 驗證方式 | 狀態 |
|---|----------|----------|------|
| 8.1 | Scenario–Test 對齊 | 每個 S1–S6 至少一則對應測試、名稱可對照 | [ ] |
| 8.2 | TDD 證據 | 關鍵模組（Domain/PDF/Font）有先紅後綠紀錄 | [ ] |
| 8.3 | Diagram–Code 對齊 | 流程圖/架構圖與程式路徑對照表、無 ghost path | [ ] |
| 8.4 | 複雜度 | 核心邏輯無 >3 層縮排、無可消除之特例 | [ ] |
| 8.5 | Userspace / 回溯 | 固定 JSON baseline 迴歸測試通過 | [ ] |
| 8.6 | 效能 | 單頁 <3s、10 頁 <10s、記憶體 <200MB（可量測） | [ ] |
| 8.7 | 安全 | 文字皆純文字節點；JSON/段落/字池上限有測試 | [ ] |
| 8.8 | 03 全情境驗收 | 03 情境 S01–S14, E01–E06, EC01–EC06 共 28 項對照驗收 | [ ] |
| 8.9 | 05 里程碑對應 | 05 實作計畫 M1–M8 對應驗收 | [ ] |

---

## 9. 彙總統計

| 類別 | 項目總數 | 已完成 |
|------|----------|--------|
| 情境–測試 (S1–S6) | 25 | |
| 03 全情境對照 | 9 | |
| Domain 層 | 9 | |
| PDF/格線引擎 | 6 | |
| Glyph/字體 | 6 | |
| JSON/Preset I/O | 8 | |
| UI 元件 | 12 | 12 |
| E2E | 6 | 6 |
| 品質閘門 | 9 | |
| **合計** | **90** | |

---

**對齊說明**: 本清單已與 `docs/spec/01–05` 及 `06_phase4-work-items-alignment-check.md` 查核對齊，補齊 03 情境、04 產出、05 Step/里程碑對應。
