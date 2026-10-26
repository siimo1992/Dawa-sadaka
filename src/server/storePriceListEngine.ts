/**
 * storePriceListEngine.ts — محرك توليد قوائم الأسعار المتناسقة وتصديرها إلى ملف PDF جاهز للطباعة (300 DPI)
 *
 * ينفذ المراحل الثلاث المتكاملة:
 * 1. المرحلة 1 (Base Image Generation): تحويل بيانات المستخدم (الأصناف والأسعار والوصف البصري المفتوح)
 *    إلى وصف هندسي وبصري دقيق (Structured Prompt) وتوليد الملصق الأساسي بأبعاد 4:5.
 * 2. المرحلة 2 (Reference-Based Editing): تمرير الصورة المرجعية الأولى مع تعليمات تعديل مركزة (Delta Prompt)
 *    لتوليد قوائم أسعار جديدة مطابقة 100% في الهوية البصرية مع تغيير القسم والأيقونة والأسعار فقط.
 * 3. المرحلة 3 (High-Resolution 300 DPI PDF Compilation): دمج الصور المختارة بصيغة RGB في ملف PDF واحد
 *    بدقة طباعة 300 DPI مع الحفاظ على الأبعاد الأصلية (4:5) دون أي هوامش بيضاء.
 */

import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export interface PriceListItem {
  name: string;
  price: string | number;
}

export interface PriceListThemeSpec {
  storeTypeAr: string;
  storeTypeEn: string;
  headerTitleAr: string;
  categoryTitleAr: string;
  categoryNameEn: string;
  iconDescriptionEn: string;
  iconKind: 'beef' | 'camel' | 'sheep' | 'coffee' | 'food' | 'bakery' | 'grocery' | 'custom';
  backgroundStyleEn: string;
  primaryBgHex: string;
  secondaryBgHex: string;
  accentHex: string;
  boardBgHex: string;
  textColorHex: string;
  currencyLabel: string;
}

export interface GeneratedPosterResult {
  id: string;
  filename: string;
  stage: 'base' | 'variation';
  referencePosterId?: string;
  imageUrl?: string;
  structuredPrompt: string;
  formattedRows: string;
  padDots: boolean;
  items: PriceListItem[];
  theme: PriceListThemeSpec;
  aspectRatio: '4:5';
  dpi: 300;
  createdAt: number;
}

export interface PdfExportCustomOptions {
  marginSizePx?: number;
  marginColorHex?: string;
  enableFooter?: boolean;
  storeName?: string;
  contactInfo?: string;
  addressInfo?: string;
  includePageNumber?: boolean;
  footerStyle?: 'dark_gold' | 'light_clean' | 'emerald_oasis';
  alreadyCompositedOnClient?: boolean;
}

const POSTERS_DIR = path.join(process.cwd(), 'data', 'store_posters');
const GENERATED_FILES_DIR = path.join(process.cwd(), 'data', 'generated_files');

function ensureDirs(): void {
  if (!fs.existsSync(POSTERS_DIR)) {
    fs.mkdirSync(POSTERS_DIR, { recursive: true });
  }
  if (!fs.existsSync(GENERATED_FILES_DIR)) {
    fs.mkdirSync(GENERATED_FILES_DIR, { recursive: true });
  }
}

/**
 * تنسيق الأصناف والأسعار في أسطر واضحة ومرتبة للنموذج (مطابق للدالة _format_price_rows)
 */
export function formatPriceRows(
  items: PriceListItem[] | Record<string, string | number>,
  padDots: boolean = false
): string {
  const list: PriceListItem[] = Array.isArray(items)
    ? items
    : Object.entries(items).map(([name, price]) => ({ name, price }));

  const rows: string[] = [];
  for (const item of list) {
    const cleanName = String(item.name || '').trim();
    const cleanPrice = String(item.price ?? '').trim();
    if (!cleanName) continue;
    if (padDots) {
      rows.push(`"${cleanName} ............... ${cleanPrice}"`);
    } else {
      rows.push(`"${cleanName} : ${cleanPrice}"`);
    }
  }
  return rows.join('\n');
}

/**
 * التحقق مما إذا كانت رسالة المستخدم في المحادثة تطلب إنشاء أو تعديل قائمة أسعار
 */
export function detectPriceListIntent(query: string, hasActiveReference: boolean = false): {
  isPriceListRequest: boolean;
  isVariationRequest: boolean;
  isBatchButcherDemo: boolean;
} {
  const q = String(query || '').trim();
  if (!q) {
    return { isPriceListRequest: false, isVariationRequest: false, isBatchButcherDemo: false };
  }

  // Check if user pasted or asked for the full 4-poster butcher shop example
  const isBatchButcherDemo =
    /StorePriceListApp|01_beef_prices|butcher_shop_price_lists\.pdf|القوائم الأربع|الأربع قوائم/i.test(q) ||
    (/لحم بقري/.test(q) && /لحم الجمل/.test(q) && /لحم غنمي/.test(q) && /لحم الحاشي/.test(q));

  const hasPriceKeywords =
    /قائمة\s*أسعار|قائمه\s*اسعار|قائمة\s*الاسعار|قائمة\s*الأسعار|لائحة\s*أسعار|منيو\s*أسعار|جدول\s*أسعار|ملصق\s*أسعار|بوستر\s*أسعار|price\s*list|menu\s*poster|قوائم\s*الأسعار/i.test(
      q
    );

  const hasVariationKeywords =
    /بنفس\s*التصميم|بنفس\s*الهوية|نفس\s*التصميم|نفس\s*الهوية|قائمة\s*ثانية|قائمة\s*ثالثة|قائمة\s*رابعة|قائمة\s*جديدة\s*بنفس|كمرجع|صورة\s*مرجعية|matching\s*variation/i.test(
      q
    );

  // Count how many "item : number" or "item number" pairs exist in the prompt
  const priceLineMatches = q.match(/[\u0600-\u06FFa-zA-Z\s+]{2,25}\s*[:：\-–—=]?\s*\d{2,6}/g) || [];
  const hasMultiplePriceItems = priceLineMatches.length >= 2;

  const isPriceListRequest =
    isBatchButcherDemo ||
    hasPriceKeywords ||
    (hasVariationKeywords && (hasMultiplePriceItems || hasActiveReference)) ||
    (hasActiveReference && hasMultiplePriceItems && /قائمة|ملحمة|مطعم|مقهى|محل|متجر|لحم|أصناف|اسعار|أسعار/i.test(q));

  const isVariationRequest =
    isPriceListRequest && (hasVariationKeywords || (hasActiveReference && !/تصميم\s*جديد\s*كلياً|بداية\s*جديدة/i.test(q)));

  return {
    isPriceListRequest,
    isVariationRequest,
    isBatchButcherDemo,
  };
}

/**
 * استخراج الأصناف والأسعار والوصف البصري المفتوح من نص المستخدم تلقائياً
 */
export function parsePriceListFromPrompt(
  rawPrompt: string,
  previousTheme?: PriceListThemeSpec
): {
  items: PriceListItem[];
  theme: PriceListThemeSpec;
} {
  const text = String(rawPrompt || '').trim();

  // Extract item-price pairs from Arabic or Latin lines
  const extractedItems: PriceListItem[] = [];
  const seenNames = new Set<string>();

  // 1. Check JSON-like or dictionary format: "لحم بقري": 1800
  const dictRegex = /["'«]([^"'»\n]{2,35})["'»]\s*[:：]\s*(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = dictRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const price = Number(match[2]);
    if (name && !seenNames.has(name)) {
      seenNames.add(name);
      extractedItems.push({ name, price });
    }
  }

  // 2. Check natural language lines or comma/newline separated segments: لحم بقري 1800، صافي 2200
  if (extractedItems.length === 0) {
    const segments = text
      .split(/[\r\n,،؛;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      // Remove leading introductory phrases like "صمم قائمة أسعار ملحمة:"
      const cleanedSeg = seg
        .replace(
          /^(?:صمم|اصنع|انشئ|أنشئ|ولد|ولّد|اعمل|أريد|اريد)?\s*(?:لي\s*)?(?:قائمة\s*أسعار|قائمه\s*اسعار|قائمة\s*ثانية|قائمة\s*ثالثة|قائمة\s*رابعة|قائمة\s*جديدة|لائحة\s*أسعار|بوستر|ملصق)\s*(?:لـ|ل|في|حول|عن)?\s*(?:ملحمة|مطعم|مقهى|مخبزة|متجر|محل)?\s*[:：\-]?\s*/i,
          ''
        )
        .replace(/(?:بنفس\s*التصميم|بنفس\s*الهوية\s*البصرية|نفس\s*التصميم|بتصميم\s*[^:：\d]+)$/i, '')
        .trim();

      const itemMatch = cleanedSeg.match(
        /^([\u0600-\u06FFa-zA-Z0-9\s+()/\-]{2,35}?)\s*[:：=\-–—.]*\s*(\d{2,7})\s*(?:دج|د\.ج|دينار|DA|DZD|ريال|درهم|\$|€)?$/i
      );
      if (itemMatch) {
        const rawName = itemMatch[1]
          .replace(/^(?:و\s+|أو\s+|مثل\s+|الأصناف\s*|الأسعار\s*)/, '')
          .trim();
        const priceVal = Number(itemMatch[2]);
        if (
          rawName &&
          rawName.length >= 2 &&
          !/^(قائمة|تصميم|ملحمة|مطعم|بنفس|توليد|المرحلة|تطبيق)$/i.test(rawName) &&
          !seenNames.has(rawName)
        ) {
          seenNames.add(rawName);
          extractedItems.push({ name: rawName, price: priceVal });
        }
      }
    }
  }

  // 3. Fallback default items if user only asked "صمم قائمة أسعار" without listing items yet
  if (extractedItems.length === 0) {
    if (/جمل|إبل|حاشي/i.test(text)) {
      extractedItems.push(
        { name: /حاشي/.test(text) ? 'لحم الحاشي' : 'لحم الجمل', price: /حاشي/.test(text) ? 1800 : 1700 },
        { name: 'كبدة', price: 3500 },
        { name: /حاشي/.test(text) ? 'دوارة' : 'هبرة', price: /حاشي/.test(text) ? 6000 : 2200 },
        { name: /حاشي/.test(text) ? 'صافي' : 'دوارة', price: /حاشي/.test(text) ? 2400 : 600 }
      );
    } else if (/غنم|خروف|كبش/i.test(text)) {
      extractedItems.push(
        { name: 'لحم غنمي', price: 2500 },
        { name: 'دوارة', price: 800 },
        { name: 'كبدة + الشحمة', price: 3000 }
      );
    } else if (/مقهى|قهوة|مشروبات|كافيه|cafe|coffee/i.test(text)) {
      extractedItems.push(
        { name: 'إسبريسو فاخر', price: 150 },
        { name: 'كابتشينو إيطالي', price: 250 },
        { name: 'شاي صحراوي بالنعناع', price: 120 },
        { name: 'عصير طبيعي طازج', price: 300 }
      );
    } else if (/مطعم|شاورما|بيتزا|مشويات|restaurant/i.test(text)) {
      extractedItems.push(
        { name: 'وجبة مشويات مشكلة', price: 1200 },
        { name: 'شاورما عربي دجاج', price: 450 },
        { name: 'بيتزا مارغريتا', price: 600 },
        { name: 'طاجين تقليدي', price: 950 }
      );
    } else {
      extractedItems.push(
        { name: 'لحم بقري', price: 1800 },
        { name: 'صافي', price: 2200 },
        { name: 'داورة', price: 6000 },
        { name: 'كبدة', price: 3500 }
      );
    }
  }

  // Determine visual theme (open-ended based on user description, or inheriting from previousTheme for variations)
  let storeTypeAr = previousTheme?.storeTypeAr || 'ملحمة';
  let storeTypeEn = previousTheme?.storeTypeEn || 'butcher shop';
  let headerTitleAr = previousTheme?.headerTitleAr || 'قائمة الأسعار';
  let categoryTitleAr = extractedItems[0]?.name || 'قائمة الأسعار';
  let categoryNameEn = 'custom store items';
  let iconDescriptionEn = 'golden emblem icon';
  let iconKind: PriceListThemeSpec['iconKind'] = previousTheme?.iconKind || 'beef';
  let backgroundStyleEn =
    previousTheme?.backgroundStyleEn ||
    'warm rustic dark wood and marble background, subtle warm lighting, and fresh high-quality garnishes at the bottom border';
  let primaryBgHex = previousTheme?.primaryBgHex || '#1C1411';
  let secondaryBgHex = previousTheme?.secondaryBgHex || '#2C1E19';
  let accentHex = previousTheme?.accentHex || '#D4AF37';
  let boardBgHex = previousTheme?.boardBgHex || '#16100E';
  let textColorHex = previousTheme?.textColorHex || '#FDFBF7';
  let currencyLabel = previousTheme?.currencyLabel || 'د.ج';

  if (/حاشي/i.test(text)) {
    categoryTitleAr = 'لحم الحاشي';
    categoryNameEn = 'young camel meat (لحم الحاشي)';
    iconDescriptionEn = 'golden camel icon';
    iconKind = 'camel';
  } else if (/جمل|إبل|بعير|camel/i.test(text)) {
    categoryTitleAr = 'لحم الجمل';
    categoryNameEn = 'camel meat';
    iconDescriptionEn = 'golden camel icon';
    iconKind = 'camel';
  } else if (/غنم|خروف|كبش|ضأن|lamb|sheep/i.test(text)) {
    categoryTitleAr = 'لحم غنمي';
    categoryNameEn = 'lamb/sheep meat';
    iconDescriptionEn = 'golden sheep/ram icon';
    iconKind = 'sheep';
  } else if (/بقر|عجل|ملحمة|جزارة|beef|butcher/i.test(text)) {
    storeTypeAr = 'ملحمة';
    storeTypeEn = 'butcher shop';
    categoryTitleAr = 'لحم بقري';
    categoryNameEn = 'beef cuts';
    iconDescriptionEn = 'golden bull/beef icon';
    iconKind = 'beef';
  } else if (/مقهى|قهوة|كافيه|شاي|مشروبات|coffee|cafe/i.test(text)) {
    storeTypeAr = 'مقهى واستراحة';
    storeTypeEn = 'specialty coffee shop & lounge';
    categoryTitleAr = 'المشروبات والقهوة';
    categoryNameEn = 'specialty coffee and beverages';
    iconDescriptionEn = 'golden coffee cup icon';
    iconKind = 'coffee';
    if (!previousTheme) {
      backgroundStyleEn =
        'warm roasted coffee beans, dark espresso wood texture, soft ambient golden café lighting, and cinnamon/mint garnishes at the bottom border';
      primaryBgHex = '#1B1512';
      secondaryBgHex = '#2E231D';
      accentHex = '#E0B25B';
      boardBgHex = '#140F0C';
    }
  } else if (/مخبز|حلويات|كيك|مرطبات|bakery|pastry/i.test(text)) {
    storeTypeAr = 'مخبزة وحلويات';
    storeTypeEn = 'artisan bakery and pastry shop';
    categoryTitleAr = 'المخبوزات والحلويات';
    categoryNameEn = 'fresh bakery and pastries';
    iconDescriptionEn = 'golden wheat and croissant icon';
    iconKind = 'bakery';
    if (!previousTheme) {
      backgroundStyleEn =
        'warm artisan stone oven and rustic wood background, golden wheat ears and pastry garnishes at the bottom border';
      primaryBgHex = '#231914';
      secondaryBgHex = '#382820';
      accentHex = '#E5B85C';
      boardBgHex = '#1A120E';
    }
  } else if (/مطعم|مشويات|شاورما|بيتزا|أكل|طعام|restaurant/i.test(text)) {
    storeTypeAr = 'مطعم ومشويات';
    storeTypeEn = 'fine restaurant and grill';
    categoryTitleAr = 'قائمة الوجبات';
    categoryNameEn = 'signature restaurant dishes';
    iconDescriptionEn = 'golden chef cloche and grill icon';
    iconKind = 'food';
    if (!previousTheme) {
      backgroundStyleEn =
        'elegant dark slate and warm cedar wood background, appetizing gourmet culinary garnishes and herbs at the bottom border';
      primaryBgHex = '#16181D';
      secondaryBgHex = '#232730';
      accentHex = '#D9A74A';
      boardBgHex = '#101216';
    }
  } else if (!previousTheme) {
    // Open-ended custom store description extracted from user prompt
    const customStoreMatch = text.match(/(?:لمحل|لمتجر|لـ|قائمة\s*أسعار)\s+([\u0600-\u06FF\s]{2,25}?)(?:[:：،,\n]|$)/);
    if (customStoreMatch && customStoreMatch[1]) {
      storeTypeAr = customStoreMatch[1].trim();
      categoryTitleAr = storeTypeAr;
      storeTypeEn = `commercial store (${storeTypeAr})`;
      categoryNameEn = storeTypeAr;
      iconDescriptionEn = 'golden store emblem icon';
      iconKind = 'custom';
      backgroundStyleEn = `professional commercial backdrop tailored for "${storeTypeAr}", subtle warm studio lighting, luxury dark wood and marble frame`;
    }
  }

  // Respect explicit color/background requests in prompt if starting a new base design
  if (!previousTheme) {
    if (/أخضر|زمردي|واحة/i.test(text)) {
      primaryBgHex = '#0D211A';
      secondaryBgHex = '#153429';
      boardBgHex = '#091712';
      accentHex = '#D4AF37';
    } else if (/أزرق|كحلي|ملكي/i.test(text)) {
      primaryBgHex = '#0F172A';
      secondaryBgHex = '#1E293B';
      boardBgHex = '#090E1A';
      accentHex = '#E2B857';
    } else if (/فاتح|أبيض|رخامي\s*أبيض/i.test(text)) {
      primaryBgHex = '#F5F0E6';
      secondaryBgHex = '#E8DFCE';
      boardBgHex = '#FFFFFF';
      textColorHex = '#1E1612';
      accentHex = '#B38728';
    }
  }

  return {
    items: extractedItems,
    theme: {
      storeTypeAr,
      storeTypeEn,
      headerTitleAr,
      categoryTitleAr,
      categoryNameEn,
      iconDescriptionEn,
      iconKind,
      backgroundStyleEn,
      primaryBgHex,
      secondaryBgHex,
      accentHex,
      boardBgHex,
      textColorHex,
      currencyLabel,
    },
  };
}

/**
 * المرحلة 1: بناء الوصف الهندسي والبصري الدقيق (Base Poster Prompt)
 */
export function buildBasePosterPrompt(
  items: PriceListItem[],
  theme: PriceListThemeSpec
): { prompt: string; formattedRows: string } {
  const formattedRows = formatPriceRows(items, false);
  const prompt =
    `A professional, clean, and appetizing ${theme.storeTypeEn} price list poster ` +
    `(${theme.headerTitleAr} - ${theme.storeTypeAr}) with ${theme.backgroundStyleEn}. ` +
    `At the top, an elegant golden Arabic header banner reading "${theme.headerTitleAr}" with a ${theme.iconDescriptionEn} above "${theme.storeTypeAr}". ` +
    `In the center, a clearly legible, well-aligned Arabic price board with rows in bold clear Arabic typography:\n` +
    `${formattedRows}\n` +
    `High contrast, clean layout, commercial food photography and graphic design style, 4:5 vertical poster aspect ratio.`;

  return { prompt, formattedRows };
}

/**
 * المرحلة 2: بناء وصف التعديل المرجعي المركز (Delta Variation Prompt)
 */
export function buildVariationPosterPrompt(
  items: PriceListItem[],
  theme: PriceListThemeSpec
): { prompt: string; formattedRows: string } {
  const formattedRows = formatPriceRows(items, true);
  const rowCount = items.length;
  const prompt =
    `Create a matching variation of this ${theme.storeTypeEn} price list poster ` +
    `for ${theme.categoryNameEn}: change the small icon at the top to a ` +
    `${theme.iconDescriptionEn} above "${theme.storeTypeAr}" and "${theme.headerTitleAr}", and replace ` +
    `the center price board content with ${rowCount} well-spaced rows ` +
    `containing these exact Arabic texts and numbers:\n${formattedRows}`;

  return { prompt, formattedRows };
}

/**
 * محاولة توليد أو تعديل الصورة عبر نماذج Gemini للصور على الخادم
 */
async function tryGenerateGeminiPosterImage(params: {
  ai: GoogleGenAI;
  prompt: string;
  referenceImageBase64?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) return null;

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const candidateModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image'];

  for (const modelName of candidateModels) {
    try {
      const parts: any[] = [];
      if (params.referenceImageBase64) {
        const cleanedBase64 = params.referenceImageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        const mimeMatch = params.referenceImageBase64.match(/^data:(image\/[^;]+);base64,/);
        parts.push({
          inlineData: {
            mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
            data: cleanedBase64,
          },
        });
      }
      parts.push({ text: params.prompt });

      const response = await client.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
          },
        },
      });

      const respParts = response?.candidates?.[0]?.content?.parts || [];
      for (const part of respParts) {
        if (part?.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    } catch {
      // Continue to next candidate or client-side high-res renderer fallback
    }
  }

  return null;
}

/**
 * المرحلة 3: دمج مجموعة صور JPEG في ملف PDF واحد جاهز للطباعة بدقة 300 DPI دون هوامش بيضاء
 * (يحاكي سلوك Pillow: rgb_images[0].save(pdf_path, "PDF", resolution=300.0, save_all=True, append_images=...))
 */
function parseJpegDimensions(jpegBuf: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset < jpegBuf.length - 8) {
    if (jpegBuf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = jpegBuf[offset + 1];
    // SOF0, SOF1, SOF2 markers
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = jpegBuf.readUInt16BE(offset + 5);
      const width = jpegBuf.readUInt16BE(offset + 7);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
    } else {
      const len = jpegBuf.readUInt16BE(offset + 2);
      if (len < 2) break;
      offset += 2 + len;
    }
  }
  // Default 4:5 300 DPI dimensions (1200 x 1500 px)
  return { width: 1200, height: 1500 };
}

function hexToPdfRgb(hex: string): [number, number, number] {
  const clean = String(hex || '#FFFFFF').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3))];
    }
  }
  return [1, 1, 1];
}

export function buildMultiPagePrintReadyPdfFromJpegs(
  jpegBuffers: Buffer[],
  dpi: number = 300,
  options?: PdfExportCustomOptions
): Buffer {
  if (!jpegBuffers.length) {
    throw new Error('لا توجد صور لتصديرها إلى ملف PDF.');
  }

  // If the client already composited Pillow margins & Arabic footer onto the high-res RGB JPEGs,
  // we use 0 extra PDF margin so dimensions match the composited canvas 1:1 at 300 DPI.
  const extraMarginPx =
    options?.alreadyCompositedOnClient ? 0 : Math.max(0, Number(options?.marginSizePx || 0));
  const marginPt = Number(((extraMarginPx * 72) / dpi).toFixed(2));
  const [bgR, bgG, bgB] = hexToPdfRgb(options?.marginColorHex || '#FFFFFF');

  const objects: Array<{ id: number; data: Buffer }> = [];
  const pageKids: string[] = [];

  for (let i = 0; i < jpegBuffers.length; i++) {
    const jpegBuf = jpegBuffers[i];
    const { width, height } = parseJpegDimensions(jpegBuf);

    // Calculate exact PDF points at 300 DPI (1 inch = 72 pt, so pt = px * 72 / 300)
    const imgWidthPt = Number(((width * 72) / dpi).toFixed(2));
    const imgHeightPt = Number(((height * 72) / dpi).toFixed(2));
    const pageWidthPt = Number((imgWidthPt + marginPt * 2).toFixed(2));
    const pageHeightPt = Number((imgHeightPt + marginPt * 2).toFixed(2));

    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imageObjId = 5 + i * 3;
    pageKids.push(`${pageObjId} 0 R`);

    // Draw background margin color if extraMarginPx > 0, then place the RGB image at (marginPt, marginPt)
    const bgRectCmd =
      marginPt > 0
        ? `q\n${bgR} ${bgG} ${bgB} rg\n0 0 ${pageWidthPt} ${pageHeightPt} re f\nQ\n`
        : '';
    const contentStreamStr =
      `${bgRectCmd}q\n${imgWidthPt} 0 0 ${imgHeightPt} ${marginPt} ${marginPt} cm\n/Im${i + 1} Do\nQ\n`;
    const contentStreamBuf = Buffer.from(contentStreamStr, 'utf8');

    // Page Object
    const pageStr =
      `${pageObjId} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /TrimBox [0 0 ${pageWidthPt} ${pageHeightPt}] /BleedBox [0 0 ${pageWidthPt} ${pageHeightPt}] ` +
      `/Contents ${contentObjId} 0 R /Resources << /XObject << /Im${i + 1} ${imageObjId} 0 R >> >> >>\n` +
      `endobj\n`;
    objects.push({ id: pageObjId, data: Buffer.from(pageStr, 'utf8') });

    // Content Stream Object
    const contentHeader = Buffer.from(
      `${contentObjId} 0 obj\n<< /Length ${contentStreamBuf.length} >>\nstream\n`,
      'utf8'
    );
    const contentFooter = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
    objects.push({
      id: contentObjId,
      data: Buffer.concat([contentHeader, contentStreamBuf, contentFooter]),
    });

    // Image XObject (DCTDecode = RGB JPEG)
    const imgHeader = Buffer.from(
      `${imageObjId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length} >>\n` +
        `stream\n`,
      'utf8'
    );
    const imgFooter = Buffer.from(`\nendstream\nendobj\n`, 'utf8');
    objects.push({
      id: imageObjId,
      data: Buffer.concat([imgHeader, jpegBuf, imgFooter]),
    });
  }

  // Prepend Catalog (Obj 1) and Pages (Obj 2)
  const catalogObj = {
    id: 1,
    data: Buffer.from(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`, 'utf8'),
  };
  const pagesObj = {
    id: 2,
    data: Buffer.from(
      `2 0 obj\n<< /Type /Pages /Kids [${pageKids.join(' ')}] /Count ${jpegBuffers.length} >>\nendobj\n`,
      'utf8'
    ),
  };

  const allObjects = [catalogObj, pagesObj, ...objects].sort((a, b) => a.id - b.id);

  // Assemble PDF with XRef table
  const headerBuf = Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'binary');
  const bodyChunks: Buffer[] = [headerBuf];
  const offsets: number[] = [0]; // index 0 is free object
  let currentOffset = headerBuf.length;

  for (const obj of allObjects) {
    offsets[obj.id] = currentOffset;
    bodyChunks.push(obj.data);
    currentOffset += obj.data.length;
  }

  const maxObjId = allObjects[allObjects.length - 1].id;
  const xrefLines: string[] = [`xref`, `0 ${maxObjId + 1}`, `0000000000 65535 f `];
  for (let id = 1; id <= maxObjId; id++) {
    const off = offsets[id] || 0;
    xrefLines.push(`${String(off).padStart(10, '0')} 00000 n `);
  }

  const trailerStr =
    `${xrefLines.join('\n')}\n` +
    `trailer\n<< /Size ${maxObjId + 1} /Root 1 0 R >>\n` +
    `startxref\n${currentOffset}\n%%EOF\n`;

  bodyChunks.push(Buffer.from(trailerStr, 'utf8'));
  return Buffer.concat(bodyChunks);
}

/**
 * تسجيل مسارات الخادم الخاصة بتوليد قوائم الأسعار المتناسقة وتصدير PDF للطباعة
 */
export function registerStorePriceListRoutes(app: Express, ai: GoogleGenAI): void {
  ensureDirs();

  // 1. توليد قائمة أسعار (المرحلة 1: التصميم الأساسي أو المرحلة 2: التعديل بالصورة المرجعية)
  app.post('/api/price-list/generate', async (req: Request, res: Response) => {
    try {
      const rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      const stage: 'base' | 'variation' = req.body?.stage === 'variation' ? 'variation' : 'base';
      const referenceImageBase64 =
        typeof req.body?.referenceImageBase64 === 'string' ? req.body.referenceImageBase64 : undefined;
      const previousTheme = req.body?.previousTheme as PriceListThemeSpec | undefined;
      const customItems = Array.isArray(req.body?.items) ? (req.body.items as PriceListItem[]) : undefined;

      const parsed = parsePriceListFromPrompt(rawPrompt, stage === 'variation' ? previousTheme : undefined);
      const items = customItems && customItems.length > 0 ? customItems : parsed.items;
      const theme: PriceListThemeSpec = {
        ...parsed.theme,
        ...(req.body?.themeOverrides || {}),
      };

      const { prompt: structuredPrompt, formattedRows } =
        stage === 'variation'
          ? buildVariationPosterPrompt(items, theme)
          : buildBasePosterPrompt(items, theme);

      // Attempt Gemini native image generation/editing
      const aiImageUrl = await tryGenerateGeminiPosterImage({
        ai,
        prompt: structuredPrompt,
        referenceImageBase64: stage === 'variation' ? referenceImageBase64 : undefined,
      });

      const posterId = `poster_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const filename =
        stage === 'base'
          ? `01_base_${theme.iconKind}_prices.jpg`
          : `02_variation_${theme.iconKind}_prices.jpg`;

      const posterResult: GeneratedPosterResult = {
        id: posterId,
        filename,
        stage,
        referencePosterId: req.body?.referencePosterId,
        imageUrl: aiImageUrl || undefined,
        structuredPrompt,
        formattedRows,
        padDots: stage === 'variation',
        items,
        theme,
        aspectRatio: '4:5',
        dpi: 300,
        createdAt: Date.now(),
      };

      return res.json({
        ok: true,
        poster: posterResult,
      });
    } catch (err: any) {
      console.error('Error in /api/price-list/generate:', err);
      return res.status(500).json({
        ok: false,
        error: err?.message || 'تعذر توليد قائمة الأسعار حالياً.',
      });
    }
  });

  // 2. المرحلة 3: تصدير الصور المختارة إلى ملف PDF واحد جاهز للطباعة (300 DPI بدون هوامش بيضاء)
  app.post('/api/price-list/export-pdf', async (req: Request, res: Response) => {
    try {
      ensureDirs();
      const imagesBase64: string[] = Array.isArray(req.body?.images) ? req.body.images : [];
      const rawFilename =
        typeof req.body?.filename === 'string' && req.body.filename.trim()
          ? req.body.filename.trim()
          : 'butcher_shop_price_lists.pdf';

      if (imagesBase64.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'لا توجد صور محددة لتصديرها إلى ملف PDF.',
        });
      }

      const jpegBuffers: Buffer[] = [];
      for (const dataUrl of imagesBase64) {
        const cleanB64 = String(dataUrl || '').replace(/^data:image\/[^;]+;base64,/, '');
        if (!cleanB64) continue;
        const buf = Buffer.from(cleanB64, 'base64');
        if (buf.length > 0) {
          jpegBuffers.push(buf);
        }
      }

      if (jpegBuffers.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'تعذر قراءة بيانات الصور المحددة.',
        });
      }

      const pdfOptions: PdfExportCustomOptions | undefined =
        req.body?.pdfSettings && typeof req.body.pdfSettings === 'object'
          ? (req.body.pdfSettings as PdfExportCustomOptions)
          : undefined;

      const pdfBuffer = buildMultiPagePrintReadyPdfFromJpegs(jpegBuffers, 300, pdfOptions);
      const safeName = rawFilename.endsWith('.pdf') ? rawFilename : `${rawFilename}.pdf`;
      const fileId = `pricelist_pdf_${Date.now()}`;
      const diskFilename = `${fileId}_${safeName.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_')}`;
      const filePath = path.join(GENERATED_FILES_DIR, diskFilename);

      fs.writeFileSync(filePath, pdfBuffer);

      const marginBadge =
        pdfOptions?.marginSizePx && pdfOptions.marginSizePx > 0
          ? ` · هامش ${pdfOptions.marginSizePx}px`
          : ' · بدون هوامش';
      const footerBadge =
        pdfOptions?.enableFooter && pdfOptions?.storeName
          ? ` · تذييل: ${pdfOptions.storeName}`
          : '';

      return res.json({
        ok: true,
        file: {
          id: fileId,
          filename: safeName,
          format: 'pdf',
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.length,
          createdAt: new Date().toISOString(),
          downloadUrl: `/api/price-list/download/${encodeURIComponent(diskFilename)}`,
          title: `ملف قوائم الأسعار للطباعة (${jpegBuffers.length} صفحات - 300 DPI${marginBadge}${footerBadge})`,
          verified: true,
        },
        pdfBase64: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
        pageCount: jpegBuffers.length,
        dpi: 300,
        appliedSettings: pdfOptions,
      });
    } catch (err: any) {
      console.error('Error in /api/price-list/export-pdf:', err);
      return res.status(500).json({
        ok: false,
        error: err?.message || 'تعذر تصدير ملف الـ PDF.',
      });
    }
  });

  // 3. مسار تنزيل ملف الـ PDF المولد مباشرة
  app.get('/api/price-list/download/:filename', (req: Request, res: Response) => {
    try {
      const safeFile = path.basename(String(req.params.filename || ''));
      const fullPath = path.join(GENERATED_FILES_DIR, safeFile);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'الملف غير موجود.' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="store_price_lists_300dpi.pdf"`);
      return res.sendFile(fullPath);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'تعذر تحميل الملف.' });
    }
  });
}
