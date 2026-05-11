# Louisko Site Workflow

這個資料夾保存 Louisko.com 之後新增首頁入口、建立次頁、驗證、推送 GitHub 與部署 Zeabur 的共用腳本。首頁目前是無印良品風格的私人入口，腳本會產生同樣風格的圓形入口按鈕。

主腳本：

```sh
node scripts/site-workflow/manage-site.mjs
```

## 常用流程

列出首頁目前卡片：

```sh
node scripts/site-workflow/manage-site.mjs list
```

建立新的次頁，並自動加到首頁入口：

```sh
node scripts/site-workflow/manage-site.mjs add-page \
  --slug my-tool \
  --title "我的新工具" \
  --description "這裡放新工具的簡短說明。" \
  --code 000000
```

新增外部連結卡片：

```sh
node scripts/site-workflow/manage-site.mjs add-link \
  --slug my-link \
  --title "外部網站" \
  --description "放在首頁的外部連結。" \
  --href "https://example.com"
```

重新依 `site-pages.json` 產生首頁卡片：

```sh
node scripts/site-workflow/manage-site.mjs refresh-home
```

檢查首頁卡片與必要檔案：

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
- `bazi.html` 是既有八字十神排盤子頁，先保留在根目錄，避免改動既有網址。
- 新增的一般次頁放在 `pages/<slug>.html`。
- 首頁入口按鈕資料放在 `site-pages.json`。
- `index.html` 裡的首頁入口按鈕區塊由下列 marker 管理：

```html
<!-- LOUISKO_APP_CARDS_START -->
<!-- LOUISKO_APP_CARDS_END -->
```

請不要手動刪除這兩個 marker，否則腳本無法更新首頁卡片。

## 安全注意

- 腳本不會覆蓋已存在的 `pages/<slug>.html`。
- Zeabur token 只會從 `/Users/kolouis/.codex/config.toml` 讀取，不會寫入 repository。
- `publish` 只會加入網站與文件相關檔案，不會批次加入整個工作區。
- 首頁通行碼彈窗只是前端提示，不是正式安全驗證。
