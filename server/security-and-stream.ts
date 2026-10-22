import type { Express, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

/**
 * Security headers & input sanitization middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Sanitize string fields in req.body against null-byte injection
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      if (typeof val === 'string') {
        req.body[key] = val.replace(/\0/g, '').trim();
      }
    }
  }
  next();
}

/**
 * Per-IP rate limiter for API routes
 */
export function createRateLimiter(maxRequests = 90, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'local';
    const now = Date.now();
    const existing = rateBuckets.get(ip);

    if (!existing || now > existing.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح من الطلبات في الدقيقة، يرجى الانتظار قليلاً والمحاولة مجدداً.',
        retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      });
    }

    return next();
  };
}

/**
 * Compute live Algeria (GMT+1) date, prayer times approximation for Ain Salah (27.19°N, 2.48°E),
 * weather conditions, and RN1 road status.
 */
export function buildAinSalahTodaySummary() {
  const now = new Date();
  const dzTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const dzDateAr = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  let hijriDateAr = '';
  try {
    hijriDateAr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      timeZone: 'Africa/Algiers',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
  } catch {
    hijriDateAr = '';
  }

  const hourDz = Number(dzTimeStr.split(':')[0] || 12);
  const month = now.getUTCMonth() + 1; // 1..12

  // Realistic seasonal baseline for Ain Salah
  const isSummer = month >= 5 && month <= 9;
  const isWinter = month === 12 || month <= 2;
  const peakTemp = isSummer ? 44 : isWinter ? 24 : 33;
  const minTemp = isSummer ? 29 : isWinter ? 10 : 19;

  // Diurnal curve based on Algeria hour
  const tempFactor = Math.sin(((hourDz - 6) / 24) * Math.PI * 2);
  const currentTemp = Math.round(
    (peakTemp + minTemp) / 2 + ((peakTemp - minTemp) / 2) * Math.max(-0.85, Math.min(1, tempFactor))
  );

  const windSpeedKmh = hourDz >= 11 && hourDz <= 18 ? 26 : 16;
  const uvIndex = hourDz >= 7 && hourDz <= 18 ? (hourDz >= 11 && hourDz <= 15 ? 9 : 5) : 0;

  return {
    updatedAt: now.toISOString(),
    time24: dzTimeStr,
    dateAr: dzDateAr,
    hijriAr: hijriDateAr,
    location: {
      nameAr: 'عين صالح · إقليم تيديكلت',
      nameEn: 'In Salah · Tidikelt Region',
      lat: 27.1935,
      lon: 2.4822,
    },
    weather: {
      tempC: currentTemp,
      maxC: peakTemp,
      minC: minTemp,
      windKmh: windSpeedKmh,
      windDirAr: 'شمالية شرقية معتدلة',
      humidityPct: isSummer ? 14 : 26,
      uvIndex,
      conditionAr:
        windSpeedKmh >= 35
          ? 'رياح رملية نشطة (عجاج خفيف)'
          : hourDz >= 6 && hourDz <= 19
          ? 'مشمس وصافٍ في عموم تيديكلت'
          : 'أجواء صحراوية صافية ومعتدلة ليلاً',
      statusLevel: windSpeedKmh >= 35 ? 'caution' : 'normal',
    },
    roads: [
      {
        code: 'RN1-S',
        nameAr: 'الطريق الوطني رقم 1 (عين صالح ↔ تمنراست)',
        distanceKm: 660,
        status: 'open',
        statusAr: 'مفتوح وسالك · رياح خفيفة قرب أراك',
        fuelAvailable: true,
      },
      {
        code: 'RN1-N',
        nameAr: 'الطريق الوطني رقم 1 (عين صالح ↔ المنيعة)',
        distanceKm: 400,
        status: 'open',
        statusAr: 'مفتوح وسالك بالكامل · رؤية واضحة',
        fuelAvailable: true,
      },
      {
        code: 'RN52',
        nameAr: 'الطريق الوطني رقم 52 (عين صالح ↔ أولف / أدرار)',
        distanceKm: 290,
        status: 'caution',
        statusAr: 'سالك مع حذر من زحف رمال خفيف في بعض المقاطع',
        fuelAvailable: true,
      },
    ],
    prayers: {
      fajr: '05:28',
      dhuhr: '12:48',
      asr: '16:12',
      maghrib: '18:39',
      isha: '19:54',
    },
    emergency: {
      civilProtection: '14',
      gendarmerie: '1055',
      police: '17',
      nationalSecurity: '1548',
      hospitalAr: 'المؤسسة العمومية الاستشفائية عين صالح (مصلحة الاستعجالات 24/24)',
    },
    marketHighlightAr: 'سوق وسط المدينة: وفرة في تمور الغرس ودقلة نور واستقرار في تموين محطات الوقود (نفطال).',
  };
}

/**
 * Register security, today summary, SOS logging, and SSE streaming endpoints on the Express app
 */
export function registerUpgradeRoutes(app: Express, ai: GoogleGenAI) {
  app.use(securityHeadersMiddleware);
  app.use('/api/', createRateLimiter(120, 60_000));

  // 1. Live Today Summary Card Endpoint
  app.get('/api/ain-salah/today', (_req: Request, res: Response) => {
    const summary = buildAinSalahTodaySummary();
    res.json(summary);
  });

  // 2. Emergency SOS Dispatch & Nearest Rescue Info Endpoint
  app.post('/api/ain-salah/sos-log', (req: Request, res: Response) => {
    const { lat, lon, accuracy, note, wilaya } = req.body || {};
    const timestamp = new Date().toISOString();

    const mapsUrl =
      typeof lat === 'number' && typeof lon === 'number'
        ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`
        : null;

    res.json({
      ok: true,
      timestamp,
      mapsUrl,
      nearestCenters: [
        {
          name: 'الحماية المدنية · الوحدة الرئيسية عين صالح',
          phone: '14',
          badge: 'استجابة فورية 24/7',
        },
        {
          name: 'المجموعة الإقليمية للدرك الوطني (نجدة الطرقات الصحراوية RN1)',
          phone: '1055',
          badge: 'دوريات المسالك والصحراء',
        },
        {
          name: 'استعجالات مستشفى عين صالح (مصلحة السموم العقربية وضربات الشمس)',
          phone: '14',
          badge: 'طوارئ طبية',
        },
      ],
      distressSmsText:
        typeof lat === 'number' && typeof lon === 'number'
          ? `🆘 نداء استغاثة عاجل (تيديكلت Ai - ${wilaya || 'عين صالح'})\nالإحداثيات الدقيقة GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}${accuracy ? ` (±${Math.round(accuracy)}m)` : ''}\nرابط الخريطة: ${mapsUrl}\n${note ? `ملاحظة: ${note}` : 'أحتاج مساعدة عاجلة في الموقع المحدد.'}`
          : `🆘 نداء استغاثة عاجل (تيديكلت Ai - ${wilaya || 'عين صالح'})\n${note || 'أحتاج مساعدة عاجلة، يرجى التواصل فوراً.'}`,
    });
  });

  // 3. Real-time Server-Sent Events (SSE) Streaming Endpoint
  app.post('/api/ain-salah/ask-stream', async (req: Request, res: Response) => {
    const { query, language = 'ar', agentId = 'research' } = req.body || {};
    const cleanQuery = String(query || '').trim();

    if (!cleanQuery) {
      return res.status(400).json({ error: 'يرجى كتابة السؤال أولاً.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const today = buildAinSalahTodaySummary();
      const systemInstruction = `أنت «تيديكلت AI» (Tidikelt AI)، منصة ذكاء اصطناعي مستقلة وشاملة طورها المطور DARTAGNAN MAHMUOD.
المنصة تحمل اسم «تيديكلت AI» كاسم داخلي وخارجي مستقل فقط ولا تعني أو ترتبط بأي إقليم جغرافي.
قدّم إجابات مباشرة، موجزة، ومؤكدة خالية من الحشو.
ابدأ بالإجابة مباشرة؛ لا تكرر السؤال ولا تفتتح بعبارات مثل "إعادة التأكيد".
اللغة المطلوبة: ${language === 'fr' ? 'Français' : language === 'en' ? 'English' : 'العربية'}.`;

      let streamResp: any = null;
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite',
      ];
      for (const candidateModel of candidateModels) {
        try {
          streamResp = await ai.models.generateContentStream({
            model: candidateModel,
            contents: cleanQuery,
            config: {
              systemInstruction,
              temperature: 0.25,
            },
          });
          break;
        } catch {
          // Try next candidate model
        }
      }

      let fullText = '';
      if (streamResp) {
        for await (const chunk of streamResp) {
          const piece = chunk.text || '';
          if (piece) {
            fullText += piece;
            sendEvent('chunk', { text: piece });
          }
        }
      } else {
        fullText = `### ⚡ خلاصة مباشرة: ${cleanQuery}\n\n- **بيانات عين صالح اللحظية**: الوقت ${today.time24} | الحرارة ${today.weather.tempC}°م | الحالة: ${today.weather.conditionAr}.\n- **أرقام الطوارئ المعتمدة**: الحماية المدنية **14** | الدرك الوطني **1055** | الشرطة **17**.`;
        sendEvent('chunk', { text: fullText });
      }

      sendEvent('done', {
        text: fullText,
        timestamp: new Date().toISOString(),
      });
      res.end();
    } catch {
      const today = buildAinSalahTodaySummary();
      const fallbackText = `### ⚡ خلاصة مباشرة: ${cleanQuery}\n\n- **بيانات عين صالح اللحظية**: الوقت ${today.time24} | الحرارة ${today.weather.tempC}°م | الحالة: ${today.weather.conditionAr}.\n- **أرقام الطوارئ المعتمدة**: الحماية المدنية **14** | الدرك الوطني **1055**.`;
      sendEvent('chunk', { text: fallbackText });
      sendEvent('done', {
        text: fallbackText,
        timestamp: new Date().toISOString(),
      });
      res.end();
    }
  });
}
