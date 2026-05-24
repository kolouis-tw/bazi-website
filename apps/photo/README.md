# Louis Image Processor

louisko.com 的照片處理次頁工具，預期路徑：

```text
/apps/photo/
```

## 功能

- 建立與選擇相簿。
- 點擊選檔或拖曳上傳 JPG / PNG / WEBP / HEIC / HEIF。
- iPhone / iPad 支援照片圖庫多選與直接拍照。
- HEIC / HEIF 後端轉 JPG。
- 前端 Canvas resize、compress、EXIF 資訊列與 Louis Logo 浮水印。
- IndexedDB 本地相簿儲存。
- 本機縮圖與雲端縮圖顯示。
- 相簿內 Lightbox 預覽、左右切換、旋轉、重設、刪除與 ZIP 下載。
- 上傳完成後自動開啟相簿詳情，直接進入後製操作。
- 相簿詳情可將目前相簿同步到後端雲端保留區。
- 電腦與手機可透過「讀取雲端」載入已同步相簿。

## 浮水印輸出規格

- 資訊列高度：118-150px。
- Logo 輸出尺寸：上限 72px。
- EXIF 主行字級：28px。
- EXIF 日期字級：20px。
- 本機輸出 JPEG quality：86。
- 本機縮圖長邊上限：480px。
- 文字過長時會自動截斷，不超出畫布。

## iPhone 上傳

手機版提供兩個入口：

- `照片圖庫`：可從 iOS Photos 選取多張照片。
- `直接拍照`：使用後鏡頭拍照後上傳。

上傳 input 使用：

```html
accept="image/*,.heic,.heif,image/heic,image/heif"
```

## HEIC 支援

HEIC / HEIF 會送至同網域後端：

```text
POST /api/convert-heic
```

後端優先使用 `sharp`，若本機或部署環境缺 HEIC decoder plugin，會 fallback 到 `heic-convert`。成功時回傳 `image/jpeg`。

一般 iPhone HEIC 可轉 JPG；少數 Apple 特殊格式，例如 ProRAW、HDR、Live Photo 衍生 HEIC，可能仍需在 iPhone 或 Mac 先匯出 JPEG。

## 資料儲存

本工具預設採用本地端相簿模式，並提供「同步雲端」流程。

所有相簿與已處理照片都儲存在目前瀏覽器的 IndexedDB：

```text
LouisImageProcessorAlbumsDB
```

未按下「同步雲端」前，照片不會永久上傳至 GitHub、Zeabur 或任何雲端資料庫。

按下「同步雲端」後，前端會把已處理的網頁版 JPEG 傳到後端 API：

```text
POST /api/photo-cloud/albums
POST /api/photo-cloud/albums/:albumId/photos
GET  /api/photo-cloud/albums
GET  /api/photo-cloud/albums/:albumId/photos
```

目前本機開發版本會保存到：

```text
_storage/photo-cloud
```

此資料夾已被 `.gitignore` 與 `.dockerignore` 排除，不會進 GitHub 或 Docker image。正式上線時使用 Cloudflare R2，不建議長期依賴 Zeabur container 檔案系統保存照片。

正式 R2 模式會保存：

- 大圖 JPEG：長邊上限 2048px，quality 86。
- 縮圖 JPEG：長邊上限 480px，quality 78。
- 相簿 metadata：`_metadata/photo-cloud.json`。

電腦與手機同步方式：

1. 在任一裝置建立相簿並上傳照片。
2. 進入相簿後按「同步雲端」。
3. 另一台裝置開啟 Photo 頁，按「讀取雲端」。
4. 已同步的相簿與縮圖會出現在該裝置瀏覽器。

## Cloudflare R2 設定

後端支援 Cloudflare R2。Zeabur 需設定環境變數：

```text
PHOTO_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=<Cloudflare account id>
R2_ACCESS_KEY_ID=<R2 access key id>
R2_SECRET_ACCESS_KEY=<R2 secret access key>
R2_BUCKET=<bucket name>
R2_PUBLIC_BASE_URL=https://media.louisko.com
```

`R2_PUBLIC_BASE_URL` 建議綁定 Cloudflare R2 custom domain，例如 `media.louisko.com`。若沒有設定 public base URL，API 仍可上傳到 R2，但回傳 URL 會是本機 fallback path，正式前需補上。

實際 key 只能放在 Zeabur environment variables 或本機 `.env`，不可寫入前端、README、AGENTS 或 commit message。

### 目前線上狀態

截至 2026-05-24：

- R2 bucket 已建立：`louisko-photo`。
- `media.louisko.com` 尚未接上 R2；目前先使用 Cloudflare R2 development public URL。
- 正式 Zeabur Node service：`louisko-node-photo`。
- 正式頁：`https://louisko.com/apps/photo/`
- 正式 API：`https://louisko.com/api/photo-cloud/albums`
- 備援 generated domain：`https://louisko-node-photo.zeabur.app/`
- 已驗證 API 可建立相簿、上傳測試 JPG、後端 resize 成長邊 2048px JPEG，並存入 R2。
- `louisko.com` 已從舊 `bazi-website` 靜態 service 移到 Node service，Photo cloud API 會在 `louisko.com/api/photo-cloud/albums` 回應。

已確認：

1. `https://louisko.com/` 首頁回 `200`。
2. `https://louisko.com/apps/photo/` 回 `200`。
3. `https://louisko.com/api/photo-cloud/albums` 回 JSON `200`。
4. R2 圖片公開 URL 可被瀏覽器讀取。

請注意：

- 清除瀏覽器資料會刪除相簿。
- 不同瀏覽器資料不互通。
- 不同裝置資料不互通。
- 建議定期使用 ZIP 下載功能備份照片。

## 本機預覽

在專案根目錄：

```sh
PORT=8084 /opt/homebrew/bin/node server.js
```

開啟：

```text
http://127.0.0.1:8084/apps/photo/
```

請用 `http://127.0.0.1:<port>/apps/photo/` 或正式網域開啟，不要直接雙擊 `index.html` 用 `file://` 開頁。HEIC / HEIF 需要後端 `/api/convert-heic`，直接開 HTML 檔時沒有同網域後端可用。

## 測試

語法與站台檢查：

```sh
node --check server.js
node --check apps/photo/app.js
node scripts/site-workflow/manage-site.mjs verify
```

測試照片資料夾：

```text
/Users/kolouis/Desktop/AI_Codex/AI_Web/photos4test
```

HEIC API 測試：

```sh
curl -s -F file=@/Users/kolouis/Desktop/AI_Codex/AI_Web/photos4test/IMG_4674.HEIC \
  -o /private/tmp/IMG_4674_converted.jpg \
  -w '%{http_code} %{content_type} %{size_download}\n' \
  http://127.0.0.1:8084/api/convert-heic
```

預期輸出為 `200 image/jpeg`。

雲端同步 API 測試：

```sh
curl -s -X POST http://127.0.0.1:8084/api/photo-cloud/albums \
  -H 'Content-Type: application/json' \
  -d '{"id":"demo","name":"Demo Album"}'
```
