/**
 * uploadedFileAnalyzer.ts — محرك قراءة وتحليل ومقارنة الملفات المرفوعة لتيدكلت AI
 *
 * يدعم:
 *  - استخراج النصوص والجداول من: PDF, DOCX, XLSX, CSV, TXT, MD, HTML
 *  - تلخيص الملف، استخراج النقاط الرئيسية، الإجابة عن أسئلة حوله مع تحديد القسم/الصفحة
 *  - مقارنة ملفين أو أكثر واستخراج أوجه التشابه والاختلاف في جدول منظم
 */
import zlib from 'zlib';

export interface AnalyzedUploadedFile {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  extractedText: string;
  sections: Array<{ label: string; content: string }>;
  tables: Array<{ name: string; headers: string[]; rows: string[][] }>;
  wordCount: number;
  summary: string;
}

/**
 * قارئ بسيط لملفات ZIP (مثل DOCX و XLSX) لاستخراج ملفات XML الداخلية بدون مكتبات خارجية ثقيلة.
 */
function extractZipEntries(zipBuffer: Buffer): Record<string, string> {
  const result: Record<string, string> = {};
  let offset = 0;

  while (offset + 30 <= zipBuffer.length) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const method = zipBuffer.readUInt16LE(offset + 8);
    const compressedSize = zipBuffer.readUInt32LE(offset + 18);
    const nameLen = zipBuffer.readUInt16LE(offset + 26);
    const extraLen = zipBuffer.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > zipBuffer.length) break;

    const entryName = zipBuffer.subarray(nameStart, nameEnd).toString('utf8');
    const dataStart = nameEnd + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > zipBuffer.length) break;

    const rawSlice = zipBuffer.subarray(dataStart, dataEnd);
    try {
      if (method === 0) {
        result[entryName] = rawSlice.toString('utf8');
      } else if (method === 8) {
        result[entryName] = zlib.inflateRawSync(rawSlice).toString('utf8');
      }
    } catch {
      // skip unreadable binary entry
    }
    offset = dataEnd;
  }

  return result;
}

function unescapeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTextFromDocxBuffer(buf: Buffer): string {
  const entries = extractZipEntries(buf);
  const docXml = entries['word/document.xml'] || '';
  if (!docXml) return '';
  const paragraphs = docXml
    .split(/<\/w:p>/i)
    .map((p) => {
      const texts: string[] = [];
      const regex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(p)) !== null) {
        texts.push(unescapeXmlEntities(m[1]));
      }
      return texts.join('');
    })
    .filter((line) => line.trim().length > 0);
  return paragraphs.join('\n');
}

function extractTextAndTablesFromXlsxBuffer(buf: Buffer): {
  text: string;
  tables: Array<{ name: string; headers: string[]; rows: string[][] }>;
} {
  const entries = extractZipEntries(buf);
  const sharedStringsXml = entries['xl/sharedStrings.xml'] || '';
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siRegex = /<si[\s\S]*?<\/si>/gi;
    let m: RegExpExecArray | null;
    while ((m = siRegex.exec(sharedStringsXml)) !== null) {
      const tMatches = m[0].match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi) || [];
      const combined = tMatches
        .map((t) => unescapeXmlEntities(t.replace(/<\/?t[^>]*>/gi, '')))
        .join('');
      sharedStrings.push(combined);
    }
  }

  const tables: Array<{ name: string; headers: string[]; rows: string[][] }> = [];
  const textLines: string[] = [];

  for (const [entryName, xml] of Object.entries(entries)) {
    if (!entryName.startsWith('xl/worksheets/sheet') || !entryName.endsWith('.xml')) continue;
    const rows: string[][] = [];
    const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = rowRegex.exec(xml)) !== null) {
      const rowXml = rMatch[1];
      const rowCells: string[] = [];
      const cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/gi;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = cellRegex.exec(rowXml)) !== null) {
        const attrs = cMatch[1];
        const cellInner = cMatch[2];
        const typeMatch = attrs.match(/\bt=["']([^"']+)["']/);
        const cellType = typeMatch ? typeMatch[1] : '';
        const vMatch = cellInner.match(/<v>([\s\S]*?)<\/v>/);
        const tMatch = cellInner.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/);
        const fMatch = cellInner.match(/<f>([\s\S]*?)<\/f>/);

        let val = '';
        if (cellType === 's' && vMatch) {
          const idx = Number(vMatch[1]);
          val = sharedStrings[idx] ?? vMatch[1];
        } else if (tMatch) {
          val = unescapeXmlEntities(tMatch[1]);
        } else if (vMatch) {
          val = unescapeXmlEntities(vMatch[1]);
        } else if (fMatch) {
          val = `=${unescapeXmlEntities(fMatch[1])}`;
        }
        rowCells.push(val);
      }
      if (rowCells.some((c) => c.trim() !== '')) {
        rows.push(rowCells);
        textLines.push(rowCells.join(' | '));
      }
    }
    if (rows.length > 0) {
      tables.push({
        name: entryName.replace('xl/worksheets/', '').replace('.xml', ''),
        headers: rows[0] || [],
        rows: rows.slice(1),
      });
    }
  }

  return {
    text: textLines.join('\n'),
    tables,
  };
}

function extractTextFromPdfBuffer(buf: Buffer): string {
  const raw = buf.toString('utf8');
  const extractedParts: string[] = [];

  // 1. Check embedded XML/UTF-8 metadata stream (used by our generator and modern PDFs)
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRegex.exec(raw)) !== null) {
    const streamBody = m[1];
    // Extract literal strings (...) Tj
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(streamBody)) !== null) {
      const cleaned = tj[1]
        .replace(/\\([()\\])/g, '$1')
        .trim();
      if (cleaned) extractedParts.push(cleaned);
    }
    // Also check if stream contains direct readable UTF-8 text (e.g., Arabic/French paragraphs)
    if (!streamBody.includes('Tj') && /[\u0600-\u06FFa-zA-Z]{4,}/.test(streamBody)) {
      extractedParts.push(streamBody.trim());
    }
  }

  return extractedParts.join('\n').trim();
}

export function analyzeUploadedFileBuffer(
  filename: string,
  buffer: Buffer,
  customId?: string
): AnalyzedUploadedFile {
  const ext = (filename.split('.').pop() || 'txt').toLowerCase();
  let extractedText = '';
  let tables: Array<{ name: string; headers: string[]; rows: string[][] }> = [];

  if (ext === 'docx') {
    extractedText = extractTextFromDocxBuffer(buffer);
  } else if (ext === 'xlsx') {
    const parsed = extractTextAndTablesFromXlsxBuffer(buffer);
    extractedText = parsed.text;
    tables = parsed.tables;
  } else if (ext === 'pdf') {
    extractedText = extractTextFromPdfBuffer(buffer);
  } else if (ext === 'csv') {
    const csvStr = buffer.toString('utf8').replace(/^\uFEFF/, '');
    extractedText = csvStr;
    const lines = csvStr.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const splitCsv = (l: string) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      tables.push({
        name: filename,
        headers: splitCsv(lines[0]),
        rows: lines.slice(1).map(splitCsv),
      });
    }
  } else if (ext === 'html' || ext === 'htm') {
    const htmlStr = buffer.toString('utf8');
    extractedText = htmlStr
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    extractedText = buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  }

  // Segment into sections/pages for precise citation
  const paragraphs = extractedText
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sections: Array<{ label: string; content: string }> = [];
  const chunkSize = 3;
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const secNum = Math.floor(i / chunkSize) + 1;
    sections.push({
      label: `القسم ${secNum}`,
      content: paragraphs.slice(i, i + chunkSize).join('\n'),
    });
  }

  const words = extractedText.split(/\s+/).filter(Boolean);
  const summary = extractedText.slice(0, 500);

  return {
    id: customId || `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    filename,
    extension: ext,
    sizeBytes: buffer.length,
    extractedText,
    sections,
    tables,
    wordCount: words.length,
    summary,
  };
}

/**
 * يبني سياق مقارنة منظم بين ملفين أو أكثر (أوجه التشابه، الاختلاف، وجدول مقارنة).
 */
export function buildMultiFileComparisonPrompt(files: AnalyzedUploadedFile[]): string {
  if (!files || files.length === 0) return '';
  if (files.length === 1) {
    const f = files[0];
    const secText = f.sections
      .slice(0, 8)
      .map((s) => `[${s.label}]:\n${s.content}`)
      .join('\n\n');
    return `[محتوى الملف المرفوع: "${f.filename}" (${f.wordCount} كلمة)]:\n${
      secText || f.extractedText.slice(0, 4500)
    }\n\n[تعليمات]: أجب عن سؤال المستخدم بدقة استناداً إلى محتوى الملف أعلاه، واذكر رقم القسم المرجعي عند الاستشهاد.`;
  }

  const filesBreakdown = files
    .map(
      (f, idx) =>
        `=== الملف (${idx + 1}): ${f.filename} (${f.extension.toUpperCase()} - ${f.wordCount} كلمة) ===\n${f.extractedText.slice(
          0,
          2800
        )}`
    )
    .join('\n\n');

  return `[مقارنة وتحليل الملفات المرفوعة (${files.length} ملفات)]:
${filesBreakdown}

[تعليمات المقارنة]:
- قارن بين الملفات المرفوعة أعلاه بدقة.
- وضح أوجه التشابه والاتفاق، وأوجه الاختلاف أو التغييرات بينها.
- اعرض جدول مقارنة منظم يوضح الفروقات الرئيسية بين كل ملف.`;
}
