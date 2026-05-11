# 四柱八字十神排盤系統

這是一個 Louisko.com 首頁與子頁工具包。`index.html` 是無印良品風格的私人入口首頁，`bazi.html` 是四柱八字十神排盤系統子頁。目前版本已整理成可交給 Codex / Cursor / Claude Code / Gemini Code Assist / 其他 AI Agent 接手的工程包。

## 線上網站

- GitHub Pages: https://kolouis-tw.github.io/bazi-website/
- Custom domain: https://louisko.com/
- 八字十神排盤: https://louisko.com/bazi.html
- Zeabur generated domain: https://bazi-ko.zeabur.app/
- GitHub repository: https://github.com/kolouis-tw/bazi-website

`https://louisko.com/` 目前已可正常公開瀏覽。GitHub Pages 保留作為備援入口。

Zeabur 目前使用後台 Dockerfile override，以 `nginx:alpine` 服務 `index.html`，並公開 `HTTP:80`。Zeabur app 本身可用 `curl -k` 讀到內容，但 Zeabur generated domains 曾出現 `NET::ERR_CERT_AUTHORITY_INVALID` / self-signed certificate，代表 HTTPS 憑證仍需在 Zeabur 端重新檢查或等待佈署完成。本資料夾內的 `package.json` 與 `server.js` 是備用 Node 靜態伺服器方案，方便未來改成一般 Node 部署。

### Zeabur 部署與 HTTPS 狀態

截至 2026-05-11 12:30 CST，Zeabur MCP / 外部 HTTPS 查詢結果：

```text
bazi-ko.zeabur.app   PROVISIONED
louisko.com           PROVISIONED
Service               RUNNING
curl -I /             HTTP/2 200
curl -I /bazi.html    HTTP/2 200
```

`https://louisko.com/` 是首頁入口，`https://louisko.com/bazi.html` 是八字十神排盤系統子頁。兩者外部 HTTPS 均已可用。

Zeabur deployment 使用 Dockerfile：

```Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

此設定會複製整個資料夾，確保首頁與 `bazi.html` 子頁都能上線。2026-05-11 10:11 CST 已確認誤加的 `louiscode.com` 已從 Zeabur service 刪除。

## Codex / Zeabur 自動化狀態

截至 2026-05-10，Codex 已完成以下本機工具設定：

- Node: 使用 Codex app 內建 Node runtime。
- npm / npx: 已安裝在 `/Users/kolouis/Desktop/AI_八字/.tools/bin/`，版本為 `11.6.4`。
- Zeabur API Key: 已在 Zeabur 建立，名稱為 `codex-mcp-20260510`。
- Zeabur MCP: 已加入 `/Users/kolouis/.codex/config.toml` 的 `mcp_servers.zeabur` 設定，token 存在本機設定檔中，請不要寫入 repository 或公開文件。
- Codex 設定備份: `/Users/kolouis/.codex/config.toml.bak-20260510-zeabur-mcp`。

若重新啟動 Codex 後 MCP 載入成功，後續可優先透過 Zeabur MCP / CLI 操作專案，減少透過 Chrome 後台手動點選。

## 本機使用

首頁：

```text
index.html
```

目前首頁入口包含 `八字排盤`、`ERP`、`AI 工具`、`設計案`、`攝影集`、`文件庫`。除 `bazi.html` 是正式工具頁外，其餘先建立在 `pages/` 作為預留次頁，避免入口出現 404。

八字十神排盤系統：

```text
bazi.html
```

若要用本機伺服器預覽：

```sh
npm start
```

預設 port 為 `8080`，也可用環境變數覆寫：

```sh
PORT=3000 npm start
```

## 新增首頁入口與次頁

之後若要把 `louisko.com` 當主頁，並持續新增其他次頁，請優先使用共用腳本：

```sh
node scripts/site-workflow/manage-site.mjs add-page --slug my-tool --title "我的新工具" --description "這裡放新工具的簡短說明。"
node scripts/site-workflow/manage-site.mjs verify
node scripts/site-workflow/manage-site.mjs publish --message "Add my tool page" --zeabur
```

若 shell 有載入 npm，也可用 npm 簡寫；若 `npm` 不在 PATH，請使用上面的 `node ...` 指令，或改用 `/Users/kolouis/Desktop/AI_八字/.tools/bin/npm`：

```sh
npm run site:list
npm run site:verify
npm run site -- add-page --slug my-tool --title "我的新工具" --description "這裡放新工具的簡短說明。"
```

腳本與說明位於 `scripts/site-workflow/`。新增的一般次頁會放在 `pages/<slug>.html`，首頁入口按鈕由 `scripts/site-workflow/site-pages.json` 管理。既有 `bazi.html` 保留在根目錄，以維持 `https://louisko.com/bazi.html` 連結不變。

首頁通行碼彈窗是前端入口提示，密碼會存在 HTML 中，不等同正式安全驗證。若未來要放入私密資料，應改成伺服器端登入、Session 或其他正式權限控管。

## 目前功能

- 四柱排盤
- 十神分析
- 地支本氣與藏干
- 旺衰分析
- 透干、通根
- 合沖刑害
- 三會局、三合局、半合局
- 六柱十二字整合分析
- 流年自動切換對應大運
- 九步大運
- 大運年齡區間
- 流年查詢
- AI 分析 Markdown 提示詞下載
- A4 PDF 列印優化

## 檔案結構

```text
index.html
bazi.html
pages/
Dockerfile
README.md
AGENTS.md
agent_notes.md
docs_algorithm.md
docs_overview.md
SMOKE_TEST.md
PACKAGE_TREE.txt
manifest.json
package.json
server.js
changelog/
docs/regression_cases.md
examples/
```

## 維護重點

不要從 DOM 畫面文字反抓八字資料。畫面文字可能含有 `span`、換行、顏色標籤或格式化內容，容易造成 `undefined` 或統計歸零。

正確方式：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

錯誤方式：

```js
document.getElementById("dayPillar").innerText
```

## 回歸測試

重要測試案例請優先看：

- `SMOKE_TEST.md`
- `docs/regression_cases.md`
- `manifest.json` 內的 `critical_regression_cases`

目前核心回歸案例：

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```

## 部署筆記

GitHub Pages 會直接發布 repository 根目錄的 `index.html`，八字系統位於 `bazi.html`。

Zeabur 目前設定：

```text
Project: bazi-website
Service: bazi-website
Server: Tencent Tokyo 2C 2GB
Custom domain: louisko.com
Generated domain: bazi-ko.zeabur.app
Public port: HTTP:80
```

正式對外連結優先使用 `https://louisko.com/`。GitHub Pages 保留作為備援。若需要追蹤 Zeabur 後台憑證狀態，可用 Zeabur MCP 的 `get_service` 查看 domain status，並以外部 `curl -I https://louisko.com` 作為實際可用性驗證。
