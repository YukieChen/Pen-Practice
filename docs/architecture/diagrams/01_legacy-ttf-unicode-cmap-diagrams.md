# Legacy TTF Unicode cmap 補寫 — Diagrams

**建立日期**: 2026-02-28  
**狀態**: ✅ 已完成  
**優先級**: 高  
**負責 Boss**: Engineering Boss  
**相關文件**: [Legacy TTF Unicode cmap 補寫 — Scenarios](../scenarios/01_legacy-ttf-unicode-cmap-scenarios.md)  
**最後更新**: 2026-02-28

---

## 一、核心概念總覽（資料結構優先）

本質就是把「舊編碼的碼值 → glyph」轉成「Unicode codepoint → glyph」，**只新增，不覆寫**。

```
┌──────────────────────────────┐
│ legacy cmap（舊編碼）          │
│  code(如 0xA440) → glyphName  │
└───────────────┬──────────────┘
                │ decode（依 encoding）
                ▼
┌──────────────────────────────┐
│ Unicode cmap（新增）           │
│  U+4E2D → glyphName           │
└──────────────────────────────┘
```

為什麼要這樣做？
- **opentype.js** 在我們的流程用「Unicode 字元」查 `cmap`。
- 舊字型常只有 Big5 / Shift-JIS / GBK / MacRoman 等對照；Word/PS 會靠系統字型引擎處理，但我們沒有。

---

## 二、現況 vs 建議（before / after）

### 現況（before）

```
fonts/convert_fonts.py
┌──────────────────────────────────────────────┐
│ if NOT has_usable_unicode_cmap(font):        │
│    → blacklist: no-unicode-cmap              │
│    → skip                                    │
└──────────────────────────────────────────────┘
```

### 建議（after）

```
fonts/convert_fonts.py
┌──────────────────────────────────────────────┐
│ if NOT has_usable_unicode_cmap(font):        │
│    try_add_unicode_cmap_from_legacy(font)    │
│    if still NOT has_usable_unicode_cmap:     │
│       → blacklist + skip                     │
│    else:                                     │
│       → save processed                        │
└──────────────────────────────────────────────┘
```

關鍵差異：
- **不改既有 Unicode 字型**（避免破壞 userspace）
- **只對缺 Unicode 的字型**嘗試補寫
- 補寫失敗則維持原本行為（skip + blacklist）

---

## 三、執行流程圖（失敗點標註）

```mermaid
flowchart TD
  A[讀取字型檔 TTFont/TTCollection] --> B{是否已有可用 Unicode cmap?}
  B -- 是 --> S[直接 save 到 processed]
  B -- 否 --> C[挑選 legacy cmap 子表<br/>Windows Big5/GBK/SJIS... or MacRoman]
  C --> D[將 legacy code 轉 bytes]
  D --> E[用對應 codec decode 成 Unicode char]
  E --> F{decode 成功且為單一字元?}
  F -- 否 --> X[跳過該映射<br/>【失敗點】不可解碼]
  F -- 是 --> G[加入 Unicode→glyphName 映射]
  G --> H{累積映射數量 > 0 ?}
  H -- 否 --> K[blacklist: no-unicode-cmap<br/>【失敗點】完全無法補寫]
  H -- 是 --> I[新增 Unicode cmap 子表<br/>(platform=3, enc=1)]
  I --> J[save 到 processed]
```

---

## 四、資料流（誰擁有什麼資料）

```
┌─────────────────────────┐
│ TTFont                  │
│  - cmap.tables[]        │  ← 原始資料（legacy/Unicode）
└───────────┬─────────────┘
            │ 讀取並選表（不修改原表）
            ▼
┌─────────────────────────┐
│ unicode_map (dict)       │  ← 新增資料（Unicode → glyphName）
└───────────┬─────────────┘
            │ 只在成功時寫回
            ▼
┌─────────────────────────┐
│ TTFont['cmap'].tables[]  │  ← append 新 Unicode subtable
└─────────────────────────┘
```

---

## 五、風險點（Never break userspace）

| 風險 | 為什麼會爆 | 防護 |
|------|------------|------|
| 覆寫既有 Unicode cmap | 可能改掉既有對照，破壞原本可用字型 | **已有 Unicode cmap 就不動** |
| legacy 解碼錯誤 | 可能把錯字映射成某 Unicode | 只接受「可 strict decode 且單一字元」；其餘跳過 |
| Symbol 字型 | Word/PS 有特殊處理，我們沒有 | 不硬救：補寫失敗就 blacklist（保持誠實） |

