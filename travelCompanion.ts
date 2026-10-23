/**
 * travelCompanion.ts — وحدة «رفيق الطريق» لخادم تيديكلت AI
 *
 * توفر هذه الوحدة:
 *  1) عرض المسارات الصحراوية ومحطات الوقود وأرقام الطوارئ (/api/companion/roads)
 *  2) نشر رحلات المشاركة والبحث عنها مع إخفاء جزئي لرقم الهاتف للعامة (/api/companion/trips)
 *  3) لوحة المشرف لعرض الرحلات كاملة (/api/companion/admin/trips — محمية عبر adminGate)
 *  4) مستشار السفر الذكي مع بديل محلي فوري عند انقطاع الاتصال (/api/companion/ask)
 */
import path from 'path';
import type { Express, Request, Response } from 'express';
import { DebouncedJsonWriter, generateWithFailover, readJsonFile } from './fixes.ts';
import {
  DESERT_ROADS,
  EMERGENCY_NUMBERS,
  analyzeQueryAwareness,
  buildAwareSystemInstruction,
} from './awareness.ts';

export interface CompanionTrip {
  id: string;
  from: string;
  to: string;
  when: string;
  seats: number;
  companionType: 'CO_DRIVER' | 'COST_SHARE' | 'FAMILY_ONLY';
  priceDzd: number;
  driverName: string;
  contact: string;
  notes: string;
  createdAt: string;
}

const DEFAULT_TRIPS: CompanionTrip[] = [
  {
    id: 'seed_trip_1',
    from: 'عين صالح',
    to: 'تمنراست',
    when: 'غداً 06:00 صباحاً',
    seats: 2,
    companionType: 'CO_DRIVER',
    priceDzd: 0,
    driverName: 'عبد القادر',
    contact: '0661234567',
    notes: 'سيارة رباعية الدفع مكيفة · تناوب على القيادة عبر أراك',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_trip_2',
    from: 'عين صالح',
    to: 'المنيعة',
    when: 'اليوم 16:00',
    seats: 3,
    companionType: 'COST_SHARE',
    priceDzd: 1500,
    driverName: 'ياسين',
    contact: '0550987654',
    notes: 'تقاسم مصاريف الوقود · الانطلاق من وسط المدينة',
    createdAt: new Date().toISOString(),
  },
];

export function maskContact(raw: string): string {
  const s = (raw || '').trim();
  if (s.length <= 4) return '****';
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

function sanitizeText(val: unknown, maxLen = 120): string {
  return String(val ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLen);
}

export function registerTravelCompanionRoutes(
  app: Express,
  ai?: any,
  opts: { storeFile?: string } = {}
): void {
  const storeFile = opts.storeFile || path.join(process.cwd(), 'data', 'companion_trips.json');
  const writer = new DebouncedJsonWriter(storeFile, 1000);
  let trips: CompanionTrip[] = readJsonFile<CompanionTrip[]>(storeFile, DEFAULT_TRIPS);
  if (!Array.isArray(trips) || trips.length === 0) {
    trips = [...DEFAULT_TRIPS];
  }

  // 1) معلومات المسارات الصحراوية والطوارئ
  app.get('/api/companion/roads', (_req: Request, res: Response) => {
    res.json({
      roads: DESERT_ROADS,
      emergency: EMERGENCY_NUMBERS,
    });
  });

  // 2) عرض الرحلات المتاحة (مع إخفاء جزئي لرقم الهاتف لحماية الخصوصية)
  app.get('/api/companion/trips', (req: Request, res: Response) => {
    const fromFilter = sanitizeText(req.query.from || req.query.origin, 60);
    const toFilter = sanitizeText(req.query.to || req.query.destination, 60);

    const filtered = trips.filter((t) => {
      const okFrom = !fromFilter || t.from.includes(fromFilter) || fromFilter.includes(t.from);
      const okTo = !toFilter || t.to.includes(toFilter) || toFilter.includes(t.to);
      return okFrom && okTo && t.seats > 0;
    });

    res.json({
      trips: filtered.map((t) => ({
        ...t,
        contact: maskContact(t.contact),
      })),
      total: filtered.length,
    });
  });

  // 3) إضافة رحلة جديدة
  app.post('/api/companion/trips', (req: Request, res: Response) => {
    const body = req.body || {};
    const from = sanitizeText(body.from || body.origin, 60);
    const to = sanitizeText(body.to || body.destination, 60);
    const when = sanitizeText(body.when || body.departure_time || 'غداً صباحاً', 80);
    const driverName = sanitizeText(body.driverName || body.name || 'مسافر تيديكلت', 60);
    const contact = sanitizeText(body.contact || body.driverPhone || body.phone, 30);
    const notes = sanitizeText(body.notes, 240);
    const seats = Math.max(1, Math.min(8, Math.round(Number(body.seats) || 1)));
    const priceDzd = Math.max(0, Math.min(50_000, Math.round(Number(body.priceDzd ?? body.price_dzd) || 0)));
    const rawType = String(body.companionType || body.companion_type || 'COST_SHARE');
    const companionType: CompanionTrip['companionType'] =
      rawType === 'CO_DRIVER' || rawType === 'FAMILY_ONLY' || rawType === 'COST_SHARE'
        ? rawType
        : 'COST_SHARE';

    if (!from || !to) {
      res.status(400).json({ error: 'يرجى تحديد نقطة الانطلاق والوجهة.' });
      return;
    }
    if (!contact || contact.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال وسيلة تواصل صحيحة.' });
      return;
    }

    const trip: CompanionTrip = {
      id: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from,
      to,
      when,
      seats,
      companionType,
      priceDzd,
      driverName,
      contact,
      notes,
      createdAt: new Date().toISOString(),
    };

    trips = [trip, ...trips].slice(0, 200);
    writer.schedule(trips);

    res.status(201).json({
      trip: { ...trip, contact: maskContact(trip.contact) },
    });
  });

  // 4) مسار المشرف لعرض كامل بيانات الرحلات (محمي تلقائياً بواسطة adminGate في fixes.ts)
  app.get('/api/companion/admin/trips', (_req: Request, res: Response) => {
    res.json({
      trips,
      total: trips.length,
    });
  });

  // 5) مستشار السفر الذكي (رفيق الطريق)
  app.post('/api/companion/ask', async (req: Request, res: Response) => {
    const query = sanitizeText(req.body?.query || req.body?.message, 1000);
    if (!query) {
      res.status(400).json({ error: 'يرجى كتابة سؤالك حول الطريق أو الرحلة.' });
      return;
    }

    const awareness = analyzeQueryAwareness(query);
    const road = awareness.matchedRoad || DESERT_ROADS[0];
    const matchingTrips = trips
      .filter((t) => query.includes(t.to) || query.includes(t.from))
      .slice(0, 3)
      .map((t) => ({ ...t, contact: maskContact(t.contact) }));

    const systemInstruction = buildAwareSystemInstruction({
      query,
      extraContext: `أنت «رفيق الطريق» داخل تيديكلت AI. ساعد المسافر بمعلومات مختصرة وعملية حول المسار، محطات الوقود، ونصائح السلامة الصحراوية.`,
    });

    if (ai) {
      const gen = await generateWithFailover(ai, {
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
      if (gen?.text) {
        res.json({
          answer: gen.text,
          model: gen.model,
          road,
          matchingTrips,
          emergency: EMERGENCY_NUMBERS,
        });
        return;
      }
    }

    const fallbackAnswer = `${road.name} (${road.from} ↔ ${road.to}، ${road.distanceKm} كم): ${road.notes} محطات الوقود: ${road.fuelStops.join('، ')}. للطوارئ: الحماية المدنية ${EMERGENCY_NUMBERS.civilProtection} أو الدرك الوطني ${EMERGENCY_NUMBERS.gendarmerie}.`;

    res.json({
      answer: fallbackAnswer,
      model: 'local-fallback',
      road,
      matchingTrips,
      emergency: EMERGENCY_NUMBERS,
    });
  });
}
