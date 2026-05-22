# Louisko Site Workflow

這個資料夾保存 `louisko.com` 主站新增入口、建立子頁、驗證、推送 GitHub 與部署 Zeabur 的共用腳本。

主腳本：

```sh
node scripts/site-workflow/manage-site.mjs
```

## 流程與紀錄文件

- `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`：記錄每次網頁變更、GitHub 同步與 Zeabur 部署的標準流程，以及各步驟的作用。
- `WEB_CHANGE_LOG.md`：每次修改、commit、push、deploy 與線上驗證後都要補一筆紀錄。

## 常用流程

列出首頁目前入口：

```sh
node scripts/site-workflow/manage-site.mjs list
```

建立新的子頁資料夾，並自動加到首頁入口：

```sh
node scripts/site-workflow/manage-site.mjs add-page \
  --slug my-tool \
  --title "我的新工具" \
  --description "我的新工具" \
  --code 000000
```

這會建立：

```text
apps/my-tool/index.html
```

重新依 `site-pages.json` 產生首頁入口：

```sh
node scripts/site-workflow/manage-site.mjs refresh-home
```

檢查首頁入口與必要檔案：

```sh
node scripts/site-workflow/manage-site.mjs verify
```

提交並推送 GitHub：

```sh
node scripts/site-workflow/manage-site.mjs publish --message "Update Louisko pages"
```

提交、推送 GitHub，並重新部署 Zeabur：

```sh
node scripts/site-workflow/manage-site.mjs publish --message "Update Louisko pages" --zeabur
```

## 約定

- `index.html` 是 Louisko 主頁。
- `apps/<slug>/index.html` 是子頁或子專案入口。
- `apps/bazi/index.html` 是八字排盤主檔。
- `bazi.html` 保留在根目錄作為舊網址相容入口。
- 首頁入口資料放在 `site-pages.json`。
- `index.html` 裡的首頁入口按鈕區塊由下列 marker 管理：

```html
<!-- LOUISKO_APP_CARDS_START -->
<!-- LOUISKO_APP_CARDS_END -->
```

請不要手動刪除這兩個 marker，否則腳本無法更新首頁入口。

## 三資料夾連動

若有 louisko.com 站台、八字頁、排盤引擎、規格、樣板、測試或部署相關更新，務必同步檢查並視需要連動更新：

- `01_Louisko_Website_目前站台/Louisko_Website`
- `02_louisko.com_未來開發專案/louisko.com_未來開發專案`
- `03_bazi-engine-ts/bazi-engine-ts`

若只更新其中一處，需記錄或說明沒有同步其他處的原因。

## 安全與頁面規則

- 腳本不會覆蓋已存在的 `apps/<slug>/index.html`。
- Zeabur token 只會從 `/Users/kolouis/.codex/config.toml` 讀取，不會寫入 repository。
- `publish` 只會加入網站與文件相關檔案，不會批次加入整個工作區。
- 除非使用者明確要求，不要把提示詞、說明提醒、使用說明、安全提醒或教學文字放到公開頁面上。
