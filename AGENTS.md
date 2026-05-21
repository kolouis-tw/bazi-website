# AGENTS.md

## 專案性質

本資料夾是 `louisko.com` 主網站專案。首頁、部署設定與主站工作流屬於根目錄；各子頁或子工具放在 `apps/` 內。

本機整併後位於 `AI_Codex/AI_Web/01_Louisko_Website_目前站台/Louisko_Website`；後續若要開發未來主版本，優先查看 `AI_Web/02_louisko.com_未來開發專案/louisko.com_未來開發專案`。

請以「低干擾、可回溯、主站與子專案分工清楚」為優先。

## 重要入口

- 主站首頁：`index.html`
- 舊八字網址相容入口：`bazi.html`
- 八字排盤子專案：`apps/bazi/`
- 預留子頁：`apps/erp/`、`apps/ai/`、`apps/design/`、`apps/photo/`、`apps/docs/`
- 主站工作流腳本：`scripts/site-workflow/manage-site.mjs`
- 首頁入口設定：`scripts/site-workflow/site-pages.json`
- 主站說明：`README.md`
- 專案資訊：`manifest.json`

## 部署現況

- Custom domain: `https://louisko.com/`
- 八字排盤新路徑: `https://louisko.com/apps/bazi/`
- 八字排盤舊相容路徑: `https://louisko.com/bazi.html`
- GitHub Pages: `https://kolouis-tw.github.io/louisko-website/`
- Zeabur generated domain: `https://bazi-ko.zeabur.app/`
- GitHub repository: `https://github.com/kolouis-tw/louisko-website`

Zeabur 使用 Dockerfile：

```Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
```

Zeabur token 只應保存在本機 Codex 設定檔或安全 secret store，不要寫入本 repository、README、AGENTS、commit message、issue 或 chat 回覆。

## 架構規則

- `index.html` 是主站首頁，目前採無印良品風格：米白底、低飽和、留白、圓形入口按鈕。
- `scripts/site-workflow/` 是主站工作流，不屬於任何單一子頁。
- `apps/<slug>/` 是各子頁或子專案的所有權邊界。
- 新增一般子頁時，優先使用 `node scripts/site-workflow/manage-site.mjs add-page ...`。
- 首頁入口由 `scripts/site-workflow/site-pages.json` 與 `index.html` 中的 `LOUISKO_APP_CARDS_START` / `LOUISKO_APP_CARDS_END` marker 管理；不要刪除 marker。
- 根目錄 `bazi.html` 只作為舊網址相容入口，不要把主要八字邏輯再放回根目錄。

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
