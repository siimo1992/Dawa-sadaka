import express from 'express';
import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DOWNLOADS_DIR = path.join(ROOT_DIR, 'public', 'downloads');

const APK_CONFIG_FILE = path.join(DATA_DIR, 'apk_release_config.json');
const UPLOADED_APK_PATH = path.join(DATA_DIR, 'tidikelt-ai-release.apk');
const PUBLIC_APK_PATH = path.join(PUBLIC_DOWNLOADS_DIR, 'tidikelt-ai-release.apk');

export interface ApkReleaseConfig {
  mode: 'external_url' | 'uploaded_file';
  externalUrl: string;
  normalizedDownloadUrl: string;
  iosAppStoreUrl: string;
  version: string;
  fileSizeLabel: string;
  fileName: string;
  releaseNotes: string;
  updatedAt: number;
  hasCustomUploadedApk: boolean;
  uploadedFileSizeBytes: number;
}

function ensureDirectories() {
  for (const dir of [DATA_DIR, PUBLIC_DOWNLOADS_DIR]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error('Failed to create directory:', dir, err);
      }
    }
  }
}

/**
 * Converts common cloud sharing URLs (like Google Drive or Dropbox) into direct download URLs
 */
export function normalizeDirectDownloadUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);

    // 1. Google Drive: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    if (parsed.hostname.includes('drive.google.com')) {
      const fileIdMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const queryId = parsed.searchParams.get('id');
      const fileId = fileIdMatch ? fileIdMatch[1] : queryId;
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
      }
    }

    // 2. Dropbox: ?dl=0 -> ?dl=1
    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('dl', '1');
      return parsed.toString();
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Checks if a file on disk is a genuine binary ZIP/APK archive (starts with PK\x03\x04 and > 1 KB)
 */
function inspectApkFile(filePath: string): { isValid: boolean; sizeBytes: number } {
  try {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, sizeBytes: 0 };
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 1024) {
      return { isValid: false, sizeBytes: stat.size };
    }
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);

    // Standard APK / JAR / ZIP magic bytes: 0x50 0x4B 0x03 0x04 ("PK\x03\x04")
    const isPkZip =
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x03 &&
      header[3] === 0x04;

    return {
      isValid: isPkZip,
      sizeBytes: stat.size,
    };
  } catch {
    return { isValid: false, sizeBytes: 0 };
  }
}

export function formatBytesLabel(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getActiveApkFilePath(): { path: string | null; isValid: boolean; sizeBytes: number } {
  const uploadedCheck = inspectApkFile(UPLOADED_APK_PATH);
  if (uploadedCheck.isValid) {
    return { path: UPLOADED_APK_PATH, isValid: true, sizeBytes: uploadedCheck.sizeBytes };
  }

  const publicCheck = inspectApkFile(PUBLIC_APK_PATH);
  if (publicCheck.isValid) {
    return { path: PUBLIC_APK_PATH, isValid: true, sizeBytes: publicCheck.sizeBytes };
  }

  return { path: null, isValid: false, sizeBytes: 0 };
}

function loadApkConfig(): ApkReleaseConfig {
  ensureDirectories();
  const activeFile = getActiveApkFilePath();

  const defaultConfig: ApkReleaseConfig = {
    mode: activeFile.isValid ? 'uploaded_file' : 'external_url',
    externalUrl: '',
    normalizedDownloadUrl: '',
    iosAppStoreUrl: '',
    version: '2.5.0',
    fileSizeLabel: activeFile.isValid ? formatBytesLabel(activeFile.sizeBytes) : '18.4 MB',
    fileName: 'tidikelt-ai-release.apk',
    releaseNotes: 'النسخة الرسمية لمنصة تيديكلت AI — دعم الدردشة الذكية، رفيق الطريق، ومحليات عين صالح.',
    updatedAt: Date.now(),
    hasCustomUploadedApk: activeFile.isValid,
    uploadedFileSizeBytes: activeFile.sizeBytes,
  };

  try {
    if (fs.existsSync(APK_CONFIG_FILE)) {
      const raw = fs.readFileSync(APK_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const externalUrl = typeof parsed.externalUrl === 'string' ? parsed.externalUrl.trim() : '';
      const normalizedDownloadUrl = normalizeDirectDownloadUrl(externalUrl);

      return {
        mode:
          parsed.mode === 'uploaded_file' || parsed.mode === 'external_url'
            ? parsed.mode
            : defaultConfig.mode,
        externalUrl,
        normalizedDownloadUrl,
        iosAppStoreUrl: typeof parsed.iosAppStoreUrl === 'string' ? parsed.iosAppStoreUrl.trim() : '',
        version: typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version.trim() : defaultConfig.version,
        fileSizeLabel:
          parsed.mode === 'uploaded_file' && activeFile.isValid
            ? formatBytesLabel(activeFile.sizeBytes)
            : typeof parsed.fileSizeLabel === 'string' && parsed.fileSizeLabel.trim()
            ? parsed.fileSizeLabel.trim()
            : defaultConfig.fileSizeLabel,
        fileName:
          typeof parsed.fileName === 'string' && parsed.fileName.trim().endsWith('.apk')
            ? parsed.fileName.trim()
            : 'tidikelt-ai-release.apk',
        releaseNotes:
          typeof parsed.releaseNotes === 'string' && parsed.releaseNotes.trim()
            ? parsed.releaseNotes.trim()
            : defaultConfig.releaseNotes,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : defaultConfig.updatedAt,
        hasCustomUploadedApk: activeFile.isValid,
        uploadedFileSizeBytes: activeFile.sizeBytes,
      };
    }
  } catch (err) {
    console.warn('Failed to read apk_release_config.json:', err);
  }

  return defaultConfig;
}

function saveApkConfig(config: Partial<ApkReleaseConfig>): ApkReleaseConfig {
  ensureDirectories();
  const current = loadApkConfig();
  const externalUrl =
    typeof config.externalUrl === 'string' ? config.externalUrl.trim() : current.externalUrl;
  const normalizedDownloadUrl = normalizeDirectDownloadUrl(externalUrl);
  const activeFile = getActiveApkFilePath();

  const updated: ApkReleaseConfig = {
    ...current,
    ...config,
    externalUrl,
    normalizedDownloadUrl,
    hasCustomUploadedApk: activeFile.isValid,
    uploadedFileSizeBytes: activeFile.sizeBytes,
    fileSizeLabel:
      (config.mode || current.mode) === 'uploaded_file' && activeFile.isValid
        ? formatBytesLabel(activeFile.sizeBytes)
        : (config.fileSizeLabel || current.fileSizeLabel).trim(),
    updatedAt: Date.now(),
  };

  try {
    fs.writeFileSync(APK_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save apk_release_config.json:', err);
  }

  return updated;
}

function streamApkFileWithRange(req: Request, res: Response, filePath: string, downloadFileName: string) {
  const stat = fs.statSync(filePath);
  const totalSize = stat.size;
  const safeFileName = (downloadFileName || 'tidikelt-ai-release.apk').replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || isNaN(end) || start >= totalSize || end >= totalSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', String(chunkSize));

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', (err) => {
      console.error('Error streaming APK range:', err);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } else {
    res.status(200);
    res.setHeader('Content-Length', String(totalSize));

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Error streaming full APK:', err);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  }
}

export function registerApkReleaseRoutes(app: Express) {
  ensureDirectories();

  // Remove the old 41-byte dummy text file if it exists so it never corrupts downloads
  try {
    if (fs.existsSync(PUBLIC_APK_PATH)) {
      const check = inspectApkFile(PUBLIC_APK_PATH);
      if (!check.isValid && check.sizeBytes < 512) {
        fs.unlinkSync(PUBLIC_APK_PATH);
      }
    }
  } catch {}

  // 1. Get current APK release configuration & status
  app.get('/api/apk/info', (_req: Request, res: Response) => {
    const config = loadApkConfig();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(config);
  });

  // 2. Update APK release configuration (Owner / Admin)
  app.post('/api/apk/config', (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const updated = saveApkConfig({
        mode: body.mode === 'uploaded_file' ? 'uploaded_file' : 'external_url',
        externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl : undefined,
        iosAppStoreUrl: typeof body.iosAppStoreUrl === 'string' ? body.iosAppStoreUrl : undefined,
        version: typeof body.version === 'string' ? body.version : undefined,
        fileSizeLabel: typeof body.fileSizeLabel === 'string' ? body.fileSizeLabel : undefined,
        fileName: typeof body.fileName === 'string' ? body.fileName : undefined,
        releaseNotes: typeof body.releaseNotes === 'string' ? body.releaseNotes : undefined,
      });
      return res.json({ ok: true, config: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'فشل حفظ إعدادات ملف APK.' });
    }
  });

  // 3. Upload a real binary .apk file directly from Owner / Admin panel
  app.post(
    '/api/apk/upload',
    express.raw({ type: '*/*', limit: '250mb' }),
    (req: Request, res: Response) => {
      try {
        const buffer = req.body as Buffer;
        if (!Buffer.isBuffer(buffer) || buffer.length < 1024) {
          return res.status(400).json({
            error: 'الملف المرفوع فارغ أو صغير جداً ولا يمثل حزمة أندرويد APK صالحة.',
          });
        }

        // Verify ZIP / APK magic header ("PK\x03\x04")
        const isPkHeader =
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04;

        if (!isPkHeader) {
          return res.status(400).json({
            error: 'الملف المرفوع ليس حزمة APK أندرويد صالحة (ترويسة الحزمة غير مطابقة لـ APK/ZIP).',
          });
        }

        ensureDirectories();
        fs.writeFileSync(UPLOADED_APK_PATH, buffer);
        try {
          fs.writeFileSync(PUBLIC_APK_PATH, buffer);
        } catch {}

        const requestedFileName =
          typeof req.headers['x-apk-filename'] === 'string'
            ? decodeURIComponent(req.headers['x-apk-filename'])
            : 'tidikelt-ai-release.apk';
        const requestedVersion =
          typeof req.headers['x-apk-version'] === 'string'
            ? decodeURIComponent(req.headers['x-apk-version'])
            : undefined;

        const updated = saveApkConfig({
          mode: 'uploaded_file',
          fileName: requestedFileName.endsWith('.apk')
            ? requestedFileName
            : 'tidikelt-ai-release.apk',
          version: requestedVersion || undefined,
          fileSizeLabel: formatBytesLabel(buffer.length),
        });

        return res.json({
          ok: true,
          message: `تم رفع واعتماد حزمة APK بنجاح (${formatBytesLabel(buffer.length)}).`,
          config: updated,
        });
      } catch (err: any) {
        console.error('APK upload error:', err);
        return res.status(500).json({
          error: err?.message || 'حدث خطأ أثناء حفظ ملف APK على الخادم.',
        });
      }
    }
  );

  // 4. Unified APK download handler (supports both /api/apk/download and /downloads/tidikelt-ai-release.apk)
  const handleApkDownload = (req: Request, res: Response) => {
    const config = loadApkConfig();
    const forceLocal = req.query.source === 'local';

    // Priority 1: If mode is external_url and a valid URL is configured
    if (!forceLocal && config.mode === 'external_url' && config.normalizedDownloadUrl) {
      return res.redirect(302, config.normalizedDownloadUrl);
    }

    // Priority 2: If a valid uploaded APK file exists on disk, stream it with full headers & byte ranges
    const activeFile = getActiveApkFilePath();
    if (activeFile.isValid && activeFile.path) {
      return streamApkFileWithRange(req, res, activeFile.path, config.fileName);
    }

    // Priority 3: Fallback if externalUrl exists even if mode was set to uploaded_file
    if (config.normalizedDownloadUrl) {
      return res.redirect(302, config.normalizedDownloadUrl);
    }

    // If neither external URL nor uploaded APK is configured yet, return clear JSON/HTML status instead of a corrupt 41-byte APK
    return res.status(404).json({
      error: 'APK_NOT_CONFIGURED',
      message:
        'لم يتم ربط ملف APK النهائي بعد. يرجى من المالك إضافة رابط التحميل المباشر أو رفع ملف APK من نافذة إعدادات التحميل، أو استخدام التثبيت الفوري المباشر (PWA).',
    });
  };

  app.get('/api/apk/download', handleApkDownload);
  app.get('/downloads/tidikelt-ai-release.apk', handleApkDownload);
}
