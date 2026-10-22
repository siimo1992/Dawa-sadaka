import React, { useState } from 'react';
import {
  Check,
  Copy,
  Terminal,
  WrapText,
  ExternalLink,
} from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isRtl?: boolean;
}

// High-Fidelity Code Block Component with Quick Copy
const CodeBlock: React.FC<{
  content: string;
  language?: string;
  isRtl?: boolean;
}> = ({ content, language = 'code', isRtl = true }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const cleanLang = (language || 'code').toLowerCase().trim();

  return (
    <div
      className="my-3 rounded-2xl overflow-hidden border border-slate-700/70 bg-[#101418] dark:bg-[#0c1014] shadow-xs text-slate-100"
      dir="ltr"
    >
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#181e24] dark:bg-[#14191f] border-b border-slate-800/80 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            {cleanLang || 'CODE'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsWrapped(!isWrapped)}
            className={`p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ${
              isWrapped ? 'bg-slate-700/70 text-white' : 'hover:bg-slate-800'
            }`}
            title={isWrapped ? 'Disable wrap' : 'Enable word wrap'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={copyCode}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              isCopied
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
            }`}
            title={isRtl ? 'نسخ الكود' : 'Copy code'}
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>{isRtl ? 'تم النسخ' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>{isRtl ? 'نسخ' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre
        className={`p-3.5 text-xs sm:text-[13px] font-mono text-slate-100 overflow-x-auto leading-relaxed select-text ${
          isWrapped ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
        }`}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isRtl = true }) => {
  type Block =
    | { type: 'code'; language?: string; content: string }
    | { type: 'text'; content: string };

  const isTableDelimiter = (line: string): boolean => {
    const trimmed = line.trim();
    return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);
  };

  const parseTableCells = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map((c) => c.trim());
  };

  // Strip distracting details, callouts, and convert any markdown tables into simple bullet points
  const cleanFillerAndTables = (raw: string): string => {
    const withoutDetails = raw
      .replace(/<details[^>]*>[\s\S]*?<\/details>/gi, '')
      .replace(/\s*\[المصدر:[^\]]+\]/g, '');

    const rawLines = withoutDetails.split('\n');
    const cleanedLines: string[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const t = line.trim();

      // Convert any Markdown table into clean, simple bullet lines (no tables in response body)
      if (t.includes('|') && i + 1 < rawLines.length && isTableDelimiter(rawLines[i + 1])) {
        const headers = parseTableCells(line);
        let j = i + 2;
        while (j < rawLines.length && rawLines[j].trim().includes('|') && rawLines[j].trim().length > 0) {
          const cells = parseTableCells(rawLines[j]).filter(Boolean);
          if (cells.length > 0) {
            if (cells.length === 1) {
              cleanedLines.push(`- ${cells[0]}`);
            } else {
              const first = cells[0].replace(/^\*\*|\*\*$/g, '').trim();
              const rest = cells
                .slice(1)
                .map((val, idx) => {
                  const h = headers[idx + 1]?.replace(/^\*\*|\*\*$/g, '').trim();
                  return h ? `${h}: ${val}` : val;
                })
                .join(' — ');
              cleanedLines.push(`- **${first}**: ${rest}`);
            }
          }
          j++;
        }
        i = j;
        continue;
      }

      // Skip standalone table delimiter lines
      if (isTableDelimiter(t)) {
        i++;
        continue;
      }

      // Skip distracting rationale, checkpoint, or redundant callout lines
      if (
        /^(?:[-*•]\s*)?(?:[💡🎯⚡🔍✅📋]\s*)?(?:\*\*)?(?:الأساس المنطقي|نقطة التحقق|معيار التحقق|الوثيقة المرجعية|الجهة المصدرة|معيار الدقة|المصدر التدريبي المعتمد|التصنيف المعرفي|Rationale|Verification Checkpoint)(?:\*\*)?\s*[:：]/i.test(
          t
        )
      ) {
        i++;
        continue;
      }

      if (
        /^>\s*(?:[💡📌✨]\s*)?(?:\*\*)?(?:خلاصة وتوصية|خلاصة ومصدر معتمد|ساعة متزامنة حية|ملاحظة مهمة)(?:\*\*)?\s*[:：]/i.test(
          t
        )
      ) {
        i++;
        continue;
      }

      cleanedLines.push(line);
      i++;
    }

    return cleanedLines.join('\n').trim();
  };

  const parseBlocks = (text: string): Block[] => {
    const cleaned = cleanFillerAndTables(text);
    const blocks: Block[] = [];
    const codeRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeRegex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = cleaned.slice(lastIndex, match.index);
        if (textChunk.trim()) {
          blocks.push({
            type: 'text',
            content: textChunk,
          });
        }
      }

      blocks.push({
        type: 'code',
        language: match[1] || 'plaintext',
        content: match[2].trimEnd(),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleaned.length) {
      const textChunk = cleaned.slice(lastIndex);
      if (textChunk.trim() || blocks.length === 0) {
        blocks.push({
          type: 'text',
          content: textChunk,
        });
      }
    }

    if (blocks.length === 0 && cleaned.length > 0) {
      blocks.push({ type: 'text', content: cleaned });
    }

    return blocks;
  };

  const renderTextContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    interface ParsedListItem {
      num?: string;
      text: string;
    }
    let currentList: ParsedListItem[] = [];
    let isNumbered = false;

    const flushList = () => {
      if (currentList.length > 0) {
        if (isNumbered) {
          elements.push(
            <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2 text-[var(--ink)] list-decimal list-inside">
              {currentList.map((item, idx) => (
                <li key={idx} className="text-[15px] leading-relaxed">
                  {renderInlineFormatting(item.text)}
                </li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 text-[var(--ink)] list-disc list-inside">
              {currentList.map((item, idx) => (
                <li key={idx} className="text-[15px] leading-relaxed">
                  {renderInlineFormatting(item.text)}
                </li>
              ))}
            </ul>
          );
        }
        currentList = [];
      }
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        flushList();
        i++;
        continue;
      }

      // Clean headings without numbered tree prefixes like "1.0 " or "1.1 "
      if (trimmed.startsWith('# ')) {
        flushList();
        const headingText = trimmed.slice(2).replace(/^\d+\.\d+\s+/, '');
        elements.push(
          <h1 key={`h1-${elements.length}`} className="text-base sm:text-lg font-bold text-[var(--ink)] mt-3 mb-1">
            {renderInlineFormatting(headingText)}
          </h1>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('## ')) {
        flushList();
        const headingText = trimmed.slice(3).replace(/^\d+\.\d+\s+/, '');
        elements.push(
          <h2 key={`h2-${elements.length}`} className="text-[15.5px] sm:text-base font-bold text-[var(--ink)] mt-2.5 mb-1">
            {renderInlineFormatting(headingText)}
          </h2>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('### ')) {
        flushList();
        const headingText = trimmed.slice(4).replace(/^\d+\.\d+\s+/, '');
        elements.push(
          <h3 key={`h3-${elements.length}`} className="text-[15px] font-bold text-[var(--ink)] mt-2.5 mb-1">
            {renderInlineFormatting(headingText)}
          </h3>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('#### ')) {
        flushList();
        const headingText = trimmed.slice(5).replace(/^\d+\.\d+\s+/, '');
        elements.push(
          <h4 key={`h4-${elements.length}`} className="text-[14.5px] font-semibold text-[var(--ink)] mt-2 mb-0.5">
            {renderInlineFormatting(headingText)}
          </h4>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('>')) {
        flushList();
        const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')];
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('>')) {
          quoteLines.push(lines[j].trim().replace(/^>\s?/, ''));
          j++;
        }
        elements.push(
          <p key={`quote-${elements.length}`} className="my-2 text-[15px] leading-relaxed text-[var(--ink)]">
            {renderInlineFormatting(quoteLines.join(' '))}
          </p>
        );
        i = j;
        continue;
      }

      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
      if (bulletMatch) {
        if (isNumbered) flushList();
        isNumbered = false;
        currentList.push({ text: bulletMatch[1] });
        i++;
        continue;
      }

      const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
      if (numberedMatch) {
        if (!isNumbered) flushList();
        isNumbered = true;
        currentList.push({ num: numberedMatch[1], text: numberedMatch[2] });
        i++;
        continue;
      }

      if (/^(\*\*\*|---|___)$/.test(trimmed)) {
        flushList();
        elements.push(<hr key={`hr-${elements.length}`} className="my-2.5 border-t border-[var(--line)]/50" />);
        i++;
        continue;
      }

      flushList();
      elements.push(
        <p key={`p-${elements.length}`} className="my-1.5 text-[15px] leading-[1.8] text-[var(--ink)]">
          {renderInlineFormatting(line)}
        </p>
      );
      i++;
    }

    flushList();
    return elements;
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 text-[13px] bg-black/5 dark:bg-white/10 text-[var(--ink)] rounded font-mono"
            dir="ltr"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
      return linkParts.map((lSub, lIdx) => {
        const linkMatch = lSub.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch;
          return (
            <a
              key={`link-${index}-${lIdx}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[var(--green)] underline hover:opacity-80 font-semibold"
            >
              <span>{linkText}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 inline-block" />
            </a>
          );
        }

        const boldParts = lSub.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((sub, sIdx) => {
          if (sub.startsWith('**') && sub.endsWith('**') && sub.length > 4) {
            return (
              <strong key={`b-${index}-${lIdx}-${sIdx}`} className="font-semibold text-[var(--ink)]">
                {sub.slice(2, -2)}
              </strong>
            );
          }
          return sub;
        });
      });
    });
  };

  const blocks = parseBlocks(content);

  return (
    <div
      className={`space-y-1 text-[15px] leading-[1.8] ${
        isRtl ? 'text-right' : 'text-left'
      }`}
    >
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={index}
              content={block.content}
              language={block.language}
              isRtl={isRtl}
            />
          );
        }

        return <div key={index}>{renderTextContent(block.content)}</div>;
      })}
    </div>
  );
};
