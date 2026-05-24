const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const port = process.env.PORT || 8080;
const root = __dirname;
const photoStorageRoot = process.env.PHOTO_STORAGE_DIR || path.join(root, "_storage", "photo-cloud");
const photoMetadataPath = path.join(photoStorageRoot, "metadata.json");
const r2MetadataKey = "_metadata/photo-cloud.json";
const storageProvider = (process.env.PHOTO_STORAGE_PROVIDER || "local").toLowerCase();
const r2Bucket = process.env.R2_BUCKET || "";
const r2PublicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const r2Client = createR2Client();
const activeStorageProvider = storageProvider === "r2" && r2Client ? "r2" : "local";

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
  },
});

function isHeicFile(file) {
  const name = (file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return (
    mime === "image/heic" ||
    mime === "image/heif" ||
    ((mime === "application/octet-stream" || !mime) && /\.(heic|heif)$/.test(name)) ||
    /\.(heic|heif)$/.test(name)
  );
}

app.post("/api/convert-heic", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "NO_FILE",
        message: "No file uploaded.",
      });
    }

    if (!isHeicFile(req.file)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_FILE_TYPE",
        message: "Only HEIC / HEIF files are accepted by this endpoint.",
      });
    }

    const { buffer: outputBuffer, convertedBy } = await convertHeicBuffer(req.file.buffer);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Converted-By", convertedBy);
    res.send(outputBuffer);
  } catch (error) {
    console.error("HEIC conversion failed:", error.message);
    res.status(422).json({
      ok: false,
      error: "HEIC_CONVERSION_FAILED",
      message: "Unable to convert this HEIC file. It may be ProRAW, HDR, Live Photo, or unsupported Apple HEIC variant.",
    });
  }
});

app.get("/api/photo-cloud/albums", async (req, res) => {
  const db = await readPhotoDb();
  res.json({ ok: true, albums: db.albums, photos: db.photos });
});

app.post("/api/photo-cloud/albums", async (req, res) => {
  const id = normalizeId(req.body?.id) || crypto.randomUUID();
  const name = String(req.body?.name || "Louis Album").trim().slice(0, 80) || "Louis Album";
  const now = new Date().toISOString();
  const db = await readPhotoDb();
  const existing = db.albums.find((album) => album.id === id);
  if (existing) {
    existing.name = name;
    existing.updatedAt = now;
  } else {
    db.albums.push({ id, name, createdAt: now, updatedAt: now });
  }
  await writePhotoDb(db);
  res.json({ ok: true, album: db.albums.find((album) => album.id === id) });
});

app.get("/api/photo-cloud/albums/:albumId/photos", async (req, res) => {
  const albumId = normalizeId(req.params.albumId);
  const db = await readPhotoDb();
  res.json({ ok: true, photos: db.photos.filter((photo) => photo.albumId === albumId) });
});

app.post("/api/photo-cloud/albums/:albumId/photos", photoUpload.single("file"), async (req, res) => {
  try {
    const albumId = normalizeId(req.params.albumId);
    if (!albumId) {
      return res.status(400).json({ ok: false, error: "INVALID_ALBUM", message: "Invalid album id." });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "NO_FILE", message: "No file uploaded." });
    }

    const now = new Date().toISOString();
    const photoId = normalizeId(req.body.photoId) || crypto.randomUUID();
    const displayBuffer = await sharp(req.file.buffer, { limitInputPixels: false })
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    const thumbBuffer = await sharp(displayBuffer, { limitInputPixels: false })
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    const displayName = `${photoId}.jpg`;
    const thumbName = `${photoId}_thumb.jpg`;
    const storageKey = `albums/${albumId}/${displayName}`;
    const thumbnailKey = `albums/${albumId}/${thumbName}`;
    const storedDisplay = await savePhotoObject(storageKey, displayBuffer, "image/jpeg");
    const storedThumb = await savePhotoObject(thumbnailKey, thumbBuffer, "image/jpeg");

    const metadata = safeJson(req.body.metadata, {});
    const dimensions = await sharp(displayBuffer).metadata();
    const db = await readPhotoDb();
    const existingIndex = db.photos.findIndex((photo) => photo.id === photoId);
    const record = {
      id: photoId,
      albumId,
      originalName: String(req.body.originalName || req.file.originalname || "photo.jpg").slice(0, 180),
      outputName: String(req.body.outputName || displayName).slice(0, 180),
      storageProvider: activeStorageProvider,
      storageKey,
      thumbnailKey,
      url: storedDisplay.url,
      thumbnailUrl: storedThumb.url,
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: displayBuffer.length,
      metadata,
      updatedAt: now,
      createdAt: now,
    };
    if (existingIndex >= 0) {
      record.createdAt = db.photos[existingIndex].createdAt || now;
      db.photos[existingIndex] = record;
    } else {
      db.photos.push(record);
    }
    const album = db.albums.find((item) => item.id === albumId);
    if (album) album.updatedAt = now;
    await writePhotoDb(db);
    res.json({ ok: true, photo: record });
  } catch (error) {
    console.error("Photo cloud upload failed:", error.message);
    res.status(422).json({
      ok: false,
      error: "PHOTO_UPLOAD_FAILED",
      message: "Unable to save this photo for cloud album storage.",
    });
  }
});

async function convertHeicBuffer(inputBuffer) {
  try {
    const buffer = await sharp(inputBuffer, { limitInputPixels: false })
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    return { buffer, convertedBy: "sharp" };
  } catch (sharpError) {
    console.warn("Sharp HEIC conversion failed, using heic-convert fallback:", sharpError.message);
    const buffer = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.92,
    });
    return { buffer: Buffer.from(buffer), convertedBy: "heic-convert" };
  }
}

function createR2Client() {
  if (storageProvider !== "r2") return null;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey || !r2Bucket) {
    console.warn("PHOTO_STORAGE_PROVIDER=r2 is set, but R2 env vars are incomplete. Falling back to local storage.");
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function savePhotoObject(key, buffer, contentType) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=2592000, immutable",
    }));
    return {
      key,
      url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${key}` : `/media/photo-cloud/${key}`,
    };
  }

  const target = path.join(photoStorageRoot, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return {
    key,
    url: `/media/photo-cloud/${key}`,
  };
}

async function readPhotoDb() {
  if (activeStorageProvider === "r2") {
    try {
      const response = await r2Client.send(new GetObjectCommand({
        Bucket: r2Bucket,
        Key: r2MetadataKey,
      }));
      const raw = await streamToString(response.Body);
      const parsed = JSON.parse(raw);
      return {
        albums: Array.isArray(parsed.albums) ? parsed.albums : [],
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      };
    } catch (error) {
      const code = error?.name || error?.Code || error?.$metadata?.httpStatusCode;
      if (code !== "NoSuchKey" && code !== 404) console.warn("R2 photo metadata read failed:", error.message);
      return { albums: [], photos: [] };
    }
  }

  await fs.mkdir(photoStorageRoot, { recursive: true });
  try {
    const raw = await fs.readFile(photoMetadataPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      albums: Array.isArray(parsed.albums) ? parsed.albums : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Photo metadata read failed:", error.message);
    return { albums: [], photos: [] };
  }
}

async function writePhotoDb(db) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2MetadataKey,
      Body: `${JSON.stringify(db, null, 2)}\n`,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    }));
    return;
  }

  await fs.mkdir(photoStorageRoot, { recursive: true });
  await fs.writeFile(photoMetadataPath, `${JSON.stringify(db, null, 2)}\n`);
}

async function streamToString(stream) {
  if (!stream) return "";
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

app.use("/media/photo-cloud", express.static(photoStorageRoot, {
  immutable: true,
  maxAge: "30d",
}));

app.use(express.static(root, {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      ok: false,
      error: "FILE_TOO_LARGE",
      message: "This upload exceeds the current file size limit.",
    });
  }
  return next(error);
});

app.use((req, res) => {
  res.status(404).type("text/plain; charset=utf-8").send("Not found");
});

app.listen(port, () => {
  console.log(`louisko.com listening on ${port}`);
});
