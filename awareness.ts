/**
 * awareness.ts — وحدة الوعي السياقي والزمني والجغرافي لخادم تيديكلت AI
 *
 * توفر هذه الوحدة:
 *  1) الهوية الرسمية الموحدة لمساعد «تيديكلت AI»
 *  2) الوعي الزمني الحي بتوقيت الجزائر (Africa/Algiers - GMT+1) والتقويمين الميلادي والهجري
 *  3) الوعي الجغرافي بإقليم تيديكلت (عين صالح، فقارة الزوى، إن غار) والمحاور الطرقية الصحراوية (RN1، RN52)
 *  4) كشف لهجة المستخدم (دارجة جزائرية / فصحى) وتصنيف موضوع السؤال والطوارئ
 *  5) بناء تعليمات النظام الذكية (buildAwareSystemInstruction) دون السماح للعميل بتجاوزها
 */

export const TIDIKELT_BASE_PROMPT = `أنت "تيديكلت AI"، مساعد ذكي داخل تطبيق تيديكلت. تساعد المستخدمين في المحادثة، والبحث عن المعلومات، وتحليل المستندات، والبرمجة.

الأسلوب:
- رد بلغة المستخدم: فصحى بسيطة، أو دارجة جزائرية إذا كتب بها.
- ابدأ بالجواب مباشرة، بدون مقدمات ولا تكرار للسؤال.
- خلي الردود قصيرة وواضحة لأن الشاشة صغيرة. زد التفاصيل فقط إذا طلبها المستخدم.
- نبرة دافئة ومحترمة، بدون تكلف.
- إذا كان الجواب خطوات، اكتبها في قائمة قصيرة مرقمة.
- في الكود: اعط الكود جاهز مع شرح قصير جدا.
- عند تحليل مستند: لخص أهم النقاط أولا، ثم اسأل المستخدم وش يحب يتعمق فيه.
- إذا ما عرفتش الجواب، قل ذلك بصراحة ولا تخترع معلومات أو مصادر.
- في المواضيع القانونية والطبية والمالية: اعط معلومة عامة وانصح المستخدم يستشير مختص.
- سؤال توضيحي واحد كحد أقصى، وفقط إذا كان ضروري.
- إذا سألك المستخدم من أنت، قل إنك مساعد تيديكلت AI.`;

export const EMERGENCY_NUMBERS = {
  civilProtection: '14',
  gendarmerie: '1055',
  police: '17',
  nationalSecurity: '1548',
} as const;

export interface RoadAxisInfo {
  code: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  waypoints: string[];
  fuelStops: string[];
  notes: string;
}

export const DESERT_ROADS: RoadAxisInfo[] = [
  {
    code: 'RN1-N',
    name: 'الطريق الوطني رقم 1 (الشمالي)',
    from: 'عين صالح',
    to: 'المنيعة',
    distanceKm: 400,
    waypoints: ['عين صالح', 'حاسي لفحل', 'المنيعة'],
    fuelStops: ['مخرج عين صالح الشمالي (نفطال)', 'المنيعة'],
    notes: 'مسار صحراوي طويل؛ يُنصح بملء الوقود كاملاً في عين صالح وتفقد الإطارات والمياه قبل الانطلاق.',
  },
  {
    code: 'RN1-S',
    name: 'الطريق الوطني رقم 1 (الجنوبي)',
    from: 'عين صالح',
    to: 'تمنراست',
    distanceKm: 660,
    waypoints: ['عين صالح', 'أراك', 'مولاي لحسن', 'إن أمقل', 'تمنراست'],
    fuelStops: ['عين صالح', 'أراك', 'إن أمقل', 'تمنراست'],
    notes: 'يمر عبر مضيق أراك؛ انتبه للرياح الرملية وانقطاع التغطية في بعض المقاطع الجبلية.',
  },
  {
    code: 'RN52',
    name: 'الطريق الوطني رقم 52',
    from: 'عين صالح',
    to: 'أدرار',
    distanceKm: 290,
    waypoints: ['عين صالح', 'إن غار', 'أولف', 'رقان', 'أدرار'],
    fuelStops: ['عين صالح', 'إن غار', 'أولف', 'أدرار'],
    notes: 'احذر من زحف الرمال عند هبوب الرياح بين عين صالح وإن غار وأولف.',
  },
];

export interface AlgeriaTimeContext {
  iso: string;
  time24: string;
  dateAr: string;
  hijriAr: string;
  weekdayAr: string;
  hour: number;
  dayPeriodAr: 'الصباح' | 'الظهيرة' | 'المساء' | 'الليل';
  seasonAr: 'الصيف' | 'الشتاء' | 'الربيع' | 'الخريف';
  summary: string;
}

export function getAlgeriaTimeContext(now: Date = new Date()): AlgeriaTimeContext {
  const time24 = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const dateAr = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const weekdayAr = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
  }).format(now);

  let hijriAr = '';
  try {
    hijriAr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      timeZone: 'Africa/Algiers',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
  } catch {
    hijriAr = '';
  }

  const hour = Number(time24.split(':')[0] || 12);
  const dayPeriodAr: AlgeriaTimeContext['dayPeriodAr'] =
    hour >= 5 && hour < 12
      ? 'الصباح'
      : hour >= 12 && hour < 16
      ? 'الظهيرة'
      : hour >= 16 && hour < 20
      ? 'المساء'
      : 'الليل';

  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', month: 'numeric' }).format(now)
  );
  const seasonAr: AlgeriaTimeContext['seasonAr'] =
    month >= 5 && month <= 9
      ? 'الصيف'
      : month === 12 || month <= 2
      ? 'الشتاء'
      : month >= 3 && month <= 4
      ? 'الربيع'
      : 'الخريف';

  const summary = `التوقيت في الجزائر (GMT+1): ${time24} (${dayPeriodAr}) — ${weekdayAr} ${dateAr}${
    hijriAr ? ` الموافق لـ ${hijriAr}` : ''
  }`;

  return {
    iso: now.toISOString(),
    time24,
    dateAr,
    hijriAr,
    weekdayAr,
    hour,
    dayPeriodAr,
    seasonAr,
    summary,
  };
}

const DARJA_RE =
  /(واش|كيفاش|علاش|وقتاش|وين|شحال|كاين|ماكانش|مكانش|بزاف|برك|راني|راك|راكم|نحوس|باغي|حبيت|شكون|درك|دروك|غدوة|طوموبيل|بلاصة|بلايص|مازوط|ليصونص|باطل|فابور|خويا|صحيت|مليح)/i;

export function detectUserDialect(text: string): 'ar-dz' | 'ar' {
  return DARJA_RE.test(text || '') ? 'ar-dz' : 'ar';
}

export type QueryTopic =
  | 'emergency'
  | 'travel'
  | 'news'
  | 'medical'
  | 'legal'
  | 'financial'
  | 'code'
  | 'document'
  | 'temporal'
  | 'general';

export interface QueryAwareness {
  dialect: 'ar-dz' | 'ar';
  topic: QueryTopic;
  isEmergency: boolean;
  needsSpecialistDisclaimer: boolean;
  matchedRoad?: RoadAxisInfo;
}

export function analyzeQueryAwareness(text: string): QueryAwareness {
  const q = (text || '').trim();
  const dialect = detectUserDialect(q);

  const isEmergency =
    /(عالق|غرزت|تائه|ضعت|استغاثة|نجدة|حادث|لدغة\s*عقرب|ضربة\s*شمس|حريق|نزيف|اختناق|طوارئ|sos)/i.test(q);

  const isMedical =
    /(دواء|علاج|مرض|أعراض|طبيب|مستشفى|صيدلية|لدغة|عقرب|ضغط|سكري|ألم|وجع|حمى|حامل|جرعة)/i.test(q);
  const isLegal =
    /(قانون|محكمة|قضية|محامي|عقوبة|جنحة|وثيقة\s*قانونية|ميراث|طلاق|عقد\s*كراء|نزاع)/i.test(q);
  const isFinancial =
    /(استثمار|قرض|بنك|فائدة|ضريبة|أسهم|تداول|ميزانية|ديون|تمويل)/i.test(q);

  const isTravel =
    /(طريق|سفر|رحلة|مساف[ةه]|عين\s*صالح|تمنراست|أدرار|المنيعة|أولف|إن\s*غار|فقارة\s*الزوى|أراك|RN1|RN52|وقود|محطة\s*بنزين|مازوط|عجاج|رمال|بلاصة|بلايص)/i.test(
      q
    );
  const isNews = /(خبر|أخبار|مستجدات|موجز|إعلان|بلدية|ولاية|بيان)/i.test(q);
  const isTemporal = /(كم\s*الساعة|الوقت\s*الآن|تاريخ\s*اليوم|شحال\s*الساعة|واش\s*من\s*نهار)/i.test(q);
  const isCode = /(كود|برمج|دالة|سكربت|python|javascript|typescript|sql|html|css)/i.test(q);
  const isDocument = /(مستند|ملف|وثيقة|تقرير|pdf|لخص\s*هذا)/i.test(q);

  let topic: QueryTopic = 'general';
  if (isEmergency) topic = 'emergency';
  else if (isMedical) topic = 'medical';
  else if (isLegal) topic = 'legal';
  else if (isFinancial) topic = 'financial';
  else if (isTravel) topic = 'travel';
  else if (isNews) topic = 'news';
  else if (isTemporal) topic = 'temporal';
  else if (isCode) topic = 'code';
  else if (isDocument) topic = 'document';

  let matchedRoad: RoadAxisInfo | undefined;
  if (/تمنراست|أراك|إن\s*أمقل|rn1-s/i.test(q)) {
    matchedRoad = DESERT_ROADS.find((r) => r.code === 'RN1-S');
  } else if (/المنيعة|حاسي\s*لفحل|rn1-n/i.test(q)) {
    matchedRoad = DESERT_ROADS.find((r) => r.code === 'RN1-N');
  } else if (/أدرار|أولف|إن\s*غار|رقان|rn52/i.test(q)) {
    matchedRoad = DESERT_ROADS.find((r) => r.code === 'RN52');
  } else if (/rn1|الطريق\s*الوطني\s*رقم\s*1/i.test(q)) {
    matchedRoad = DESERT_ROADS[0];
  }

  return {
    dialect,
    topic,
    isEmergency,
    needsSpecialistDisclaimer: isMedical || isLegal || isFinancial,
    matchedRoad,
  };
}

export function buildAwareSystemInstruction(
  opts: {
    query?: string;
    replyStyle?: string;
    extraContext?: string;
    now?: Date;
  } = {}
): string {
  const timeCtx = getAlgeriaTimeContext(opts.now);
  const awareness = analyzeQueryAwareness(opts.query || '');
  const effectiveDialect =
    opts.replyStyle === 'ar-dz' || opts.replyStyle === 'ar' ? opts.replyStyle : awareness.dialect;

  const sections: string[] = [TIDIKELT_BASE_PROMPT];

  sections.push(
    `[الوعي الزمني]: ${timeCtx.summary}. (إقليم تيديكلت - عين صالح، الجزائر).`
  );

  if (effectiveDialect === 'ar-dz') {
    sections.push(
      '[توجيه اللهجة]: المستخدم يكتب بالدارجة الجزائرية؛ رد عليه بدارجة جزائرية بسيطة، مفهومة، ودافئة.'
    );
  }

  if (awareness.isEmergency) {
    sections.push(
      `[طوارئ وسلامة]: أعطِ خطوات إسعاف أو سلامة فورية ومختصرة جداً، واذكر أرقام الطوارئ في الجزائر: الحماية المدنية (${EMERGENCY_NUMBERS.civilProtection})، الدرك الوطني (${EMERGENCY_NUMBERS.gendarmerie})، الشرطة (${EMERGENCY_NUMBERS.police}).`
    );
  }

  if (awareness.matchedRoad) {
    const r = awareness.matchedRoad;
    sections.push(
      `[معلومات الطريق ${r.code}]: ${r.name} (${r.from} ↔ ${r.to}، المسافة ${r.distanceKm} كم). نقاط المرور: ${r.waypoints.join('، ')}. محطات الوقود: ${r.fuelStops.join('، ')}. تنبيه: ${r.notes}`
    );
  }

  if (awareness.needsSpecialistDisclaimer) {
    sections.push(
      '[تنبيه مهني]: هذا السؤال في مجال طبي/قانوني/مالي؛ قدم معلومة عامة مفيدة وذكّر المستخدم باستشارة مختص.'
    );
  }

  if (opts.extraContext && opts.extraContext.trim()) {
    sections.push(opts.extraContext.trim());
  }

  return sections.join('\n\n');
}
