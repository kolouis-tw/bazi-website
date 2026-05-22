# Louisko Web Change Log

本文件用來記錄每次 `louisko.com` 網頁修改、GitHub 同步與 Zeabur 部署。

## 記錄格式

```md
## YYYY-MM-DD HH:mm TZ - 變更標題

- 變更目的：
- 修改檔案：
- 本機驗證：
- GitHub commit：
- GitHub push：
- Zeabur 部署：
- 線上驗證：
- 三資料夾同步：
- 備註：
```

## 2026-05-22 10:51 Asia/Taipei - 修正八字論命頁返回排盤連結

- 變更目的：修正 `https://louisko.com/apps/bazi/bazi-analysis.html` 的「返回排盤」指到不存在的 `bazi-input-test.html`，造成 404。
- 修改檔案：`apps/bazi/bazi-analysis.html`
- 本機驗證：本機 server 開啟 `http://127.0.0.1:8083/apps/bazi/bazi-analysis.html`，點擊頂部「返回排盤」後回到 `http://127.0.0.1:8083/apps/bazi/`。
- GitHub commit：`71f2482 Fix bazi analysis return link`
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `main`。
- Zeabur 部署：先用 `deploy` 重跑服務，確認未帶入本機未推內容；再用 `upload --interactive=false --json` 上傳本機站台檔案。
- 線上驗證：重新抓取 `https://louisko.com/apps/bazi/bazi-analysis.html`，確認兩個「返回排盤」皆為 `href="./"`。
- 三資料夾同步：已同步目前站台與未來主專案候選；`03_bazi-engine-ts` 未改，因該獨立 engine 測試頁本來存在 `bazi-input-test.html`，不是正式站台 404 問題。
- 備註：本次同時修復 GitHub SSH key 與 remote，後續可正常 `git push origin main`。

## 2026-05-22 11:00 Asia/Taipei - 補充八字同步與十步大運文件

- 變更目的：補充三資料夾連動規則，並把舊文件中的九步大運描述校正為前後節氣起運、十步大運。
- 修改檔案：`AGENTS.md`、`README.md`、`apps/bazi/README.md`、`apps/bazi/SMOKE_TEST.md`、`apps/bazi/changelog/v2_luck_sync_fix.md`、`apps/bazi/docs_algorithm.md`、`apps/bazi/docs_overview.md`、`scripts/site-workflow/README.md`
- 本機驗證：文件變更，未涉及頁面執行邏輯。
- GitHub commit：`6c21c76 Document bazi sync workflow`
- GitHub push：尚未推送時建立本紀錄；後續推送時補記。
- Zeabur 部署：未部署，文件不影響線上頁面功能。
- 線上驗證：不適用。
- 三資料夾同步：此紀錄先建立於目前站台；後續同步到未來主專案候選工作流文件。
- 備註：此 commit 之後如有 push 或 deploy，需在本段補記。

## 2026-05-22 11:20 Asia/Taipei - 建立網頁變更與部署流程紀錄

- 變更目的：整理並固定每次網頁修改、新增頁面、GitHub push、Zeabur deploy/upload 與線上驗證的標準流程。
- 修改檔案：`scripts/site-workflow/WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`、`scripts/site-workflow/WEB_CHANGE_LOG.md`、`scripts/site-workflow/README.md`
- 本機驗證：文件變更，檢查 Markdown 內容與路徑引用。
- GitHub commit：`Document web change deployment workflow`（本次 commit）。
- GitHub push：與前一筆文件 commit 一起推到 `main`。
- Zeabur 部署：未部署；此變更為文件與流程紀錄，不影響線上頁面。
- 線上驗證：不適用。
- 三資料夾同步：已同步新增到目前站台與未來主專案候選；`03_bazi-engine-ts` 未改，因本流程屬於網站與部署工作流，非 engine 程式或測試。
- 備註：後續每次站台變更都應先看 `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`，完成後補本檔。
