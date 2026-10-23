/**
 * newsHub.ts — وحدة «مركز الأخبار المحلية» لخادم تيديكلت AI
 *
 * توفر هذه الوحدة:
 *  1) قراءة الأخبار المحلية المصنفة (/api/news/local)
 *  2) إضافة وحذف الأخبار المحلية للمشرف فقط (/api/news/local — محمية عبر adminGate في fixes.ts)
 *  3) توليد موجز ذكي ومختصر لأهم الأخبار مع بديل محلي فوري (/api/news/digest)
 */
import path from 'path';
import type { Express, Request, Response } from 'express';
import { DebouncedJsonWriter, generateWithFailover, readJsonFile } from './fixes.ts';
import { buildAwareSystemInstruction, getAlgeriaTimeContext } from './awareness.ts';

export type LocalNewsCategory = 'بلدية' | 'طرقات' | 'طقس' | 'صحة' | 'تعليم' | 'أسواق' | 'عام';

export interface LocalNewsItem {
  id: string;
  title: string;
  summary: string;
  category: LocalNewsCategory;
  source: string;
  urgent?: boolean;
  createdAt: string;
}

const VALID_CATEGORIES = new Set<LocalNewsCategory>([
  'بلدية',
  'طرقات',
  'طقس',
  'صحة',
  'تعليم',
  'أسواق',
  'عام',
]);

const DEFAULT_NEWS: LocalNewsItem[] = [
  {
    id: 'seed_news_1',
    title: 'استقرار حركة المرور عبر الطريق الوطني رقم 1 بين عين صالح والمنيعة',
    summary: 'أكدت مصالح أمن الطرقات أن المسار سالك أمام المركبات مع التوصية بتفقد الوقود والمياه قبل السفر.',
    category: 'طرقات',
    source: 'خلية الإعلام المحلية',
    urgent: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_news_2',
    title: 'وفرة تمور دقلة نور والغرس في السوق الأسبوعي بعين صالح',
    summary: 'شهدت أسواق وسط المدينة وفرة في المنتجات الفلاحية المحلية واستقراراً في التموين اليومي.',
    category: 'أسواق',
    source: 'تيديكلت المحلي',
    urgent: false,
    createdAt: new Date().toISOString(),
  },
];

function cleanField(val: unknown, maxLen = 300): string {
  return String(val ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLen);
}

export function registerNewsHubRoutes(
  app: Express,
  ai?: any,
  opts: { storeFile?: string } = {}
): void {
  const storeFile = opts.storeFile || path.join(process.cwd(), 'data', 'local_news.json');
  const writer = new DebouncedJsonWriter(storeFile, 1000);
  let items: LocalNewsItem[] = readJsonFile<LocalNewsItem[]>(storeFile, DEFAULT_NEWS);
  if (!Array.isArray(items) || items.length === 0) {
    items = [...DEFAULT_NEWS];
  }

  // 1) عرض الأخبار المحلية للجميع
  app.get('/api/news/local', (req: Request, res: Response) => {
    const category = cleanField(req.query.category, 40);
    const list = category
      ? items.filter((item) => item.category === category)
      : items;

    res.json({
      items: list,
      total: list.length,
    });
  });

  // 2) نشر خبر محلي جديد (محمي تلقائياً عبر adminGate في fixes.ts)
  app.post('/api/news/local', (req: Request, res: Response) => {
    const body = req.body || {};
    const title = cleanField(body.title, 180);
    const summary = cleanField(body.summary || body.body || body.text, 1200);
    const rawCat = cleanField(body.category, 40) as LocalNewsCategory;
    const category: LocalNewsCategory = VALID_CATEGORIES.has(rawCat) ? rawCat : 'عام';
    const source = cleanField(body.source || 'إدارة تيديكلت AI', 100);
    const urgent = Boolean(body.urgent);

    if (!title || !summary) {
      res.status(400).json({ error: 'عنوان الخبر وملخصه مطلوبان.' });
      return;
    }

    const item: LocalNewsItem = {
      id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      summary,
      category,
      source,
      urgent,
      createdAt: new Date().toISOString(),
    };

    items = [item, ...items].slice(0, 200);
    writer.schedule(items);

    res.status(201).json({ item });
  });

  // 3) حذف خبر محلي (محمي تلقائياً عبر adminGate في fixes.ts)
  app.delete('/api/news/local/:id', (req: Request, res: Response) => {
    const id = cleanField(req.params.id, 80);
    const before = items.length;
    items = items.filter((x) => x.id !== id);
    const deleted = items.length !== before;
    if (deleted) writer.schedule(items);

    res.json({ deleted, total: items.length });
  });

  // 4) توليد موجز ذكي لأهم الأخبار
  app.post('/api/news/digest', async (req: Request, res: Response) => {
    const limit = Math.max(1, Math.min(10, Number(req.body?.limit) || 5));
    const topItems = items.slice(0, limit);
    const timeCtx = getAlgeriaTimeContext();

    if (topItems.length === 0) {
      res.json({
        digest: 'لا توجد أخبار محلية مسجلة حالياً.',
        count: 0,
        generatedAt: timeCtx.iso,
      });
      return;
    }

    const bullets = topItems
      .map((n, idx) => `${idx + 1}. [${n.category}] ${n.title}: ${n.summary}`)
      .join('\n');

    if (ai) {
      const systemInstruction = buildAwareSystemInstruction({
        query: 'لخص أخبار اليوم في نقاط قصيرة',
        extraContext:
          'لخص الأخبار المحلية المرفقة في 3 نقاط قصيرة وواضحة بدون مقدمات ولا تهويل.',
      });
      const gen = await generateWithFailover(ai, {
        contents: `الأخبار المحلية اليوم:\n${bullets}`,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });
      if (gen?.text) {
        res.json({
          digest: gen.text,
          model: gen.model,
          count: topItems.length,
          generatedAt: timeCtx.iso,
        });
        return;
      }
    }

    const fallbackDigest = topItems
      .map((n, idx) => `${idx + 1}. ${n.title} (${n.category})`)
      .join('\n');

    res.json({
      digest: fallbackDigest,
      model: 'local-fallback',
      count: topItems.length,
      generatedAt: timeCtx.iso,
    });
  });
}
