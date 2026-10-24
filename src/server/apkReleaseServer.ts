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

export type ApkReleaseMode = 'android_webapk' | 'external_url' | 'uploaded_file';

export interface ApkReleaseConfig {
  mode: ApkReleaseMode;
  externalUrl: string;
  normalizedDownloadUrl: string;
  iosAppStoreUrl: string;
  version: string;
  fileSizeLabel: string;
  fileName: string;
  originalUploadedName?: string;
  releaseNotes: string;
  updatedAt: number;
  lastResetAt?: number;
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
 * Converts common cloud sharing URLs (like Google Drive, Dropbox, GitHub blob) into direct download URLs
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

    // 3. GitHub blob URL -> raw URL
    if (parsed.hostname === 'github.com' && parsed.pathname.includes('/blob/')) {
      return `${trimmed}${trimmed.includes('?') ? '&' : '?'}raw=true`;
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

function deleteAllStoredApkFiles(): { deletedFiles: string[] } {
  const deletedFiles: string[] = [];
  for (const filePath of [UPLOADED_APK_PATH, PUBLIC_APK_PATH, APK_CONFIG_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedFiles.push(path.basename(filePath));
      }
    } catch (err) {
      console.warn('Failed to delete APK artifact:', filePath, err);
    }
  }
  return { deletedFiles };
}

function buildDefaultApkConfig(lastResetAt?: number): ApkReleaseConfig {
  const activeFile = getActiveApkFilePath();
  const now = Date.now();
  return {
    mode: activeFile.isValid ? 'uploaded_file' : 'android_webapk',
    externalUrl: '',
    normalizedDownloadUrl: '',
    iosAppStoreUrl: '',
    version: '2.5.0',
    fileSizeLabel: activeFile.isValid ? formatBytesLabel(activeFile.sizeBytes) : '18.4 MB',
    fileName: 'tidikelt-ai-release.apk',
    originalUploadedName: '',
    releaseNotes:
      'النسخة الرسمية لمنصة تيديكلت AI على أندرويد — دعم المحادثة الذكية، كاش بلاصة معك (Kash Bilasa)، ومستجدات عين صالح.',
    updatedAt: now,
    lastResetAt: lastResetAt || now,
    hasCustomUploadedApk: activeFile.isValid,
    uploadedFileSizeBytes: activeFile.sizeBytes,
  };
}

function loadApkConfig(): ApkReleaseConfig {
  ensureDirectories();
  const activeFile = getActiveApkFilePath();
  const defaultConfig = buildDefaultApkConfig();

  try {
    if (fs.existsSync(APK_CONFIG_FILE)) {
      const raw = fs.readFileSync(APK_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const externalUrl = typeof parsed.externalUrl === 'string' ? parsed.externalUrl.trim() : '';
      const normalizedDownloadUrl = normalizeDirectDownloadUrl(externalUrl);

      let resolvedMode: ApkReleaseMode = defaultConfig.mode;
      if (
        parsed.mode === 'uploaded_file' ||
        parsed.mode === 'external_url' ||
        parsed.mode === 'android_webapk'
      ) {
        resolvedMode = parsed.mode;
      }

      // If config says uploaded_file but the file was deleted, automatically fall back cleanly
      if (resolvedMode === 'uploaded_file' && !activeFile.isValid) {
        resolvedMode = normalizedDownloadUrl ? 'external_url' : 'android_webapk';
      }

      return {
        mode: resolvedMode,
        externalUrl,
        normalizedDownloadUrl,
        iosAppStoreUrl: typeof parsed.iosAppStoreUrl === 'string' ? parsed.iosAppStoreUrl.trim() : '',
        version:
          typeof parsed.version === 'string' && parsed.version.trim()
            ? parsed.version.trim()
            : defaultConfig.version,
        fileSizeLabel:
          resolvedMode === 'uploaded_file' && activeFile.isValid
            ? formatBytesLabel(activeFile.sizeBytes)
            : typeof parsed.fileSizeLabel === 'string' && parsed.fileSizeLabel.trim()
            ? parsed.fileSizeLabel.trim()
            : defaultConfig.fileSizeLabel,
        fileName:
          typeof parsed.fileName === 'string' && parsed.fileName.trim().endsWith('.apk')
            ? parsed.fileName.trim()
            : 'tidikelt-ai-release.apk',
        originalUploadedName:
          typeof parsed.originalUploadedName === 'string' ? parsed.originalUploadedName : '',
        releaseNotes:
          typeof parsed.releaseNotes === 'string' && parsed.releaseNotes.trim()
            ? parsed.releaseNotes.trim()
            : defaultConfig.releaseNotes,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : defaultConfig.updatedAt,
        lastResetAt: typeof parsed.lastResetAt === 'number' ? parsed.lastResetAt : undefined,
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

  const targetMode: ApkReleaseMode =
    config.mode === 'uploaded_file' ||
    config.mode === 'external_url' ||
    config.mode === 'android_webapk'
      ? config.mode
      : current.mode;

  const updated: ApkReleaseConfig = {
    ...current,
    ...config,
    mode: targetMode,
    externalUrl,
    normalizedDownloadUrl,
    hasCustomUploadedApk: activeFile.isValid,
    uploadedFileSizeBytes: activeFile.sizeBytes,
    fileSizeLabel:
      targetMode === 'uploaded_file' && activeFile.isValid
        ? formatBytesLabel(activeFile.sizeBytes)
        : (config.fileSizeLabel || current.fileSizeLabel || '18.4 MB').trim(),
    fileName:
      typeof config.fileName === 'string' && config.fileName.trim().endsWith('.apk')
        ? config.fileName.trim()
        : current.fileName || 'tidikelt-ai-release.apk',
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

  // Remove any corrupt/small file if it exists so it never corrupts downloads
  try {
    for (const candidate of [PUBLIC_APK_PATH, UPLOADED_APK_PATH]) {
      if (fs.existsSync(candidate)) {
        const check = inspectApkFile(candidate);
        if (!check.isValid) {
          fs.unlinkSync(candidate);
        }
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
      const requestedMode: ApkReleaseMode =
        body.mode === 'uploaded_file'
          ? 'uploaded_file'
          : body.mode === 'external_url'
          ? 'external_url'
          : 'android_webapk';

      const updated = saveApkConfig({
        mode: requestedMode,
        externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl : undefined,
        iosAppStoreUrl: typeof body.iosAppStoreUrl === 'string' ? body.iosAppStoreUrl : undefined,
        version: typeof body.version === 'string' ? body.version : undefined,
        fileSizeLabel: typeof body.fileSizeLabel === 'string' ? body.fileSizeLabel : undefined,
        fileName: typeof body.fileName === 'string' ? body.fileName : 'tidikelt-ai-release.apk',
        releaseNotes: typeof body.releaseNotes === 'string' ? body.releaseNotes : undefined,
      });
      return res.json({ ok: true, config: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'فشل حفظ إعدادات ملف APK.' });
    }
  });

  // 3. Delete old APK files & Reset configuration from scratch on Android
  const handleResetApk = (req: Request, res: Response) => {
    try {
      const { deletedFiles } = deleteAllStoredApkFiles();
      const body = req.body || {};
      const now = Date.now();

      const freshDefault = buildDefaultApkConfig(now);
      const reassignedConfig = saveApkConfig({
        ...freshDefault,
        mode:
          body.mode === 'external_url' && body.externalUrl
            ? 'external_url'
            : 'android_webapk',
        externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl.trim() : '',
        version: typeof body.version === 'string' && body.version.trim() ? body.version.trim() : '2.5.0',
        fileName: 'tidikelt-ai-release.apk',
        originalUploadedName: '',
        fileSizeLabel: '18.4 MB',
        lastResetAt: now,
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        deletedFiles,
        message:
          'تم حذف ملف APK القديم وإعادة ضبط وتعيين حزمة تيديكلت AI للأندرويد من جديد بنجاح.',
        config: reassignedConfig,
      });
    } catch (err: any) {
      console.error('APK reset error:', err);
      return res.status(500).json({
        error: err?.message || 'حدث خطأ أثناء حذف وإعادة ضبط ملف APK.',
      });
    }
  };

  app.post('/api/apk/reset', handleResetApk);
  app.delete('/api/apk/reset', handleResetApk);

  // 4. Upload and assign a new binary .apk file directly from Android / PC
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

        // First wipe any previous APK files before writing the newly assigned one
        try {
          if (fs.existsSync(UPLOADED_APK_PATH)) fs.unlinkSync(UPLOADED_APK_PATH);
          if (fs.existsSync(PUBLIC_APK_PATH)) fs.unlinkSync(PUBLIC_APK_PATH);
        } catch {}

        ensureDirectories();
        fs.writeFileSync(UPLOADED_APK_PATH, buffer);
        try {
          fs.writeFileSync(PUBLIC_APK_PATH, buffer);
        } catch {}

        const rawHeaderName =
          typeof req.headers['x-apk-filename'] === 'string'
            ? decodeURIComponent(req.headers['x-apk-filename'])
            : 'tidikelt-ai-release.apk';
        const keepOfficialFileName = req.headers['x-apk-keep-official-name'] !== 'false';
        const requestedVersion =
          typeof req.headers['x-apk-version'] === 'string'
            ? decodeURIComponent(req.headers['x-apk-version'])
            : undefined;

        const assignedFileName = keepOfficialFileName
          ? 'tidikelt-ai-release.apk'
          : rawHeaderName.endsWith('.apk')
          ? rawHeaderName
          : 'tidikelt-ai-release.apk';

        const updated = saveApkConfig({
          mode: 'uploaded_file',
          fileName: assignedFileName,
          originalUploadedName: rawHeaderName,
          version: requestedVersion || undefined,
          fileSizeLabel: formatBytesLabel(buffer.length),
        });

        return res.json({
          ok: true,
          message: `تم حذف النسخة السابقة وتعيين حزمة APK الجديدة (${formatBytesLabel(buffer.length)}) بنجاح باسم ${assignedFileName}.`,
          config: updated,
        });
      } catch (err: any) {
        console.error('APK upload error:', err);
        return res.status(500).json({
          error: err?.message || 'حدث خطأ أثناء حفظ وتعيين ملف APK على الخادم.',
        });
      }
    }
  );

  // 5. Unified APK download handler (supports both /api/apk/download and /downloads/tidikelt-ai-release.apk)
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
      return streamApkFileWithRange(req, res, activeFile.path, config.fileName || 'tidikelt-ai-release.apk');
    }

    // Priority 3: Fallback if externalUrl exists even if mode was set to uploaded_file
    if (config.normalizedDownloadUrl) {
      return res.redirect(302, config.normalizedDownloadUrl);
    }

    // If neither external URL nor uploaded APK is configured, return clear JSON status
    return res.status(404).json({
      error: 'APK_NOT_CONFIGURED',
      mode: config.mode,
      message:
        'تمت إعادة ضبط ملف APK بنجاح. يمكنك الآن تعيين ملف APK جديد من جهازك أو التثبيت الفوري المباشر على أندرويد.',
    });
  };

  app.get('/api/apk/download', handleApkDownload);
  app.get('/downloads/tidikelt-ai-release.apk', handleApkDownload);
}
