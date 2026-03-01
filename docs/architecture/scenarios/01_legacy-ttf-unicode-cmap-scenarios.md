# Legacy TTF Unicode cmap 補寫 — Scenarios

**建立日期**: 2026-02-28  
**狀態**: ✅ 已完成  
**優先級**: 高  
**負責 Boss**: Engineering Boss  
**相關文件**: [Legacy TTF Unicode cmap 補寫 — Diagrams](../diagrams/01_legacy-ttf-unicode-cmap-diagrams.md)  
**最後更新**: 2026-02-28

---

## 背景（為什麼要做）

我們的應用在瀏覽器端使用 `opentype.js` 以「Unicode 字元」查 `cmap` 取得 glyph，再取 outline path 生成字帖。

許多舊字型（尤其是舊編碼 / 非 Unicode 編碼）在 Word/Photoshop 可顯示，但在我們的流程會被 `fonts/convert_fonts.py` 判定為 `no-unicode-cmap` 而被 blacklist，導致無法使用。

本功能的目標是：**在轉換階段補寫一份 Unicode `cmap`（保留原本的 legacy `cmap`），讓字型能被我們的流程正常解析與使用。**

---

## Scenarios（Given / When / Then）

### Scenario 01 — TTF 只有 Windows Big5 cmap，補寫 Unicode cmap 後可用

**Given**
- 使用者放入一個 `.ttf`，其 `cmap` 僅包含 Windows Big5（platform=3, enc=4），沒有 Unicode `cmap`（platform=0 或 platform=3 enc=1/10）。

**When**
- 執行 `fonts/convert_fonts.py` 進行轉換輸出到 `fonts/processed/`。

**Then**
- 轉換腳本會從 Big5 `cmap` 推導出 Unicode 對照並新增一個 Unicode `cmap` 子表（platform=3, enc=1）。
- 輸出的字型檔案仍保留原本的 Big5 `cmap`，並額外具備 Unicode `cmap`。
- 該字型不會被寫入 blacklist 的 `no-unicode-cmap`。

---

### Scenario 02 — TTF 已有 Unicode cmap，不應被修改（避免破壞 userspace）

**Given**
- 使用者放入一個 `.ttf`，已包含可用的 Unicode `cmap`（platform=0 或 platform=3 enc=1/10）。

**When**
- 執行 `fonts/convert_fonts.py`。

**Then**
- 腳本不會嘗試補寫任何 Unicode `cmap`（避免覆寫/重排造成不必要差異）。
- 字型可正常輸出到 `fonts/processed/`。

---

### Scenario 03 — TTF 沒有 Unicode cmap，且 legacy cmap 無法可靠解碼，應維持 blacklist 行為

**Given**
- 使用者放入一個 `.ttf`，沒有 Unicode `cmap`。
- 字型僅包含不支援或無法可靠解碼的 legacy `cmap`（例如 Symbol 類型或損壞/怪異表），無法生成有效的 Unicode 對照。

**When**
- 執行 `fonts/convert_fonts.py`。

**Then**
- 腳本不會輸出到 `fonts/processed/`。
- blacklist 會新增一筆 `{ reason: "no-unicode-cmap" }`（或等價原因），並保留錯誤細節於 log。

---

### Scenario 04 — TTC：集合內每個 font 個別補寫；無法補寫者個別 skip 並 blacklist（含 index）

**Given**
- 使用者放入一個 `.ttc`，其內含多個 font。
- 其中部分 font 缺少 Unicode `cmap`，但具備可解碼的 legacy `cmap`；部分則完全無法解碼。

**When**
- 執行 `fonts/convert_fonts.py`。

**Then**
- 可補寫者：輸出到 `fonts/processed/`，且具備新增的 Unicode `cmap`。
- 不可補寫者：該 index 的 font 會被 skip，blacklist 記錄包含 `{ path, index, reason }`，避免「看似被輸出但實際不可用」的假象。

