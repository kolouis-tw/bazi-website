const DB_NAME = "LouisImageProcessorAlbumsDB";
const DB_VERSION = 1;
const MAX_EDGE = 1800;
const JPEG_QUALITY = 0.86;
const WEB_PHOTO_MAX_BYTES = 600 * 1024;
const MAX_SELECTED = 10;
const COPYRIGHT_TEXT = "© Louis Photography | All Rights Reserved";
const INFO_BAR_MIN_HEIGHT = 118;
const INFO_BAR_MAX_HEIGHT = 150;
const INFO_BAR_HEIGHT_RATIO = 0.072;
const WATERMARK_LOGO_SIZE = 72;
const EXIF_MAIN_FONT_SIZE = 28;
const EXIF_DATE_FONT_SIZE = 20;
const LOCAL_API_BASES = [
  "http://127.0.0.1:8084",
  "http://127.0.0.1:8083",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8080",
];
const CLOUD_API_BASES = [
  "https://louisko-node-photo.zeabur.app",
];

const state = {
  db: null,
  albums: [],
  currentAlbumId: null,
  detailAlbumId: null,
  detailPhotos: [],
  selectedPhotoIds: new Set(),
  lightboxIndex: 0,
  logo: null,
};

const $ = (selector) => document.querySelector(selector);
const els = {
  albumSelect: $("#albumSelect"),
  brandLogo: $("#brandLogo"),
  newAlbumButton: $("#newAlbumButton"),
  fileInput: $("#fileInput"),
  cameraInput: $("#cameraInput"),
  dropZone: $(".drop-zone"),
  progressBar: $("#progressBar"),
  statusText: $("#statusText"),
  errorList: $("#errorList"),
  cloudStatus: $("#cloudStatus"),
  albumGrid: $("#albumGrid"),
  photoGrid: $("#photoGrid"),
  detailTitle: $("#detailTitle"),
  lightbox: $("#lightbox"),
  lightboxImage: $("#lightboxImage"),
  lightboxCaption: $("#lightboxCaption"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const logoSrc = window.LOUIS_LOGO_DATA_URL || "./assets/louis-logo.png";
  els.brandLogo.src = logoSrc;
  state.logo = await loadImage(logoSrc);
  state.db = await openDb();
  await ensureDefaultAlbum();
  bindEvents();
  await pullCloudLibrary({ silent: true });
  await refreshAlbums();
  setStatus("準備就緒");
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewJump));
  });
  els.newAlbumButton.addEventListener("click", createAlbumFromPrompt);
  els.albumSelect.addEventListener("change", () => {
    state.currentAlbumId = els.albumSelect.value;
  });
  els.fileInput.addEventListener("change", () => handleInputFiles(els.fileInput));
  els.cameraInput.addEventListener("change", () => handleInputFiles(els.cameraInput));
  bindDropZone();
  $("#selectAllButton").addEventListener("click", selectVisiblePhotos);
  $("#clearSelectButton").addEventListener("click", clearSelection);
  $("#rotateLeftButton").addEventListener("click", () => rotateSelected(-90));
  $("#rotateRightButton").addEventListener("click", () => rotateSelected(90));
  $("#resetButton").addEventListener("click", resetSelected);
  $("#deletePhotosButton").addEventListener("click", deleteSelectedPhotos);
  $("#downloadButton").addEventListener("click", downloadSelected);
  $("#cloudSyncButton").addEventListener("click", syncCurrentAlbumToCloud);
  $("#cloudPullButton").addEventListener("click", () => pullCloudLibraryAndRender());
  $("#cloudRefreshButton").addEventListener("click", () => pullCloudLibraryAndRender());
  $("#closeLightbox").addEventListener("click", closeLightbox);
  $("#prevPhoto").addEventListener("click", () => moveLightbox(-1));
  $("#nextPhoto").addEventListener("click", () => moveLightbox(1));
  document.addEventListener("keydown", handleKeys);
}

function bindDropZone() {
  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      els.dropZone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      els.dropZone.classList.remove("is-dragging");
    });
  });
  els.dropZone.addEventListener("drop", (event) => {
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
    handleFiles(files);
  });
}

async function handleInputFiles(input) {
  await handleFiles([...input.files]);
  input.value = "";
}

function showView(view) {
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("is-active"));
  document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  const target = view === "albums" ? "#albumsView" : view === "detail" ? "#detailView" : "#uploadView";
  document.querySelector(target).classList.add("is-active");
  if (view === "albums") renderAlbumGrid();
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("albums")) db.createObjectStore("albums", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) {
        const store = db.createObjectStore("photos", { keyPath: "id" });
        store.createIndex("albumId", "albumId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(store, mode = "readonly") {
  return state.db.transaction(store, mode).objectStore(store);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(store) {
  return requestToPromise(tx(store).getAll());
}

function putRecord(store, value) {
  return requestToPromise(tx(store, "readwrite").put(value));
}

function deleteRecord(store, id) {
  return requestToPromise(tx(store, "readwrite").delete(id));
}

function getRecord(store, id) {
  return requestToPromise(tx(store).get(id));
}

function getPhotosByAlbum(albumId) {
  return requestToPromise(tx("photos").index("albumId").getAll(albumId));
}

async function ensureDefaultAlbum() {
  const albums = await getAll("albums");
  if (albums.length) return;
  const now = new Date().toISOString();
  await putRecord("albums", { id: crypto.randomUUID(), name: "Louis Album", createdAt: now, updatedAt: now });
}

async function refreshAlbums() {
  state.albums = (await getAll("albums")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  state.currentAlbumId ||= state.albums[0]?.id;
  renderAlbumSelect();
  renderAlbumGrid();
}

function renderAlbumSelect() {
  els.albumSelect.innerHTML = state.albums.map((album) => (
    `<option value="${escapeHtml(album.id)}">${escapeHtml(album.name)}</option>`
  )).join("");
  if (state.currentAlbumId) els.albumSelect.value = state.currentAlbumId;
}

async function createAlbumFromPrompt() {
  const name = prompt("相簿名稱");
  if (!name?.trim()) return;
  const now = new Date().toISOString();
  const album = { id: crypto.randomUUID(), name: name.trim(), createdAt: now, updatedAt: now };
  await putRecord("albums", album);
  state.currentAlbumId = album.id;
  await refreshAlbums();
}

async function renderAlbumGrid() {
  const cards = await Promise.all(state.albums.map(async (album) => {
    const photos = await getPhotosByAlbum(album.id);
    const coverUrl = photos[0] ? photoImageSrc(photos[0], "thumb") : "";
    return { album, photos, coverUrl };
  }));
  els.albumGrid.innerHTML = cards.map(({ album, photos, coverUrl }) => `
    <article class="album-card">
      ${coverUrl ? `<img class="album-cover" src="${coverUrl}" alt="">` : `<div class="album-cover"></div>`}
      <div class="album-body">
        <h3>${escapeHtml(album.name)}</h3>
        <p class="photo-meta">${photos.length} 張照片${album.cloudSyncedAt ? " · 雲端相簿" : ""}</p>
        <div class="card-actions">
          <button data-open-album="${escapeHtml(album.id)}"><i class="fa-solid fa-folder-open"></i></button>
          <button data-delete-album="${escapeHtml(album.id)}" class="danger"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </article>
  `).join("");
  els.albumGrid.querySelectorAll("[data-open-album]").forEach((button) => {
    button.addEventListener("click", () => openAlbum(button.dataset.openAlbum));
  });
  els.albumGrid.querySelectorAll("[data-delete-album]").forEach((button) => {
    button.addEventListener("click", () => deleteAlbum(button.dataset.deleteAlbum));
  });
}

async function deleteAlbum(albumId) {
  const album = state.albums.find((item) => item.id === albumId);
  if (!album || !confirm(`刪除相簿「${album.name}」與其中照片？`)) return;
  setCloudStatus("刪除雲端相簿中...");
  await deleteCloudAlbum(albumId);
  const photos = await getPhotosByAlbum(albumId);
  await Promise.all(photos.map((photo) => deleteRecord("photos", photo.id)));
  await deleteRecord("albums", albumId);
  if (state.currentAlbumId === albumId) state.currentAlbumId = null;
  await ensureDefaultAlbum();
  await refreshAlbums();
  setCloudStatus("相簿已刪除，雲端檔案也已同步移除。");
}

async function handleFiles(files) {
  if (!files.length) return;
  const albumId = state.currentAlbumId || els.albumSelect.value;
  if (!albumId) return setStatus("請先建立相簿");
  clearErrors();
  let done = 0;
  let succeeded = 0;
  const errors = [];
  for (const file of files) {
    try {
      setStatus(`處理中：${file.name}`);
      const originalExif = await readExifSmart(file);
      const convertedFromHeic = isHeic(file);
      const normalizedFile = await normalizeUploadFile(file);
      const exifData = normalizeExif(originalExif);
      if (convertedFromHeic) exifData.Orientation = 1;
      const outputBlob = await processImage(normalizedFile, exifData);
      const now = new Date().toISOString();
      await putRecord("photos", {
        id: crypto.randomUUID(),
        albumId,
        originalName: file.name,
        outputName: outputNameFor(file.name),
        blob: outputBlob,
        originalBlob: outputBlob,
        originalSizeBytes: file.size,
        processedSizeBytes: outputBlob.size,
        exifData,
        createdAt: now,
        updatedAt: now,
        transformHistory: [],
      });
      succeeded += 1;
      await touchAlbum(albumId);
    } catch (error) {
      console.warn(error);
      errors.push({ name: file.name, message: readableError(error) });
    } finally {
      done += 1;
      els.progressBar.value = Math.round((done / files.length) * 100);
    }
  }
  await refreshAlbums();
  setStatus(`完成 ${succeeded} / ${done} 張照片`);
  renderErrors(errors);
  if (succeeded > 0) await openAlbum(albumId);
}

async function touchAlbum(albumId) {
  const album = state.albums.find((item) => item.id === albumId) || await requestToPromise(tx("albums").get(albumId));
  if (!album) return;
  album.updatedAt = new Date().toISOString();
  await putRecord("albums", album);
}

function isHeic(file) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function normalizeUploadFile(file) {
  if (!isHeic(file)) return file;
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetchHeicConversion(formData);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "HEIC 轉檔失敗。此檔案可能是 Apple ProRAW / HDR / Live Photo 特殊格式。");
  }
  const blob = await response.blob();
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

async function fetchHeicConversion(formData) {
  const paths = apiCandidates().map((base) => `${base}/api/convert-heic`);
  let lastNetworkError = null;
  let lastResponse = null;
  for (const url of paths) {
    try {
      const response = await fetch(url, { method: "POST", body: formData });
      if (shouldTryNextApi(response)) {
        lastResponse = response;
        continue;
      }
      return response;
    } catch (error) {
      lastNetworkError = error;
    }
  }
  if (lastResponse) return lastResponse;
  throw new Error(fileModeMessage(lastNetworkError));
}

function apiCandidates() {
  const bases = [];
  if (location.protocol !== "file:") bases.push(location.origin);
  if (location.protocol === "file:" || isLocalHost(location.hostname)) bases.push(...LOCAL_API_BASES);
  bases.push(...CLOUD_API_BASES);
  return [...new Set(bases)];
}

async function fetchCloud(path, options = {}) {
  const urls = apiCandidates().map((base) => `${base}${path}`);
  let lastNetworkError = null;
  let lastResponse = null;
  for (const url of urls) {
    const { timeoutMs, ...fetchOptions } = options;
    const controller = timeoutMs ? new AbortController() : null;
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, controller ? { ...fetchOptions, signal: controller.signal } : fetchOptions);
      if (shouldTryNextApi(response)) {
        lastResponse = response;
        continue;
      }
      return response;
    } catch (error) {
      lastNetworkError = error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  if (lastResponse) return lastResponse;
  throw new Error(fileModeMessage(lastNetworkError));
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function shouldTryNextApi(response) {
  return response.status === 404 || response.status === 405;
}

function fileModeMessage(error) {
  if (location.protocol !== "file:") return error?.message || "雲端 API 連線失敗。若目前在 louisko.com 靜態服務，請先使用 Node 測試網址或完成正式 domain 切換。";
  return "HEIC 需要後端轉檔。請用本機預覽網址開啟，例如 http://127.0.0.1:8084/apps/photo/，不要直接開 HTML 檔。";
}

function clearErrors() {
  els.errorList.hidden = true;
  els.errorList.innerHTML = "";
}

function renderErrors(errors) {
  if (!errors.length) {
    clearErrors();
    return;
  }
  els.errorList.hidden = false;
  els.errorList.innerHTML = `
    <strong>${errors.length} 張照片處理失敗</strong>
    <ul>
      ${errors.map((error) => `<li>${escapeHtml(error.name)}：${escapeHtml(error.message)}</li>`).join("")}
    </ul>
  `;
}

function readableError(error) {
  const message = error?.message || "處理失敗";
  if (/Tainted canvases/i.test(message)) {
    return "瀏覽器阻擋 Canvas 匯出。已改用內嵌 Logo，請重新整理後再上傳。";
  }
  if (/Failed to fetch/i.test(message)) {
    return fileModeMessage(error);
  }
  return message;
}

async function readExifSmart(file) {
  try {
    if (window.exifr) return await window.exifr.parse(file);
  } catch (error) {
    console.warn("exifr failed", error);
  }
  return new Promise((resolve) => {
    if (!window.EXIF) return resolve({});
    window.EXIF.getData(file, function onExif() {
      resolve(window.EXIF.getAllTags(this) || {});
    });
  });
}

function normalizeExif(raw = {}) {
  return {
    Make: raw.Make || raw.make || "",
    Model: raw.Model || raw.model || "",
    FocalLength: raw.FocalLength || raw.focalLength || "",
    FNumber: raw.FNumber || raw.ApertureValue || raw.fNumber || "",
    ExposureTime: raw.ExposureTime || raw.exposureTime || "",
    ISOSpeedRatings: raw.ISOSpeedRatings || raw.ISO || raw.iso || "",
    DateTimeOriginal: raw.DateTimeOriginal || raw.CreateDate || raw.ModifyDate || "",
    Orientation: Number(raw.Orientation || raw.orientation || 1),
  };
}

async function processImage(file, exifData) {
  const image = await loadImage(URL.createObjectURL(file));
  const oriented = drawOrientedImage(image, exifData.Orientation);
  const scale = Math.min(1, MAX_EDGE / Math.max(oriented.width, oriented.height));
  const imageWidth = Math.round(oriented.width * scale);
  const imageHeight = Math.round(oriented.height * scale);
  const infoHeight = Math.round(Math.min(INFO_BAR_MAX_HEIGHT, Math.max(INFO_BAR_MIN_HEIGHT, imageWidth * INFO_BAR_HEIGHT_RATIO)));
  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight + infoHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(oriented, 0, 0, imageWidth, imageHeight);
  drawInfoBar(ctx, canvas.width, imageHeight, infoHeight, exifData);
  return canvasToBlobUnderLimit(canvas, WEB_PHOTO_MAX_BYTES);
}

function drawOrientedImage(image, orientation) {
  const swaps = [5, 6, 7, 8].includes(orientation);
  const canvas = document.createElement("canvas");
  canvas.width = swaps ? image.height : image.width;
  canvas.height = swaps ? image.width : image.height;
  const ctx = canvas.getContext("2d");
  switch (orientation) {
    case 2: ctx.translate(canvas.width, 0); ctx.scale(-1, 1); break;
    case 3: ctx.translate(canvas.width, canvas.height); ctx.rotate(Math.PI); break;
    case 4: ctx.translate(0, canvas.height); ctx.scale(1, -1); break;
    case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
    case 6: ctx.translate(canvas.width, 0); ctx.rotate(0.5 * Math.PI); break;
    case 7: ctx.translate(canvas.width, canvas.height); ctx.rotate(0.5 * Math.PI); ctx.scale(-1, 1); break;
    case 8: ctx.translate(0, canvas.height); ctx.rotate(-0.5 * Math.PI); break;
    default: break;
  }
  ctx.drawImage(image, 0, 0);
  return canvas;
}

function drawInfoBar(ctx, width, top, height, exifData) {
  ctx.save();
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, top, width, height);
  const gradient = ctx.createLinearGradient(0, top, width, top);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,.36)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, width, 1);

  const padding = Math.max(24, Math.round(width * 0.028));
  const logoSize = Math.round(Math.min(WATERMARK_LOGO_SIZE, height * 0.58));
  const logoX = padding;
  const logoY = top + Math.round((height - logoSize) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(state.logo, logoX, logoY, logoSize, logoSize);
  ctx.restore();

  const textX = logoX + logoSize + Math.round(padding * 0.75);
  const maxTextWidth = width - textX - padding;
  const mainText = buildExifLine(exifData);
  const dateText = formatDate(exifData.DateTimeOriginal);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${EXIF_MAIN_FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(fitText(ctx, mainText, maxTextWidth), textX, top + height * 0.41);
  if (mainText !== COPYRIGHT_TEXT && dateText) {
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = `500 ${EXIF_DATE_FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(fitText(ctx, dateText, maxTextWidth), textX, top + height * 0.66);
  }
  ctx.restore();
}

function buildExifLine(exif) {
  const camera = [exif.Make, exif.Model].filter(Boolean).join(" ").trim();
  const parts = [
    camera,
    formatFocal(exif.FocalLength),
    formatAperture(exif.FNumber),
    formatExposure(exif.ExposureTime),
    exif.ISOSpeedRatings ? `ISO ${exif.ISOSpeedRatings}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : COPYRIGHT_TEXT;
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) output = output.slice(0, -1);
  return `${output}…`;
}

function formatFocal(value) {
  if (!value) return "";
  const number = typeof value === "object" && "numerator" in value ? value.numerator / value.denominator : Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}mm` : String(value);
}

function formatAperture(value) {
  if (!value) return "";
  const number = typeof value === "object" && "numerator" in value ? value.numerator / value.denominator : Number(value);
  return Number.isFinite(number) ? `f/${number.toFixed(number >= 10 ? 0 : 1)}` : `f/${value}`;
}

function formatExposure(value) {
  if (!value) return "";
  const number = typeof value === "object" && "numerator" in value ? value.numerator / value.denominator : Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (number < 1) return `1/${Math.round(1 / number)}s`;
  return `${Number(number.toFixed(1))}s`;
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  return String(value).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
}

async function openAlbum(albumId) {
  state.detailAlbumId = albumId;
  state.selectedPhotoIds.clear();
  setCloudStatus("");
  const album = state.albums.find((item) => item.id === albumId);
  els.detailTitle.textContent = album?.name || "相簿";
  state.detailPhotos = (await getPhotosByAlbum(albumId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  renderPhotoGrid();
  showView("detail");
}

function renderPhotoGrid() {
  els.photoGrid.innerHTML = state.detailPhotos.map((photo, index) => {
    const url = photoImageSrc(photo, "thumb");
    const changed = photo.transformHistory?.length ? "已修改" : "未修改";
    const cloud = photo.cloudSyncedAt || photo.cloudOnly ? " · 雲端" : "";
    const size = photoSizeLabel(photo);
    return `
      <article class="photo-card">
        <img src="${url}" alt="" data-lightbox-index="${index}">
        <div class="photo-body">
          <strong>${escapeHtml(photo.originalName)}</strong>
          <p class="photo-meta">${escapeHtml(photo.outputName)} · ${size} · ${changed}${cloud}</p>
          <label class="check-row">
            <input type="checkbox" value="${escapeHtml(photo.id)}" ${state.selectedPhotoIds.has(photo.id) ? "checked" : ""}>
            <span>選取</span>
          </label>
        </div>
      </article>
    `;
  }).join("");
  els.photoGrid.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => updateSelection(input));
  });
  els.photoGrid.querySelectorAll("[data-lightbox-index]").forEach((image) => {
    image.addEventListener("click", () => openLightbox(Number(image.dataset.lightboxIndex)));
  });
}

function updateSelection(input) {
  if (input.checked && state.selectedPhotoIds.size >= MAX_SELECTED) {
    input.checked = false;
    alert(`最多勾選 ${MAX_SELECTED} 張`);
    return;
  }
  if (input.checked) state.selectedPhotoIds.add(input.value);
  else state.selectedPhotoIds.delete(input.value);
}

function selectVisiblePhotos() {
  state.selectedPhotoIds = new Set(state.detailPhotos.slice(0, MAX_SELECTED).map((photo) => photo.id));
  renderPhotoGrid();
}

function clearSelection() {
  state.selectedPhotoIds.clear();
  renderPhotoGrid();
}

async function rotateSelected(degrees) {
  const selected = state.detailPhotos.filter((photo) => state.selectedPhotoIds.has(photo.id));
  for (const photo of selected) {
    if (!photo.blob) continue;
    photo.blob = await rotateBlob(photo.blob, degrees);
    photo.processedSizeBytes = photo.blob.size;
    photo.updatedAt = new Date().toISOString();
    photo.transformHistory = [...(photo.transformHistory || []), degrees > 0 ? "rotate-right" : "rotate-left"];
    photo.cloudSyncedAt = "";
    await putRecord("photos", photo);
  }
  await openAlbum(state.detailAlbumId);
}

async function resetSelected() {
  const selected = state.detailPhotos.filter((photo) => state.selectedPhotoIds.has(photo.id));
  for (const photo of selected) {
    if (!photo.originalBlob) continue;
    photo.blob = photo.originalBlob;
    photo.processedSizeBytes = photo.blob.size;
    photo.updatedAt = new Date().toISOString();
    photo.transformHistory = [];
    photo.cloudSyncedAt = "";
    await putRecord("photos", photo);
  }
  await openAlbum(state.detailAlbumId);
}

async function deleteSelectedPhotos() {
  if (!state.selectedPhotoIds.size || !confirm(`刪除 ${state.selectedPhotoIds.size} 張照片？`)) return;
  setCloudStatus("刪除雲端照片中...");
  for (const id of state.selectedPhotoIds) await deleteCloudPhoto(state.detailAlbumId, id);
  await Promise.all([...state.selectedPhotoIds].map((id) => deleteRecord("photos", id)));
  await openAlbum(state.detailAlbumId);
  await refreshAlbums();
  setCloudStatus("已刪除選取照片，雲端檔案也已同步移除。");
}

async function downloadSelected() {
  const selected = state.detailPhotos.filter((photo) => state.selectedPhotoIds.has(photo.id));
  if (!selected.length) return alert("請先選取照片");
  setCloudStatus("準備下載照片中...");
  const zip = new JSZip();
  const failed = [];
  for (const photo of selected) {
    try {
      const blob = photo.blob || await fetchCloudBlob(photo);
      if (blob) zip.file(photo.outputName, blob);
    } catch (error) {
      console.warn(error);
      failed.push(photo.originalName);
    }
  }
  if (!Object.keys(zip.files).length) {
    setCloudStatus(`下載失敗：雲端檔案不存在或尚未重新同步。${failed.slice(0, 2).join("、")}`);
    return;
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "louis_gallery.zip";
  link.click();
  URL.revokeObjectURL(link.href);
  setCloudStatus(failed.length ? `已下載部分照片，${failed.length} 張雲端檔案不存在。` : "已建立下載檔。");
}

async function syncCurrentAlbumToCloud() {
  if (!state.detailAlbumId || !state.detailPhotos.length) return;
  const album = state.albums.find((item) => item.id === state.detailAlbumId);
  const uploadablePhotos = state.detailPhotos.filter((photo) => photo.blob);
  setCloudStatus("準備同步雲端...");
  try {
    let done = 0;
    if (!uploadablePhotos.length) {
      await pullCloudLibrary({ silent: true });
      await openAlbum(state.detailAlbumId);
      return setCloudStatus("此相簿沒有新的本機照片要同步，已更新雲端相簿清單。");
    }
    const failed = [];
    for (const photo of uploadablePhotos) {
      done += 1;
      setCloudStatus(`同步雲端中：${done} / ${uploadablePhotos.length}（${formatBytes(photo.blob.size)}）`);
      try {
        const formData = new FormData();
        formData.append("photoId", photo.id);
        formData.append("albumName", album?.name || "Louis Album");
        formData.append("originalName", photo.originalName);
        formData.append("outputName", photo.outputName);
        formData.append("metadata", JSON.stringify({ exifData: photo.exifData, transformHistory: photo.transformHistory || [] }));
        formData.append("file", photo.blob, photo.outputName);
        const response = await fetchCloud(`/api/photo-cloud/albums/${encodeURIComponent(state.detailAlbumId)}/photos`, {
          method: "POST",
          body: formData,
          timeoutMs: 120000,
        });
        if (!response.ok) {
          throw new Error(await cloudResponseError(response, `${photo.originalName} 同步失敗`));
        }
        const result = await response.json();
        photo.cloudUrl = result.photo?.url || "";
        photo.cloudStorageKey = result.photo?.storageKey || "";
        photo.thumbnailUrl = "";
        photo.cloudSizeBytes = result.photo?.sizeBytes || photo.blob.size;
        photo.cloudSyncedAt = new Date().toISOString();
        await putRecord("photos", photo);
      } catch (error) {
        console.warn(error);
        failed.push(`${photo.originalName}: ${readableError(error)}`);
      }
    }
    await pullCloudLibrary({ silent: true });
    await openAlbum(state.detailAlbumId);
    const okCount = uploadablePhotos.length - failed.length;
    setCloudStatus(failed.length
      ? `已同步 ${okCount} 張，${failed.length} 張失敗：${failed.slice(0, 2).join("；")}`
      : `已同步 ${okCount} 張照片到雲端保留區，其他裝置可按「讀取雲端」載入。`);
    renderPhotoGrid();
  } catch (error) {
    console.warn(error);
    setCloudStatus(`同步失敗：${readableError(error)}`);
  }
}

async function deleteCloudAlbum(albumId) {
  const response = await fetchCloud(`/api/photo-cloud/albums/${encodeURIComponent(albumId)}`, {
    method: "DELETE",
    timeoutMs: 120000,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await cloudResponseError(response, "雲端相簿刪除失敗"));
  }
}

async function deleteCloudPhoto(albumId, photoId) {
  const response = await fetchCloud(`/api/photo-cloud/albums/${encodeURIComponent(albumId)}/photos/${encodeURIComponent(photoId)}`, {
    method: "DELETE",
    timeoutMs: 120000,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await cloudResponseError(response, "雲端照片刪除失敗"));
  }
}

async function pullCloudLibraryAndRender() {
  setCloudStatus("讀取雲端相簿中...");
  try {
    const counts = await pullCloudLibrary({ silent: false });
    await refreshAlbums();
    if (state.detailAlbumId) await openAlbum(state.detailAlbumId);
    else renderAlbumGrid();
    setCloudStatus(`已讀取雲端：${counts.albums} 本相簿、${counts.photos} 張照片。`);
    setStatus("雲端相簿已更新");
  } catch (error) {
    console.warn(error);
    setCloudStatus(`讀取雲端失敗：${readableError(error)}`);
  }
}

async function pullCloudLibrary({ silent = false } = {}) {
  try {
    const response = await fetchCloud("/api/photo-cloud/albums", { cache: "no-store" });
    if (!response.ok) throw new Error(await cloudResponseError(response, "雲端相簿讀取失敗"));
    const data = await response.json();
    const albums = Array.isArray(data.albums) ? data.albums : [];
    const photos = Array.isArray(data.photos) ? data.photos : [];
    await pruneLocalCloudRecords(albums, photos);
    for (const album of albums) await mergeCloudAlbum(album);
    for (const photo of photos) await mergeCloudPhoto(photo);
    return { albums: albums.length, photos: photos.length };
  } catch (error) {
    if (!silent) throw error;
    console.warn("Cloud library pull skipped:", error.message);
    return { albums: 0, photos: 0 };
  }
}

async function pruneLocalCloudRecords(cloudAlbums, cloudPhotos) {
  const cloudAlbumIds = new Set(cloudAlbums.map((album) => String(album.id || "")).filter(Boolean));
  const cloudPhotoIds = new Set(cloudPhotos.map((photo) => String(photo.id || "")).filter(Boolean));
  const localAlbums = await getAll("albums");
  const localPhotos = await getAll("photos");

  for (const album of localAlbums) {
    if (album.cloudSyncedAt && !cloudAlbumIds.has(album.id)) {
      const photos = await getPhotosByAlbum(album.id);
      const hasLocalBlob = photos.some((photo) => photo.blob);
      if (!hasLocalBlob) {
        for (const photo of photos) await deleteRecord("photos", photo.id);
        await deleteRecord("albums", album.id);
      }
    }
  }

  for (const photo of localPhotos) {
    if (photo.cloudSyncedAt && !photo.blob && !cloudPhotoIds.has(photo.id)) {
      await deleteRecord("photos", photo.id);
    }
  }
}

async function mergeCloudAlbum(cloudAlbum) {
  const id = String(cloudAlbum.id || "");
  if (!id) return;
  const existing = await getRecord("albums", id);
  await putRecord("albums", {
    ...(existing || {}),
    id,
    name: cloudAlbum.name || existing?.name || "Louis Album",
    createdAt: existing?.createdAt || cloudAlbum.createdAt || new Date().toISOString(),
    updatedAt: cloudAlbum.updatedAt || existing?.updatedAt || new Date().toISOString(),
    cloudSyncedAt: cloudAlbum.updatedAt || new Date().toISOString(),
  });
}

async function mergeCloudPhoto(cloudPhoto) {
  const id = String(cloudPhoto.id || "");
  const albumId = String(cloudPhoto.albumId || "");
  if (!id || !albumId) return;
  const existing = await getRecord("photos", id);
  await putRecord("photos", {
    ...(existing || {}),
    id,
    albumId,
    originalName: cloudPhoto.originalName || existing?.originalName || "cloud-photo.jpg",
    outputName: cloudPhoto.outputName || existing?.outputName || `${id}.jpg`,
    createdAt: existing?.createdAt || cloudPhoto.createdAt || new Date().toISOString(),
    updatedAt: cloudPhoto.updatedAt || existing?.updatedAt || new Date().toISOString(),
    exifData: existing?.exifData || cloudPhoto.metadata?.exifData || {},
    transformHistory: existing?.transformHistory || cloudPhoto.metadata?.transformHistory || [],
    blob: existing?.blob,
    originalBlob: existing?.originalBlob,
    originalSizeBytes: existing?.originalSizeBytes || 0,
    processedSizeBytes: existing?.processedSizeBytes || cloudPhoto.sizeBytes || 0,
    cloudUrl: cloudPhoto.url || existing?.cloudUrl || "",
    cloudStorageKey: cloudPhoto.storageKey || existing?.cloudStorageKey || "",
    thumbnailUrl: "",
    cloudSizeBytes: cloudPhoto.sizeBytes || existing?.cloudSizeBytes || 0,
    cloudWidth: cloudPhoto.width || existing?.cloudWidth || 0,
    cloudHeight: cloudPhoto.height || existing?.cloudHeight || 0,
    cloudSyncedAt: cloudPhoto.updatedAt || new Date().toISOString(),
    cloudOnly: !existing?.blob,
  });
}

async function cloudResponseError(response, fallback) {
  if (response.status === 404 || response.status === 405) {
    return "雲端 API 尚未在目前網址啟用。請使用 Node 測試網址，或完成 louisko.com 正式切換後再同步。";
  }
  const error = await response.json().catch(() => null);
  return error?.message || fallback;
}

async function fetchCloudBlob(photo) {
  if (!photo) return null;
  const key = photo.cloudStorageKey || photo.storageKey || "";
  const url = key
    ? `/api/photo-cloud/object?key=${encodeURIComponent(key)}&name=${encodeURIComponent(photo.outputName || "photo.jpg")}`
    : photo.cloudUrl;
  if (!url) return null;
  const response = key ? await fetchCloud(url, { cache: "no-store" }) : await fetch(url);
  if (!response.ok) throw new Error("雲端照片下載失敗");
  return response.blob();
}

function setCloudStatus(message) {
  if (!message) {
    els.cloudStatus.hidden = true;
    els.cloudStatus.textContent = "";
    return;
  }
  els.cloudStatus.hidden = false;
  els.cloudStatus.textContent = message;
}

async function rotateBlob(blob, degrees) {
  const image = await loadImage(URL.createObjectURL(blob));
  const canvas = document.createElement("canvas");
  const rightAngle = Math.abs(degrees) % 180 === 90;
  canvas.width = rightAngle ? image.height : image.width;
  canvas.height = rightAngle ? image.width : image.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  return canvasToBlobUnderLimit(canvas, WEB_PHOTO_MAX_BYTES);
}

function openLightbox(index) {
  state.lightboxIndex = index;
  updateLightbox();
  els.lightbox.classList.add("is-open");
  els.lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  els.lightbox.classList.remove("is-open");
  els.lightbox.setAttribute("aria-hidden", "true");
}

function moveLightbox(step) {
  if (!state.detailPhotos.length) return;
  state.lightboxIndex = (state.lightboxIndex + step + state.detailPhotos.length) % state.detailPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  const photo = state.detailPhotos[state.lightboxIndex];
  if (!photo) return;
  els.lightboxImage.src = photoImageSrc(photo, "full");
  els.lightboxCaption.textContent = `${state.lightboxIndex + 1} / ${state.detailPhotos.length} · ${photo.originalName}`;
}

function photoImageSrc(photo, size = "thumb") {
  if (photo.blob) return URL.createObjectURL(photo.blob);
  return photo.cloudUrl || "";
}

function photoSizeLabel(photo) {
  const parts = [];
  if (photo.originalSizeBytes) parts.push(`原檔 ${formatBytes(photo.originalSizeBytes)}`);
  const displaySize = photo.processedSizeBytes || photo.cloudSizeBytes || photo.blob?.size || 0;
  if (displaySize) parts.push(`成品 ${formatBytes(displaySize)}`);
  return parts.join(" / ") || "雲端照片";
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 KB";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function handleKeys(event) {
  if (!els.lightbox.classList.contains("is-open")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("圖片輸出失敗")), type, quality);
  });
}

async function canvasToBlobUnderLimit(sourceCanvas, maxBytes) {
  let workingCanvas = sourceCanvas;
  let lastBlob = null;
  for (let scaleAttempt = 0; scaleAttempt < 8; scaleAttempt += 1) {
    for (const quality of [JPEG_QUALITY, 0.82, 0.78, 0.74, 0.70, 0.66, 0.62, 0.58, 0.54]) {
      const blob = await canvasToBlob(workingCanvas, "image/jpeg", quality);
      lastBlob = blob;
      if (blob.size <= maxBytes) return blob;
    }
    workingCanvas = scaleCanvas(workingCanvas, 0.86);
  }
  return lastBlob;
}

function scaleCanvas(sourceCanvas, ratio) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * ratio));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function outputNameFor(name) {
  return name.replace(/\.[^.]+$/, "") + "_louis.jpg";
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
