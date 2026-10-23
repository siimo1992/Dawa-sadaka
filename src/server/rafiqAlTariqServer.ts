import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const RIDES_FILE = path.join(DATA_DIR, 'rafiq_rides.json');

export type CompanionType = 'CO_DRIVER' | 'COST_SHARE' | 'FAMILY_ONLY';
export type SearchCompanionType = 'CO_DRIVER' | 'COST_SHARE' | 'FAMILY_ONLY' | 'ANY';

export interface RafiqRide {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  companion_type: CompanionType;
  price_dzd: number; // 0 = باطل (مجاناً)
  seats: number;
  totalSeats: number;
  notes: string;
  driverName: string;
  driverPhone: string;
  createdAt: number;
  bookingsCount: number;
}

export interface RafiqFunctionCallResult {
  name: 'publish_ride' | 'search_rides';
  args: Record<string, any>;
}

export const RAFIQ_SYSTEM_INSTRUCTION = `أنت العقل المدبر لمنصة "رفيق الطريق" في الجزائر لمشاركة الرحلات بين الولايات.
مهمتك هي فهم رسائل السائقين والمسافرين المكتوبة باللغة العربية أو الدارجة الجزائرية، واستخراج البيانات بدقة لاستدعاء الدالة البرمجية المناسبة.

قواعد الفهم:
1. إذا كان المتحدث سائقاً ولديه سيارة ويبحث عن رفيق أو ركاب -> استدعِ دالة \`publish_ride\`.
2. إذا كان المتحدث مسافراً يبحث عن مقعد أو سيارة -> استدعِ دالة \`search_rides\`.
3. انتبه للمصطلحات الجزائرية:
   - "بلاصة / بلايص" = مقعد / مقاعد (مثلاً: "بلاصة" = 1، "زوج بلايص" = 2، "ثلاثة بلايص" = 3، "4 بلايص" = 4).
   - "باطل / فابور / لوجه الله" = مجاناً (السعر \`price_dzd = 0\`).
   - "يعاوني في السياقة / يسوق معايا / عنده برمي / نبدلو السياقة" = نوع الرفيق \`CO_DRIVER\` (رفيق قيادة يتناوب على القيادة).
   - "نعاونو في المازوط / ليصونص / نتقاسمو المازوط / تقاسم المصاريف" = نوع الرفيق \`COST_SHARE\` (تقاسم المصاريف والوقود).
   - "عايلة / للعائلات / مع العايلة" = نوع الرفيق \`FAMILY_ONLY\` (للعائلات).
4. إذا كانت هناك معلومة أساسية ناقصة (مثل نقطة الانطلاق أو الوجهة)، اسأل المستخدم عنها بلطف وباختصار قبل استدعاء الدالة، ولا تستدعِ الدالة أبداً إذا كانت نقطة الانطلاق (origin) أو الوجهة (destination) مجهولة.`;

export const publishRideDeclaration: FunctionDeclaration = {
  name: 'publish_ride',
  description: 'نشر رحلة جديدة عندما يعلن سائق عن سفره وحاجته إلى رفيق طريق أو ركاب.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      origin: {
        type: Type.STRING,
        description: 'ولاية أو مدينة الانطلاق',
      },
      destination: {
        type: Type.STRING,
        description: 'ولاية أو مدينة الوصول',
      },
      departure_time: {
        type: Type.STRING,
        description: 'تاريخ ووقت الانطلاق',
      },
      companion_type: {
        type: Type.STRING,
        enum: ['CO_DRIVER', 'COST_SHARE', 'FAMILY_ONLY'],
        description:
          'CO_DRIVER لرفيق يتناوب على القيادة، COST_SHARE لتقاسم المصاريف، FAMILY_ONLY للعائلات',
      },
      price_dzd: {
        type: Type.NUMBER,
        description: 'السعر بالدينار الجزائري، ويكون 0 إذا كانت الرحلة مجانية مقابل القيادة',
      },
      seats: {
        type: Type.INTEGER,
        description: 'عدد المقاعد المتاحة',
      },
      notes: {
        type: Type.STRING,
        description: 'شروط إضافية مثل التدخين أو نوع السيارة',
      },
    },
    required: ['origin', 'destination', 'companion_type'],
  },
};

export const searchRidesDeclaration: FunctionDeclaration = {
  name: 'search_rides',
  description: 'البحث عن رحلة متاحة عندما يطلب مسافر الانتقال من مدينة إلى أخرى.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      origin: {
        type: Type.STRING,
        description: 'ولاية الانطلاق',
      },
      destination: {
        type: Type.STRING,
        description: 'ولاية الوصول',
      },
      companion_type: {
        type: Type.STRING,
        enum: ['CO_DRIVER', 'COST_SHARE', 'FAMILY_ONLY', 'ANY'],
        description: 'نوع الرحلة المطلوبة',
      },
    },
    required: ['origin', 'destination'],
  },
};

export const RAFIQ_TOOLS_SCHEMA = [publishRideDeclaration, searchRidesDeclaration];

const SEED_RIDES: RafiqRide[] = [
  {
    id: 'ride-dz-1',
    origin: 'عين صالح',
    destination: 'الجزائر',
    departure_time: 'غدًا · 06:00',
    companion_type: 'CO_DRIVER',
    price_dzd: 0,
    seats: 2,
    totalSeats: 2,
    notes: 'تويوتا هايلوكس · رفيق قيادة يتناوب مع السائق',
    driverName: 'سائق رفيق الطريق',
    driverPhone: '0555000001',
    createdAt: Date.now() - 1000 * 60 * 95,
    bookingsCount: 0,
  },
  {
    id: 'ride-dz-2',
    origin: 'عين صالح',
    destination: 'تمنراست',
    departure_time: 'اليوم · 16:30',
    companion_type: 'COST_SHARE',
    price_dzd: 1500,
    seats: 3,
    totalSeats: 3,
    notes: 'بيجو 406 مكيفة · الانطلاق من وسط المدينة',
    driverName: 'ياسين',
    driverPhone: '0555000002',
    createdAt: Date.now() - 1000 * 60 * 180,
    bookingsCount: 0,
  },
  {
    id: 'ride-dz-3',
    origin: 'أدرار',
    destination: 'عين صالح',
    departure_time: 'غدًا · 07:30',
    companion_type: 'COST_SHARE',
    price_dzd: 1200,
    seats: 2,
    totalSeats: 2,
    notes: 'رونو سامبول · مرورًا بأولف وفقارة الزوى',
    driverName: 'محمد أمين',
    driverPhone: '0555000003',
    createdAt: Date.now() - 1000 * 60 * 240,
    bookingsCount: 0,
  },
];

function normalizeStoredRide(raw: any): RafiqRide {
  const rawCompanion = raw.companion_type || raw.companionType;
  const companion_type: CompanionType =
    rawCompanion === 'CO_DRIVER' || rawCompanion === 'FAMILY_ONLY' || rawCompanion === 'COST_SHARE'
      ? rawCompanion
      : 'COST_SHARE';

  const price_dzd =
    typeof raw.price_dzd === 'number'
      ? raw.price_dzd
      : typeof raw.price === 'number'
      ? raw.price
      : 0;

  const departure_time = String(raw.departure_time || raw.departureTime || 'غدوة الصباح');
  const notes = String(
    raw.notes ||
      [raw.vehicleType, raw.routeNotes].filter(Boolean).join(' · ') ||
      'رحلة عبر رفيق الطريق'
  );

  return {
    id: String(raw.id || `ride-${Date.now()}`),
    origin: String(raw.origin || ''),
    destination: String(raw.destination || ''),
    departure_time,
    companion_type,
    price_dzd,
    seats: typeof raw.seats === 'number' ? raw.seats : 1,
    totalSeats: typeof raw.totalSeats === 'number' ? raw.totalSeats : typeof raw.seats === 'number' ? raw.seats : 1,
    notes,
    driverName: String(raw.driverName || 'سائق رفيق الطريق'),
    driverPhone: String(raw.driverPhone || '0661-00-00-00'),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    bookingsCount: typeof raw.bookingsCount === 'number' ? raw.bookingsCount : 0,
  };
}

function loadRides(): RafiqRide[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(RIDES_FILE)) {
      const raw = fs.readFileSync(RIDES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customRides = parsed
          .filter((r: any) => r && typeof r.id === 'string' && !r.id.startsWith('ride-dz-'))
          .map(normalizeStoredRide);
        const merged = [...customRides, ...SEED_RIDES];
        fs.writeFileSync(RIDES_FILE, JSON.stringify(merged, null, 2), 'utf-8');
        return merged;
      }
    }
    fs.writeFileSync(RIDES_FILE, JSON.stringify(SEED_RIDES, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not load rafiq_rides.json, using seed rides:', err);
  }
  return [...SEED_RIDES];
}

let ridesStore: RafiqRide[] = loadRides();

function saveRides() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(RIDES_FILE, JSON.stringify(ridesStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save rafiq_rides.json:', err);
  }
}

const WILAYA_ALIASES: Array<{ canonical: string; patterns: RegExp[] }> = [
  { canonical: 'عين صالح', patterns: [/عين\s*صالح|إن\s*صالح|ان\s*صالح|in\s*salah/i] },
  { canonical: 'الجزائر', patterns: [/الجزائر|العاصمة|دزاير|اليج|alger/i] },
  { canonical: 'تمنراست', patterns: [/تمنراست|تمنغست|تام|tamanrasset/i] },
  { canonical: 'أدرار', patterns: [/أدرار|ادرار|adrar/i] },
  { canonical: 'ورقلة', patterns: [/ورقلة|وارجلان|ouargla/i] },
  { canonical: 'غرداية', patterns: [/غرداية|تغردايت|ghardaia/i] },
  { canonical: 'المنيعة', patterns: [/المنيعة|القليعة|el\s*menia/i] },
  { canonical: 'وهران', patterns: [/وهران|واهران|الباهية|oran/i] },
  { canonical: 'قسنطينة', patterns: [/قسنطينة|سيرتا|constantine/i] },
  { canonical: 'سطيف', patterns: [/سطيف|setif/i] },
  { canonical: 'بشار', patterns: [/بشار|bechar/i] },
  { canonical: 'إليزي', patterns: [/إليزي|اليزي|illizi/i] },
  { canonical: 'تندوف', patterns: [/تندوف|tindouf/i] },
  { canonical: 'الجلفة', patterns: [/الجلفة|جلفة|djelfa/i] },
  { canonical: 'الأغواط', patterns: [/الأغواط|الاغواط|laghouat/i] },
  { canonical: 'بسكرة', patterns: [/بسكرة|biskra/i] },
  { canonical: 'الوادي', patterns: [/الوادي|واد\s*سوف|سوف|el\s*oued/i] },
  { canonical: 'تقرت', patterns: [/تقرت|توقرت|touggourt/i] },
  { canonical: 'تيميمون', patterns: [/تيميمون|timimoun/i] },
  { canonical: 'برج باجي مختار', patterns: [/برج\s*باجي\s*مختار/i] },
  { canonical: 'إن قزام', patterns: [/إن\s*قزام|ان\s*قزام|عين\s*قزام/i] },
  { canonical: 'جانت', patterns: [/جانت|djanet/i] },
  { canonical: 'عنابة', patterns: [/عنابة|بونة|annaba/i] },
  { canonical: 'بجاية', patterns: [/بجاية|bejaia/i] },
  { canonical: 'تيزي وزو', patterns: [/تيزي\s*وزو|tizi/i] },
  { canonical: 'البليدة', patterns: [/البليدة|بليدة|blida/i] },
  { canonical: 'تلمسان', patterns: [/تلمسان|tlemcen/i] },
  { canonical: 'باتنة', patterns: [/باتنة|batna/i] },
];

export function normalizeCityName(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  for (const w of WILAYA_ALIASES) {
    if (w.patterns.some((p) => p.test(cleaned))) {
      return w.canonical;
    }
  }
  return cleaned.replace(/^(ولاية|مدينة)\s+/i, '').trim();
}

export function parseAlgerianDarjaRideIntent(fullText: string): {
  role: 'driver' | 'passenger';
  origin?: string;
  destination?: string;
  seats: number;
  price_dzd?: number;
  companion_type: CompanionType;
  search_companion_type: SearchCompanionType;
  departure_time?: string;
  notes?: string;
} {
  const text = fullText.trim();

  const isDriver =
    /عندي\s*(طوموبيل|سيارة|مركبة|كليو|سامبول|هايلوكس|بيجو|رونو|داسيا|بلاصة|بلايص|مقاعد)|راني\s*طالع\s*بسيارتي|نحوس\s*على\s*(واحد\s*يسوق|رفيق|ركاب)|يعاوني\s*في\s*السياقة|يسوق\s*معايا|متوفرة\s*بلايص|كاين\s*\d*\s*بلايص/i.test(
      text
    ) && !/نحوس\s*على\s*(بلاصة|سيارة|طوموبيل|رحلة)|خصتني\s*بلاصة|نسحق\s*بلاصة/i.test(text);

  let companion_type: CompanionType = 'COST_SHARE';
  let search_companion_type: SearchCompanionType = 'ANY';

  if (/يعاوني\s*في\s*السياقة|يسوق\s*معايا|نسوق\s*معاه|عنده\s*برمي|عندي\s*برمي|برمي|رخصة\s*سياقة|رفيق\s*قيادة|نبدلو\s*السياقة/i.test(text)) {
    companion_type = 'CO_DRIVER';
    search_companion_type = 'CO_DRIVER';
  } else if (/عايلة|عائلة|للعائلات|عائلي|مرتي|ولادي/i.test(text)) {
    companion_type = 'FAMILY_ONLY';
    search_companion_type = 'FAMILY_ONLY';
  } else if (/المازوط|مازوط|ليصونص|ليسونس|الوقود|نتقاسمو\s*المازوط|نعاونو\s*في\s*المازوط|نعاونو\s*في\s*ليصونص|مصاريف/i.test(text)) {
    companion_type = 'COST_SHARE';
    search_companion_type = 'COST_SHARE';
  }

  let seats = 1;
  if (/زوج\s*بلايص|2\s*بلايص|بلايصتين|مقعدين|اثنين\s*بلايص/i.test(text)) {
    seats = 2;
  } else if (/ثلاثة?\s*بلايص|3\s*بلايص|ثلاث\s*مقاعد/i.test(text)) {
    seats = 3;
  } else if (/أربعة?\s*بلايص|اربعة?\s*بلايص|4\s*بلايص|أربع\s*مقاعد/i.test(text)) {
    seats = 4;
  } else {
    const matchNum = text.match(/(\d+)\s*(?:بلايص|بلاصة|مقاعد|مقعد)/i);
    if (matchNum) {
      seats = Math.max(1, Math.min(8, parseInt(matchNum[1], 10)));
    }
  }

  let price_dzd: number | undefined = undefined;
  if (/باطل|فابور|مجاناً|مجانا|بلاش|لوجه\s*الله|0\s*دج/i.test(text)) {
    price_dzd = 0;
  } else {
    const priceMatch = text.match(/(\d{3,5})\s*(?:دج|دينار|ألف|الف|da)/i);
    if (priceMatch) {
      price_dzd = parseInt(priceMatch[1], 10);
    }
  }

  let origin: string | undefined;
  let destination: string | undefined;

  const fromToMatch = text.match(/من\s+([^\s،,.]+(?:\s+[^\s،,.]+)?)\s+(?:إلى|الى|لـ|ل|حتى|شور)\s*([^\s،,.]+(?:\s+[^\s،,.]+)?)/i);
  if (fromToMatch) {
    origin = normalizeCityName(fromToMatch[1]);
    destination = normalizeCityName(fromToMatch[2]);
  }

  if (!origin || !destination) {
    const foundWilayas: Array<{ name: string; index: number }> = [];
    for (const w of WILAYA_ALIASES) {
      for (const p of w.patterns) {
        const m = p.exec(text);
        if (m && m.index !== undefined) {
          if (!foundWilayas.some((fw) => fw.name === w.canonical)) {
            foundWilayas.push({ name: w.canonical, index: m.index });
          }
        }
      }
    }
    foundWilayas.sort((a, b) => a.index - b.index);
    if (foundWilayas.length >= 2) {
      origin = origin || foundWilayas[0].name;
      destination = destination || foundWilayas[1].name;
    } else if (foundWilayas.length === 1) {
      const single = foundWilayas[0].name;
      if (new RegExp(`من\\s*${single}`, 'i').test(text)) {
        origin = single;
      } else if (new RegExp(`(?:إلى|الى|لـ|ل|طالع\\s*ل|رايح\\s*ل|هابط\\s*ل)\\s*${single}`, 'i').test(text)) {
        destination = single;
      }
    }
  }

  let departure_time: string | undefined;
  const timeMatch = text.match(/(غدوة\s*(?:الصباح|العشية|الليل)?(?:\s*على\s*\d{1,2}(?::\d{2})?)?|اليوم\s*(?:الصباح|العشية|الليل)?|بعد\s*غدوة|الصباح\s*بكري|العشية|الخميس|الجمعة|السبت|الأحد)/i);
  if (timeMatch) {
    departure_time = timeMatch[1].trim();
  }

  return {
    role: isDriver ? 'driver' : 'passenger',
    origin,
    destination,
    seats,
    price_dzd,
    companion_type,
    search_companion_type,
    departure_time,
    notes: text.slice(0, 140),
  };
}

export function filterMatchingRides(args: {
  origin?: string;
  destination?: string;
  companion_type?: string;
}): RafiqRide[] {
  const normOrigin = normalizeCityName(args.origin);
  const normDest = normalizeCityName(args.destination);

  return ridesStore.filter((r) => {
    const matchOrigin =
      !normOrigin ||
      normalizeCityName(r.origin).includes(normOrigin) ||
      normOrigin.includes(normalizeCityName(r.origin));
    const matchDest =
      !normDest ||
      normalizeCityName(r.destination).includes(normDest) ||
      normDest.includes(normalizeCityName(r.destination));
    const matchSeats = r.seats >= 1;
    const matchCompanion =
      !args.companion_type ||
      args.companion_type === 'ANY' ||
      r.companion_type === args.companion_type;

    return matchOrigin && matchDest && matchSeats && matchCompanion;
  });
}

export function registerRafiqAlTariqRoutes(app: Express, ai: GoogleGenAI) {
  app.get('/api/rafiq/rides', (_req: Request, res: Response) => {
    return res.json({
      rides: ridesStore,
      total: ridesStore.length,
      toolsSchema: RAFIQ_TOOLS_SCHEMA,
    });
  });

  app.post('/api/rafiq/book', (req: Request, res: Response) => {
    const { rideId, seatsToBook = 1 } = req.body || {};
    if (!rideId) {
      return res.status(400).json({ error: 'معرف الرحلة مطلوب.' });
    }

    const idx = ridesStore.findIndex((r) => r.id === rideId);
    if (idx === -1) {
      return res.status(404).json({ error: 'الرحلة غير موجودة.' });
    }

    const ride = ridesStore[idx];
    const requested = Math.max(1, Number(seatsToBook) || 1);
    if (ride.seats < requested) {
      return res.status(400).json({ error: 'لا توجد مقاعد كافية متاحة في هذه الرحلة.' });
    }

    ride.seats -= requested;
    ride.bookingsCount = (ride.bookingsCount || 0) + requested;
    saveRides();

    return res.json({
      success: true,
      ride,
      rides: ridesStore,
    });
  });

  app.post('/api/rafiq/publish', (req: Request, res: Response) => {
    const {
      origin,
      destination,
      departure_time,
      companion_type,
      price_dzd,
      seats,
      notes,
      driverName,
      driverPhone,
    } = req.body || {};

    const cleanOrigin = normalizeCityName(String(origin || '').trim());
    const cleanDest = normalizeCityName(String(destination || '').trim());

    if (!cleanOrigin || !cleanDest) {
      return res.status(400).json({ error: 'يرجى تحديد مدينة الانطلاق ومدينة الوصول.' });
    }

    const validCompanion: CompanionType =
      companion_type === 'CO_DRIVER' ||
      companion_type === 'FAMILY_ONLY' ||
      companion_type === 'COST_SHARE'
        ? companion_type
        : 'COST_SHARE';

    const validPrice =
      validCompanion === 'CO_DRIVER' && (price_dzd === undefined || price_dzd === '')
        ? 0
        : Math.max(0, Number(price_dzd) || 0);

    const validSeats = Math.max(1, Math.min(8, Math.round(Number(seats) || 2)));
    const validTime = String(departure_time || 'غدًا · 06:00 صباحًا').trim();
    const validNotes = String(notes || 'سيارة مريحة ومكيفة · التزام بالموعد').trim();

    const newRide: RafiqRide = {
      id: `ride-${Date.now()}`,
      origin: cleanOrigin,
      destination: cleanDest,
      departure_time: validTime,
      companion_type: validCompanion,
      price_dzd: validPrice,
      seats: validSeats,
      totalSeats: validSeats,
      notes: validNotes,
      driverName: String(driverName || 'سائق رفيق الطريق').trim(),
      driverPhone: String(driverPhone || '0661-00-00-00').trim(),
      createdAt: Date.now(),
      bookingsCount: 0,
    };

    ridesStore = [newRide, ...ridesStore];
    saveRides();

    return res.json({
      success: true,
      publishedRide: newRide,
      rides: ridesStore,
      functionCall: {
        name: 'publish_ride',
        args: {
          origin: cleanOrigin,
          destination: cleanDest,
          departure_time: validTime,
          companion_type: validCompanion,
          price_dzd: validPrice,
          seats: validSeats,
          notes: validNotes,
        },
      },
    });
  });

  app.put('/api/rafiq/rides/:id', (req: Request, res: Response) => {
    const rideId = String(req.params.id || '');
    const idx = ridesStore.findIndex((r) => String(r.id) === rideId);
    if (idx === -1) {
      return res.status(404).json({ error: 'الرحلة غير موجودة.' });
    }

    const current = ridesStore[idx];
    const body = req.body || {};

    const updatedOrigin = body.origin !== undefined
      ? normalizeCityName(String(body.origin).trim()) || current.origin
      : current.origin;
    const updatedDest = body.destination !== undefined
      ? normalizeCityName(String(body.destination).trim()) || current.destination
      : current.destination;

    const updatedCompanion: CompanionType =
      body.companion_type === 'CO_DRIVER' ||
      body.companion_type === 'FAMILY_ONLY' ||
      body.companion_type === 'COST_SHARE'
        ? body.companion_type
        : current.companion_type;

    const updatedPrice =
      body.price_dzd !== undefined
        ? Math.max(0, Number(body.price_dzd) || 0)
        : current.price_dzd;

    const updatedSeats =
      body.seats !== undefined
        ? Math.max(0, Math.min(8, Math.round(Number(body.seats))))
        : current.seats;

    const updatedTime =
      body.departure_time !== undefined
        ? String(body.departure_time).trim() || current.departure_time
        : current.departure_time;

    const updatedNotes =
      body.notes !== undefined
        ? String(body.notes).trim()
        : current.notes;

    const updatedPhone =
      body.driverPhone !== undefined
        ? String(body.driverPhone).trim() || current.driverPhone
        : current.driverPhone;

    ridesStore[idx] = {
      ...current,
      origin: updatedOrigin,
      destination: updatedDest,
      departure_time: updatedTime,
      companion_type: updatedCompanion,
      price_dzd: updatedPrice,
      seats: updatedSeats,
      notes: updatedNotes,
      driverPhone: updatedPhone,
    };

    saveRides();
    return res.json({
      success: true,
      ride: ridesStore[idx],
      rides: ridesStore,
    });
  });

  app.delete('/api/rafiq/rides/:id', (req: Request, res: Response) => {
    const rideId = String(req.params.id || '');
    const beforeLen = ridesStore.length;
    ridesStore = ridesStore.filter((r) => String(r.id) !== rideId);
    if (ridesStore.length !== beforeLen) {
      saveRides();
    }
    return res.json({
      success: true,
      rides: ridesStore,
    });
  });

  app.post('/api/rafiq/chat', async (req: Request, res: Response) => {
    try {
      const { message, history = [] } = req.body || {};
      const userText = typeof message === 'string' ? message.trim() : '';

      if (!userText) {
        return res.status(400).json({ error: 'يرجى كتابة رسالتك أولاً.' });
      }

      const conversationContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      if (Array.isArray(history)) {
        for (const h of history.slice(-8)) {
          if (h && typeof h.text === 'string' && h.text.trim()) {
            conversationContents.push({
              role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.text.trim() }],
            });
          }
        }
      }
      conversationContents.push({
        role: 'user',
        parts: [{ text: userText }],
      });

      const combinedDialogueText = [
        ...conversationContents.filter((c) => c.role === 'user').map((c) => c.parts[0]?.text || ''),
      ].join(' ، ');

      let functionCall: RafiqFunctionCallResult | null = null;
      let assistantReply = '';

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: conversationContents,
          config: {
            systemInstruction: RAFIQ_SYSTEM_INSTRUCTION,
            temperature: 0.2,
            tools: [
              {
                functionDeclarations: [publishRideDeclaration, searchRidesDeclaration],
              },
            ],
          },
        });

        const calls = response.functionCalls;
        if (calls && calls.length > 0) {
          const fc = calls[0];
          if (fc.name === 'publish_ride' || fc.name === 'search_rides') {
            functionCall = {
              name: fc.name,
              args: (fc.args as Record<string, any>) || {},
            };
          }
        }
        assistantReply = response.text || '';
      } catch (aiErr: any) {
        console.warn('Gemini function call fallback triggered for Rafiq Al-Tariq:', aiErr?.message || aiErr);
        const parsed = parseAlgerianDarjaRideIntent(combinedDialogueText);
        if (!parsed.origin || !parsed.destination) {
          const missingPart =
            !parsed.origin && !parsed.destination
              ? 'نقطة الانطلاق والوجهة (من أي ولاية راك خارج ولوين رايح؟)'
              : !parsed.origin
              ? 'ولاية الانطلاق (منين راك مقلع؟)'
              : 'ولاية الوجهة (لوين راك قاصد؟)';
          return res.json({
            reply: `مرحبا بيك خويا في رفيق الطريق! يخصني غير تقولي ${missingPart} باش نكملولك الطلب في الحين.`,
            functionCall: null,
            needsClarification: true,
            rides: ridesStore,
          });
        }

        if (parsed.role === 'driver') {
          functionCall = {
            name: 'publish_ride',
            args: {
              origin: parsed.origin,
              destination: parsed.destination,
              departure_time: parsed.departure_time || 'غدوة الصباح',
              companion_type: parsed.companion_type,
              price_dzd: parsed.price_dzd ?? (parsed.companion_type === 'CO_DRIVER' ? 0 : 1500),
              seats: parsed.seats || 1,
              notes: parsed.notes || userText,
            },
          };
        } else {
          functionCall = {
            name: 'search_rides',
            args: {
              origin: parsed.origin,
              destination: parsed.destination,
              companion_type: parsed.search_companion_type,
            },
          };
        }
      }

      if (functionCall) {
        const rawOrigin = String(functionCall.args.origin || '').trim();
        const rawDest = String(functionCall.args.destination || '').trim();
        const isUnknown = (val: string) =>
          !val ||
          /^(غير محدد|غير معروف|مجهول|unknown|null|undefined|\?|none|-)$/i.test(val);

        if (isUnknown(rawOrigin) || isUnknown(rawDest)) {
          const missingQuestion =
            isUnknown(rawOrigin) && isUnknown(rawDest)
              ? 'من أي ولاية راك منطلق، ولوين راك متوجه خويا؟'
              : isUnknown(rawOrigin)
              ? `عرفت بلي راك متوجه لـ **${rawDest}**، بصح من أي ولاية راك منطلق؟`
              : `عرفت بلي الانطلاق من **${rawOrigin}**، بصح لوين راك حاب توصل (الوجهة)؟`;

          return res.json({
            reply: assistantReply || missingQuestion,
            functionCall: null,
            needsClarification: true,
            rides: ridesStore,
          });
        }

        const darjaHints = parseAlgerianDarjaRideIntent(combinedDialogueText);
        const origin = normalizeCityName(rawOrigin);
        const destination = normalizeCityName(rawDest);

        if (functionCall.name === 'publish_ride') {
          const seats = Math.max(1, Number(functionCall.args.seats) || darjaHints.seats || 1);
          const isFree =
            darjaHints.price_dzd === 0 ||
            Number(functionCall.args.price_dzd) === 0 ||
            /باطل|فابور|مجان/i.test(combinedDialogueText);
          const price_dzd = isFree
            ? 0
            : Number(functionCall.args.price_dzd) > 0
            ? Number(functionCall.args.price_dzd)
            : darjaHints.price_dzd ?? 1500;

          const rawCompanion = functionCall.args.companion_type;
          const companion_type: CompanionType =
            darjaHints.companion_type === 'CO_DRIVER' || darjaHints.companion_type === 'FAMILY_ONLY'
              ? darjaHints.companion_type
              : ['CO_DRIVER', 'COST_SHARE', 'FAMILY_ONLY'].includes(rawCompanion)
              ? rawCompanion
              : 'COST_SHARE';

          const departure_time = String(
            functionCall.args.departure_time || darjaHints.departure_time || 'غدوة الصباح'
          ).trim();
          const notes = String(functionCall.args.notes || userText).trim();

          const normalizedArgs = {
            origin,
            destination,
            departure_time,
            companion_type,
            price_dzd,
            seats,
            notes,
          };

          const newRide: RafiqRide = {
            id: `ride-${Date.now()}`,
            origin,
            destination,
            departure_time,
            companion_type,
            price_dzd,
            seats,
            totalSeats: seats,
            notes,
            driverName: 'سائق رفيق الطريق',
            driverPhone: '0661-00-00-00',
            createdAt: Date.now(),
            bookingsCount: 0,
          };

          ridesStore = [newRide, ...ridesStore];
          saveRides();

          const companionLabel =
            companion_type === 'CO_DRIVER'
              ? 'رفيق قيادة (CO_DRIVER - يتناوب على القيادة)'
              : companion_type === 'FAMILY_ONLY'
              ? 'للعائلات فقط (FAMILY_ONLY)'
              : 'تقاسم المصاريف والوقود (COST_SHARE)';

          const priceLabel = price_dzd === 0 ? 'باطل (مجاناً - 0 دج)' : `${price_dzd} دج للمقعد`;

          return res.json({
            reply:
              assistantReply ||
              `تم استدعاء \`publish_ride\` ونشر رحلتك بنجاح من **${origin}** إلى **${destination}**!\n- **المقاعد المتاحة**: ${seats} بلايص\n- **السعر**: ${priceLabel}\n- **نوع الرفيق**: ${companionLabel}\n- **وقت الانطلاق**: ${departure_time}\n- **ملاحظات**: ${notes}`,
            functionCall: {
              name: 'publish_ride',
              args: normalizedArgs,
            },
            publishedRide: newRide,
            rides: ridesStore,
            needsClarification: false,
          });
        }

        if (functionCall.name === 'search_rides') {
          const rawCompanion = functionCall.args.companion_type;
          const companion_type: SearchCompanionType =
            darjaHints.search_companion_type !== 'ANY'
              ? darjaHints.search_companion_type
              : ['CO_DRIVER', 'COST_SHARE', 'FAMILY_ONLY', 'ANY'].includes(rawCompanion)
              ? rawCompanion
              : 'ANY';

          const normalizedArgs = {
            origin,
            destination,
            companion_type,
          };

          const matchedRides = filterMatchingRides(normalizedArgs);

          const matchSummary =
            matchedRides.length > 0
              ? `تم استدعاء \`search_rides\` للبحث عن رحلة من **${origin}** إلى **${destination}** (${companion_type}). لقينا **${matchedRides.length} رحلة** مطابقة في القائمة، تقدر تحجز بلاصتك مباشرة!`
              : `تم استدعاء \`search_rides\` للبحث من **${origin}** إلى **${destination}** (${companion_type}). حالياً ماكانش رحلة مطابقة تماماً لهذا المسار، بصح تقدر تلغي الفلتر وتشوف الرحلات القريبة المتوفرة.`;

          return res.json({
            reply: assistantReply || matchSummary,
            functionCall: {
              name: 'search_rides',
              args: normalizedArgs,
            },
            matchedRides,
            rides: ridesStore,
            needsClarification: false,
          });
        }
      }

      return res.json({
        reply:
          assistantReply ||
          'مرحبا بيك في منصة "رفيق الطريق"! قولي برك من أي ولاية راك مقلع ولوين راك حاب تروح، وواش راك سائق ولا مسافر؟',
        functionCall: null,
        needsClarification: true,
        rides: ridesStore,
      });
    } catch (err: any) {
      console.error('Rafiq Al-Tariq chat error:', err);
      return res.status(500).json({
        error: 'تعذر معالجة طلب رفيق الطريق حالياً. حاول مرة أخرى.',
      });
    }
  });
}
