import React, { useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  Apple,
  Download,
  Share2,
  PlusSquare,
  Settings,
  Link2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  Sparkles,
  ArrowRight,
  FileArchive,
} from 'lucide-react';
import { usePWAInstall } from '../lib/api';

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

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn?: boolean;
  openInOwnerMode?: boolean;
}

function previewNormalizedUrl(rawUrl: string): { url: string; isGoogleDrive: boolean; isDropbox: boolean } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return { url: '', isGoogleDrive: false, isDropbox: false };
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('drive.google.com')) {
      const fileIdMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const queryId = parsed.searchParams.get('id');
      const fileId = fileIdMatch ? fileIdMatch[1] : queryId;
      if (fileId) {
        return {
          url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`,
          isGoogleDrive: true,
          isDropbox: false,
        };
      }
    }
    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('dl', '1');
      return {
        url: parsed.toString(),
        isGoogleDrive: false,
        isDropbox: true,
      };
    }
    return { url: trimmed, isGoogleDrive: false, isDropbox: false };
  } catch {
    return { url: trimmed, isGoogleDrive: false, isDropbox: false };
  }
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  isAdminLoggedIn = false,
  openInOwnerMode = false,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, install: installPWA } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'download' | 'owner'>('download');
  const [config, setConfig] = useState<ApkReleaseConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);

  // Download progress & status state for visitor
  const [isDownloadingApk, setIsDownloadingApk] = useState<boolean>(false);
  const [downloadProgressPct, setDownloadProgressPct] = useState<number | null>(null);
  const [downloadStatusMsg, setDownloadStatusMsg] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Owner form state
  const [formMode, setFormMode] = useState<'external_url' | 'uploaded_file'>('external_url');
  const [formExternalUrl, setFormExternalUrl] = useState<string>('');
  const [formIosUrl, setFormIosUrl] = useState<string>('');
  const [formVersion, setFormVersion] = useState<string>('2.5.0');
  const [formSizeLabel, setFormSizeLabel] = useState<string>('18.4 MB');
  const [formFileName, setFormFileName] = useState<string>('tidikelt-ai-release.apk');
  const [formReleaseNotes, setFormReleaseNotes] = useState<string>('');

  // Upload state for owner
  const [isUploadingApk, setIsUploadingApk] = useState<boolean>(false);
  const [uploadProgressPct, setUploadProgressPct] = useState<number>(0);
  const [ownerSaveFeedback, setOwnerSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  const fetchApkInfo = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/apk/info', { cache: 'no-store' });
      if (res.ok) {
        const data: ApkReleaseConfig = await res.json();
        setConfig(data);
        setFormMode(data.mode);
        setFormExternalUrl(data.externalUrl || '');
        setFormIosUrl(data.iosAppStoreUrl || '');
        setFormVersion(data.version || '2.5.0');
        setFormSizeLabel(data.fileSizeLabel || '18.4 MB');
        setFormFileName(data.fileName || 'tidikelt-ai-release.apk');
        setFormReleaseNotes(data.releaseNotes || '');
      }
    } catch (err) {
      console.warn('Failed to fetch APK info:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setDownloadStatusMsg(null);
      setOwnerSaveFeedback(null);
      setActiveTab(openInOwnerMode ? 'owner' : 'download');
      fetchApkInfo();
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, openInOwnerMode]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  // Determines if a ready APK source exists (either external URL or uploaded valid APK)
  const isExternalReady = Boolean(
    config &&
      config.mode === 'external_url' &&
      config.normalizedDownloadUrl &&
      config.normalizedDownloadUrl.trim().length > 0
  );
  const isUploadedReady = Boolean(
    config && config.mode === 'uploaded_file' && config.hasCustomUploadedApk
  );
  const hasFallbackExternal = Boolean(
    config && config.normalizedDownloadUrl && config.normalizedDownloadUrl.trim().length > 0
  );
  const hasAnyValidApkSource = isExternalReady || isUploadedReady || hasFallbackExternal || Boolean(config?.hasCustomUploadedApk);

  const activeDirectUrl =
    isExternalReady && config
      ? config.normalizedDownloadUrl
      : isUploadedReady
      ? '/api/apk/download?source=local'
      : hasFallbackExternal && config
      ? config.normalizedDownloadUrl
      : config?.hasCustomUploadedApk
      ? '/api/apk/download?source=local'
      : '';

  const handleDownloadAndroidApk = async (e: React.MouseEvent) => {
    setDownloadStatusMsg(null);

    if (!hasAnyValidApkSource || !config) {
      e.preventDefault();
      setDownloadStatusMsg({
        type: 'error',
        text: 'لم يقم المالك برفع ملف APK أو ربط الرابط الخارجي المباشر بعد. يمكنك التثبيت الفوري المباشر عبر الزر أدناه أو إعداد الرابط من لوحة المالك.',
      });
      return;
    }

    // Case 1: External Direct Link (Google Drive / GitHub / Direct server)
    if ((config.mode === 'external_url' && config.normalizedDownloadUrl) || (!config.hasCustomUploadedApk && config.normalizedDownloadUrl)) {
      // Let the anchor tag open the external direct URL naturally, and display helpful status
      setDownloadStatusMsg({
        type: 'success',
        text: 'جاري بدء التحميل المباشر من الرابط المعتمد... إذا لم يبدأ تلقائياً، اضغط على زر «فتح الرابط المباشر» أدناه.',
      });
      return;
    }

    // Case 2: Uploaded APK on our server — stream with progress verification so it downloads 100% intact
    e.preventDefault();
    if (isDownloadingApk) return;

    setIsDownloadingApk(true);
    setDownloadProgressPct(0);
    setDownloadStatusMsg({
      type: 'info',
      text: 'جاري تنزيل حزمة APK والتحقق من اكتمال الملف 100%...',
    });

    try {
      const response = await fetch('/api/apk/download?source=local', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'تعذر تنزيل ملف APK من الخادم.');
      }

      const contentLengthHeader = response.headers.get('Content-Length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : config.uploadedFileSizeBytes || 0;

      if (!response.body) {
        const blob = await response.blob();
        triggerBrowserSave(blob, config.fileName || 'tidikelt-ai-release.apk');
      } else {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(new Uint8Array(value));
            receivedBytes += value.byteLength;
            if (totalBytes > 0) {
              setDownloadProgressPct(Math.min(99, Math.round((receivedBytes / totalBytes) * 100)));
            }
          }
        }

        if (totalBytes > 0 && receivedBytes < totalBytes) {
          throw new Error(
            `انقطع الاتصال قبل اكتمال التنزيل (${Math.round((receivedBytes / totalBytes) * 100)}%). يرجى المحاولة مرة أخرى.`
          );
        }

        const fullBlob = new Blob(chunks, {
          type: 'application/vnd.android.package-archive',
        });
        setDownloadProgressPct(100);
        triggerBrowserSave(fullBlob, config.fileName || 'tidikelt-ai-release.apk');
      }

      setDownloadStatusMsg({
        type: 'success',
        text: 'اكتمل تنزيل ملف APK بنسبة 100% بنجاح! افتح الملف من إشعارات التنزيل لتثبيت التطبيق.',
      });
    } catch (err: any) {
      setDownloadStatusMsg({
        type: 'error',
        text: err?.message || 'حدث خطأ أثناء التنزيل. يمكنك استخدام الرابط المباشر الاحتياطي.',
      });
    } finally {
      setIsDownloadingApk(false);
    }
  };

  const triggerBrowserSave = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.endsWith('.apk') ? filename : `${filename}.apk`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  };

  const handleCopyDirectLink = async () => {
    if (!activeDirectUrl) return;
    const absoluteUrl = activeDirectUrl.startsWith('http')
      ? activeDirectUrl
      : `${window.location.origin}${activeDirectUrl}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleSaveOwnerConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerSaveFeedback(null);

    if (formMode === 'external_url' && !formExternalUrl.trim()) {
      setOwnerSaveFeedback({
        type: 'error',
        text: 'يرجى إدخال رابط التحميل المباشر لملف الـ APK (مثل رابط Google Drive أو GitHub).',
      });
      return;
    }

    if (formMode === 'uploaded_file' && !config?.hasCustomUploadedApk) {
      setOwnerSaveFeedback({
        type: 'error',
        text: 'يرجى رفع ملف .apk من جهازك أولاً أو اختيار وضع الرابط الخارجي المباشر.',
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/apk/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: formMode,
          externalUrl: formExternalUrl.trim(),
          iosAppStoreUrl: formIosUrl.trim(),
          version: formVersion.trim() || '2.5.0',
          fileSizeLabel: formSizeLabel.trim() || '18.4 MB',
          fileName: formFileName.trim() || 'tidikelt-ai-release.apk',
          releaseNotes: formReleaseNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'تعذر حفظ الإعدادات');
      }
      setConfig(data.config);
      setOwnerSaveFeedback({
        type: 'success',
        text: 'تم حفظ واعتماد إعدادات تحميل APK بنجاح! يمكن للزوار التحميل الآن.',
      });
    } catch (err: any) {
      setOwnerSaveFeedback({
        type: 'error',
        text: err?.message || 'حدث خطأ أثناء حفظ الإعدادات.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleFileSelectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOwnerSaveFeedback(null);

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setOwnerSaveFeedback({
        type: 'error',
        text: 'يرجى اختيار ملف بصيغة .apk حصراً.',
      });
      e.target.value = '';
      return;
    }

    if (file.size < 1024) {
      setOwnerSaveFeedback({
        type: 'error',
        text: 'حجم الملف صغير جداً ولا يمثل حزمة أندرويد APK صالحة.',
      });
      e.target.value = '';
      return;
    }

    // Verify PK\x03\x04 header on client before uploading
    try {
      const sliceBuffer = await file.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(sliceBuffer);
      const isPk =
        header[0] === 0x50 &&
        header[1] === 0x4b &&
        header[2] === 0x03 &&
        header[3] === 0x04;
      if (!isPk) {
        setOwnerSaveFeedback({
          type: 'error',
          text: 'هذا الملف تالف أو ليس حزمة أندرويد APK حقيقية (ترويسة الحزمة غير صالحة).',
        });
        e.target.value = '';
        return;
      }
    } catch {}

    setIsUploadingApk(true);
    setUploadProgressPct(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/apk/upload', true);
    xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');
    xhr.setRequestHeader('X-Apk-Filename', encodeURIComponent(file.name));
    xhr.setRequestHeader('X-Apk-Version', encodeURIComponent(formVersion || '2.5.0'));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        setUploadProgressPct(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploadingApk(false);
      e.target.value = '';
      try {
        const resp = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && resp?.config) {
          setConfig(resp.config);
          setFormMode('uploaded_file');
          setFormFileName(resp.config.fileName);
          setFormSizeLabel(resp.config.fileSizeLabel);
          setOwnerSaveFeedback({
            type: 'success',
            text: resp.message || 'تم رفع ملف APK واعتماده للتحميل المباشر بنجاح!',
          });
        } else {
          setOwnerSaveFeedback({
            type: 'error',
            text: resp?.error || 'فشل رفع ملف الـ APK.',
          });
        }
      } catch {
        setOwnerSaveFeedback({
          type: 'error',
          text: 'حدث خطأ غير متوقع أثناء معالجة استجابة الخادم.',
        });
      }
    };

    xhr.onerror = () => {
      setIsUploadingApk(false);
      e.target.value = '';
      setOwnerSaveFeedback({
        type: 'error',
        text: 'انقطع الاتصال أثناء رفع ملف الـ APK. يرجى المحاولة مجدداً أو استخدام رابط خارجي مباشر.',
      });
    };

    xhr.send(file);
  };

  const normalizedPreview = previewNormalizedUrl(formExternalUrl);

  return (
    <dialog
      ref={dialogRef}
      id="downloadDialog"
      aria-labelledby="downloadTitle"
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fixed inset-0 m-auto z-50 p-0 rounded-2xl border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm max-w-[480px] w-[94vw] max-h-[90vh] overflow-y-auto"
    >
      <div className="relative p-5 sm:p-6 bg-[var(--card)] text-[var(--ink)] font-sans leading-relaxed text-right" dir="rtl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#176b52]/15 text-[#176b52] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="downloadTitle" className="text-base sm:text-lg font-extrabold text-[var(--ink)] m-0 truncate">
                {activeTab === 'owner' ? 'إدارة ملف APK وروابط التحميل' : 'تنزيل تطبيق تيديكلت AI'}
              </h2>
              <p className="text-xs text-[var(--mute)] m-0 truncate">
                {activeTab === 'owner'
                  ? 'لوحة المالك لرفع حزمة الأندرويد أو ربط رابط مباشر'
                  : 'النسخة الرسمية الكاملة لهواتف أندرويد وآيفون'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'download' ? 'owner' : 'download')}
              title={activeTab === 'download' ? 'إعدادات المالك لملف APK والرابط' : 'العودة لنافذة التحميل'}
              className={`px-2.5 h-9 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'owner'
                  ? 'bg-[#176b52] text-white border-[#176b52]'
                  : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-[#176b52]'
              }`}
            >
              {activeTab === 'owner' ? (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>صفحة التنزيل</span>
                </>
              ) : (
                <>
                  <Settings className="w-3.5 h-3.5 text-[#176b52]" />
                  <span>{isAdminLoggedIn ? 'إدارة APK' : 'إعداد الرابط'}</span>
                </>
              )}
            </button>

            <button
              id="closeDownload"
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors text-xl font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>

        {/* ===================== TAB 1: VISITOR DOWNLOAD VIEW ===================== */}
        {activeTab === 'download' && (
          <div className="space-y-4">
            {/* Release Metadata Strip */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <ShieldCheck className="w-4 h-4 text-[#176b52] shrink-0" />
                  <span>إصدار الأندرويد الرسمي</span>
                  <span className="font-mono tabular-nums text-[#176b52]">
                    v{config?.version || '2.5.0'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--mute)] font-mono tabular-nums">
                  <span>الحجم: {config?.fileSizeLabel || '18.4 MB'}</span>
                  <span>·</span>
                  <span>APK</span>
                </div>
              </div>

              {config?.releaseNotes && (
                <p className="text-xs text-[var(--mute)] m-0 leading-relaxed">
                  {config.releaseNotes}
                </p>
              )}

              {/* Source readiness indicator */}
              <div className="pt-1.5 border-t border-[var(--line)]/60 flex items-center justify-between text-[11px]">
                {hasAnyValidApkSource ? (
                  <span className="text-[#176b52] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isExternalReady
                        ? 'مرتبط برابط تحميل خارجي مباشر ومفحوص'
                        : 'حزمة APK مرفوعة ومفحوصة بالكامل على الخادم'}
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>بانتظار ربط رابط APK الخارجي أو رفع الحزمة من المالك</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('owner')}
                  className="text-[#176b52] hover:underline font-bold cursor-pointer"
                >
                  تحديث الرابط
                </button>
              </div>
            </div>

            {/* Primary Android APK Download Button */}
            <div className="space-y-2.5">
              <a
                className="platform-link android flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-xl font-bold text-white bg-[#176b52] hover:bg-[#125742] transition-all shadow-md hover:shadow-lg no-underline text-center min-h-[50px] cursor-pointer"
                href={activeDirectUrl || '#'}
                target={isExternalReady || (!isUploadedReady && hasFallbackExternal) ? '_blank' : undefined}
                rel={isExternalReady || (!isUploadedReady && hasFallbackExternal) ? 'noopener noreferrer' : undefined}
                download={isUploadedReady ? config?.fileName || 'tidikelt-ai-release.apk' : undefined}
                onClick={handleDownloadAndroidApk}
              >
                {isDownloadingApk ? (
                  <>
                    <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                    <span className="tabular-nums">
                      جاري تنزيل الحزمة الكاملة... {downloadProgressPct !== null ? `${downloadProgressPct}%` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 shrink-0" />
                    <span>
                      تنزيل APK لأندرويد ({config?.fileSizeLabel || 'نسخة كاملة'})
                    </span>
                  </>
                )}
              </a>

              {/* Native progress element when streaming local APK */}
              {isDownloadingApk && downloadProgressPct !== null && (
                <div className="space-y-1">
                  <progress
                    value={downloadProgressPct}
                    max={100}
                    className="w-full h-2 rounded-full overflow-hidden accent-[#176b52]"
                  />
                  <div className="flex justify-between text-[11px] text-[var(--mute)] font-mono tabular-nums">
                    <span>فحص سلامة الحزمة أثناء التحميل</span>
                    <span>{downloadProgressPct}%</span>
                  </div>
                </div>
              )}

              {/* Direct External Link Helper Actions (Open in new tab / Copy direct link) */}
              {hasAnyValidApkSource && activeDirectUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={activeDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[#176b52] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1.5 no-underline transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#176b52]" />
                    <span>فتح رابط التحميل المباشر في المتصفح</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[#176b52] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    title="نسخ رابط التحميل المباشر"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#176b52]" />
                        <span className="text-[#176b52]">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[var(--mute)]" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Download status message */}
              {downloadStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-2 ${
                    downloadStatusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : downloadStatusMsg.type === 'error'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {downloadStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <p className="m-0">{downloadStatusMsg.text}</p>
                    {downloadStatusMsg.type === 'error' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('owner')}
                        className="px-2.5 py-1 rounded-lg bg-[#176b52] text-white text-[11px] font-bold cursor-pointer"
                      >
                        فتح إعدادات المالك لربط ملف APK الآن
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instant Browser / WebAPK Installation Option (Works immediately without external APK) */}
            {!isInstalled && (
              <div className="p-3.5 rounded-xl bg-[#176b52]/8 border border-[#176b52]/25 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#176b52]" />
                    <span>تثبيت فوري مباشر (بدون انتظار تحميل APK)</span>
                  </span>
                </div>
                <p className="text-[11px] text-[var(--mute)] m-0 leading-relaxed">
                  يمكنك تثبيت تطبيق <b>تيديكلت AI</b> مباشرة على شاشة هاتفك بضغطة واحدة عبر تقنية WebAPK بدون الحاجة لتنزيل حزمة خارجية:
                </p>
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={() => installPWA()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--card)] border border-[#176b52] text-[#176b52] hover:bg-[#176b52] hover:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>تثبيت التطبيق فوراً على الهاتف</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-[#176b52] font-bold bg-[var(--card)] p-2.5 rounded-lg border border-[var(--line)]">
                    من قائمة متصفح Chrome (⋮) في أعلى الشاشة اختر <b>«تثبيت التطبيق» (Install App)</b> أو <b>«الإضافة إلى الشاشة الرئيسية»</b>.
                  </div>
                )}
              </div>
            )}

            {/* iOS / iPhone Link & Instructions */}
            <div className="pt-2 border-t border-[var(--line)] space-y-2.5">
              {config?.iosAppStoreUrl ? (
                <a
                  className="platform-link iphone flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-bold text-[#173f72] bg-[#eaf1fa] hover:bg-[#dbe7f7] transition-all no-underline text-center min-h-[48px]"
                  href={config.iosAppStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Apple className="w-5 h-5 shrink-0" />
                  <span>iPhone و iPad — تحميل من App Store</span>
                </a>
              ) : null}

              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--mute)] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <Apple className="w-4 h-4 shrink-0" />
                  <span>لمستخدمي iPhone و iPad (تثبيت عبر Safari):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-[#176b52] font-semibold">
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>1. اضغط زر «مشاركة» في متصفح Safari</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>2. اختر «إضافة إلى الشاشة الرئيسية»</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: OWNER APK MANAGER VIEW ===================== */}
        {activeTab === 'owner' && (
          <form onSubmit={handleSaveOwnerConfig} className="space-y-4">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setFormMode('external_url')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  formMode === 'external_url'
                    ? 'bg-[#176b52] text-white shadow-xs'
                    : 'text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <Link2 className="w-4 h-4 shrink-0" />
                <span>رابط خارجي مباشر</span>
              </button>

              <button
                type="button"
                onClick={() => setFormMode('uploaded_file')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  formMode === 'uploaded_file'
                    ? 'bg-[#176b52] text-white shadow-xs'
                    : 'text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>رفع ملف APK للخادم</span>
              </button>
            </div>

            {/* Option A: External Direct URL (Google Drive / GitHub / Direct) */}
            {formMode === 'external_url' && (
              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                    رابط ملف APK الخارجي (Google Drive أو GitHub Releases أو رابط مباشر):
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={formExternalUrl}
                    onChange={(e) => setFormExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... أو https://.../app-release.apk"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] text-xs font-mono focus:outline-none focus:border-[#176b52]"
                  />
                  <p className="text-[11px] text-[var(--mute)] mt-1.5 mb-0 leading-relaxed">
                    💡 يمكنك لصق رابط مشاركة <b>Google Drive</b> العادي وسيقوم النظام تلقائياً بتحويله إلى رابط تنزيل مباشر فوري لجميع الهواتف.
                  </p>
                </div>

                {normalizedPreview.url && (
                  <div className="p-2.5 rounded-lg bg-[#176b52]/10 border border-[#176b52]/25 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#176b52]">
                      <span>
                        {normalizedPreview.isGoogleDrive
                          ? '✓ تم تحويل رابط Google Drive إلى رابط تنزيل مباشر:'
                          : normalizedPreview.isDropbox
                          ? '✓ تم تحويل رابط Dropbox إلى تنزيل مباشر:'
                          : '✓ الرابط المباشر المعتمد للتنزيل:'}
                      </span>
                      <a
                        href={normalizedPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline flex items-center gap-1"
                      >
                        <span>تجربة الرابط</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div
                      dir="ltr"
                      className="text-[10px] font-mono text-[var(--mute)] truncate select-all"
                    >
                      {normalizedPreview.url}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Option B: Direct APK File Upload from Device */}
            {formMode === 'uploaded_file' && (
              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <FileArchive className="w-4 h-4 text-[#176b52]" />
                    <span>رفع ملف APK الفعلي من جهازك:</span>
                  </span>
                  {config?.hasCustomUploadedApk && (
                    <span className="text-[11px] font-bold text-[#176b52]">
                      ✓ مرفوع حالياً ({config.fileSizeLabel})
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={handleFileSelectUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploadingApk}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#176b52]/50 bg-[var(--card)] hover:bg-[#176b52]/5 text-xs font-bold text-[#176b52] flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[48px]"
                >
                  {isUploadingApk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="tabular-nums">جاري رفع وفحص الحزمة... {uploadProgressPct}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>اختر ملف .apk من هاتفك أو حاسوبك لرفعه</span>
                    </>
                  )}
                </button>

                {isUploadingApk && (
                  <progress
                    value={uploadProgressPct}
                    max={100}
                    className="w-full h-2 rounded-full overflow-hidden accent-[#176b52]"
                  />
                )}

                <p className="text-[11px] text-[var(--mute)] m-0 leading-relaxed">
                  يتم التحقق تلقائياً من ترويسة حزمة الأندرويد (ZIP/APK Signature) لضمان عدم رفع ملف تالف أو ناقص.
                </p>
              </div>
            )}

            {/* Release Version, Size, and Notes Fields */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  رقم الإصدار (Version):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="2.5.0"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-xs font-mono focus:outline-none focus:border-[#176b52]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  حجم الملف المعروض:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formSizeLabel}
                  onChange={(e) => setFormSizeLabel(e.target.value)}
                  placeholder="24.5 MB"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-xs font-mono focus:outline-none focus:border-[#176b52]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                وصف التحديثات في هذا الإصدار:
              </label>
              <textarea
                rows={2}
                value={formReleaseNotes}
                onChange={(e) => setFormReleaseNotes(e.target.value)}
                placeholder="مثال: إصدار رسمي محدث يدعم رفيق الطريق ومستجدات عين صالح..."
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-xs focus:outline-none focus:border-[#176b52] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                رابط App Store للآيفون (اختياري):
              </label>
              <input
                type="url"
                dir="ltr"
                value={formIosUrl}
                onChange={(e) => setFormIosUrl(e.target.value)}
                placeholder="https://apps.apple.com/app/..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-xs font-mono focus:outline-none focus:border-[#176b52]"
              />
            </div>

            {ownerSaveFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  ownerSaveFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-700 dark:text-rose-300'
                }`}
              >
                {ownerSaveFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{ownerSaveFeedback.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSavingConfig || isLoadingConfig}
                className="flex-1 py-3 px-4 rounded-xl bg-[#176b52] hover:bg-[#125742] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md min-h-[46px]"
              >
                {isSavingConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ واعتماد إعدادات التحميل</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('download')}
                className="py-3 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer transition-colors min-h-[46px]"
              >
                معاينة التنزيل
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
};
