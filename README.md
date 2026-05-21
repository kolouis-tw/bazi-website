# Louisko Website

這是 `louisko.com` 的主網站專案。`index.html` 是首頁，`apps/` 內放各個子頁與子專案。

本機整併後位於 `AI_Codex/AI_Web/01_Louisko_Website_目前站台/Louisko_Website`；未來主專案候選位於 `AI_Web/02_louisko.com_未來開發專案/louisko.com_未來開發專案`。

## 線上網站

- Custom domain: https://louisko.com/
- 八字排盤正式新路徑: https://louisko.com/apps/bazi/
- 八字排盤舊相容路徑: https://louisko.com/bazi.html
- GitHub Pages: https://kolouis-tw.github.io/louisko-website/
- Zeabur generated domain: https://bazi-ko.zeabur.app/
- GitHub repository: https://github.com/kolouis-tw/louisko-website

## 專案結構

```text
index.html
bazi.html
apps/
  bazi/
    index.html
    README.md
    docs_algorithm.md
    docs_overview.md
    SMOKE_TEST.md
    docs/
    changelog/
    examples/
  erp/
    index.html
  ai/
    index.html
  design/
    index.html
  photo/
    index.html
  docs/
    index.html
scripts/
  site-workflow/
Dockerfile
package.json
server.js
README.md
AGENTS.md
manifest.json
```

## 路徑規則

- 主站首頁只放在 `index.html`。
- 新子頁與子專案放在 `apps/<slug>/index.html`。
- 八字排盤主檔案是 `apps/bazi/index.html`。
- 根目錄 `bazi.html` 只作為舊網址相容入口，會導向 `apps/bazi/`。
- 主站腳本放在 `scripts/site-workflow/`，不要放進單一子專案資料夾。

## 新增子頁

優先使用共用腳本：

```sh
node scripts/site-workflow/manage-site.mjs add-page --slug my-tool --title "我的新工具" --description "我的新工具"
node scripts/site-workflow/manage-site.mjs verify
```

若 shell 有載入 npm，也可用：

```sh
npm run site:list
npm run site:verify
npm run site -- add-page --slug my-tool --title "我的新工具" --description "我的新工具"
```

## 本機預覽

```sh
npm start
```

預設 port 是 `8080`，也可用環境變數覆寫：

```sh
PORT=3000 npm start
```

## 部署

Zeabur 使用 Dockerfile：

```Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

部署目標：

```text
Project: louisko-website
Service: louisko-website
Server: Tencent Tokyo 2C 2GB
Custom domain: louisko.com
Public port: HTTP:80
```

Zeabur token 只保存在本機 Codex 設定檔或安全 secret store，不要寫入 repository、README、AGENTS、commit message 或 chat 回覆。

## 頁面規則

除非使用者明確要求，不要在公開頁面加入提示詞、說明提醒、使用說明、安全提醒或教學文字。必要提醒只寫在 `README.md`、`AGENTS.md` 或其他內部文件。

## 八字子專案

八字排盤的維護文件已移到 `apps/bazi/`。修改排盤、流年、大運、六柱或十神邏輯時，請先閱讀：

- `apps/bazi/README.md`
- `apps/bazi/docs_algorithm.md`
- `apps/bazi/docs_overview.md`
- `apps/bazi/SMOKE_TEST.md`
- `apps/bazi/docs/regression_cases.md`
