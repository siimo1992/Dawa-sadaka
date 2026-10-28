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
    if (!stat.isFile() || stat.size < 50 * 1024) {
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

const PUBLIC_DESKTOP_SHORTCUT_PATH = path.join(PUBLIC_DOWNLOADS_DIR, 'Tidikelt-AI.url');
const LEGACY_LIGHT_APP_PATH = path.join(PUBLIC_DOWNLOADS_DIR, 'tidikelt-ai-app.html');

const DEFAULT_PUBLIC_ORIGIN = 'https://ais-pre-3yvhw5ixhaot3axrf2lz5b-862365813506.europe-west2.run.app';

/**
 * Generates a standard Desktop Shortcut (.url) file for Windows / Desktop browsers
 * that opens the FULL Tidikelt AI platform directly with 1 click.
 */
export function buildDesktopShortcutFileContent(originUrl = ''): string {
  const safeOrigin = (originUrl || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const fullAppUrl = `${safeOrigin}/?install=1`;
  const iconUrl = `${safeOrigin}/icon-512.png`;
  return [
    '[InternetShortcut]',
    `URL=${fullAppUrl}`,
    `IconFile=${iconUrl}`,
    'IconIndex=0',
    'HotKey=0',
    'IDList=',
    '',
  ].join('\r\n');
}

/**
 * Generates a 1-click direct launcher & Home Screen installer for the FULL Tidikelt AI application
 * (NOT a mini or lightweight app). Automatically redirects to the full application in Chrome / system browser
 * with ?install=1 so the full app is installed directly onto the Home Screen or Desktop.
 */
export function buildDirectFullAppLauncherHtml(originUrl = '', version = '2.5.0'): string {
  const safeOrigin = (originUrl || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const installTargetUrl = `${safeOrigin}/?install=1`;
  const hostNoProto = safeOrigin.replace(/^https?:\/\//, '');
  const chromeIntentUrl = `intent://${hostNoProto}/?install=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(installTargetUrl)};end`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta http-equiv="refresh" content="0;url=${installTargetUrl}" />
  <meta name="theme-color" content="#065f46" />
  <title>تيديكلت AI — مشغل وتثبيت التطبيق الكامل</title>
  <link rel="icon" type="image/png" href="${safeOrigin}/icon-192.png" />
  <link rel="apple-touch-icon" href="${safeOrigin}/apple-touch-icon.png" />
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Cairo', sans-serif; }
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #071115;
      color: #f8fafc;
      padding: 20px;
      text-align: center;
    }
    .card {
      max-width: 420px;
      width: 100%;
      background: #101c22;
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 24px;
      padding: 28px 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #059669, #047857);
      font-size: 32px;
      font-weight: 900;
      color: #fff;
      box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4);
    }
    h1 { margin: 0 0 8px; font-size: 20px; font-weight: 800; }
    p { margin: 0 0 20px; font-size: 13px; color: #94a3b8; line-height: 1.65; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 18px;
      border-radius: 14px;
      background: #059669;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">ت</div>
    <h1>تيديكلت AI (v${version})</h1>
    <p>جاري فتح وتثبيت التطبيق الكامل مباشرة على جهازك...</p>
    <a id="launchFullAppBtn" href="${installTargetUrl}" class="btn">
      فتح وتثبيت التطبيق الكامل الآن
    </a>
  </div>
  <script>
    (function() {
      var ua = navigator.userAgent.toLowerCase();
      var isAndroid = ua.indexOf('android') > -1;
      var targetUrl = ${JSON.stringify(installTargetUrl)};
      var intentUrl = ${JSON.stringify(chromeIntentUrl)};
      var btn = document.getElementById('launchFullAppBtn');
      if (isAndroid && (location.protocol === 'file:' || location.protocol === 'content:')) {
        if (btn) btn.href = intentUrl;
        window.location.replace(intentUrl);
      } else {
        window.location.replace(targetUrl);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Periodic self-healing verifier for APK & Direct Desktop/Home-Screen Shortcut readiness.
 * Cleans up any corrupted (<50KB or invalid header) APK files and legacy mini-app files,
 * and ensures the direct desktop shortcut is always ready on disk.
 */
export function verifyAndRepairApkRelease(): {
  ok: boolean;
  repaired: boolean;
  mode: ApkReleaseMode;
  fileName: string;
  fileSizeLabel: string;
  hasValidBinaryOnDisk: boolean;
} {
  ensureDirectories();
  let repaired = false;

  // Clean up any corrupted or dummy (<50KB) APK files on disk so Android never shows "Package Parse Error"
  for (const candidate of [PUBLIC_APK_PATH, UPLOADED_APK_PATH]) {
    try {
      if (fs.existsSync(candidate)) {
        const check = inspectApkFile(candidate);
        if (!check.isValid) {
          fs.unlinkSync(candidate);
          repaired = true;
        }
      }
    } catch {}
  }

  // Remove legacy lightweight mini-app file if present
  try {
    if (fs.existsSync(LEGACY_LIGHT_APP_PATH)) {
      fs.unlinkSync(LEGACY_LIGHT_APP_PATH);
      repaired = true;
    }
  } catch {}

  const config = loadApkConfig();
  const activeFile = getActiveApkFilePath();

  // Always ensure the direct Desktop Shortcut (.url) exists in public/downloads/Tidikelt-AI.url
  try {
    const shortcutContent = buildDesktopShortcutFileContent('');
    if (!fs.existsSync(PUBLIC_DESKTOP_SHORTCUT_PATH)) {
      fs.writeFileSync(PUBLIC_DESKTOP_SHORTCUT_PATH, shortcutContent, 'utf-8');
      repaired = true;
    }
  } catch {}

  return {
    ok: true,
    repaired,
    mode: config.mode,
    fileName: activeFile.isValid ? config.fileName || 'tidikelt-ai-release.apk' : 'Tidikelt-AI.url',
    fileSizeLabel: activeFile.isValid ? config.fileSizeLabel || '18.4 MB' : 'تثبيت مباشر للتطبيق الكامل',
    hasValidBinaryOnDisk: activeFile.isValid,
  };
}

export function registerApkReleaseRoutes(app: Express) {
  verifyAndRepairApkRelease();

  const resolveOriginUrl = (req: Request): string => {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    return host ? `${proto}://${host}` : DEFAULT_PUBLIC_ORIGIN;
  };

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

      verifyAndRepairApkRelease();

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

  // 5. Direct PC Desktop Shortcut endpoint (.url file that opens the FULL app in 1 click on Windows/PC)
  const handleDesktopShortcutDownload = (req: Request, res: Response) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    // Mobile phones (Android/iOS) cannot open .url files and show "يتعذر فتح الملف".
    // Redirect mobile devices directly to the full application with ?install=1
    if (isMobile) {
      return res.redirect(302, '/?install=1');
    }

    const originUrl = resolveOriginUrl(req);
    const shortcutPayload = Buffer.from(buildDesktopShortcutFileContent(originUrl), 'utf-8');

    res.setHeader('Content-Type', 'application/internet-shortcut; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Tidikelt-AI.url"; filename*=UTF-8''%D8%AA%D9%8A%D8%AF%D9%8A%D9%83%D9%84%D8%AA-AI.url`
    );
    res.setHeader('Content-Length', String(shortcutPayload.length));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(shortcutPayload);
  };

  app.get('/api/apk/desktop-shortcut', handleDesktopShortcutDownload);
  app.get('/downloads/Tidikelt-AI.url', handleDesktopShortcutDownload);

  // 6. Unified Full-App Download / Shortcut / APK handler
  const handleApkDownload = (req: Request, res: Response) => {
    const config = loadApkConfig();
    const forceLocal = req.query.source === 'local';
    const format = typeof req.query.format === 'string' ? req.query.format : '';

    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    if (format === 'shortcut' || format === 'url') {
      if (isMobile) {
        return res.redirect(302, '/?install=1');
      }
      return handleDesktopShortcutDownload(req, res);
    }

    // Priority 1: If mode is external_url and a valid URL is configured
    if (!forceLocal && config.mode === 'external_url' && config.normalizedDownloadUrl) {
      return res.redirect(302, config.normalizedDownloadUrl);
    }

    // Priority 2: If a valid binary APK file exists on disk, stream it with full headers & byte ranges
    const activeFile = getActiveApkFilePath();
    if (activeFile.isValid && activeFile.path) {
      return streamApkFileWithRange(req, res, activeFile.path, config.fileName || 'tidikelt-ai-release.apk');
    }

    // Priority 3: Fallback if externalUrl exists even if mode was set to uploaded_file
    if (config.normalizedDownloadUrl) {
      return res.redirect(302, config.normalizedDownloadUrl);
    }

    // Priority 4: If accessed from a Desktop computer (PC / Mac), download the 1-click Desktop Shortcut
    if (!isMobile && format !== 'launcher') {
      return handleDesktopShortcutDownload(req, res);
    }

    // Priority 5: On Mobile devices when no custom APK is uploaded:
    // CRITICAL: DO NOT serve an attachment file that drops into Downloads and produces "يتعذر فتح الملف".
    // Redirect directly (302) to the full web application with ?install=1 so Chrome / browser
    // natively prompts the user to install the genuine application to the Home Screen!
    return res.redirect(302, '/?install=1');
  };

  app.get('/api/apk/download', handleApkDownload);
  app.get('/downloads/tidikelt-ai-release.apk', handleApkDownload);
  app.get('/downloads/tidikelt-ai-app.html', (_req: Request, res: Response) => {
    return res.redirect(302, '/?install=1');
  });
  app.get('/install', (_req: Request, res: Response) => {
    return res.redirect(302, '/?install=1');
  });
}
