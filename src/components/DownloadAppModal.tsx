import React, { useEffect, useRef } from 'react';
import { Smartphone, Apple, X, Download, Share2, PlusSquare } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        id="downloadDialog"
        aria-labelledby="downloadTitle"
        onClick={handleBackdropClick}
        onClose={onClose}
        className="fixed inset-0 m-auto z-50 p-0 rounded-2xl border-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-[420px] w-[92vw] overflow-hidden"
      >
        <div className="relative p-6 bg-white text-slate-800 font-sans leading-relaxed text-right rtl">
          {/* Close button */}
          <button
            id="closeDownload"
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-3 left-3 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-2xl font-bold cursor-pointer"
          >
            ×
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📲</span>
            <h2 id="downloadTitle" className="text-xl font-bold text-slate-900 m-0">
              اختر هاتفك
            </h2>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            اختر النسخة المناسبة لجهازك:
          </p>

          <div className="space-y-3">
            {/* Android APK Link */}
            <a
              className="platform-link android flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-bold text-white bg-[#176b52] hover:bg-[#125742] transition-all shadow-md hover:shadow-lg no-underline text-center min-h-[48px]"
              href="/downloads/tidikelt-ai-release.apk"
              download="tidikelt-ai-release.apk"
            >
              <Smartphone className="w-5 h-5 shrink-0" />
              <span>تنزيل APK لأندرويد</span>
            </a>

            {/* iOS / iPhone Link */}
            <a
              className="platform-link iphone flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-bold text-[#173f72] bg-[#eaf1fa] hover:bg-[#dbe7f7] transition-all no-underline text-center min-h-[48px]"
              href="https://apps.apple.com/app/idYOUR_APP_ID"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Apple className="w-5 h-5 shrink-0" />
              <span>iPhone و iPad — App Store</span>
            </a>
          </div>

          {/* iOS / PWA Instruction note */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
            <p className="m-0 leading-relaxed font-medium text-slate-700">
              إذا لم تُنشر نسخة iPhone بعد، لا تضع رابط APK هنا؛
              وجّه مستخدمي iPhone إلى موقع التطبيق، ويمكنهم اختيار
              «مشاركة» ثم «إضافة إلى الشاشة الرئيسية» إذا كان الموقع يدعم PWA.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#176b52] font-semibold">
              <Share2 className="w-4 h-4 shrink-0" />
              <span>1. اضغط زر المشاركة في متصفح Safari</span>
              <PlusSquare className="w-4 h-4 shrink-0" />
              <span>2. اختر «إضافة إلى الصفحة الرئيسية»</span>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
};
