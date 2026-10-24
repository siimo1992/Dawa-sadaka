import React, { useState } from 'react';
import { FileDown, FileText, Eye, Loader2, ChevronDown } from 'lucide-react';

export interface GeneratedFileInfo {
  id: string;
  filename: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt' | 'md' | 'html';
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
  previewUrl?: string;
  title: string;
  verified: boolean;
}

export const FILE_FORMAT_OPTIONS: Array<{
  format: GeneratedFileInfo['format'];
  label: string;
  badge: string;
}> = [
  { format: 'docx', label: 'مستند Word (DOCX)', badge: 'DOCX' },
  { format: 'pdf', label: 'ملف PDF رسمي', badge: 'PDF' },
  { format: 'xlsx', label: 'جدول Excel بالمعادلات', badge: 'XLSX' },
  { format: 'pptx', label: 'عرض PowerPoint', badge: 'PPTX' },
  { format: 'txt', label: 'ملف نصي عربي (TXT)', badge: 'TXT' },
  { format: 'md', label: 'مستند Markdown', badge: 'MD' },
  { format: 'html', label: 'صفحة ويب منسقة للطباعة', badge: 'HTML' },
  { format: 'csv', label: 'بيانات CSV', badge: 'CSV' },
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const GeneratedFileCard: React.FC<{ file: GeneratedFileInfo }> = ({ file }) => {
  return (
    <div
      className="mt-3 p-3.5 rounded-2xl bg-[var(--bg)] border border-amber-500/30 flex items-center justify-between gap-3 shadow-xs"
      dir="rtl"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono text-xs font-extrabold uppercase shrink-0 border border-amber-500/30">
          {file.format}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-[var(--ink)] truncate" title={file.filename}>
            {file.filename}
          </div>
          <div className="text-[10.5px] text-[var(--mute)] flex items-center gap-2 mt-0.5">
            <span>الحجم: {formatFileSize(file.sizeBytes)}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">جاهز للتنزيل ✓</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {file.previewUrl && (
          <a
            href={file.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-[var(--card)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-[var(--ink)] text-[11px] font-bold flex items-center gap-1 transition-colors"
            title={file.format === 'pdf' ? 'معاينة وطباعة المستند' : 'معاينة الملف'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{file.format === 'pdf' ? 'معاينة وطباعة' : 'معاينة'}</span>
          </a>
        )}
        <a
          href={file.downloadUrl}
          download={file.filename}
          className="px-3 py-1.5 rounded-xl bg-[var(--green)] hover:opacity-90 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-opacity"
          title="تنزيل الملف المكتبي"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>تنزيل ({file.format.toUpperCase()})</span>
        </a>
      </div>
    </div>
  );
};

export const ConvertMessageToFileMenu: React.FC<{
  messageTitle: string;
  messageContent: string;
  conversationId?: string;
  onFileGenerated: (file: GeneratedFileInfo) => void;
}> = ({ messageTitle, messageContent, conversationId, onFileGenerated }) => {
  const [open, setOpen] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);

  const handleGenerate = async (format: GeneratedFileInfo['format']) => {
    setGeneratingFormat(format);
    try {
      const res = await fetch('/api/files/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageTitle || 'وثيقة تيدكلت AI',
          content: messageContent,
          format,
          conversation_id: conversationId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.file) {
          onFileGenerated(data.file);
        }
      }
    } catch {
      // ignore
    } finally {
      setGeneratingFormat(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={Boolean(generatingFormat)}
        className="px-2.5 py-1 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[var(--ink)] hover:text-amber-600 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
        title="تحويل هذه الإجابة إلى ملف قابل للتنزيل"
      >
        {generatingFormat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-amber-600" />
        )}
        <span>تحويل لملف</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1.5 right-0 z-30 w-52 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xl p-1.5 space-y-0.5 text-right"
          dir="rtl"
        >
          <div className="px-2.5 py-1 text-[10px] font-extrabold text-[var(--mute)] border-b border-[var(--line)]/50 mb-1">
            تصدير الإجابة كملف فعلي:
          </div>
          {FILE_FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              type="button"
              onClick={() => handleGenerate(opt.format)}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[var(--bg)] text-xs font-bold text-[var(--ink)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>{opt.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {opt.badge}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
