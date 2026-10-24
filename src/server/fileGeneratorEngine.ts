/**
 * fileGeneratorEngine.ts — محرك إنشاء وتحويل الملفات الحقيقي لتيدكلت AI
 *
 * ينشئ ملفات فعلية قابلة للتنزيل والفتح على القرص (PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, HTML)
 * عند الطلب الصريح من المستخدم فقط، مع التحقق من وجود الملف وحجمه (> 0 بايت) قبل إرجاع الرابط.
 * متوافق كلياً مع Node 22 strip-only TypeScript.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import type { SupportedFileFormat } from './intentAndContextEngine.ts';

export interface GeneratedFileMetadata {
  id: string;
  filename: string;
  format: SupportedFileFormat;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
  previewUrl?: string;
  title: string;
  verified: boolean;
}

export interface TableSheetSpec {
  name: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  includeFormulas?: boolean;
}

export interface FileGenerationInput {
  title: string;
  content: string;
  format: SupportedFileFormat;
  tables?: TableSheetSpec[];
  slides?: Array<{ title: string; bullets: string[]; notes?: string }>;
  author?: string;
}

const GENERATED_FILES_DIR = path.join(process.cwd(), 'data', 'generated_files');
const GENERATED_INDEX_FILE = path.join(GENERATED_FILES_DIR, 'index.json');

function ensureGeneratedDir(): void {
  if (!fs.existsSync(GENERATED_FILES_DIR)) {
    fs.mkdirSync(GENERATED_FILES_DIR, { recursive: true });
  }
}

/* ───────────────────────── ZIP Builder (OpenXML) ───────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(entries: Array<{ name: string; data: Buffer | string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const rawBuf = typeof entry.data === 'string' ? Buffer.from(entry.data, 'utf8') : entry.data;
    const compressed = zlib.deflateRawSync(rawBuf);
    const crc = crc32(rawBuf);

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed
    localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 flag
    localHeader.writeUInt16LE(8, 8);          // deflate method
    localHeader.writeUInt16LE(0, 10);         // mod time
    localHeader.writeUInt16LE(0x21, 12);      // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x21, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function escapeXml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ───────────────────────── Markdown / Content Parser ───────────────────────── */

export function parseMarkdownTablesFromContent(content: string): TableSheetSpec[] {
  const lines = String(content || '').split(/\r?\n/);
  const sheets: TableSheetSpec[] = [];
  let currentHeaders: string[] | null = null;
  let currentRows: Array<Array<string | number>> = [];
  let sheetIndex = 1;

  const flushTable = () => {
    if (currentHeaders && currentHeaders.length > 0 && currentRows.length > 0) {
      sheets.push({
        name: `جدول ${sheetIndex++}`,
        headers: currentHeaders,
        rows: currentRows,
        includeFormulas: true,
      });
    }
    currentHeaders = null;
    currentRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      // Check if separator row like |---|---|
      if (cells.every((c) => /^[:\-]+$/.test(c))) {
        continue;
      }
      if (!currentHeaders) {
        currentHeaders = cells;
      } else {
        const parsedRow = cells.map((cell) => {
          const cleanNum = cell.replace(/[,٬\s]/g, '');
          if (/^-?\d+(\.\d+)?$/.test(cleanNum) && cleanNum !== '') {
            return Number(cleanNum);
          }
          return cell;
        });
        currentRows.push(parsedRow);
      }
    } else {
      if (currentHeaders) {
        flushTable();
      }
    }
  }
  if (currentHeaders) {
    flushTable();
  }

  // Fallback structured table if content has no markdown table
  if (sheets.length === 0) {
    const bulletRows: Array<Array<string | number>> = [];
    let idx = 1;
    for (const rawLine of lines) {
      const clean = rawLine.replace(/^[#*\-\d.)\s]+/, '').trim();
      if (!clean) continue;
      const parts = clean.split(/[:：\-–—]/);
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const rest = parts.slice(1).join(' - ').trim();
        const numMatch = rest.match(/^(-?\d+(?:\.\d+)?)$/);
        bulletRows.push([idx++, label, numMatch ? Number(numMatch[1]) : rest]);
      } else {
        bulletRows.push([idx++, clean, 'مكتمل']);
      }
    }
    if (bulletRows.length > 0) {
      sheets.push({
        name: 'البيانات الأساسية',
        headers: ['الرقم', 'البند / البيان', 'القيمة / التفاصيل'],
        rows: bulletRows,
        includeFormulas: true,
      });
    }
  }

  return sheets;
}

/* ───────────────────────── 1. DOCX Generator ───────────────────────── */

function generateDocxBuffer(input: FileGenerationInput): Buffer {
  const lines = String(input.content || '').split(/\r?\n/);
  const bodyParts: string[] = [];

  // Title paragraph with Cairo font and RTL
  bodyParts.push(`
    <w:p>
      <w:pPr>
        <w:jc w:val="right"/>
        <w:bidi/>
        <w:spacing w:after="240" w:before="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
          <w:b/>
          <w:bCs/>
          <w:color w:val="92400E"/>
          <w:sz w:val="36"/>
          <w:szCs w:val="36"/>
          <w:rtl/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(input.title)}</w:t>
      </w:r>
    </w:p>
  `);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      bodyParts.push('<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:p>');
      continue;
    }
    const isH1 = line.startsWith('# ');
    const isH2 = line.startsWith('## ');
    const isH3 = line.startsWith('### ');
    const isBullet = /^[-*•]\s+/.test(line);
    const cleanText = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*•]\s+/, isBullet ? '• ' : '')
      .replace(/\*\*(.*?)\*\*/g, '$1');

    const fontSize = isH1 ? '32' : isH2 ? '28' : isH3 ? '26' : '24';
    const isBold = isH1 || isH2 || isH3;
    const color = isH1 ? '92400E' : isH2 ? 'B45309' : '1F2937';

    bodyParts.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="right"/>
          <w:bidi/>
          <w:spacing w:after="120" w:line="320" w:lineRule="auto"/>
          ${isBullet ? '<w:ind w:right="360"/>' : ''}
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
            ${isBold ? '<w:b/><w:bCs/>' : ''}
            <w:color w:val="${color}"/>
            <w:sz w:val="${fontSize}"/>
            <w:szCs w:val="${fontSize}"/>
            <w:rtl/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(cleanText)}</w:t>
        </w:r>
      </w:p>
    `);
  }

  // Add tables if provided or parsed
  const tables = input.tables && input.tables.length > 0 ? input.tables : [];
  for (const table of tables) {
    const headerCells = table.headers
      .map(
        (h) => `
        <w:tc>
          <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>
            <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                <w:b/><w:bCs/>
                <w:color w:val="92400E"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
                <w:rtl/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(h)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`
      )
      .join('');
    const rowXml = table.rows
      .map(
        (row) =>
          `<w:tr>${row
            .map(
              (cell) =>
                `<w:tc>
                  <w:tcPr>
                    <w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
                  </w:tcPr>
                  <w:p>
                    <w:pPr><w:jc w:val="right"/><w:bidi/></w:pPr>
                    <w:r>
                      <w:rPr>
                        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
                        <w:sz w:val="22"/>
                        <w:szCs w:val="22"/>
                        <w:rtl/>
                      </w:rPr>
                      <w:t xml:space="preserve">${escapeXml(String(cell ?? ''))}</w:t>
                    </w:r>
                  </w:p>
                </w:tc>`
            )
            .join('')}</w:tr>`
      )
      .join('');

    bodyParts.push(`
      <w:tbl>
        <w:tblPr>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="D97706"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="D97706"/>
            <w:left w:val="single" w:sz="6" w:space="0" w:color="D97706"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="D97706"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
          </w:tblBorders>
          <w:bidiVisual/>
          <w:jc w:val="center"/>
        </w:tblPr>
        <w:tr>${headerCells}</w:tr>
        ${rowXml}
      </w:tbl>
    `);
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
      <w:bidi/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="ar-DZ" w:bidi="ar-DZ"/>
        <w:rtl/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:bidi/>
        <w:jc w:val="right"/>
        <w:spacing w:line="320" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: docRelsXml },
  ]);
}

/* ───────────────────────── 2. XLSX Generator (With Formulas) ───────────────────────── */

function colLetter(colIdx: number): string {
  let n = colIdx + 1;
  let str = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    n = Math.floor((n - 1) / 26);
  }
  return str;
}

function generateXlsxBuffer(input: FileGenerationInput): Buffer {
  const sheets =
    input.tables && input.tables.length > 0
      ? input.tables
      : parseMarkdownTablesFromContent(input.content);

  const firstSheet = sheets[0] || {
    name: 'البيانات',
    headers: ['البند', 'القيمة'],
    rows: [['تيدكلت AI', 100]],
    includeFormulas: true,
  };

  const xmlRows: string[] = [];
  let rowIndex = 1;

  // Title Row
  xmlRows.push(
    `<row r="${rowIndex}"><c r="A${rowIndex}" t="inlineStr"><is><t>${escapeXml(input.title)}</t></is></c></row>`
  );
  rowIndex++;

  // Header Row
  const headerStartRow = rowIndex;
  const headerCells = firstSheet.headers
    .map((h, cIdx) => {
      const ref = `${colLetter(cIdx)}${rowIndex}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
    })
    .join('');
  xmlRows.push(`<row r="${rowIndex}">${headerCells}</row>`);
  rowIndex++;

  const dataStartRow = rowIndex;
  const numericCols = new Set<number>();

  for (const row of firstSheet.rows) {
    const cells = row
      .map((val, cIdx) => {
        const ref = `${colLetter(cIdx)}${rowIndex}`;
        if (typeof val === 'number' && Number.isFinite(val)) {
          numericCols.add(cIdx);
          return `<c r="${ref}"><v>${val}</v></c>`;
        }
        const strVal = String(val ?? '');
        if (strVal.startsWith('=')) {
          return `<c r="${ref}"><f>${escapeXml(strVal.slice(1))}</f></c>`;
        }
        return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
      })
      .join('');
    xmlRows.push(`<row r="${rowIndex}">${cells}</row>`);
    rowIndex++;
  }
  const dataEndRow = rowIndex - 1;

  // Add real SUM, AVERAGE, IF summary rows if numeric columns exist
  if (firstSheet.includeFormulas !== false && dataEndRow >= dataStartRow && numericCols.size > 0) {
    // SUM row
    const sumCells: string[] = [];
    sumCells.push(
      `<c r="A${rowIndex}" t="inlineStr"><is><t>المجموع (SUM)</t></is></c>`
    );
    for (const cIdx of numericCols) {
      if (cIdx === 0) continue;
      const col = colLetter(cIdx);
      const ref = `${col}${rowIndex}`;
      sumCells.push(`<c r="${ref}"><f>SUM(${col}${dataStartRow}:${col}${dataEndRow})</f></c>`);
    }
    xmlRows.push(`<row r="${rowIndex}">${sumCells.join('')}</row>`);
    const sumRowIdx = rowIndex;
    rowIndex++;

    // AVERAGE row
    const avgCells: string[] = [];
    avgCells.push(
      `<c r="A${rowIndex}" t="inlineStr"><is><t>المتوسط (AVERAGE)</t></is></c>`
    );
    for (const cIdx of numericCols) {
      if (cIdx === 0) continue;
      const col = colLetter(cIdx);
      const ref = `${col}${rowIndex}`;
      avgCells.push(`<c r="${ref}"><f>AVERAGE(${col}${dataStartRow}:${col}${dataEndRow})</f></c>`);
    }
    xmlRows.push(`<row r="${rowIndex}">${avgCells.join('')}</row>`);
    rowIndex++;

    // IF Evaluation row
    const ifCells: string[] = [];
    ifCells.push(
      `<c r="A${rowIndex}" t="inlineStr"><is><t>التقييم (IF)</t></is></c>`
    );
    for (const cIdx of numericCols) {
      if (cIdx === 0) continue;
      const col = colLetter(cIdx);
      const ref = `${col}${rowIndex}`;
      ifCells.push(
        `<c r="${ref}"><f>IF(${col}${sumRowIdx}&gt;0,"نشط","غير نشط")</f></c>`
      );
    }
    xmlRows.push(`<row r="${rowIndex}">${ifCells.join('')}</row>`);
    rowIndex++;
  }

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/worksheet">
  <sheetViews>
    <sheetView rightToLeft="1" workbookViewId="0"/>
  </sheetViews>
  <sheetData>
    ${xmlRows.join('\n    ')}
  </sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/workbook" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(firstSheet.name.slice(0, 31))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
  ]);
}

/* ───────────────────────── 3. PPTX Generator ───────────────────────── */

function generatePptxBuffer(input: FileGenerationInput): Buffer {
  const slides: Array<{ title: string; bullets: string[] }> = [];
  if (input.slides && input.slides.length > 0) {
    slides.push(...input.slides);
  } else {
    const sections = String(input.content || '').split(/\n(?=#{1,3}\s)/);
    for (const sec of sections) {
      const lines = sec.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const slideTitle = lines[0].replace(/^#{1,6}\s+/, '').slice(0, 80) || input.title;
      const bullets = lines.slice(1, 7).map((b) => b.replace(/^[-*•\d.)]+\s*/, ''));
      slides.push({
        title: slideTitle,
        bullets: bullets.length > 0 ? bullets : [lines[0]],
      });
    }
    if (slides.length === 0) {
      slides.push({
        title: input.title,
        bullets: [input.content || 'عرض تقديمي من تيدكلت AI'],
      });
    }
  }

  const entries: Array<{ name: string; data: string }> = [];
  const slideOverrides: string[] = [];
  const slideRels: string[] = [];
  const slideIdList: string[] = [];

  slides.forEach((slide, idx) => {
    const slideNum = idx + 1;
    const rId = `rId${slideNum + 1}`;
    const paragraphsXml = [
      `<a:p><a:pPr algn="r" rtl="1"/><a:r><a:rPr lang="ar-DZ" sz="2800" b="1"/><a:t>${escapeXml(slide.title)}</a:t></a:r></a:p>`,
      ...slide.bullets.map(
        (b) =>
          `<a:p><a:pPr algn="r" rtl="1"/><a:r><a:rPr lang="ar-DZ" sz="1800"/><a:t>• ${escapeXml(b)}</a:t></a:r></a:p>`
      ),
    ].join('');

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="SlideContent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="5943600"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="1"/>
          <a:lstStyle/>
          ${paragraphsXml}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    entries.push({ name: `ppt/slides/slide${slideNum}.xml`, data: slideXml });
    slideOverrides.push(
      `<Override PartName="/ppt/slides/slide${slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    );
    slideRels.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNum}.xml"/>`
    );
    slideIdList.push(`<p:sldId id="${255 + slideNum}" r:id="${rId}"/>`);
  });

  const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    ${slideIdList.join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  const presentationRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${slideRels.join('\n  ')}
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides.join('\n  ')}
</Types>`;

  entries.push(
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'ppt/presentation.xml', data: presentationXml },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRelsXml }
  );

  return buildZipArchive(entries);
}

/* ───────────────────────── 4. PDF Generator (With Arabic & ToUnicode) ───────────────────────── */

const ARABIC_LETTERS: Record<number, [number, number, number, number, boolean]> = {
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80, false], // Hamza
  0x0622: [0xFE81, 0xFE81, 0xFE82, 0xFE82, false], // Alif with Madda
  0x0623: [0xFE83, 0xFE83, 0xFE84, 0xFE84, false], // Alif with Hamza Above
  0x0624: [0xFE85, 0xFE85, 0xFE86, 0xFE86, false], // Waw with Hamza
  0x0625: [0xFE87, 0xFE87, 0xFE88, 0xFE88, false], // Alif with Hamza Below
  0x0626: [0xFE89, 0xFE8B, 0xFE8C, 0xFE8A, true],  // Ya with Hamza
  0x0627: [0xFE8D, 0xFE8D, 0xFE8E, 0xFE8E, false], // Alif
  0x0628: [0xFE8F, 0xFE91, 0xFE92, 0xFE90, true],  // Ba
  0x0629: [0xFE93, 0xFE93, 0xFE94, 0xFE94, false], // Ta Marbuta
  0x062A: [0xFE95, 0xFE97, 0xFE98, 0xFE96, true],  // Ta
  0x062B: [0xFE99, 0xFE9B, 0xFE9C, 0xFE9A, true],  // Tha
  0x062C: [0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E, true],  // Jim
  0x062D: [0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2, true],  // Hha
  0x062E: [0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6, true],  // Kha
  0x062F: [0xFEA9, 0xFEA9, 0xFEAA, 0xFEAA, false], // Dal
  0x0630: [0xFEAB, 0xFEAB, 0xFEAC, 0xFEAC, false], // Dhal
  0x0631: [0xFEAD, 0xFEAD, 0xFEAE, 0xFEAE, false], // Ra
  0x0632: [0xFEAF, 0xFEAF, 0xFEB0, 0xFEB0, false], // Zay
  0x0633: [0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2, true],  // Sin
  0x0634: [0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6, true],  // Shin
  0x0635: [0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA, true],  // Sad
  0x0636: [0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE, true],  // Dad
  0x0637: [0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2, true],  // Tah
  0x0638: [0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6, true],  // Zah
  0x0639: [0xFEC9, 0xFECB, 0xFECC, 0xFECA, true],  // Ayn
  0x063A: [0xFECD, 0xFECF, 0xFED0, 0xFECE, true],  // Ghayn
  0x0641: [0xFED1, 0xFED3, 0xFED4, 0xFED2, true],  // Fa
  0x0642: [0xFED5, 0xFED7, 0xFED8, 0xFED6, true],  // Qaf
  0x0643: [0xFED9, 0xFEDB, 0xFEDC, 0xFEDA, true],  // Kaf
  0x0644: [0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE, true],  // Lam
  0x0645: [0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2, true],  // Mim
  0x0646: [0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6, true],  // Nun
  0x0647: [0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA, true],  // Ha
  0x0648: [0xFEED, 0xFEED, 0xFEEE, 0xFEEE, false], // Waw
  0x0649: [0xFEEF, 0xFEEF, 0xFEF0, 0xFEF0, false], // Alif Maqsura
  0x064A: [0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2, true],  // Ya
};

function reshapeArabicLine(text: string): string {
  const chars = Array.from(String(text || ''));
  const reshaped: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    const entry = ARABIC_LETTERS[code];
    if (!entry) {
      reshaped.push(chars[i]);
      continue;
    }

    // Lam-Alif ligatures
    if (code === 0x0644 && i + 1 < chars.length) {
      const nextCode = chars[i + 1].charCodeAt(0);
      let lamAlifForm: [number, number] | null = null;
      if (nextCode === 0x0622) lamAlifForm = [0xFEF5, 0xFEF6];
      else if (nextCode === 0x0623) lamAlifForm = [0xFEF7, 0xFEF8];
      else if (nextCode === 0x0625) lamAlifForm = [0xFEF9, 0xFEFA];
      else if (nextCode === 0x0627) lamAlifForm = [0xFEFB, 0xFEFC];

      if (lamAlifForm) {
        const prevCode = i > 0 ? chars[i - 1].charCodeAt(0) : 0;
        const prevEntry = ARABIC_LETTERS[prevCode];
        const connectsWithPrev = prevEntry && prevEntry[4];
        reshaped.push(String.fromCharCode(connectsWithPrev ? lamAlifForm[1] : lamAlifForm[0]));
        i++;
        continue;
      }
    }

    const prevCode = i > 0 ? chars[i - 1].charCodeAt(0) : 0;
    const prevEntry = ARABIC_LETTERS[prevCode];
    const connectsWithPrev = prevEntry && prevEntry[4];

    const nextCode = i + 1 < chars.length ? chars[i + 1].charCodeAt(0) : 0;
    const nextEntry = ARABIC_LETTERS[nextCode];
    const connectsWithNext = entry[4] && nextEntry !== undefined;

    let glyphCode: number;
    if (connectsWithPrev && connectsWithNext) {
      glyphCode = entry[2];
    } else if (connectsWithPrev) {
      glyphCode = entry[3];
    } else if (connectsWithNext) {
      glyphCode = entry[1];
    } else {
      glyphCode = entry[0];
    }
    reshaped.push(String.fromCharCode(glyphCode));
  }

  // Reverse words containing Arabic for visual RTL drawing
  const hasArabic = reshaped.some((c) => /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]/.test(c));
  if (hasArabic) {
    return reshaped.reverse().join('');
  }
  return reshaped.join('');
}

function toUtf16Hex(text: string): string {
  const buf = Buffer.alloc(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    buf.writeUInt16BE(text.charCodeAt(i), i * 2);
  }
  return buf.toString('hex').toUpperCase();
}

function toActualTextHex(str: string): string {
  const buf = Buffer.alloc(2 + str.length * 2);
  buf.writeUInt16BE(0xfeff, 0); // UTF-16BE BOM
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16BE(str.charCodeAt(i), 2 + i * 2);
  }
  return '<' + buf.toString('hex').toUpperCase() + '>';
}

function buildToUnicodeCMap(): string {
  const mappings: string[] = [];
  // 1. ASCII range (English letters, numbers, punctuation)
  for (let c = 0x0020; c <= 0x007e; c++) {
    const hex = c.toString(16).padStart(4, '0').toUpperCase();
    mappings.push(`<${hex}> <${hex}>`);
  }
  // 2. Canonical Arabic range (0x0600 - 0x06FF: letters, Arabic digits, Arabic punctuation)
  for (let c = 0x0600; c <= 0x06ff; c++) {
    const hex = c.toString(16).padStart(4, '0').toUpperCase();
    mappings.push(`<${hex}> <${hex}>`);
  }
  // 3. Typographical punctuation & bullets
  for (const c of [0x2013, 0x2014, 0x2022, 0x2026, 0x00ab, 0x00bb]) {
    const hex = c.toString(16).padStart(4, '0').toUpperCase();
    mappings.push(`<${hex}> <${hex}>`);
  }
  // 4. Arabic letter presentation forms mapping back to canonical Unicode
  for (const [codeStr, entry] of Object.entries(ARABIC_LETTERS)) {
    const origCode = Number(codeStr).toString(16).padStart(4, '0').toUpperCase();
    const uniqueForms = Array.from(new Set([entry[0], entry[1], entry[2], entry[3]]));
    for (const form of uniqueForms) {
      const formHex = form.toString(16).padStart(4, '0').toUpperCase();
      mappings.push(`<${formHex}> <${origCode}>`);
    }
  }
  // 5. Lam-Alif ligatures
  mappings.push('<FEF5> <06440622>', '<FEF6> <06440622>');
  mappings.push('<FEF7> <06440623>', '<FEF8> <06440623>');
  mappings.push('<FEF9> <06440625>', '<FEFA> <06440625>');
  mappings.push('<FEFB> <06440627>', '<FEFC> <06440627>');

  // Split into chunks of max 100 entries per block (strict ISO 32000-1 requirement)
  const chunks: string[] = [];
  const chunkSize = 100;
  for (let i = 0; i < mappings.length; i += chunkSize) {
    const chunk = mappings.slice(i, i + chunkSize);
    chunks.push(`${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar`);
  }

  return `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Custom-ToUnicode def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${chunks.join('\n')}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
}

interface EmbeddedFontCache {
  fontName: string;
  fontRaw: Buffer;
  fontDeflated: Buffer;
  cidToGidDeflated: Buffer;
}

let cachedArabicFont: EmbeddedFontCache | null = null;

function getEmbeddedArabicFont(): EmbeddedFontCache | null {
  if (cachedArabicFont) {
    return cachedArabicFont;
  }
  try {
    const fontPath = path.join(process.cwd(), 'src', 'server', 'assets', 'fonts', 'Amiri-Regular.ttf');
    if (!fs.existsSync(fontPath)) {
      return null;
    }
    const fontRaw = fs.readFileSync(fontPath);
    const fontDeflated = zlib.deflateSync(fontRaw);

    // Parse TrueType format 4 cmap subtable for exact character to glyph ID mapping
    const numTables = fontRaw.readUInt16BE(4);
    let cmapOffset = 0;
    for (let i = 0; i < numTables; i++) {
      const tag = fontRaw.toString('ascii', 12 + i * 16, 16 + i * 16);
      if (tag === 'cmap') {
        cmapOffset = fontRaw.readUInt32BE(12 + i * 16 + 8);
        break;
      }
    }

    if (cmapOffset === 0) return null;

    const numSubtables = fontRaw.readUInt16BE(cmapOffset + 2);
    let subOffset = 0;
    for (let i = 0; i < numSubtables; i++) {
      const platformID = fontRaw.readUInt16BE(cmapOffset + 4 + i * 8);
      const encodingID = fontRaw.readUInt16BE(cmapOffset + 6 + i * 8);
      if (platformID === 3 && encodingID === 1) {
        subOffset = cmapOffset + fontRaw.readUInt32BE(cmapOffset + 8 + i * 8);
        break;
      }
    }

    if (subOffset === 0) return null;

    const segCountX2 = fontRaw.readUInt16BE(subOffset + 6);
    const segCount = segCountX2 / 2;
    const endCodes: number[] = [];
    for (let i = 0; i < segCount; i++) endCodes.push(fontRaw.readUInt16BE(subOffset + 14 + i * 2));
    const startCodesOffset = subOffset + 16 + segCountX2;
    const startCodes: number[] = [];
    for (let i = 0; i < segCount; i++) startCodes.push(fontRaw.readUInt16BE(startCodesOffset + i * 2));
    const idDeltasOffset = startCodesOffset + segCountX2;
    const idDeltas: number[] = [];
    for (let i = 0; i < segCount; i++) idDeltas.push(fontRaw.readInt16BE(idDeltasOffset + i * 2));
    const idRangeOffsetsOffset = idDeltasOffset + segCountX2;
    const idRangeOffsets: number[] = [];
    for (let i = 0; i < segCount; i++) idRangeOffsets.push(fontRaw.readUInt16BE(idRangeOffsetsOffset + i * 2));

    const getGid = (code: number): number => {
      for (let i = 0; i < segCount; i++) {
        if (endCodes[i] >= code) {
          if (startCodes[i] > code) return 0;
          if (idRangeOffsets[i] === 0) {
            return (code + idDeltas[i]) & 0xFFFF;
          } else {
            const ro = idRangeOffsets[i];
            const glyphIdxOffset = (idRangeOffsetsOffset + i * 2) + ro + (code - startCodes[i]) * 2;
            const gid = fontRaw.readUInt16BE(glyphIdxOffset);
            return gid !== 0 ? (gid + idDeltas[i]) & 0xFFFF : 0;
          }
        }
      }
      return 0;
    };

    const cidToGidBuf = Buffer.alloc(65536 * 2);
    for (let c = 0; c < 65536; c++) {
      cidToGidBuf.writeUInt16BE(getGid(c), c * 2);
    }
    const cidToGidDeflated = zlib.deflateSync(cidToGidBuf);

    cachedArabicFont = {
      fontName: 'Amiri-Regular',
      fontRaw,
      fontDeflated,
      cidToGidDeflated,
    };
    return cachedArabicFont;
  } catch (err) {
    console.error('Failed to load embedded Arabic font:', err);
    return null;
  }
}

function generatePdfBuffer(input: FileGenerationInput): Buffer {
  const embedded = getEmbeddedArabicFont();
  const fontName = embedded?.fontName || 'Amiri-Regular';

  const rawLines = [
    input.title,
    '—'.repeat(Math.min(40, input.title.length + 8)),
    ...String(input.content || '').split(/\r?\n/),
  ];

  const streamLines: string[] = ['BT', '/F1 13 Tf', '50 790 Td', '18 TL'];
  const maxLines = 45;
  for (const line of rawLines.slice(0, maxLines)) {
    const clean = line.trim();
    if (!clean) {
      streamLines.push('T*');
      continue;
    }
    const reshaped = reshapeArabicLine(clean);
    const hex = toUtf16Hex(reshaped);
    const actualTextParam = toActualTextHex(clean);
    streamLines.push(`/Span << /ActualText ${actualTextParam} >> BDC`);
    streamLines.push(`<${hex}> Tj`);
    streamLines.push('EMC');
    streamLines.push('T*');
  }
  streamLines.push('ET');
  const contentStream = streamLines.join('\n') + '\n';
  const streamBuf = Buffer.from(contentStream, 'utf8');

  // Full UTF-8 text payload for universal extraction
  const fullUtf8Payload = Buffer.from(`${input.title}\n\n${input.content}`, 'utf8');
  const toUnicodeCMapStr = buildToUnicodeCMap();
  const toUnicodeBuf = Buffer.from(toUnicodeCMapStr, 'utf8');

  const objects: Array<{ id: number; data: Buffer }> = [];

  // 1: Catalog (Tagged PDF for ActualText copy-paste support)
  objects.push({
    id: 1,
    data: Buffer.from(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Metadata 7 0 R /MarkInfo << /Marked true >> >>\nendobj\n`, 'utf8'),
  });

  // 2: Pages
  objects.push({
    id: 2,
    data: Buffer.from(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`, 'utf8'),
  });

  // 3: Page
  objects.push({
    id: 3,
    data: Buffer.from(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
      'utf8'
    ),
  });

  // 4: Content Stream
  const obj4Header = Buffer.from(`4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`, 'utf8');
  const obj4Footer = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
  objects.push({
    id: 4,
    data: Buffer.concat([obj4Header, streamBuf, obj4Footer]),
  });

  // 5: Type0 Font with Identity-H and ToUnicode CMap
  objects.push({
    id: 5,
    data: Buffer.from(
      `5 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /${fontName} /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 8 0 R >>\nendobj\n`,
      'utf8'
    ),
  });

  // 6: CIDFontType2 (Links to FontDescriptor and embedded CIDToGIDMap)
  const cidFontExtra = embedded
    ? `/FontDescriptor 9 0 R /CIDToGIDMap 10 0 R`
    : `/CIDToGIDMap /Identity`;
  objects.push({
    id: 6,
    data: Buffer.from(
      `6 0 obj\n<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${fontName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ${cidFontExtra} /W [ 0 65535 600 ] >>\nendobj\n`,
      'utf8'
    ),
  });

  // 7: Full UTF-8 Payload & Metadata
  const obj7Header = Buffer.from(
    `7 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${fullUtf8Payload.length} >>\nstream\n`,
    'utf8'
  );
  const obj7Footer = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
  objects.push({
    id: 7,
    data: Buffer.concat([obj7Header, fullUtf8Payload, obj7Footer]),
  });

  // 8: ToUnicode CMap Stream
  const obj8Header = Buffer.from(`8 0 obj\n<< /Length ${toUnicodeBuf.length} >>\nstream\n`, 'utf8');
  const obj8Footer = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
  objects.push({
    id: 8,
    data: Buffer.concat([obj8Header, toUnicodeBuf, obj8Footer]),
  });

  if (embedded) {
    // 9: FontDescriptor with FontFile2 reference
    objects.push({
      id: 9,
      data: Buffer.from(
        `9 0 obj\n<< /Type /FontDescriptor /FontName /${fontName} /Flags 4 /FontBBox [-438 -900 11467 1815] /ItalicAngle 0 /Ascent 1124 /Descent -634 /CapHeight 700 /StemV 80 /FontFile2 11 0 R >>\nendobj\n`,
        'utf8'
      ),
    });

    // 10: CIDToGIDMap Stream (deflated)
    const obj10Header = Buffer.from(
      `10 0 obj\n<< /Length ${embedded.cidToGidDeflated.length} /Filter /FlateDecode >>\nstream\n`,
      'utf8'
    );
    const obj10Footer = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
    objects.push({
      id: 10,
      data: Buffer.concat([obj10Header, embedded.cidToGidDeflated, obj10Footer]),
    });

    // 11: Embedded FontFile2 (Amiri-Regular TrueType font program)
    const obj11Header = Buffer.from(
      `11 0 obj\n<< /Length ${embedded.fontDeflated.length} /Length1 ${embedded.fontRaw.length} /Filter /FlateDecode >>\nstream\n`,
      'utf8'
    );
    const obj11Footer = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
    objects.push({
      id: 11,
      data: Buffer.concat([obj11Header, embedded.fontDeflated, obj11Footer]),
    });
  }

  let offset = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'utf8').length;
  const offsets: number[] = [];
  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'utf8')];

  for (const obj of objects) {
    offsets.push(offset);
    parts.push(obj.data);
    offset += obj.data.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'utf8'));

  return Buffer.concat(parts);
}

/* ───────────────────────── 5. CSV / HTML / MD / TXT ───────────────────────── */

function generateCsvBuffer(input: FileGenerationInput): Buffer {
  const sheets =
    input.tables && input.tables.length > 0
      ? input.tables
      : parseMarkdownTablesFromContent(input.content);
  const firstSheet = sheets[0];
  const escapeCsvCell = (val: string | number): string => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows: string[] = [];
  if (firstSheet) {
    rows.push(firstSheet.headers.map(escapeCsvCell).join(','));
    for (const r of firstSheet.rows) {
      rows.push(r.map(escapeCsvCell).join(','));
    }
  } else {
    rows.push('العنوان,المحتوى');
    rows.push(`${escapeCsvCell(input.title)},${escapeCsvCell(input.content)}`);
  }
  // Prepend UTF-8 BOM so Excel opens Arabic CSV cleanly
  return Buffer.from('\uFEFF' + rows.join('\r\n'), 'utf8');
}

function generateHtmlBuffer(input: FileGenerationInput): Buffer {
  const paragraphs = String(input.content || '')
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (t.startsWith('# ')) return `<h1>${escapeXml(t.slice(2))}</h1>`;
      if (t.startsWith('## ')) return `<h2>${escapeXml(t.slice(3))}</h2>`;
      if (t.startsWith('### ')) return `<h3>${escapeXml(t.slice(4))}</h3>`;
      if (/^[-*•]\s+/.test(t)) return `<li>${escapeXml(t.replace(/^[-*•]\s+/, ''))}</li>`;
      return `<p>${escapeXml(t)}</p>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(input.title)} — تيدكلت AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif;
      background: #FAF6F0;
      color: #1F2937;
      margin: 0;
      padding: 24px;
      line-height: 1.8;
      direction: rtl;
    }
    .toolbar {
      max-width: 860px;
      margin: 0 auto 20px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #FFFFFF;
      padding: 12px 20px;
      border-radius: 14px;
      border: 1px solid #E5DCCB;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .toolbar-title {
      font-weight: 800;
      font-size: 14px;
      color: #92400E;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.2s;
    }
    .btn-print {
      background: #D97706;
      color: #FFFFFF;
    }
    .btn-print:hover {
      background: #B45309;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E5DCCB;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 8px 24px rgba(146, 64, 14, 0.06);
    }
    h1 { color: #92400E; border-bottom: 2px solid #FDE68A; padding-bottom: 12px; margin-top: 0; font-size: 26px; }
    h2 { color: #B45309; margin-top: 24px; font-size: 20px; border-bottom: 1px solid #FEF3C7; padding-bottom: 6px; }
    h3 { color: #92400E; margin-top: 20px; font-size: 16px; }
    p { margin: 12px 0; font-size: 14px; color: #374151; }
    li { margin: 6px 0; font-size: 14px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { border: 1px solid #E5DCCB; padding: 10px 14px; text-align: right; font-size: 13px; }
    th { background: #FEF3C7; color: #92400E; font-weight: 800; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #E5DCCB; font-size: 11.5px; color: #6B7280; text-align: center; }

    @media print {
      body {
        background: #FFFFFF !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .toolbar {
        display: none !important;
      }
      .container {
        max-width: 100% !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      @page {
        size: A4;
        margin: 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">📄 مستند تيدكلت AI — نسخة منسقة للطباعة و PDF</div>
    <div>
      <button onclick="window.print()" class="btn btn-print">🖨️ طباعة أو حفظ كـ PDF</button>
    </div>
  </div>
  <div class="container">
    <h1>${escapeXml(input.title)}</h1>
    ${paragraphs}
    <div class="footer">تم الإنشاء بواسطة تيدكلت AI • عين صالح، الجزائر • ${new Date().toLocaleDateString('ar-DZ')}</div>
  </div>
</body>
</html>`;
  return Buffer.from(html, 'utf8');
}

/* ───────────────────────── Main Generator Entrypoint ───────────────────────── */

const MIME_MAP: Record<SupportedFileFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  html: 'text/html; charset=utf-8',
};

function sanitizeFilename(title: string, format: SupportedFileFormat): string {
  const cleaned = String(title || 'tidikelt-document')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 60)
    .replace(/^_+|_+$/g, '');
  return `${cleaned || 'tidikelt_file'}.${format}`;
}

function loadGeneratedIndex(): Record<string, GeneratedFileMetadata & { diskPath: string }> {
  try {
    ensureGeneratedDir();
    if (fs.existsSync(GENERATED_INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(GENERATED_INDEX_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return {};
}

function saveGeneratedIndex(index: Record<string, GeneratedFileMetadata & { diskPath: string }>): void {
  ensureGeneratedDir();
  fs.writeFileSync(GENERATED_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

export function generateAndVerifyFile(input: FileGenerationInput): GeneratedFileMetadata {
  ensureGeneratedDir();
  const id = crypto.randomBytes(8).toString('hex');
  const format = input.format;
  const filename = sanitizeFilename(input.title, format);
  const diskFilename = `${id}_${filename}`;
  const diskPath = path.join(GENERATED_FILES_DIR, diskFilename);

  let fileBuffer: Buffer;
  switch (format) {
    case 'docx':
      fileBuffer = generateDocxBuffer(input);
      break;
    case 'xlsx':
      fileBuffer = generateXlsxBuffer(input);
      break;
    case 'pptx':
      fileBuffer = generatePptxBuffer(input);
      break;
    case 'pdf':
      fileBuffer = generatePdfBuffer(input);
      break;
    case 'csv':
      fileBuffer = generateCsvBuffer(input);
      break;
    case 'html':
      fileBuffer = generateHtmlBuffer(input);
      break;
    case 'md':
      fileBuffer = Buffer.from(`\uFEFF# ${input.title}\n\n${input.content}`, 'utf8');
      break;
    case 'txt':
    default:
      fileBuffer = Buffer.from(`\uFEFF${input.title}\n${'='.repeat(40)}\n\n${input.content}`, 'utf8');
      break;
  }

  fs.writeFileSync(diskPath, fileBuffer);

  // Strict verification before returning link
  const exists = fs.existsSync(diskPath);
  const stats = exists ? fs.statSync(diskPath) : null;
  if (!exists || !stats || stats.size <= 0) {
    throw new Error('فشل التحقق من الملف المنشأ على الخادم (الحجم صفر أو الملف غير موجود).');
  }

  const metadata: GeneratedFileMetadata = {
    id,
    filename,
    format,
    mimeType: MIME_MAP[format] || 'application/octet-stream',
    sizeBytes: stats.size,
    createdAt: new Date().toISOString(),
    downloadUrl: `/api/files/download/${id}`,
    previewUrl: format === 'html' || format === 'pdf' || format === 'txt' || format === 'md'
      ? `/api/files/download/${id}?inline=1`
      : undefined,
    title: input.title,
    verified: true,
  };

  const index = loadGeneratedIndex();
  index[id] = { ...metadata, diskPath };
  saveGeneratedIndex(index);

  return metadata;
}

export function getGeneratedFileById(id: string): (GeneratedFileMetadata & { diskPath: string }) | null {
  const index = loadGeneratedIndex();
  const entry = index[id];
  if (!entry || !fs.existsSync(entry.diskPath)) {
    return null;
  }
  return entry;
}
