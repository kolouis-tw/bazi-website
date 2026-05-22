# Louisko Web Change, GitHub and Zeabur Workflow

本文件記錄 `louisko.com` 每次網頁變更、上傳新頁面、同步 GitHub 與部署 Zeabur 的標準流程，以及各步驟的作用。

## 角色分工

| 位置 | 作用 |
|---|---|
| 本機專案 | 實際編輯、測試、預覽與產生 commit 的工作區。 |
| GitHub `kolouis-tw/louisko-website` | 版本紀錄、回溯來源、多人協作與 Zeabur 可追蹤的程式碼來源。 |
| Zeabur | 將網站檔案建置並發布到服務。 |
| `louisko.com` | 使用者實際看到的正式網域。 |

## 標準流程

### 1. 確認變更範圍

先確認要改的是哪一類：

- 主站首頁：`index.html`
- 舊網址轉址：`bazi.html`
- 子頁或工具：`apps/<slug>/`
- 八字排盤：`apps/bazi/`
- 部署或工作流：`Dockerfile`、`.dockerignore`、`scripts/site-workflow/`
- 文件：`README.md`、`AGENTS.md`、各子頁文件

若涉及八字演算法、排盤、AI payload、大運、流月、神煞或論命頁，必須先讀 `AI_Web/../重要資料_八字規格入口.md` 與對應 spec。

### 2. 編輯與同步檢查

修改時以目前站台為正式部署來源：

```text
01_Louisko_Website_目前站台/Louisko_Website
```

同時檢查是否需要同步：

```text
02_louisko.com_未來開發專案/louisko.com_未來開發專案
03_bazi-engine-ts/bazi-engine-ts
```

若只更新其中一處，必須在回覆或變更紀錄中說明原因。

### 3. 本機驗證

基本驗證：

```sh
node scripts/site-workflow/manage-site.mjs verify
```

若是靜態頁，可開本機 server 檢查：

```sh
python3 -m http.server 8083
```

再用瀏覽器打開：

```text
http://127.0.0.1:8083/
```

前端修正應至少確認：

- 目標頁可載入。
- 主要按鈕與連結不 404。
- 手機與桌面版文字不重疊。
- Console 無明顯錯誤。

### 4. Git commit

確認差異：

```sh
git diff --stat
git diff
```

提交：

```sh
git add <changed-files>
git commit -m "Describe the site change"
```

作用：

- 讓本機變更成為可追溯版本。
- 方便 GitHub、Zeabur、未來回溯對齊同一個 commit。

### 5. 推送 GitHub

目前 remote 應使用 SSH：

```sh
git remote -v
```

推送：

```sh
git push origin main
```

作用：

- 把本機 commit 推到 GitHub。
- 讓 GitHub 成為正式版本紀錄。
- 若 Zeabur 綁定 GitHub 部署，Zeabur 可由 GitHub 版本重新部署。

### 6. 部署 Zeabur

如果 GitHub 已推上去，可重新部署既有服務：

```sh
ZEABUR_TOKEN=$(awk -F 'ZEABUR_TOKEN = ' '/ZEABUR_TOKEN/ {gsub(/[\"{}, ]/,"",$2); print $2; exit}' /Users/kolouis/.codex/config.toml) \
/opt/homebrew/bin/npx -y zeabur@latest deploy \
  --project-id 6a008755e6a21fff4d962fee \
  --service-id 6a0088674a961c814e9ee899 \
  --environment-id 6a008755e5ed304c1d845a06 \
  --interactive=false \
  --json
```

如果需要直接上傳本機目前檔案給 Zeabur：

```sh
ZEABUR_TOKEN=$(awk -F 'ZEABUR_TOKEN = ' '/ZEABUR_TOKEN/ {gsub(/[\"{}, ]/,"",$2); print $2; exit}' /Users/kolouis/.codex/config.toml) \
/opt/homebrew/bin/npx -y zeabur@latest upload --interactive=false --json
```

作用：

- `deploy`：重跑 Zeabur 服務部署流程。
- `upload`：把本機檔案打包上傳到 Zeabur，適合 GitHub push 尚未完成但必須先更新線上站時使用。

原則上優先使用 GitHub commit + push，再部署 Zeabur；直接 `upload` 應記錄原因。

### 7. 線上驗證

部署後檢查正式網域：

```sh
curl -I https://louisko.com/
curl -I https://louisko.com/apps/bazi/
```

若要確認 HTML 內容：

```sh
curl -L https://louisko.com/apps/bazi/bazi-analysis.html -o /tmp/louisko-bazi-analysis.html
rg "目標文字或連結" /tmp/louisko-bazi-analysis.html
```

作用：

- 確認 Zeabur 已發布新版本。
- 確認 custom domain `louisko.com` 看到的不是舊 cache 或舊部署。
- 確認使用者實際路徑可用。

### 8. 記錄變更

每次完成後更新：

```text
scripts/site-workflow/WEB_CHANGE_LOG.md
```

至少記錄：

- 日期時間。
- 修改檔案。
- 變更目的。
- 本機驗證。
- GitHub commit SHA。
- 是否 push。
- Zeabur 部署方式。
- 線上驗證結果。
- 若未同步其他資料夾，原因是什麼。

## 常見情境

### 新增一個子頁

```sh
node scripts/site-workflow/manage-site.mjs add-page \
  --slug my-tool \
  --title "我的工具" \
  --description "工具描述" \
  --code 000000
node scripts/site-workflow/manage-site.mjs verify
git add index.html apps/my-tool scripts/site-workflow/site-pages.json
git commit -m "Add my-tool page"
git push origin main
```

再部署 Zeabur 並更新 `WEB_CHANGE_LOG.md`。

### 修正既有頁面

```sh
git diff -- apps/<slug>/
node scripts/site-workflow/manage-site.mjs verify
git add apps/<slug>/
git commit -m "Fix <slug> page"
git push origin main
```

再部署 Zeabur並線上驗證。

### 緊急修線上站

若 GitHub 認證暫時失效，但線上站必須先修：

1. 本機修正。
2. 本機驗證。
3. 本機 commit。
4. 用 Zeabur `upload` 直接部署。
5. 事後修復 GitHub push。
6. 將 commit 補推到 GitHub。
7. 在 `WEB_CHANGE_LOG.md` 記錄為緊急部署。

## 安全規則

- 不把 Zeabur token、API key、LLM key 寫進 repo、README、AGENTS、commit message 或公開頁面。
- Zeabur token 只從 `/Users/kolouis/.codex/config.toml` 讀取。
- 不把私人測試資料、出生資料、prompt secret 或使用者資料放進公開 HTML。
- 不用 `git reset --hard` 或 destructive command 處理部署問題，除非使用者明確要求。
