# louisko.com 未來開發專案

這個資料夾是 `louisko.com` 未來網站開發的主專案資料夾。根目錄保留可直接開發與部署的網站檔案；內部規劃、規格、參考資料與歷史來源統一放在 `_project/`。

目前整併位置：`/Users/kolouis/Desktop/AI_Codex/AI_Web/02_louisko.com_未來開發專案/louisko.com_未來開發專案`。這是後續 louisko.com 開發的主專案候選。

## 快速入口

- 主站首頁：`index.html`
- 舊八字入口相容頁：`bazi.html`
- 八字子專案：`apps/bazi/`
- 攝影照片處理工具：`apps/photo/`
- 其他預留子頁：`apps/erp/`、`apps/ai/`、`apps/design/`、`apps/photo/`、`apps/docs/`
- 主站工作流：`scripts/site-workflow/`
- 小白部署分工手冊：`_project/03_deployment/LOUISKO_DEPLOYMENT_OWNER_MANUAL.md`
- 八字 TypeScript 引擎：`packages/bazi-engine-ts/`
- 專案規劃資料：`_project/`

## 本機預覽

```sh
npm start
```

預設 port 是 `8080`，也可指定：

```sh
PORT=3000 npm start
```

## 攝影照片處理工具

`apps/photo/` 是 Louis Image Processor，提供相簿建立、照片上傳、EXIF 資訊列、Louis Logo 浮水印、相簿內旋轉、刪除、Lightbox 預覽與 ZIP 下載。

HEIC / HEIF 檔案會透過同一個 Node / Express 服務的 `POST /api/convert-heic` 轉成 JPG。後端使用 `multer` memory storage，優先以 `sharp` 轉檔，若 HEIC codec 不完整則 fallback 到 `heic-convert`。單檔上限 50MB，不寫入磁碟，也不永久保存使用者照片。

相簿詳情頁提供「同步雲端」流程。同步時會把已處理照片上傳到後端，後端再轉成網頁適合版本：

- 單一成品 JPG，已含 EXIF 資訊列與 Louis Logo 浮水印。
- 前端先壓縮到小於 600KB；後端再確認一次，確保 R2 最終檔案小於 600KB。
- 後端長邊上限 1800px，必要時會降低 JPEG quality 與尺寸。
- 本機開發保存位置：`_storage/photo-cloud`。

`_storage/` 已排除在 Git 與 Docker image 外。正式上線使用 Cloudflare R2，不建議依賴 Zeabur container disk 長期保存照片。Cloudflare R2 只保存單一成品 JPG，不再另外建立縮圖檔。

Cloudflare R2 可用下列環境變數啟用：

```text
PHOTO_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=https://media.louisko.com
```

實際 key 只放 Zeabur environment variables 或本機 `.env`，不要寫進 repository。

目前部署狀態：

- 正式 `https://louisko.com/` 已綁到 Zeabur Node service：`louisko-node-photo`。
- 正式 Photo 頁：`https://louisko.com/apps/photo/`
- 正式 Photo API：`https://louisko.com/api/photo-cloud/albums`
- 備援 generated domain：`https://louisko-node-photo.zeabur.app/`
- R2 bucket：`louisko-photo`。
- `media.louisko.com` 尚未接 R2，目前先使用 R2 development public URL。

截至 2026-05-24，`louisko.com` 已從舊 `bazi-website` 靜態 service 移到 Node service，首頁、子頁與 `/api/*` 共用同一個正式入口。

iPhone / iPad 使用時，手機版頁面提供兩個上傳入口：

- 「照片圖庫」：使用 `accept="image/*,.heic,.heif,image/heic,image/heif"` 與 `multiple`，可從 iOS Photos 選取多張照片。
- 「直接拍照」：使用 `capture="environment"`，可叫出後鏡頭拍照後上傳。

### 資料儲存說明

本工具採用「本地端相簿模式」，並可手動同步到雲端保留區。

所有相簿與已處理照片會先儲存在目前瀏覽器的 IndexedDB 中。未按下「同步雲端」前，照片不會永久上傳至 GitHub、Zeabur 或任何雲端資料庫。

請注意：

- 清除瀏覽器資料會刪除相簿。
- 不同瀏覽器資料不互通。
- 不同裝置資料不互通。
- 建議定期使用 ZIP 下載功能備份照片。

### HEIC 支援說明

一般 iPhone HEIC 會透過 Zeabur 後端自動轉換為 JPG。少數 Apple 特殊格式，例如 ProRAW、HDR、Live Photo 衍生 HEIC，可能仍無法轉換。

若轉換失敗，請在 iPhone 或 Mac 先匯出 JPEG：

- iPhone：設定 → 相機 → 格式 → 最相容
- iPhone 照片 App：分享 / 儲存為 JPEG
- Mac 預覽程式：檔案 → 輸出 → JPEG

## 常用工作流

```sh
npm run site:list
npm run site:verify
npm run site -- add-page --slug my-tool --title "我的新工具" --description "我的新工具"
```

## 專案分工

- 根目錄：主站、部署設定、入口頁與全站工作流。
- `apps/<slug>/`：各功能頁或子產品。
- `apps/bazi/`：目前線上八字功能頁。
- `packages/bazi-engine-ts/`：未來 Web / App / API 可共用的八字核心引擎。
- `_project/01_roadmap/`：未來開發方向與架構規劃。
- `_project/02_specs/`：八字頁、流月、神煞、次頁等規格。
- `_project/03_deployment/`：部署與網域資料。若要理解 GitHub、Zeabur、Cloudflare、R2 的角色，先讀 `_project/03_deployment/LOUISKO_DEPLOYMENT_OWNER_MANUAL.md`。
- `_project/04_references/`：命理 PDF、舊整理索引、研究資料。
- `_project/05_archive/`：未來放舊版備份或封存包。
- `_project/06_assets/`：未來放品牌、圖片、影片與設計素材。

## 三資料夾連動

若有 louisko.com 站台、八字頁、排盤引擎、規格、樣板、測試或部署相關更新，務必同步檢查並視需要連動更新：

- `01_Louisko_Website_目前站台/Louisko_Website`
- `02_louisko.com_未來開發專案/louisko.com_未來開發專案`
- `03_bazi-engine-ts/bazi-engine-ts`

若只更新其中一處，需記錄或說明沒有同步其他處的原因。

## 網域說明

此資料夾以 `louisko.com` 作為未來目標站名。部分歷史文件保留 `Louisko Website`、`louisko.com`、`bazi-website` 等名稱，代表舊專案來源與部署紀錄。
