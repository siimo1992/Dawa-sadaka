import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  CopyPlus,
  Download,
  FileDown,
  Layers,
  Loader2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';

export interface PriceListItemData {
  name: string;
  price: string | number;
}

export interface PriceListThemeData {
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

export interface PriceListPosterData {
  id: string;
  filename: string;
  stage: 'base' | 'variation';
  referencePosterId?: string;
  imageUrl?: string;
  renderedJpegDataUrl?: string;
  structuredPrompt: string;
  formattedRows: string;
  padDots: boolean;
  items: PriceListItemData[];
  theme: PriceListThemeData;
  aspectRatio: '4:5';
  dpi: 300;
  createdAt: number;
}

export interface PdfExportSettings {
  marginSizePx: number;
  marginColorHex: string;
  enableFooter: boolean;
  storeName: string;
  contactInfo: string;
  addressInfo: string;
  includePageNumber: boolean;
  footerStyle: 'dark_gold' | 'light_clean' | 'emerald_oasis';
}

export const DEFAULT_PDF_EXPORT_SETTINGS: PdfExportSettings = {
  marginSizePx: 0,
  marginColorHex: '#FFFFFF',
  enableFooter: true,
  storeName: 'ملحمة الواحة للّحوم الطازجة',
  contactInfo: 'هاتف / واتساب: 0660 00 00 00',
  addressInfo: 'عين صالح — التوصيل متاح',
  includePageNumber: true,
  footerStyle: 'dark_gold',
};

/**
 * يحاكي إعدادات مكتبة Pillow المتقدمة في دالة export_to_pdf:
 * 1) إضافة هوامش مخصصة حول كل صورة (ImageOps.expand(img, border=margin_px, fill=margin_color))
 * 2) إضافة شريط تذييل تلقائي (Footer) في أسفل كل صفحة يحتوي على اسم المتجر ومعلومات التواصل وترقيم الصفحات
 *    باستخدام Image.new("RGB", ...) و ImageDraw.Draw(...) بدقة 300 DPI.
 */
export async function applyPillowMarginsAndFooterToPage(
  sourceImageDataUrl: string,
  settings: PdfExportSettings,
  pageIndex: number,
  totalPages: number
): Promise<string> {
  if (!sourceImageDataUrl) return '';
  const margin = Math.max(0, Number(settings.marginSizePx || 0));
  const hasFooter = Boolean(settings.enableFooter);

  if (margin === 0 && !hasFooter) {
    return sourceImageDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth || 1200;
      const srcH = img.naturalHeight || 1500;
      const footerH = hasFooter ? Math.round(srcW * 0.135) : 0; // ~162px at 1200px width (300 DPI)

      const outW = srcW + margin * 2;
      const outH = srcH + margin * 2 + footerH;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceImageDataUrl);
        return;
      }

      // 1. Fill outer page margin (equivalent to ImageOps.expand fill=margin_color)
      ctx.fillStyle = settings.marginColorHex || '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);

      // 2. Paste original RGB poster at (margin, margin)
      ctx.drawImage(img, margin, margin, srcW, srcH);

      // Subtle frame around poster when margin > 0
      if (margin > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
        ctx.lineWidth = Math.max(2, Math.round(margin * 0.05));
        ctx.strokeRect(margin, margin, srcW, srcH);
        ctx.restore();
      }

      // 3. Draw Automatic Store & Contact Footer on every page (equivalent to ImageDraw.Draw on expanded canvas)
      if (hasFooter && footerH > 0) {
        const footerX = margin;
        const footerY = margin + srcH;
        const footerW = srcW;

        let bgPrimary = '#150E0B';
        let bgSecondary = '#221712';
        let accentColor = '#D4AF37';
        let titleColor = '#FDFBF7';
        let subColor = '#E6D5B8';

        if (settings.footerStyle === 'light_clean') {
          bgPrimary = '#F8F5EE';
          bgSecondary = '#EFE9DC';
          accentColor = '#9E7A1C';
          titleColor = '#18100C';
          subColor = '#4A3F35';
        } else if (settings.footerStyle === 'emerald_oasis') {
          bgPrimary = '#0B1F19';
          bgSecondary = '#123329';
          accentColor = '#D4AF37';
          titleColor = '#F4FBF8';
          subColor = '#B6DFD1';
        }

        ctx.save();
        const footGrad = ctx.createLinearGradient(footerX, footerY, footerX + footerW, footerY + footerH);
        footGrad.addColorStop(0, bgPrimary);
        footGrad.addColorStop(0.5, bgSecondary);
        footGrad.addColorStop(1, bgPrimary);
        ctx.fillStyle = footGrad;
        ctx.fillRect(footerX, footerY, footerW, footerH);

        // Top ornamental accent border separating poster from footer
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(footerX, footerY + 2);
        ctx.lineTo(footerX + footerW, footerY + 2);
        ctx.stroke();

        // Outer border matching poster width
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(footerX + 1, footerY + 1, footerW - 2, footerH - 2);

        const padX = Math.round(footerW * 0.045);
        const rightEdge = footerX + footerW - padX;
        const leftEdge = footerX + padX;
        const centerY = footerY + footerH / 2;

        const storeNameText = (settings.storeName || '').trim() || 'اسم المتجر';
        const contactText = (settings.contactInfo || '').trim();
        const addressText = (settings.addressInfo || '').trim();
        const detailsLine = [contactText, addressText].filter(Boolean).join('  |  ');

        // Store Name (Right side in RTL)
        ctx.fillStyle = accentColor;
        ctx.font = `900 ${Math.round(srcW * 0.031)}px Cairo, Tajawal, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(storeNameText, rightEdge, detailsLine ? centerY - footerH * 0.19 : centerY);

        // Contact Info & Address (Below Store Name on Right in RTL)
        if (detailsLine) {
          ctx.fillStyle = titleColor;
          ctx.font = `bold ${Math.round(srcW * 0.022)}px Cairo, Tajawal, sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(detailsLine, rightEdge, centerY + footerH * 0.22);
        }

        // Optional Automatic Page Number Badge on the Left side
        if (settings.includePageNumber) {
          const pageLabel = `صفحة ${pageIndex + 1} من ${totalPages}`;
          const badgeW = Math.round(srcW * 0.18);
          const badgeH = Math.round(footerH * 0.44);
          const badgeX = leftEdge;
          const badgeY = centerY - badgeH / 2;

          ctx.fillStyle = 'rgba(212, 175, 55, 0.14)';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
          ctx.fill();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = subColor;
          ctx.font = `bold ${Math.round(srcW * 0.02)}px Cairo, Tajawal, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pageLabel, badgeX + badgeW / 2, centerY + 1);
        }

        ctx.restore();
      }

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(sourceImageDataUrl);
    img.src = sourceImageDataUrl;
  });
}

/**
 * يولّد كود Python الكامل لدالة export_to_pdf باستخدام مكتبة Pillow (ImageOps + ImageDraw + ImageFont)
 * وفق الإعدادات التي اختارها المستخدم للهوامش والتذييل التلقائي.
 */
export function buildPillowPythonExportSnippet(settings: PdfExportSettings): string {
  const marginVal = Math.max(0, Number(settings.marginSizePx || 0));
  const marginHex = settings.marginColorHex || '#FFFFFF';
  const addFooterPy = settings.enableFooter ? 'True' : 'False';
  const storeNamePy = (settings.storeName || 'ملحمة الواحة').replace(/"/g, '\\"');
  const contactPy = (settings.contactInfo || 'هاتف: 0660 00 00 00').replace(/"/g, '\\"');
  const addressPy = (settings.addressInfo || '').replace(/"/g, '\\"');
  const pageNumPy = settings.includePageNumber ? 'True' : 'False';

  return `from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

def export_to_pdf(
    self,
    pdf_filename: str = "butcher_shop_price_lists.pdf",
    margin_px: int = ${marginVal},
    margin_color: str = "${marginHex}",
    add_footer: bool = ${addFooterPy},
    store_name: str = "${storeNamePy}",
    contact_info: str = "${contactPy}",
    address_info: str = "${addressPy}",
    include_page_numbers: bool = ${pageNumPy},
) -> Path:
    """المرحلة 3 (محدّثة): دمج الصور في ملف PDF بدقة 300 DPI مع دعم الهوامش (Margins) والتذييل التلقائي (Footer) عبر Pillow."""
    if not self.generated_images:
        raise ValueError("لا توجد صور مولدة لتصديرها إلى PDF.")

    processed_pages = []
    total_pages = len(self.generated_images)

    for idx, img_path in enumerate(self.generated_images, start=1):
        img = Image.open(img_path).convert("RGB")

        # 1. إضافة تذييل تلقائي (Footer) يحتوي على اسم المتجر ومعلومات التواصل في كل صفحة
        if add_footer:
            footer_height = int(img.width * 0.135)
            new_canvas = Image.new("RGB", (img.width, img.height + footer_height), "#150E0B")
            new_canvas.paste(img, (0, 0))

            draw = ImageDraw.Draw(new_canvas)
            # خط فاصل ذهبي أعلى التذييل
            draw.line([(0, img.height), (img.width, img.height)], fill="#D4AF37", width=4)

            try:
                title_font = ImageFont.truetype("Cairo-Bold.ttf", size=int(img.width * 0.03))
                sub_font = ImageFont.truetype("Cairo-Regular.ttf", size=int(img.width * 0.022))
            except IOError:
                title_font = ImageFont.load_default()
                sub_font = ImageFont.load_default()

            # كتابة اسم المتجر ومعلومات التواصل
            footer_top = img.height + int(footer_height * 0.22)
            details = "  |  ".join(filter(None, [contact_info, address_info]))
            draw.text((img.width - 50, footer_top), store_name, fill="#D4AF37", font=title_font, anchor="ra")
            if details:
                draw.text((img.width - 50, footer_top + int(footer_height * 0.42)), details, fill="#FDFBF7", font=sub_font, anchor="ra")

            if include_page_numbers:
                page_str = f"صفحة {idx} من {total_pages}"
                draw.text((50, img.height + footer_height // 2), page_str, fill="#E6D5B8", font=sub_font, anchor="lm")

            img = new_canvas

        # 2. إضافة الهوامش المخصصة (Margins) حول الصفحة باستخدام ImageOps.expand
        if margin_px > 0:
            img = ImageOps.expand(img, border=margin_px, fill=margin_color)

        processed_pages.append(img)

    # 3. حفظ جميع الصفحات في ملف PDF واحد جاهز للطباعة بدقة 300 DPI
    pdf_path = self.output_dir / pdf_filename
    processed_pages[0].save(
        pdf_path,
        "PDF",
        resolution=300.0,
        save_all=True,
        append_images=processed_pages[1:],
    )
    return pdf_path`;
}

/**
 * يرسم ملصق قائمة الأسعار بدقة طباعة عالية (1200x1500 بكسل = نسبة 4:5 عند 300 DPI)
 * بصيغة RGB JPEG متطابقة 100% في الهوية البصرية (الخلفية، الإطار الذهبي، الأيقونة العلوية، وصفوف الأسعار العربية الواضحة)
 */
export async function renderHighResPosterToJpeg(poster: PriceListPosterData): Promise<string> {
  const WIDTH = 1200;
  const HEIGHT = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return poster.imageUrl || '';

  const { theme, items, padDots } = poster;

  // 1. Background (Warm rustic dark wood & marble / custom store theme)
  const bgGrad = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT * 0.35,
    100,
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT * 0.85
  );
  bgGrad.addColorStop(0, theme.secondaryBgHex || '#2C1E19');
  bgGrad.addColorStop(0.65, theme.primaryBgHex || '#1C1411');
  bgGrad.addColorStop(1, '#0C0806');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle wood grain & marble veins texture lines
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
  ctx.lineWidth = 2;
  for (let y = 30; y < HEIGHT; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(WIDTH * 0.3, y + 12, WIDTH * 0.7, y - 12, WIDTH, y + 4);
    ctx.stroke();
  }
  ctx.restore();

  // Warm spotlight glow at top center
  const glowGrad = ctx.createRadialGradient(WIDTH / 2, 220, 20, WIDTH / 2, 220, 480);
  glowGrad.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
  glowGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, WIDTH, 700);

  // 2. Outer & Inner Ornamental Golden Frame (identical across all variations)
  const accent = theme.accentHex || '#D4AF37';
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, WIDTH - 96, HEIGHT - 96);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, WIDTH - 128, HEIGHT - 128);

  // Corner ornaments
  const corners = [
    [48, 48, 1, 1],
    [WIDTH - 48, 48, -1, 1],
    [48, HEIGHT - 48, 1, -1],
    [WIDTH - 48, HEIGHT - 48, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx + dx * 22, cy + dy * 22, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Top Category Icon inside Golden Medallion
  ctx.save();
  const medalY = 175;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, medalY, 58, 0, Math.PI * 2);
  ctx.fillStyle = theme.boardBgHex || '#16100E';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Draw clean vector silhouette / emblem for the category
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawCategoryEmblem = (kind: PriceListThemeData['iconKind']) => {
    ctx.save();
    ctx.translate(WIDTH / 2, medalY);
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    if (kind === 'camel') {
      // Golden Camel silhouette
      ctx.beginPath();
      ctx.arc(-6, -12, 16, Math.PI, 0, false); // Hump
      ctx.lineTo(18, 6);
      ctx.lineTo(24, -18); // Neck
      ctx.arc(28, -20, 6, 0, Math.PI * 2); // Head
      ctx.moveTo(14, 6);
      ctx.lineTo(14, 28);
      ctx.moveTo(4, 6);
      ctx.lineTo(4, 28);
      ctx.moveTo(-14, 6);
      ctx.lineTo(-14, 28);
      ctx.moveTo(-22, 6);
      ctx.lineTo(-22, 28);
      ctx.stroke();
    } else if (kind === 'sheep') {
      // Golden Ram / Sheep horns emblem
      ctx.beginPath();
      ctx.arc(-14, -4, 14, 0.2 * Math.PI, 1.6 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, -4, 14, 1.4 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 2, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'beef') {
      // Golden Bull horns & head emblem
      ctx.beginPath();
      ctx.moveTo(-30, -18);
      ctx.quadraticCurveTo(-18, 4, 0, 4);
      ctx.quadraticCurveTo(18, 4, 30, -18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-16, -2);
      ctx.lineTo(16, -2);
      ctx.lineTo(10, 22);
      ctx.lineTo(-10, 22);
      ctx.closePath();
      ctx.fill();
    } else {
      // Golden Star / Store Crest
      ctx.font = 'bold 46px Cairo, Tajawal, sans-serif';
      ctx.fillText('★', 0, 2);
    }
    ctx.restore();
  };
  drawCategoryEmblem(theme.iconKind);
  ctx.restore();

  // 4. Store Type Kicker & Golden Header Banner ("قائمة الأسعار")
  ctx.save();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Cairo, Tajawal, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(theme.storeTypeAr || 'ملحمة', WIDTH / 2, 278);

  // Golden Banner Box
  const bannerW = 540;
  const bannerH = 88;
  const bannerX = (WIDTH - bannerW) / 2;
  const bannerY = 308;

  const bannerGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  bannerGrad.addColorStop(0, '#9E7A1C');
  bannerGrad.addColorStop(0.5, '#F3D266');
  bannerGrad.addColorStop(1, '#9E7A1C');

  ctx.fillStyle = bannerGrad;
  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 18);
  ctx.fill();

  ctx.fillStyle = '#18100C';
  ctx.font = '900 46px Cairo, Tajawal, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.headerTitleAr || 'قائمة الأسعار', WIDTH / 2, bannerY + bannerH / 2 + 2);

  // Category Subtitle badge below header
  ctx.fillStyle = '#F7E7B4';
  ctx.font = 'bold 30px Cairo, Tajawal, sans-serif';
  ctx.fillText(`— ${theme.categoryTitleAr} —`, WIDTH / 2, bannerY + bannerH + 46);
  ctx.restore();

  // 5. Center Price Board Container
  const boardX = 115;
  const boardY = 485;
  const boardW = WIDTH - 230;
  const boardH = 740;

  ctx.save();
  ctx.fillStyle = theme.boardBgHex || 'rgba(18, 12, 10, 0.92)';
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 24);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Price Rows (Right-to-Left aligned Arabic item name + price + optional dotted leaders)
  const rowCount = Math.max(items.length, 1);
  const availableHeight = boardH - 100;
  const rowStep = Math.min(135, availableHeight / rowCount);
  const startY = boardY + (boardH - rowStep * (rowCount - 1)) / 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const y = startY + i * rowStep;

    // Alternating subtle row highlight
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
      ctx.beginPath();
      ctx.roundRect(boardX + 36, y - 42, boardW - 72, 84, 14);
      ctx.fill();
    }

    const rightX = boardX + boardW - 65;
    const leftX = boardX + 65;

    // Item Name (Right side in RTL)
    ctx.fillStyle = theme.textColorHex || '#FDFBF7';
    ctx.font = 'bold 42px Cairo, Tajawal, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, rightX, y);

    // Price Value (Left side in RTL)
    const priceStr = `${item.price}`;
    ctx.fillStyle = accent;
    ctx.font = '900 44px Cairo, Tajawal, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(priceStr, leftX, y);

    // Dotted leader or colon separator between item name and price
    const nameWidth = ctx.measureText(item.name).width;
    const priceWidth = ctx.measureText(priceStr).width;
    const dotsStartX = leftX + priceWidth + 28;
    const dotsEndX = rightX - nameWidth - 28;

    if (dotsEndX > dotsStartX + 30) {
      ctx.save();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 3;
      if (padDots) {
        ctx.setLineDash([4, 12]);
      } else {
        ctx.setLineDash([2, 16]);
      }
      ctx.beginPath();
      ctx.moveTo(dotsStartX, y + 6);
      ctx.lineTo(dotsEndX, y + 6);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();

  // 6. Bottom Border Garnishes & Quality Footer (Rosemary, Garlic & Fresh Cuts Aesthetic)
  ctx.save();
  const footerY = 1315;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, footerY);
  ctx.lineTo(WIDTH - 180, footerY);
  ctx.stroke();

  // Decorative herb/rosemary sprig vectors at bottom border
  ctx.strokeStyle = '#4F774A';
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    const baseX = WIDTH / 2 + side * 220;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 + side * 90, footerY + 45);
    ctx.quadraticCurveTo(baseX, footerY + 25, baseX + side * 120, footerY + 55);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(253, 251, 247, 0.78)';
  ctx.font = 'bold 24px Cairo, Tajawal, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('جودة عالية · أسعار مدروسة · طباعة عالية الدقة 300 DPI', WIDTH / 2, footerY + 50);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

interface PriceListPosterCardProps {
  poster: PriceListPosterData;
  isSelectedForPdf: boolean;
  selectedCount: number;
  isActiveReference: boolean;
  isExportingPdf: boolean;
  pdfSettings?: PdfExportSettings;
  onUpdatePdfSettings?: (next: PdfExportSettings) => void;
  onToggleSelectForPdf: (posterId: string, jpegDataUrl: string) => void;
  onSetAsReference: (poster: PriceListPosterData, jpegDataUrl: string) => void;
  onGenerateVariationQuick: (
    referencePoster: PriceListPosterData,
    referenceJpeg: string,
    promptText: string
  ) => void;
  onExportSelectedToPdf: (
    fallbackSinglePosterJpeg?: string,
    fallbackFilename?: string,
    customSettingsOverride?: PdfExportSettings
  ) => void;
  onRunFullButcherDemo?: () => void;
  onPreviewImage?: (imgUrl: string) => void;
}

export const PriceListPosterCard: React.FC<PriceListPosterCardProps> = ({
  poster,
  isSelectedForPdf,
  selectedCount,
  isActiveReference,
  isExportingPdf,
  pdfSettings,
  onUpdatePdfSettings,
  onToggleSelectForPdf,
  onSetAsReference,
  onGenerateVariationQuick,
  onExportSelectedToPdf,
  onRunFullButcherDemo,
  onPreviewImage,
}) => {
  const [renderedJpeg, setRenderedJpeg] = useState<string>(
    poster.renderedJpegDataUrl || poster.imageUrl || ''
  );
  const [displayMode, setDisplayMode] = useState<'canvas' | 'ai'>(
    poster.imageUrl ? 'ai' : 'canvas'
  );
  const [showCustomVariationForm, setShowCustomVariationForm] = useState(false);
  const [showPdfSettingsPanel, setShowPdfSettingsPanel] = useState(false);
  const [showPillowPythonCode, setShowPillowPythonCode] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);
  const [localPdfSettings, setLocalPdfSettings] = useState<PdfExportSettings>(
    pdfSettings || {
      ...DEFAULT_PDF_EXPORT_SETTINGS,
      storeName: `${poster.theme.storeTypeAr || 'ملحمة'} البركة`,
    }
  );
  const [previewWithFooterDataUrl, setPreviewWithFooterDataUrl] = useState<string>('');

  const activePdfSettings = pdfSettings || localPdfSettings;

  const updateSettings = (patch: Partial<PdfExportSettings>) => {
    const next = { ...activePdfSettings, ...patch };
    setLocalPdfSettings(next);
    onUpdatePdfSettings?.(next);
  };
  const [customCategoryAr, setCustomCategoryAr] = useState('');
  const [customItems, setCustomItems] = useState<Array<{ name: string; price: string }>>([
    { name: 'لحم الجمل', price: '1700' },
    { name: 'كبدة', price: '3500' },
    { name: 'هبرة', price: '2200' },
    { name: 'دوارة', price: '600' },
  ]);

  useEffect(() => {
    let mounted = true;
    renderHighResPosterToJpeg(poster).then((dataUrl) => {
      if (mounted && dataUrl) {
        setRenderedJpeg(dataUrl);
      }
    });
    return () => {
      mounted = false;
    };
  }, [poster]);

  const baseEffectiveImage =
    displayMode === 'ai' && poster.imageUrl ? poster.imageUrl : renderedJpeg || poster.imageUrl || '';

  useEffect(() => {
    let mounted = true;
    if (!baseEffectiveImage) return;
    if (activePdfSettings.marginSizePx === 0 && !activePdfSettings.enableFooter) {
      setPreviewWithFooterDataUrl('');
      return;
    }
    applyPillowMarginsAndFooterToPage(
      baseEffectiveImage,
      activePdfSettings,
      0,
      Math.max(selectedCount, 1)
    ).then((compositedUrl) => {
      if (mounted) {
        setPreviewWithFooterDataUrl(compositedUrl);
      }
    });
    return () => {
      mounted = false;
    };
  }, [baseEffectiveImage, activePdfSettings, selectedCount]);

  const effectiveImage = baseEffectiveImage;
  const previewDisplayImage =
    showPdfSettingsPanel && previewWithFooterDataUrl ? previewWithFooterDataUrl : effectiveImage;

  const handleDownloadSingleJpg = () => {
    const targetImg = previewWithFooterDataUrl || effectiveImage;
    if (!targetImg) return;
    const a = document.createElement('a');
    a.href = targetImg;
    a.download = poster.filename || 'price_list_poster.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCustomVariationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = customItems.filter((r) => r.name.trim() && r.price.trim());
    if (validRows.length === 0) return;
    const catLabel = customCategoryAr.trim() || validRows[0].name.trim();
    const formattedPrompt = `قائمة أسعار ${catLabel} بنفس التصميم: ${validRows
      .map((r) => `${r.name.trim()}: ${r.price.trim()}`)
      .join('، ')}`;
    setShowCustomVariationForm(false);
    onGenerateVariationQuick(poster, effectiveImage, formattedPrompt);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] overflow-hidden shadow-xs">
      {/* Top Status & Stage Bar */}
      <div className="px-4 py-2.5 bg-[var(--card)] border-b border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {poster.stage === 'base'
              ? 'المرحلة 1: التصميم الأساسي المرجعي (Base Image)'
              : 'المرحلة 2: قائمة متطابقة بالاعتماد على الصورة المرجعية (Reference Variation)'}
          </span>
          <span className="text-[var(--line)]">·</span>
          <span className="font-mono text-[11px] text-[var(--mute)] tabular-nums">
            4:5 · 300 DPI RGB
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {poster.imageUrl && (
            <button
              type="button"
              onClick={() => setDisplayMode((m) => (m === 'ai' ? 'canvas' : 'ai'))}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] cursor-pointer transition-colors whitespace-nowrap"
            >
              {displayMode === 'ai' ? 'عرض طباعة عربية فائقة الوضوح' : 'عرض صورة النموذج التوليدي'}
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadSingleJpg}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[var(--green)]" />
            <span>حفظ JPG</span>
          </button>
        </div>
      </div>

      {/* Main Content Split: Poster Preview + Price Table & Actions */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* 4:5 Poster Visual Preview */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div
            onClick={() => previewDisplayImage && onPreviewImage?.(previewDisplayImage)}
            className="relative group w-full max-w-[290px] aspect-[4/5] rounded-xl overflow-hidden border-2 border-amber-500/40 bg-stone-950 shadow-md cursor-pointer"
            title="اضغط لمعاينة الملصق بالحجم الكامل"
          >
            {previewDisplayImage ? (
              <img
                src={previewDisplayImage}
                alt={poster.theme.categoryTitleAr}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-stone-950 group-hover:scale-102 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-amber-200/70">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>جاري تجهيز الملصق...</span>
              </div>
            )}

            {/* Selection Indicator Overlay */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectForPdf(poster.id, effectiveImage);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-md cursor-pointer transition-all ${
                  isSelectedForPdf
                    ? 'bg-emerald-600 text-white border border-emerald-400'
                    : 'bg-black/75 text-white/90 hover:bg-black border border-white/20'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${isSelectedForPdf ? 'opacity-100' : 'opacity-40'}`} />
                <span>{isSelectedForPdf ? 'محدد للـ PDF ✓' : 'تحديد للـ PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Structured Items Table + Reference Variation + PDF Compiler Controls */}
        <div className="md:col-span-7 space-y-3.5 w-full">
          <div>
            <div className="text-xs font-bold text-[var(--mute)] mb-1">
              {poster.theme.storeTypeAr} · {poster.theme.categoryTitleAr}
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 space-y-1.5">
              {poster.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-[var(--line)]/50 last:border-b-0"
                >
                  <span className="font-bold text-[var(--ink)]">{item.name}</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-[var(--mute)]/40" />
                  <span className="font-mono font-extrabold text-[var(--green)] tabular-nums">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons: Select for PDF, Set Reference Variation, Export PDF */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onToggleSelectForPdf(poster.id, effectiveImage)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all whitespace-nowrap ${
                isSelectedForPdf
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[var(--card)] hover:bg-[var(--line)]/40 border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isSelectedForPdf
                  ? 'مضاف إلى حزمة الـ PDF ✓'
                  : 'تحديد الصورة لإضافتها إلى PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSetAsReference(poster, effectiveImage);
                setShowCustomVariationForm((prev) => !prev);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all whitespace-nowrap ${
                isActiveReference || showCustomVariationForm
                  ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-[var(--card)] hover:bg-[var(--line)]/40 border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              <CopyPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>توليد قائمة جديدة بنفس الهوية البصرية</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPdfSettingsPanel((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all whitespace-nowrap ${
                showPdfSettingsPanel
                  ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-[var(--card)] hover:bg-[var(--line)]/40 border-[var(--line)] text-[var(--ink)]'
              }`}
              title="تخصيص الهوامش (Margins) والتذييل التلقائي (Footer) في دالة تصدير PDF"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span>إعدادات PDF (الهوامش والتذييل)</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={() =>
                onExportSelectedToPdf(
                  effectiveImage,
                  'butcher_shop_price_lists.pdf',
                  activePdfSettings
                )
              }
              className="px-3.5 py-2 rounded-xl bg-[var(--green)] hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>
                {selectedCount > 0
                  ? `تحويل الصور المختارة (${selectedCount}) إلى PDF للطباعة`
                  : 'تصدير هذه القائمة إلى PDF للطباعة (300 DPI)'}
              </span>
            </button>
          </div>

          {/* Active Pillow PDF Summary Pill */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--line)]/80 text-[11px]">
            <div className="flex items-center gap-2 flex-wrap text-[var(--mute)]">
              <span className="font-bold text-[var(--ink)]">إعدادات Pillow PDF النشطة:</span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] font-mono tabular-nums text-[var(--ink)]">
                الهوامش: {activePdfSettings.marginSizePx === 0 ? 'بدون هوامش (0px)' : `${activePdfSettings.marginSizePx}px`}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]">
                {activePdfSettings.enableFooter
                  ? `التذييل: ${activePdfSettings.storeName || 'مفعّل'}`
                  : 'التذييل: غير مفعّل'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPdfSettingsPanel((prev) => !prev)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
            >
              {showPdfSettingsPanel ? 'إخفاء الإعدادات ▲' : 'تخصيص ⚙'}
            </button>
          </div>

          {/* Custom Pillow PDF Margins & Automatic Store Footer Settings Panel */}
          {showPdfSettingsPanel && (
            <div className="p-3.5 rounded-xl bg-[var(--card)] border border-amber-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--line)]/60 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--ink)]">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  <span>إعدادات Pillow المخصصة لدالة تصدير PDF (الهوامش + التذييل التلقائي)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPillowPythonCode((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showPillowPythonCode ? 'إخفاء كود Pillow' : 'عرض كود Python (Pillow)'}</span>
                </button>
              </div>

              {/* 1. Margins Selection (ImageOps.expand) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--ink)] block">
                  1. حجم الهوامش حول كل صفحة (Margins — <code className="font-mono">ImageOps.expand</code>):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { label: 'بدون هوامش (0px)', value: 0 },
                    { label: 'هامش رفيع (40px)', value: 40 },
                    { label: 'هامش قياسي (80px)', value: 80 },
                    { label: 'هامش عريض (120px)', value: 120 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateSettings({ marginSizePx: opt.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        activePdfSettings.marginSizePx === opt.value
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                          : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-amber-500/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Margin Fill Color */}
                {activePdfSettings.marginSizePx > 0 && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] text-[var(--mute)] font-semibold">لون الهامش:</span>
                    {[
                      { label: 'أبيض للطباعة', hex: '#FFFFFF' },
                      { label: 'كريمي فاخر', hex: '#F5EFE6' },
                      { label: 'داكن ملكي', hex: '#18100C' },
                      { label: 'أخضر واحة', hex: '#0E1F19' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => updateSettings({ marginColorHex: c.hex })}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border flex items-center gap-1.5 cursor-pointer ${
                          activePdfSettings.marginColorHex === c.hex
                            ? 'border-amber-500 bg-amber-500/15 text-[var(--ink)]'
                            : 'border-[var(--line)] bg-[var(--bg)] text-[var(--mute)]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/20 inline-block"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Automatic Store & Contact Footer on Every Page (ImageDraw.Draw) */}
              <div className="space-y-2 pt-2 border-t border-[var(--line)]/50">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--ink)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activePdfSettings.enableFooter}
                      onChange={(e) => updateSettings({ enableFooter: e.target.checked })}
                      className="rounded border-[var(--line)] text-amber-500 focus:ring-amber-500"
                    />
                    <span>
                      2. إضافة تذييل تلقائي (Footer) في كل صفحة يحتوي على اسم المتجر ومعلومات التواصل
                    </span>
                  </label>

                  {activePdfSettings.enableFooter && (
                    <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--mute)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePdfSettings.includePageNumber}
                        onChange={(e) => updateSettings({ includePageNumber: e.target.checked })}
                        className="rounded border-[var(--line)] text-amber-500"
                      />
                      <span>ترقيم الصفحات تلقائياً</span>
                    </label>
                  )}
                </div>

                {activePdfSettings.enableFooter && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--mute)] block mb-0.5">
                        اسم المتجر في التذييل:
                      </span>
                      <input
                        type="text"
                        value={activePdfSettings.storeName}
                        onChange={(e) => updateSettings({ storeName: e.target.value })}
                        placeholder="مثال: ملحمة الواحة للّحوم الطازجة"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[var(--mute)] block mb-0.5">
                        معلومات التواصل (هاتف / واتساب):
                      </span>
                      <input
                        type="text"
                        value={activePdfSettings.contactInfo}
                        onChange={(e) => updateSettings({ contactInfo: e.target.value })}
                        placeholder="مثال: هاتف / واتساب: 0660 00 00 00"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-[var(--mute)] block mb-0.5">
                          العنوان أو ملاحظة إضافية (اختياري):
                        </span>
                        <input
                          type="text"
                          value={activePdfSettings.addressInfo}
                          onChange={(e) => updateSettings({ addressInfo: e.target.value })}
                          placeholder="مثال: عين صالح — وسط المدينة (التوصيل متاح)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[var(--mute)] block mb-0.5">
                          نمط التذييل:
                        </span>
                        <div className="flex items-center gap-1">
                          {[
                            { id: 'dark_gold' as const, label: 'ذهبي داكن' },
                            { id: 'light_clean' as const, label: 'فاتح للطباعة' },
                            { id: 'emerald_oasis' as const, label: 'أخضر واحة' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => updateSettings({ footerStyle: st.id })}
                              className={`px-2 py-1.5 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
                                activePdfSettings.footerStyle === st.id
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300'
                                  : 'bg-[var(--bg)] border-[var(--line)] text-[var(--mute)]'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Live Pillow Python Code Snippet Viewer */}
              {showPillowPythonCode && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100">
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-amber-400 font-bold">
                      StorePriceListApp.export_to_pdf (Pillow ImageOps + ImageDraw)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          buildPillowPythonExportSnippet(activePdfSettings)
                        );
                        setCopiedPython(true);
                        setTimeout(() => setCopiedPython(false), 2000);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPython ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ كود Python</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-64 m-0 text-emerald-200"
                  >
                    <code>{buildPillowPythonExportSnippet(activePdfSettings)}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Quick Matching Variations Bar (One-Click Reference-Based Presets) */}
          <div className="pt-2 border-t border-[var(--line)]/60 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-[var(--mute)] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>توليد سريع بالاعتماد على هذه الصورة كمرجع (بنفس الخلفية والإطار 100%):</span>
              </span>
              {onRunFullButcherDemo && (
                <button
                  type="button"
                  onClick={onRunFullButcherDemo}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  توليد القوائم الأربع كاملة + PDF ◀
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onGenerateVariationQuick(
                    poster,
                    effectiveImage,
                    'قائمة أسعار لحم الجمل بنفس التصميم: لحم الجمل: 1700، كبدة: 3500، هبرة: 2200، دوارة: 600'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:border-amber-500 border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
              >
                + قائمة لحم الجمل (مرجعي)
              </button>

              <button
                type="button"
                onClick={() =>
                  onGenerateVariationQuick(
                    poster,
                    effectiveImage,
                    'قائمة أسعار لحم غنمي بنفس التصميم: لحم غنمي: 2500، دوارة: 800، كبدة + الشحمة: 3000'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:border-amber-500 border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
              >
                + قائمة لحم غنمي (مرجعي)
              </button>

              <button
                type="button"
                onClick={() =>
                  onGenerateVariationQuick(
                    poster,
                    effectiveImage,
                    'قائمة أسعار لحم الحاشي بنفس التصميم: لحم الحاشي: 1800، كبدة: 3500، دوارة: 6000، صافي: 2400'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[var(--card)] hover:border-amber-500 border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
              >
                + قائمة لحم الحاشي (مرجعي)
              </button>
            </div>
          </div>

          {/* Inline Custom Variation Editor when user clicks "توليد قائمة جديدة بنفس الهوية البصرية" */}
          {showCustomVariationForm && (
            <form
              onSubmit={handleCustomVariationSubmit}
              className="p-3 rounded-xl bg-[var(--card)] border border-amber-500/40 space-y-2.5"
            >
              <div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
                <span>إدخال أصناف وأسعار القائمة الجديدة (تستخدم هذا الملصق كصورة مرجعية):</span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomItems((prev) => [...prev, { name: '', price: '' }])
                  }
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة صنف</span>
                </button>
              </div>

              <input
                type="text"
                value={customCategoryAr}
                onChange={(e) => setCustomCategoryAr(e.target.value)}
                placeholder="اسم القسم أو الأيقونة (مثال: لحم الجمل، مشروبات ساخنة، حلويات...)"
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-amber-500"
              />

              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {customItems.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                        );
                      }}
                      placeholder="اسم الصنف"
                      className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={row.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                        );
                      }}
                      placeholder="السعر"
                      className="w-24 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] font-mono tabular-nums"
                    />
                    {customItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCustomItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomVariationForm(false)}
                  className="px-3 py-1 rounded-lg text-xs text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  توليد القائمة المطابقة الآن
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
