# AGENTS.md

## 專案性質

本資料夾是 `louisko.com` 未來主網站專案。首頁、部署設定與主站工作流屬於根目錄；各子頁或子工具放在 `apps/` 內。

目前整併位置：`/Users/kolouis/Desktop/AI_Codex/AI_Web/02_louisko.com_未來開發專案/louisko.com_未來開發專案`。這是後續 louisko.com 開發的主專案候選。

部分歷史文件仍會出現 `Louisko Website`、`louisko.com`、`bazi-website` 等名稱，代表舊專案來源或既有部署紀錄。新規劃與新文件優先使用 `louisko.com`。

請以「低干擾、可回溯、主站與子專案分工清楚」為優先。

若使用者詢問 GitHub、Zeabur、Cloudflare、DNS、R2、`media.louisko.com` 或正式切換流程，優先參考：

```text
_project/03_deployment/LOUISKO_DEPLOYMENT_OWNER_MANUAL.md
```

## 重要入口

- 主站首頁：`index.html`
- 舊八字網址相容入口：`bazi.html`
- 八字排盤子專案：`apps/bazi/`
- 預留子頁：`apps/erp/`、`apps/ai/`、`apps/design/`、`apps/photo/`、`apps/docs/`
- 主站工作流腳本：`scripts/site-workflow/manage-site.mjs`
- 首頁入口設定：`scripts/site-workflow/site-pages.json`
- 主站說明：`README.md`
- 小白部署分工手冊：`_project/03_deployment/LOUISKO_DEPLOYMENT_OWNER_MANUAL.md`
- 專案資訊：`manifest.json`

## 部署現況

- Custom domain: `https://louisko.com/`
- 八字排盤新路徑: `https://louisko.com/apps/bazi/`
- 八字排盤舊相容路徑: `https://louisko.com/bazi.html`
- GitHub Pages: `https://kolouis-tw.github.io/louisko-website/`
- 正式 Zeabur service: `louisko-node-photo`
- 正式 Zeabur service id: `6a118115a458d428a0ab1ee4`
- 備援舊 Zeabur service: `bazi-website`
- 備援舊 Zeabur generated domain: `https://bazi-ko.zeabur.app/`
- GitHub repository: `https://github.com/kolouis-tw/louisko-website`

截至 2026-05-24，`louisko.com` 已從舊 `bazi-website` 靜態 service 移到 `louisko-node-photo` Node service。正式首頁、子頁與 Photo API 現在共用同一個入口；`https://louisko.com/api/photo-cloud/albums` 應回 JSON `200`。

攝影集 / Photo Node service：

- Zeabur service name: `louisko-node-photo`
- Zeabur service id: `6a118115a458d428a0ab1ee4`
- Generated domain: `https://louisko-node-photo.zeabur.app/`
- 正式 Photo page: `https://louisko.com/apps/photo/`
- 正式 Photo cloud API: `https://louisko.com/api/photo-cloud/albums`
- 正式 Photo object download API: `https://louisko.com/api/photo-cloud/object?key=<storageKey>`

`louisko-node-photo` 已確認用 Docker / Node 執行 `npm start`，`server.js` 監聽 `PORT` / `8080`，並可連 Cloudflare R2。

Photo 線上狀態截至 2026-05-24：

- `https://louisko.com/api/photo-cloud/albums` 回 JSON `200`。
- R2 metadata 目前應只有 `Phone`、`MacBook` 兩本相簿；ghost `Louis Album` 已刪除。
- Photo metadata 應為單一成品 JPG 模式：`thumbnailRefs=0`、`missingStorageKeys=0`。
- 跨裝置下載必須走同網域 `/api/photo-cloud/object`，不要直接從前端 `fetch(r2.dev)` 下載，避免 CORS 與裝置差異。

本專案根目錄 Dockerfile：

```Dockerfile
FROM node:20-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
```

Zeabur token 只應保存在本機 Codex 設定檔或安全 secret store，不要寫入本 repository、README、AGENTS、commit message、issue 或 chat 回覆。

## Cloudflare CLI / R2 操作

本機已可使用 Cloudflare 官方 Wrangler CLI：

```sh
/opt/homebrew/bin/npx -y wrangler@latest --version
/opt/homebrew/bin/npx -y wrangler@latest whoami
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket list
```

已完成 Wrangler OAuth login，帳號可讀取 Cloudflare account `5208cf5dbbf25b1776f9b45cd796d45d`，並已安裝 Wrangler 的 Codex skills。可用 CLI 查詢 R2：

```sh
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket info louisko-photo
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket dev-url get louisko-photo
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket domain list louisko-photo
```

目前 `louisko-photo` bucket 的 r2.dev public URL 已啟用，custom domain 尚未連接。若要用 Wrangler 連接 `media.louisko.com`，需先讓 `louisko.com` 成為此 Cloudflare account 底下的 zone，並取得 zone id：

```sh
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket domain add louisko-photo \
  --domain media.louisko.com \
  --zone-id <cloudflare-zone-id>
```

目前 Codex 環境沒有 Cloudflare MCP connector；優先使用 Wrangler CLI。Cloudflare OAuth token、R2 access key、secret key 不可寫進 repository、README、AGENTS、commit message 或公開回覆。

## 架構規則

- `index.html` 是主站首頁，目前採無印良品風格：米白底、低飽和、留白、圓形入口按鈕。
- `scripts/site-workflow/` 是主站工作流，不屬於任何單一子頁。
- `apps/<slug>/` 是各子頁或子專案的所有權邊界。
- 新增一般子頁時，優先使用 `node scripts/site-workflow/manage-site.mjs add-page ...`。
- 首頁入口由 `scripts/site-workflow/site-pages.json` 與 `index.html` 中的 `LOUISKO_APP_CARDS_START` / `LOUISKO_APP_CARDS_END` marker 管理；不要刪除 marker。
- 根目錄 `bazi.html` 只作為舊網址相容入口，不要把主要八字邏輯再放回根目錄。

## 三資料夾連動規則

若有 louisko.com 站台、八字頁、排盤引擎、規格、樣板、測試或部署相關更新，務必同步檢查並視需要連動更新：

- `01_Louisko_Website_目前站台/Louisko_Website`
- `02_louisko.com_未來開發專案/louisko.com_未來開發專案`
- `03_bazi-engine-ts/bazi-engine-ts`

若只更新其中一處，必須在回覆中說明沒有同步其他處的原因。

## 頁面內容規則

- 除非使用者明確要求，不要在首頁或次頁加入提示詞、說明提醒、使用說明、安全提醒或教學文字。
- 必要提醒可寫在 README / AGENTS 等內部文件，不放到公開頁面。
- 首頁通行碼彈窗只是前端入口提示，不是正式安全機制；不要把真正私密資料只靠此通行碼保護，也不要把這類安全提醒顯示在頁面上，除非使用者明確要求。

## 八字子專案規則

八字排盤位於 `apps/bazi/`。修改排盤邏輯時，先讀：

- `apps/bazi/README.md`
- `apps/bazi/docs_algorithm.md`
- `apps/bazi/docs_overview.md`
- `apps/bazi/SMOKE_TEST.md`
- `apps/bazi/docs/regression_cases.md`

修改排盤、流年、大運、六柱或十神邏輯後，至少確認：

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```

不要從 DOM 畫面文字反推八字資料；應使用程式內部結構化資料，例如：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

## Git 注意事項

- 只追蹤必要文字檔與網站檔案。
- 不要加入 `.DS_Store`、壓縮檔或不必要的大型二進位檔。
- 不要使用破壞性 Git 指令，例如 `git reset --hard` 或 `git checkout --`，除非使用者明確要求。

## 建議變更流程

1. 先判斷變更屬於主站還是某個 `apps/<slug>/` 子專案。
2. 主站入口與新增子頁優先使用 `scripts/site-workflow/manage-site.mjs`。
3. 八字邏輯修改只動 `apps/bazi/`。
4. 執行必要的本機預覽或驗證。
5. 更新 README / AGENTS / manifest，記錄架構或部署改變。
