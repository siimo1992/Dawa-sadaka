import React, { useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  Apple,
  Monitor,
  Download,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { usePWAInstall } from '../lib/api';

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

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn?: boolean;
  openInOwnerMode?: boolean;
}

export async function purgeAndroidApkClientCache(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update().catch(() => {});
      }
    }
  } catch {}
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { isInstallable, isInstalled, install: installPWA } = usePWAInstall();

  const [activeDeviceTab, setActiveDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync dialog visibility with isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCopyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDirectInstall = async () => {
    if (isInstallable) {
      try {
        await installPWA();
      } catch (err) {
        console.error('Install failed', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto p-0 bg-transparent backdrop:bg-black/60 max-w-lg w-[calc(100%-2rem)] rounded-2xl border-0 overflow-visible"
    >
      <div
        className="relative bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl p-4 sm:p-5 text-[var(--ink)] flex flex-col max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/15 border border-[var(--green)]/30 text-[var(--green)] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--ink)] m-0 flex items-center gap-1.5">
                <span>تنزيل وتثبيت التطبيق</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)] font-bold">
                  تثبيت عادي مباشر
                </span>
              </h2>
              <p className="text-xs text-[var(--mute)] m-0">
                تثبيت سلس على الشاشة الرئيسية بدون تعقيدات ملفات APK
              </p>
            </div>
          </div>

          <button
            id="closeDownload"
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors text-lg font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4">
          {/* One-Click Native Install Card */}
          <div className="p-3.5 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--green)]" />
                <span>التثبيت الفوري بنقرة واحدة</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--green)] font-bold">
                PWA رسمي
              </span>
            </div>

            {isInstalled ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>تطبيق تيديكلت AI مثبت بالفعل على هذا الجهاز وجاهز للاستخدام.</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--green)] hover:opacity-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق على جهازك الآن</span>
              </button>
            ) : (
              <p className="text-xs text-[var(--mute)] m-0 leading-relaxed">
                يمكنك إضافة التطبيق مباشرة إلى شاشة هاتفك الرئيسية عبر خيارات المتصفح أدناه بنقرة واحدة ودون الحاجة لأي تنزيل خارجي:
              </p>
            )}
          </div>

          {/* Device Selection Tabs (أندرويد / آيفون / الكمبيوتر) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveDeviceTab('android')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeDeviceTab === 'android'
                  ? 'bg-[var(--card)] text-[var(--green)] shadow-xs border border-[var(--line)]'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>أندرويد</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeviceTab('ios')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeDeviceTab === 'ios'
                  ? 'bg-[var(--card)] text-[var(--green)] shadow-xs border border-[var(--line)]'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>آيفون (iOS)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeviceTab('desktop')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeDeviceTab === 'desktop'
                  ? 'bg-[var(--card)] text-[var(--green)] shadow-xs border border-[var(--line)]'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>الكمبيوتر</span>
            </button>
          </div>

          {/* Instructions Box depending on Device */}
          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5 text-xs">
            {activeDeviceTab === 'android' && (
              <div className="space-y-2.5">
                <span className="font-extrabold text-[var(--ink)] block">
                  خطوات التثبيت المباشر على هواتف أندرويد (Google Chrome):
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--mute)] leading-relaxed">
                  <li>
                    اضغط على قائمة خيارات المتصفح (النقاط الثلاث <strong className="text-[var(--ink)]">⋮</strong> في أعلى الشاشة).
                  </li>
                  <li>
                    اختر <strong className="text-[var(--green)]">«تثبيت التطبيق»</strong> أو <strong className="text-[var(--green)]">«إضافة إلى الشاشة الرئيسية»</strong>.
                  </li>
                  <li>
                    اضغط <strong className="text-[var(--ink)]">تثبيت</strong>، وسيظهر التطبيق فوراً على شاشتك بأيقونته الرسمية ويعمل كتطبيق كامل ومستقل.
                  </li>
                </ol>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                  <strong className="block font-bold mb-0.5">💡 لتفادي رسالة «يتعذر فتح الملف»:</strong>
                  <span>
                    هواتف أندرويد لا تفتح ملفات الاختصارات المنزلة في مجلد التنزيلات؛ التثبيت يتم مباشرة من داخل متصفح Chrome عبر القائمة (⋮) دون تنزيل أي ملف وسيط قد يسبب خطأ.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cleanHost = window.location.host;
                    const fallbackUrl = `${window.location.origin}/?install=1`;
                    const intentUrl = `intent://${cleanHost}/?install=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
                    try {
                      if (window.top) {
                        window.top.location.href = intentUrl;
                      } else {
                        window.location.href = intentUrl;
                      }
                    } catch {
                      window.location.href = fallbackUrl;
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--green)]/15 border border-[var(--green)]/40 hover:bg-[var(--green)]/25 text-[var(--green)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>فتح الرابط في متصفح Chrome للتثبيت المباشر</span>
                </button>
              </div>
            )}

            {activeDeviceTab === 'ios' && (
              <div className="space-y-2">
                <span className="font-extrabold text-[var(--ink)] block">
                  خطوات التثبيت على هواتف آيفون وiPad (Safari):
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--mute)] leading-relaxed">
                  <li>
                    اضغط على زر المشاركة (<strong className="text-[var(--ink)]">Share ⎋</strong>) في شريط متصفح سفاري بالأسفل.
                  </li>
                  <li>
                    مرر لأسفل القائمة واضغط على <strong className="text-[var(--green)]">«إضافة إلى الشاشة الرئيسية» (Add to Home Screen ⊞)</strong>.
                  </li>
                  <li>
                    اضغط <strong className="text-[var(--ink)]">«إضافة» (Add)</strong> في الزاوية العلوية، وسيُثبَّت التطبيق على شاشتك كأيقونة مستقلة.
                  </li>
                </ol>
              </div>
            )}

            {activeDeviceTab === 'desktop' && (
              <div className="space-y-2.5">
                <span className="font-extrabold text-[var(--ink)] block">
                  خطوات التثبيت على الكمبيوتر (Windows / Mac / Linux):
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-[var(--mute)] leading-relaxed">
                  <li>
                    اضغط على أيقونة التثبيت (<strong className="text-[var(--green)]">⊕</strong>) الموجودة في شريط عنوان المتصفح بالأعلى.
                  </li>
                  <li>
                    أو افتح قائمة المتصفح واضغط <strong className="text-[var(--green)]">«تثبيت تيديكلت AI»</strong>.
                  </li>
                  <li>
                    أو حمّل اختصار سطح المكتب بنقرة واحدة أدناه.
                  </li>
                </ol>

                <a
                  href="/api/apk/desktop-shortcut"
                  download="Tidikelt-AI.url"
                  className="w-full py-2 px-3 rounded-xl bg-[var(--green)] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-opacity no-underline shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل اختصار سطح المكتب للكمبيوتر (Tidikelt-AI.url)</span>
                </a>
              </div>
            )}
          </div>

          {/* Advantages of Regular / Standard Install */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[var(--mute)]">سريع وخفيف جداً على الذاكرة</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[var(--mute)]">آمن 100% وبدون ملفات غير معروفة</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-[var(--mute)]">تحديثات تلقائية وفورية</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="text-[var(--mute)]">يعمل حتى بدون اتصال بالإنترنت</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyAppUrl}
            className="py-1.5 px-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/40 text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[var(--mute)]" />
                <span>مشاركة رابط التثبيت</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:bg-[var(--line)]/50 text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </dialog>
  );
};
