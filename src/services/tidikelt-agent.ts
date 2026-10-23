// tidikelt-agent.ts
// خدمة جاهزة لربط تطبيق "تيديكلت Ai" ببحث Google وتنفيذ الأكواد عبر الخادم الآمن.
// استورد دالة askTidikelt أو detectMode في أي مكون داخل التطبيق.

// ───────── تعليمات النظام (شخصية المساعد) ─────────
export const SYSTEM_INSTRUCTION = `
أنت "تيديكلت AI"، مساعد ذكي داخل تطبيق تيديكلت. تساعد المستخدمين في المحادثة، والبحث عن المعلومات، وتحليل المستندات، والبرمجة.

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
- إذا سألك المستخدم من أنت، قل إنك مساعد تيديكلت AI.
`.trim();

// ───────── أنواع البيانات ─────────
export type Mode = 'auto' | 'chat' | 'search' | 'code';

export interface Source {
  title: string;
  url: string;
}

export interface AgentReply {
  text: string;            // الجواب النهائي
  mode: Exclude<Mode, 'auto'>;
  sources: Source[];       // مصادر البحث (إن وجدت)
  code?: string;           // الكود الذي نُفّذ (إن وجد)
  codeOutput?: string;     // ناتج تنفيذ الكود
}

// رسالة سابقة في المحادثة (لحفظ السياق)
export interface HistoryItem {
  role: 'user' | 'model';
  text: string;
}

// ───────── التوجيه الذكي واختيار الوضع تلقائياً ─────────
export function chooseRoute(question: string, selectedMode = 'auto'): 'direct' | 'web' {
  if (selectedMode === 'chat') {
    return 'direct';
  }

  if (selectedMode === 'search') {
    return 'web';
  }

  // أمثلة على طلبات تتطلب معلومات حديثة
  const needsFreshInfo =
    /(اليوم|الآن|حالي|آخر|أحدث|الطقس|سعر|مواعيد|نتائج|خبر)/u.test(question);

  return needsFreshInfo ? 'web' : 'direct';
}

export const SEARCH_HINTS =
  /(اليوم|الآن|حالي|آخر|أحدث|الطقس|سعر|مواعيد|نتائج|خبر)/u;

export const CODE_HINTS =
  /(كود|برمج|سكربت|دالة|رسم بياني|python|javascript|code|script|function|algorithm|regex|sql)/i;

export function detectMode(prompt: string): Exclude<Mode, 'auto'> {
  if (CODE_HINTS.test(prompt)) return 'code';
  return chooseRoute(prompt, 'auto') === 'web' ? 'search' : 'chat';
}

// ───────── الدالة الرئيسية ─────────
export async function askTidikelt(
  prompt: string,
  options: { mode?: Mode; history?: HistoryItem[]; customCode?: string } = {}
): Promise<AgentReply> {
  const requested = options.customCode ? 'code' : (options.mode ?? 'auto');
  const resolvedMode = requested === 'auto' ? detectMode(prompt) : requested;

  const response = await fetch('/api/tidikelt/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      mode: requested,
      history: options.history ?? [],
      customCode: options.customCode,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute askTidikelt request');
  }

  const data = await response.json();
  return {
    text: data.text ?? '',
    mode: data.mode ?? resolvedMode,
    sources: Array.isArray(data.sources) ? data.sources : [],
    code: data.code ?? options.customCode,
    codeOutput: data.codeOutput,
  };
}
