// lib/smart-routing.ts

export type Route = {
  mode: "direct" | "local" | "web";
  reason: string;
};

export type Source = {
  title: string;
  text: string;
  url?: string;
  score?: number; // مدى صلة المقطع بالسؤال، من 0 إلى 1
};

export type Dependencies = {
  searchLocal: (query: string) => Promise<Source[]>;
  searchWeb: (query: string) => Promise<Source[]>;
  generateAnswer: (input: {
    question: string;
    route: Route["mode"];
    sources: Source[];
    instruction: string;
  }) => Promise<string>;
};

export function normalizeArabic(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const currentInfoTerms = [
  "الآن", "اليوم", "حاليا", "حالياً", "آخر", "أحدث",
  "مستجدات", "أخبار", "الطقس", "حالة الطقس", "سعر",
  "الأسعار", "مفتوح الآن", "ساعات العمل", "هذا الأسبوع",
  "now", "today", "latest", "current", "weather", "news", "price",
];

export const searchRequestTerms = [
  "ابحث", "ابحث عن", "تحقق من", "تأكد من", "مصدر",
  "مصادر", "مراجع", "وثق", "قارن المصادر",
  "search", "verify", "sources", "references",
];

export const localTerms = [
  "عين صالح", "تيديكلت", "تيديكلت ai", "أدرار",
  "تمنراست", "إليزي", "البلدية", "محلي",
];

export function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function routeQuestion(question: string): Route {
  const q = normalizeArabic(question);

  // المحتوى الآني أو طلب البحث الصريح يحتاج إلى مصادر حديثة.
  if (containsAny(q, currentInfoTerms)) {
    return { mode: "web", reason: "السؤال يحتاج معلومة حديثة أو متغيرة" };
  }

  if (containsAny(q, searchRequestTerms)) {
    return { mode: "web", reason: "المستخدم طلب البحث أو التحقق من المصادر" };
  }

  // معلومات المنطقة الثابتة: الخدمات، التعريفات، والإرشادات المحلية.
  if (containsAny(q, localTerms)) {
    return { mode: "local", reason: "السؤال مرتبط بمعرفة محلية" };
  }

  // الشروحات العامة، الصياغة، والتلخيص لا تحتاج عادةً إلى استرجاع مصادر.
  return { mode: "direct", reason: "لا توجد إشارة واضحة إلى حاجة البحث" };
}

export async function smartAnswer(
  question: string,
  deps: Dependencies
): Promise<{ answer: string; route: Route; sourcesUsed: number }> {
  const route = routeQuestion(question);
  let sources: Source[] = [];

  try {
    if (route.mode === "local") {
      sources = await deps.searchLocal(question);

      // إذا لم تعثر قاعدة المعرفة المحلية على دعم كافٍ، جرّب البحث الخارجي.
      const relevantLocalSources = sources.filter(
        (source) => (source.score ?? 1) >= 0.55
      );

      if (relevantLocalSources.length === 0) {
        sources = await deps.searchWeb(question);
      } else {
        sources = relevantLocalSources.slice(0, 4);
      }
    } else if (route.mode === "web") {
      sources = (await deps.searchWeb(question)).slice(0, 5);
    }
    // المسار direct يتجاوز البحث لتقليل زمن الاستجابة.
  } catch (error) {
    // لا توقف المحادثة بسبب تعطل البحث؛ أخبر النموذج أن المصادر غير متاحة.
    console.error("source_retrieval_failed", {
      route: route.mode,
      error: error instanceof Error ? error.name : "unknown",
    });
    sources = [];
  }

  const instruction =
    sources.length > 0
      ? [
          "أجب عن السؤال اعتمادًا على المصادر المرفقة.",
          "ميّز بين المعلومة المؤكدة والاستنتاج.",
          "أضف روابط المصادر عند توفرها.",
          "إذا لم تدعم المصادر الإجابة، صرّح بذلك ولا تخترع تفاصيل.",
        ].join(" ")
      : route.mode === "web" || route.mode === "local"
        ? [
            "لم تتوفر مصادر مناسبة لهذا السؤال.",
            "لا تدّعِ أنك تحققت من معلومة حديثة أو محلية.",
            "اذكر بوضوح أن التحقق من المصدر لم ينجح.",
          ].join(" ")
        : "أجب مباشرة وباختصار. إذا لم تكن متأكدًا، صرّح بعدم اليقين.";

  const answer = await deps.generateAnswer({
    question,
    route: route.mode,
    sources,
    instruction,
  });

  return {
    answer,
    route,
    sourcesUsed: sources.length,
  };
}
