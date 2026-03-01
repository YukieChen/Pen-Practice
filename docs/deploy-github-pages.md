# 將字帖產生器放到 GitHub 讓大家使用

程式是純前端，可透過 **GitHub Pages** 免費託管，任何人用瀏覽器開連結就能用。

---

## 一、前置：程式庫已就緒

- 本專案已設定：
  - **Vite `base: './'`**：建置後的資源用相對路徑，放在任意子路徑都能正常載入。
  - **GitHub Actions 工作流程**：`.github/workflows/deploy-pages.yml`，推送到 `main` 時會自動建置並部署到 GitHub Pages。

---

## 二、步驟總覽

```
建立 GitHub  repo  →  推送程式碼  →  開啟 GitHub Pages  →  完成
```

---

## 三、詳細步驟

### 1. 在 GitHub 建立一個新 repo

- 到 [GitHub New repository](https://github.com/new)
- Repository name 可填：`Pen-Practice`（或你喜歡的名稱）
- 選 Public，**不要**勾 "Add a README"（若專案已有檔案就從本機 push 上去）
- 建立後記下 repo 網址，例如：`https://github.com/你的帳號/Pen-Practice`

### 2. 本機初始化 git（若尚未）

在專案目錄執行：

```powershell
git init
git add .
git commit -m "Initial commit: 字帖產生器"
git branch -M main
git remote add origin https://github.com/你的帳號/Pen-Practice.git
git push -u origin main
```

（若已有 git，只要 `git remote add` 與 `git push` 即可。）

### 3. 開啟 GitHub Pages 並指定來源

- 到 repo 的 **Settings** → 左側 **Pages**
- **Build and deployment**：
  - **Source** 選 **GitHub Actions**（不要選 "Deploy from a branch"）
- 儲存後不用再手動上傳檔案，之後每次 push 到 `main` 都會由 Actions 建置並部署。

### 4. 第一次部署

- 推送後到 **Actions** 分頁，會看到 "Deploy to GitHub Pages" workflow
- 跑完後（約 1–2 分鐘），**Settings → Pages** 會顯示網址，例如：
  - **https://你的帳號.github.io/Pen-Practice/**

把這個網址分享給別人，即可使用字帖產生器。

---

## 四、之後的更新

只要照平常開發流程：

```powershell
git add .
git commit -m "說明你的修改"
git push origin main
```

Actions 會自動重新建置並部署，幾分鐘後線上版本就會更新。

---

## 五、注意事項

| 項目 | 說明 |
|------|------|
| **字型檔** | 要讓大家用到「預設楷書」與「缺字填補」，請把 `default-kai.ttf`、`fallback.ttf` 放在 `assets/fonts/` 並一併 push，部署後會一起在網頁上提供。 |
| **分支名稱** | 工作流程目前觸發自 `main`。若你使用 `master`，請把 `.github/workflows/deploy-pages.yml` 裡的 `branches: ['main']` 改成 `branches: ['master']`。 |
| **Repo 名稱** | 若 repo 名稱不是 `Pen-Practice`，網址會變成 `https://你的帳號.github.io/你的repo名稱/`，無需改設定，`base: './'` 已可應付。 |

---

## 六、本機先確認建置與預覽

部署前可先在本機建置並預覽：

```powershell
npm run build
npm run preview
```

瀏覽器開 `http://localhost:4173`（或終端顯示的網址），確認行為正常後再 push。
