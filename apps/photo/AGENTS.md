# AGENTS.md

## 子專案定位

`apps/photo/` 是 louisko.com 的 Louis Image Processor 次頁工具，路徑預期為：

```text
https://louisko.com/apps/photo/
```

此工具用於照片上傳、拖曳放置、相簿管理、EXIF 資訊列、Louis Logo 浮水印、旋轉、刪除、Lightbox 預覽與 ZIP 下載。

## 檔案分工

- `index.html`：頁面結構與上傳入口。
- `styles.css`：暗色攝影工具 UI 與 mobile layout。
- `app.js`：前端相簿、IndexedDB、Canvas、EXIF、watermark、下載與 Lightbox 邏輯。
- `assets/louis-logo.png`：浮水印與頁首使用的 Louis Logo。
- `assets/louis-logo-data.js`：內嵌 Logo data URL，避免本機檔案模式造成 Canvas tainted。
- 根目錄 `server.js`：提供靜態頁面與 `POST /api/convert-heic`。
- 根目錄 `server.js`：也提供 `POST /api/photo-cloud/albums` 與照片同步 API。
- 根目錄 `package.json`：管理 Express、Multer、Sharp、heic-convert 等後端依賴。

## iPhone / iPad 上傳規則

本頁會在 iPhone 上使用，修改上傳功能時必須保留：

```html
accept="image/*,.heic,.heif,image/heic,image/heif"
```

並保留兩種入口：

- 照片圖庫：支援多選。
- 直接拍照：使用 `capture="environment"` 開啟後鏡頭。

iOS Photos 可能提供 `.HEIC`、`.HEIF`、JPEG，或副檔名與實際內容不完全一致的檔案。判斷 HEIC 時不可只看 MIME type，必須同時看副檔名。

## HEIC / HEIF 轉檔規則

HEIC / HEIF 必須送到後端：

```text
POST /api/convert-heic
```

後端流程：

1. 優先使用 `sharp`。
2. 若 `sharp` 因 HEIC codec / libheif plugin 不完整而失敗，fallback 到 `heic-convert`。
3. 成功時回傳 `image/jpeg`。
4. 不寫入磁碟，不永久保存照片。
5. 單檔上限 50MB。

不可在 UI 或 README 宣稱「所有 HEIC 一定可轉」。正確說法是一般 HEIC 可轉，少數 ProRAW、HDR、Live Photo 衍生格式可能仍需手動匯出 JPEG。

## 本地儲存規則

相簿與照片只存在使用者瀏覽器 IndexedDB：

```text
LouisImageProcessorAlbumsDB
```

Stores：

- `albums`
- `photos`

未按下「同步雲端」前，GitHub、Zeabur 與 louisko.com 不永久保存使用者相簿照片。若修改同步流程，只能透過後端 API 寫入受控 storage adapter，不可把 API key 放到前端。

## 雲端保留規則

目前「同步雲端」是 cloud-ready / R2-ready 功能：

- 本機開發保存到 `_storage/photo-cloud`。
- `_storage/` 必須維持在 `.gitignore` 與 `.dockerignore`。
- 後端會把同步照片轉為網頁適合尺寸：長邊上限 2048px，JPEG quality 86。
- 後端會另外產生縮圖：長邊上限 480px，JPEG quality 78。
- 前端本機相簿也需保存縮圖 Blob，列表與相簿封面優先顯示縮圖，不直接用大圖當縮圖。
- 前端需顯示原檔容量與網頁版容量，方便確認不是在保存原檔。
- 正式上線不可長期依賴 Zeabur container disk，應使用 Cloudflare R2 或同級 object storage。
- 不可把任何 R2 / S3 / Supabase key 寫進前端、README、AGENTS 或 commit message。
- 目前後端已支援 Cloudflare R2，使用 `PHOTO_STORAGE_PROVIDER=r2` 與 `R2_*` 環境變數啟用。
- 若 `PHOTO_STORAGE_PROVIDER=r2` 且 R2 env vars 完整，照片檔案與相簿 metadata 都應保存在 R2；metadata key 為 `_metadata/photo-cloud.json`。
- 若 `PHOTO_STORAGE_PROVIDER=r2` 但 R2 env vars 不完整，後端會 fallback 到 local storage。
- `.env` 與 `.env.*` 必須維持 ignored；只允許 `.env.example` 進版控。

目前 Cloudflare R2 / Zeabur 狀態：

- R2 bucket: `louisko-photo`
- 目前 public base URL 使用 Cloudflare R2 development URL；`media.louisko.com` 尚未接上，因為 `louisko.com` 尚未由同一個 Cloudflare account 管理 DNS。
- 正式理想目標仍是 `R2_PUBLIC_BASE_URL=https://media.louisko.com`。
- 本機 Wrangler CLI 已登入 Cloudflare，可用於查詢 R2 bucket、r2.dev URL 與 custom domain 狀態。
- 已確認 `louisko-photo` 的 r2.dev URL 啟用，且目前沒有 custom domain connected。
- Zeabur 正式 Node service: `louisko-node-photo`
- Generated domain: `https://louisko-node-photo.zeabur.app/apps/photo/`
- 正式網址: `https://louisko.com/apps/photo/`
- 正式 API: `https://louisko.com/api/photo-cloud/albums`
- 截至 2026-05-24，`louisko.com` 已從舊 `bazi-website` 靜態 service 移到 Node service，首頁、Photo 頁與 `/api/*` 共用正式入口。
- 前端仍保留 `https://louisko-node-photo.zeabur.app` fallback，作為正式 domain 異常時的備援。

已驗證的線上 smoke test：

- `GET https://louisko.com/api/photo-cloud/albums` 回傳 JSON `200`。
- `POST /api/photo-cloud/albums` 可建立相簿。
- `POST /api/photo-cloud/albums/:albumId/photos` 可將測試 JPG resize 成長邊 2048px 的網頁版 JPEG 並寫入 R2。
- R2 公開圖片 URL 回 `200 image/jpeg`。
- 前端需提供「讀取雲端」功能，將雲端相簿與照片 metadata 合併到本機 IndexedDB，使電腦與手機瀏覽器都可看到已同步相簿。

任何文件中只能記錄 bucket name、public URL、service id 這類非敏感資訊。不可寫入 `R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、Zeabur token 或其他 secret。

## 浮水印規則

處理後的圖片底部需新增資訊列，不可覆蓋原照片內容。

資訊列內容：

- 左側：Louis Logo。
- 右側：EXIF 拍攝參數與日期。
- EXIF 缺失時：`© Louis Photography | All Rights Reserved`。
- 資訊列高度目前為 118-150px。
- Logo 輸出尺寸目前上限為 72px。
- EXIF 主行字級固定 28px，日期字級固定 20px。

修改 Canvas 排版時，必須保留 `fitText` 類型的裁切機制，避免文字超出畫布。

## 上傳體驗規則

桌面版必須支援：

- 點擊選檔。
- 拖曳照片到上傳區。

手機版必須支援：

- 照片圖庫。
- 直接拍照。

照片處理完成後，若至少一張成功，必須自動開啟目前相簿詳情，讓使用者立刻看到可後製照片。

## 測試資料

本機測試照片資料夾：

```text
/Users/kolouis/Desktop/AI_Codex/AI_Web/photos4test
```

此資料夾包含 JPG、PNG 與 HEIC。HEIC 測試時需至少確認一張真正 HEIC 可由 `/api/convert-heic` 轉成 JPEG。

## 建議驗證

在未來主專案根目錄執行：

```sh
node --check server.js
node --check apps/photo/app.js
node scripts/site-workflow/manage-site.mjs verify
```

本機預覽建議：

```sh
PORT=8084 /opt/homebrew/bin/node server.js
```

測試時請使用 `http://127.0.0.1:<port>/apps/photo/` 或正式網域。不要直接用 `file://.../index.html` 當正式測試入口；HEIC API 需要後端服務，Canvas 也容易受到本機檔案來源限制。

HEIC API 測試範例：

```sh
curl -s -F file=@/Users/kolouis/Desktop/AI_Codex/AI_Web/photos4test/IMG_4674.HEIC \
  -o /private/tmp/IMG_4674_converted.jpg \
  -w '%{http_code} %{content_type} %{size_download}\n' \
  http://127.0.0.1:8084/api/convert-heic
```

## 三資料夾連動

本功能屬於 louisko.com 主站次頁。完成重大修改後，需檢查是否要同步：

- `01_Louisko_Website_目前站台/Louisko_Website`
- `02_louisko.com_未來開發專案/louisko.com_未來開發專案`
- `03_bazi-engine-ts/bazi-engine-ts`

照片工具通常不涉及 `03_bazi-engine-ts`。若未同步目前站台，回覆中需說明原因。
