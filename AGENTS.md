# AGENTS.md

## 專案性質

本資料夾是 Louisko.com 首頁與「四柱八字十神排盤系統」子頁的前端網站工程包，不是大型多服務後端專案。主要可交付檔案是 `index.html` 與 `bazi.html`，其餘 Markdown 與 JSON 檔案用於交接、測試、版本紀錄與 AI Agent 維護。

請以「低干擾、可回溯、避免破壞既有排盤邏輯」為優先。

## 重要入口

- 首頁入口：`index.html`
- 八字十神排盤子頁：`bazi.html`
- 專案說明：`README.md`
- 功能總覽：`docs_overview.md`
- 演算法說明：`docs_algorithm.md`
- 測試清單：`SMOKE_TEST.md`
- 回歸案例：`docs/regression_cases.md`
- 版本紀錄：`changelog/`
- 專案資訊：`manifest.json`

## 部署現況

- GitHub Pages: `https://kolouis-tw.github.io/bazi-website/`
- Custom domain: `https://louisko.com/`
- 八字十神排盤: `https://louisko.com/bazi.html`
- Zeabur generated domain: `https://bazi-ko.zeabur.app/`
- GitHub repository: `https://github.com/kolouis-tw/bazi-website`

`https://louisko.com/` 目前已可正常公開瀏覽。GitHub Pages 保留作為備援入口。Zeabur generated domain 曾出現 HTTPS 憑證錯誤 `NET::ERR_CERT_AUTHORITY_INVALID` / self-signed certificate，因此若遇到 Zeabur 後台顯示 `PROVISIONING`，要同時用外部 `curl -I` 驗證實際 HTTPS 狀態。

截至 2026-05-11 12:30 CST，Zeabur MCP / 外部 HTTPS 查詢結果：

```text
bazi-ko.zeabur.app   PROVISIONED
louisko.com           PROVISIONED
Service               RUNNING
curl -I /             HTTP/2 200
curl -I /bazi.html    HTTP/2 200
```

目前判斷：網站部署正常，`louisko.com` 外部 HTTPS 已可用。`index.html` 是 Louisko 首頁，`bazi.html` 是八字十神排盤系統子頁。

若未來 Zeabur domain 再出現 `PROVISIONING` 或憑證錯誤，下一步優先：

1. 用 Zeabur MCP `get_service` 再查 domain status。
2. 若仍是 `PROVISIONING`，到 Zeabur 後台重新檢查 custom domain / generated domain 的 DNS 與憑證狀態。
3. 若外部 HTTPS 再次出現 self-signed certificate，回報 Zeabur support，並提供 service `RUNNING`、`curl -k` 成功、正常 HTTPS 驗證失敗等資訊。

2026-05-11 10:11 CST：使用者更正網域為 `louisko.com`；已將 `louisko.com` 加到 service，並刪除誤加的 `louiscode.com`。

Zeabur 目前使用後台 Dockerfile override：

```Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

本地 `package.json` 與 `server.js` 是備用 Node 靜態伺服器方案。Zeabur / Docker 部署需複製整個資料夾，因為首頁與八字系統已拆成 `index.html` 與 `bazi.html` 兩個頁面。

## Codex / Zeabur MCP 狀態

截至 2026-05-10，Codex 已具備以下工具：

- Node: 使用 Codex app 內建 Node runtime。
- npm / npx: 位於 `/Users/kolouis/Desktop/AI_八字/.tools/bin/`，版本為 `11.6.4`。
- Zeabur API Key: 已在 Zeabur 建立，名稱為 `codex-mcp-20260510`。
- Zeabur MCP: 已寫入 `/Users/kolouis/.codex/config.toml` 的 `mcp_servers.zeabur` 設定。
- 設定備份: `/Users/kolouis/.codex/config.toml.bak-20260510-zeabur-mcp`。

Zeabur token 只應保存在本機 Codex 設定檔或安全的 secret store，不要寫入本 repository、README、AGENTS、commit message、issue 或 chat 回覆。

若 Codex 重新啟動後 Zeabur MCP tools 可用，優先使用 MCP / CLI 查詢與部署；只有在 MCP 功能不足或需要已登入 session 時，才改用 Chrome 操作 Zeabur 後台。

## 開發原則

- 優先維持純靜態 HTML 可直接開啟的特性。
- `index.html` 是首頁入口，應維持為簡潔 icon 導覽頁。
- `bazi.html` 是八字十神排盤工具頁，修改排盤邏輯時應只改此頁或同步更新相關文件。
- 不要引入大型框架或建置流程，除非使用者明確要求重構。
- 不要任意改動排盤核心資料流。若要改 UI，避免影響 `chart` 物件與運算函式。
- 不要從 DOM 文字反推八字、十神或大運資料；應使用程式內部結構化資料。
- 修改演算法後，必須同步檢查 `SMOKE_TEST.md` 與 `docs/regression_cases.md` 的案例。
- 若新增功能，請更新 `README.md`、`docs_overview.md` 或 `changelog/` 中對應內容。

## 核心資料讀取規則

正確做法：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

避免做法：

```js
document.getElementById("dayPillar").innerText
```

原因：畫面文字可能包含 `span`、換行、顏色標籤或格式化內容，直接讀 DOM 容易造成資料錯誤。

## 回歸測試重點

每次修改 `bazi.html` 的排盤、流年、大運、六柱或十神邏輯後，至少確認：

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```

若只修改 README、AGENTS、changelog 或其他純文件，不需要執行瀏覽器測試，但要確認 Markdown 結構清楚、連結正確。

## 本機執行

直接開啟：

```text
index.html
bazi.html
```

或用 Node 靜態伺服器：

```sh
npm start
```

預設 port 是 `8080`。

## Git 注意事項

- 只追蹤必要文字檔與網站檔案。
- 不要加入 `.DS_Store`、壓縮檔或不必要的大型二進位檔。
- 不要使用破壞性 Git 指令，例如 `git reset --hard` 或 `git checkout --`，除非使用者明確要求。
- 若 GitHub 命令列憑證不可用，可改用 GitHub 網頁操作，但要在回覆中說明。

## 建議變更流程

1. 先讀 `README.md`、`docs_algorithm.md`、`docs_overview.md`。
2. 若改排盤邏輯，再讀 `SMOKE_TEST.md` 與 `docs/regression_cases.md`。
3. 小範圍修改 `index.html`、`bazi.html` 或文件。
4. 執行必要的本機預覽或人工測試。
5. 更新 README/changelog，記錄部署或行為改變。
