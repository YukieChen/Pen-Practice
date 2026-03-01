# 字體放置與缺字填補

## 一、字體檔案放在哪裡？

本專案使用 Vite，靜態資源目錄為 **`assets/`**（對應 `vite.config.ts` 的 `publicDir: 'assets'`）。

| 用途 | 路徑 | 說明 |
|------|------|------|
| 預設字體 | `assets/fonts/default-kai.ttf` | 未上傳自訂字體時使用，必須存在否則無法產生字帖 |
| **缺字填補字體** | `assets/fonts/fallback.ttf` | 主字體缺字時用此字體補字，可選；建議使用涵蓋率高的開源字體（如隨峰體） |

對應的網址為：

- 預設字體：`/fonts/default-kai.ttf`
- 缺字填補：`/fonts/fallback.ttf`

若未放置 `fallback.ttf`，程式會自動略過（不拋錯），缺字仍會顯示為空白格。

---

## 二、缺字如何處理？

```
┌─────────────────────────────────────────────────────────┐
│ 產生字帖時                                               │
├─────────────────────────────────────────────────────────┤
│ 1. 使用主字體（預設或使用者上傳）                         │
│ 2. 對每個要顯示的字元：                                   │
│    - 先查主字體是否有該字的 glyph                         │
│    - 有 → 用主字體繪製                                    │
│    - 沒有 → 若有 fallback 字體，改用 fallback 繪製        │
│    - 都沒有 → 該格只繪格線（空白）                         │
└─────────────────────────────────────────────────────────┘
```

- **缺字填補字體**：例如 [隨峰體](https://github.com/ButTaiwan/suifeng-font) 開源可商用，涵蓋常用字，很適合作為 `fallback.ttf`。
- 步驟：下載隨峰體 TTF，重新命名為 `fallback.ttf`，放到 `assets/fonts/` 即可。

---

## 三、目錄結構範例

```
Pen-Practice/
├── assets/
│   └── fonts/
│       ├── default-kai.ttf   ← 預設書寫字體（必備）
│       └── fallback.ttf      ← 缺字填補用（可選，如隨峰體）
├── fonts/                    ← 專案內其他用途（轉檔、黑名單等）
│   ├── raw/
│   └── ...
└── ...
```

---

## 四、若要改用其他檔名或路徑

缺字填補的 URL 定義在 `src/engine/font-manager.ts`：

```ts
export const FALLBACK_FONT_URL = '/fonts/fallback.ttf';
```

若要改成例如隨峰體檔名 `Suifeng-Regular.ttf`，可改為：

```ts
export const FALLBACK_FONT_URL = '/fonts/Suifeng-Regular.ttf';
```

並將檔案放在 `assets/fonts/Suifeng-Regular.ttf`。

---

## 五、為什麼有些字體缺字會出現方框？

OpenType 規定：字體可以內建一個「缺字」 glyph，名為 **.notdef**（通常為 glyph index 0），很多字體會把它畫成**方框** □。  
程式若只檢查「有沒有 path」而沒辨識 .notdef，就會誤以為「有字」而把方框畫出來，不會改用 fallback。

本專案已處理：會辨識 **glyph index 0** 或 **name === '.notdef'**，視為缺字，改由 fallback 字體繪製（或僅繪格線）。因此同一字體在修正後，缺字應會以 fallback 補上，不再出現方框。
