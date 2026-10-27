/**
 * intentAndContextEngine.ts
 * محرك فهم المقاصد، تصحيح الأخطاء الإملائية والصوتية، استيعاب الدارجة الجزائرية واللغات المختلطة،
 * وحل الإشارات السياقية والغموض لمساعد تيديكلت AI.
 */

export type FileFormatType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt' | 'md' | 'html';
export type SupportedFileFormat = FileFormatType;

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp?: number;
}

export interface SessionSearchSource {
  index: number;
  title: string;
  url: string;
  snippet: string;
  extractedContent?: string;
  publishedDate?: string;
}

export type UserIntentType =
  | 'general_chat'
  | 'ambiguous_query'
  | 'web_search'
  | 'follow_up_continue'
  | 'follow_up_summarize'
  | 'follow_up_translate'
  | 'follow_up_explain_point'
  | 'follow_up_explain_source'
  | 'follow_up_compare_sources'
  | 'source_explanation'
  | 'comparison'
  | 'uploaded_file_analysis'
  | 'generate_file'
  | 'convert_previous_to_file'
  | 'proofread_text'
  | 'analyze_uploaded_files'
  | 'compare_uploaded_files'
  | 'code_execution';

export interface ResolvedIntent {
  originalText: string;
  correctedText: string;
  appliedCorrections: string[];
  expandedContextualPrompt: string;
  referencedPreviousTurn: boolean;
  referencedSourceIndices: number[];
  searchQuery: string;
  intent: UserIntentType;
  detectedLanguage: 'ar' | 'ar-dz' | 'fr' | 'en' | 'mixed';
  requestedFileFormat?: FileFormatType;
  explicitFileRequest: boolean;
  targetPointIndex?: number;
  targetSourceIndices?: number[];
  targetTranslationLang?: string;
  isAmbiguous: boolean;
  ambiguityCheck: {
    isAmbiguous: boolean;
    clarificationQuestion?: string;
    suggestedOptions?: string[];
  };
  ambiguityClarification?: {
    briefIntro: string;
    clarifyingQuestion: string;
    suggestedInterpretations: string[];
  };
  memoryPreferenceToSave?: {
    category: 'language' | 'style' | 'project' | 'file_format' | 'general';
    key: string;
    value: string;
  };
  memoryPreferenceCommand?: {
    key: string;
    value: string;
  };
}

export type IntentAndContextAnalysis = ResolvedIntent;

// قاموس تصحيح الأخطاء الإملائية والصوتية والدارجة الصحراوية الجزائرية والمصطلحات التقنية المعربة
const TYPO_AND_DIALECT_MAP: Array<[RegExp, string]> = [
  [/(?:لبدياف|لبي دي اف|لبيدياف|إلى بدياف|الى بدياف|بصيغة بدياف|ملف بدياف|البدياف|بدياف|بيدياف|بي دي اف|بي دي إف|فدف)/gi, 'PDF'],
  [/(?:لاكسيل|لإكسيل|لاكسل|جدول اكسيل|ملف اكسيل|ملف اكسل|اكسيل|إكسيل|اكسل|إكسل)/gi, 'Excel (XLSX)'],
  [/(?:لوورد|لورد|ملف وورد|مستند وورد|بصيغة وورد|وورد)/gi, 'Word (DOCX)'],
  [/(?:لباوربوينت|لبوربوينت|عرض باوربوينت|ملف باوربوينت|باوربوينت|بوربوينت)/gi, 'PowerPoint (PPTX)'],
  [/(?:لسي اس في|ملف سي اس في|سي اس في)/gi, 'CSV'],
  [/(?:لماركداون|ملف ماركداون|ماركداون)/gi, 'MD'],
  [/(?:لاتش تي ام ال|ملف اتش تي ام ال|اتش تي ام ال)/gi, 'HTML'],
  [/(?:صححلي هاد|صححلي هاذ|صلحلي هاد)/gi, 'صحح لي هذا'],
  [/(?:ديرلي)/gi, 'أنشئ لي'],
  [/\b(?:السول|السوال|السؤل)\b/g, 'السؤال'],
  [/\b(?:خورميات|خورزميات|خوارزميت)\b/g, 'خوارزميات'],
  [/\b(?:تيدكلت|تدكلت|تديكلت|تيدكيكلت)\b/g, 'تيديكلت'],
  [/\b(?:اصطناعيي|الصطناعي|إصطناعي)\b/g, 'اصطناعي'],
  [/\b(?:صحروية|صحرويه|الصحروية)\b/g, 'الصحراوية'],
  [/\b(?:جتقطعات|تقطعت)\b/g, 'تقطعات'],
  [/\b(?:المكلمة|مكلمة)\b/g, 'المكالمة'],
  [/\b(?:يتعلخم|يتعلام)\b/g, 'يتعلم'],
  [/\b(?:الذكرة|ذكره)\b/g, 'الذاكرة'],
  [/\b(?:بنصبة|بنسبة)\b/g, 'بالنسبة'],
  [/\b(?:ان وجدة|إن وجدة|ان وجدت)\b/g, 'إن وجدت'],
  [/\b(?:الدفاء|الدافئه)\b/g, 'الدافئة'],
  [/\b(?:الهادئدة|الهادئه)\b/g, 'الهادئة'],
  [/\b(?:بدارجة)\b/g, 'بالدارجة'],
  [/\b(?:اسثناء|اثناء)\b/g, 'أثناء'],
  [/\b(?:برمجه)\b/g, 'برمجة'],
  [/\b(?:معلومه)\b/g, 'معلومة'],
  [/\b(?:ملخصه)\b/g, 'ملخصة'],
  [/\b(?:خطاء|اخطاء)\b/g, 'أخطاء'],
  [/\b(?:تاكد|تأكذ)\b/g, 'تأكد'],
  [/\b(?:اقتراحت)\b/g, 'اقتراحات'],
  [/\b(?:انشاء|إنشأ)\b/g, 'إنشاء'],
];

const ARABIC_ORDINALS: Record<string, number> = {
  'الأول': 1, 'الاول': 1, 'الأولى': 1, 'الاولى': 1, 'اول': 1, 'أول': 1, '1': 1, 'واحد': 1, 'اللول': 1, 'اللولة': 1,
  'الثاني': 2, 'الثانية': 2, 'ثاني': 2, 'ثانية': 2, '2': 2, 'زوج': 2, 'الزاوج': 2, 'الزاوجة': 2,
  'الثالث': 3, 'الثالثة': 3, 'ثالث': 3, 'ثالثة': 3, '3': 3, 'ثلاثة': 3, 'التالت': 3, 'التالتة': 3,
  'الرابع': 4, 'الرابعة': 4, 'رابع': 4, 'رابعة': 4, '4': 4, 'ربعة': 4,
  'الخامس': 5, 'الخامسة': 5, 'خامس': 5, 'خامسة': 5, '5': 5, 'خمسة': 5,
};

export function correctUserTextAndDialect(raw: string): string {
  let text = String(raw || '').trim();
  if (!text) return '';

  for (const [pattern, replacement] of TYPO_AND_DIALECT_MAP) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function detectUserLanguageAndDialect(text: string): 'ar' | 'ar-dz' | 'fr' | 'en' | 'mixed' {
  const clean = String(text || '').trim();
  const hasArabic = /[\u0600-\u06FF]/.test(clean);
  const hasLatin = /[a-zA-Z]/.test(clean);

  const darjaMarkers =
    /\b(واش|وش|وشحالك|واش حالك|كيفاش|علاش|وقتاش|وين|شكون|شحال|ديرلي|دير|حولها|ردها|صححلي|هاد|هاذ|بزاف|برك|خويا|باش|كاين|ماكانش|ماعلباليش|فهمني|زيد|كمل|عطيني|بغيت|نحب|لاباس|درك|نقولك|تيدكلت|تيديكلت|عين صالح|فقارة|واش خصك)\b/i;

  if (hasArabic && darjaMarkers.test(clean)) {
    return 'ar-dz';
  }

  if (hasArabic && hasLatin) {
    const arabicCount = (clean.match(/[\u0600-\u06FF]/g) || []).length;
    const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
    if (arabicCount > 3 && latinCount > 6) {
      return 'mixed';
    }
  }

  if (!hasArabic && hasLatin) {
    const frMarkers = /\b(bonjour|merci|comment|pourquoi|quand|quel|quelle|est|les|des|dans|avec|pour|une|sur|expliquer|résumer|traduire)\b/i;
    if (frMarkers.test(clean)) return 'fr';
    return 'en';
  }

  return 'ar';
}

export function detectRequestedFileFormat(text: string): FileFormatType | undefined {
  const q = correctUserTextAndDialect(text).toLowerCase();

  if (/\b(pdf|بدياف|بيدياف|بي دي اف)\b/i.test(q)) return 'pdf';
  if (/\b(xlsx|excel|اكسيل|إكسيل|اكسل|جدول حسابي)\b/i.test(q)) return 'xlsx';
  if (/\b(docx|word|وورد|مستند وورد)\b/i.test(q)) return 'docx';
  if (/\b(pptx|powerpoint|باوربوينت|بوربوينت|عرض تقديمي|شرائح عرض)\b/i.test(q)) return 'pptx';
  if (/\b(csv|سي اس في)\b/i.test(q)) return 'csv';
  if (/\b(html|صفحة ويب|ملف ويب)\b/i.test(q)) return 'html';
  if (/\b(markdown|md|ماركداون)\b/i.test(q)) return 'md';
  if (/\b(txt|ملف نصي|نص عادي)\b/i.test(q)) return 'txt';

  return undefined;
}

export function isExplicitFileGenerationOrConversionRequest(text: string): {
  isFileRequest: boolean;
  isConversionOfPrevious: boolean;
  format?: FileFormatType;
} {
  const corrected = correctUserTextAndDialect(text);
  const format = detectRequestedFileFormat(corrected);

  const conversionPattern =
    /(?:حولها|حوله|حوّلها|حوّله|ردها|رده|خرجها|خرجه|صدرها|صدّره|صدره|احفظها|احفظه|نزلها|نزله|حملها|حمله|حول\s+(?:الإجابة|الرد|البحث|التقرير|المحتوى|النص|الجدول)|حوّل\s+(?:الإجابة|الرد|البحث|التقرير|المحتوى|النص|الجدول)|convert\s+(?:it|this|the\s+answer|the\s+report)\s+to|export\s+(?:as|to)|convertir\s+en)/i;

  const explicitCreationPattern =
    /(?:ديرلي|أنشئ\s+(?:لي\s+)?(?:ملف|جدول|تقرير|مستند|عرض)|انشئ\s+(?:لي\s+)?(?:ملف|جدول|تقرير|مستند|عرض)|اصنع\s+(?:لي\s+)?ملف|اعمل\s+(?:لي\s+)?ملف|خرجلي\s+ملف|أريد\s+ملف|اريد\s+ملف|بصيغة\s+(?:PDF|Excel|Word|PowerPoint|XLSX|DOCX|PPTX|CSV|HTML|MD|TXT)|في\s+ملف|create\s+a?\s*(?:pdf|excel|xlsx|word|docx|pptx|csv)\s+file|generate\s+a?\s*(?:pdf|excel|xlsx|word|docx|pptx|csv))/i;

  if (format && conversionPattern.test(corrected)) {
    return {
      isFileRequest: true,
      isConversionOfPrevious: true,
      format,
    };
  }

  if (format && /^(?:حولها|حوله|حوّلها|حوّله|ردها|رده|إلى|الى|لـ|ل)\s*(?:ملف\s*)?(?:PDF|Excel|Word|PowerPoint|XLSX|DOCX|PPTX|CSV|HTML|MD|TXT)/i.test(corrected)) {
    return {
      isFileRequest: true,
      isConversionOfPrevious: true,
      format,
    };
  }

  if (format && (explicitCreationPattern.test(text) || explicitCreationPattern.test(corrected))) {
    return {
      isFileRequest: true,
      isConversionOfPrevious: false,
      format,
    };
  }

  return {
    isFileRequest: false,
    isConversionOfPrevious: false,
    format,
  };
}

function normalizeForMatching(text: string): string {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .trim();
}

export function extractReferencedIndices(text: string): {
  pointIndex?: number;
  sourceIndices?: number[];
} {
  const clean = normalizeForMatching(text);

  const pointMatch = clean.match(
    /(?:النقطه|النقطة|نقطه|نقطة|العنصر|الخطوه|الخطوة)\s+(الأولى|الاولى|الأول|الاول|الثانيه|الثانية|الثاني|الثالثه|الثالثة|الثالث|الرابعه|الرابعة|الرابع|الخامسه|الخامسة|الخامس|\d+)/i
  );
  let pointIndex: number | undefined;
  if (pointMatch) {
    const token = pointMatch[1].replace(/ه$/, 'ة');
    pointIndex = ARABIC_ORDINALS[token] || ARABIC_ORDINALS[pointMatch[1]] || Number(pointMatch[1]) || 1;
  }

  const sourceIndices: number[] = [];
  if (/(?:المصدر|النتيجه|النتيجة|الرابط|الموقع|المرجع)/i.test(clean)) {
    for (const [word, idx] of Object.entries(ARABIC_ORDINALS)) {
      const normalizedWord = normalizeForMatching(word);
      const regex = new RegExp(`(?:^|\\s|ب|و)(?:ال)?${normalizedWord}(?:$|\\s|[،.؟])`, 'i');
      if (regex.test(clean) && !sourceIndices.includes(idx)) {
        sourceIndices.push(idx);
      }
    }
  }

  return {
    pointIndex,
    sourceIndices: sourceIndices.length > 0 ? sourceIndices : undefined,
  };
}

export function checkQueryAmbiguity(
  text: string,
  hasConversationHistory: boolean
): {
  isAmbiguous: boolean;
  clarification?: {
    briefIntro: string;
    clarifyingQuestion: string;
    suggestedInterpretations: string[];
  };
} {
  const clean = normalizeForMatching(text);

  if (/^(?:حول العالم|عن العالم|العالم|معلومات حول العالم|معلومات عن العالم)$/i.test(clean)) {
    return {
      isAmbiguous: true,
      clarification: {
        briefIntro:
          'يضم العالم **195 دولة** معترفاً بها دولياً (193 دولة عضو في الأمم المتحدة ودولتان بصفة مراقب)، موزعة على **7 قارات**، ويبلغ عدد سكان العالم أكثر من **8.1 مليار نسمة**.',
        clarifyingQuestion:
          'عبارة «حول العالم» واسعة؛ أي جانب تقصد تحديداً لأقدم لك تفاصيل دقيقة؟',
        suggestedInterpretations: [
          'معلومات عامة وإحصاءات جغرافية وسكانية عن دول العالم وقاراته',
          'أبرز أخبار ومستجدات العالم اليوم',
          'السياحة والسفر حول العالم وأشهر الوجهات والمعالم',
          'رواية «حول العالم في ثمانين يوماً» لجول فيرن',
        ],
      },
    };
  }

  if (!hasConversationHistory && /^(?:تحويل|ملف|بحث|تقرير|مقارنة|جدول)$/i.test(clean)) {
    return {
      isAmbiguous: true,
      clarification: {
        briefIntro: 'أنا جاهز لمساعدتك في إعداد المطلوب بدقة.',
        clarifyingQuestion: `ما هو الموضوع أو المحتوى الذي تريد «${text.trim()}» حوله؟`,
        suggestedInterpretations: [
          'كتابة موضوع أو تقرير جديد من الصفر',
          'تحليل أو تلخيص نص أو ملف مرفق',
          'البحث عن معلومات حديثة من الويب',
        ],
      },
    };
  }

  return { isAmbiguous: false };
}

export function detectMemoryPreferenceCommand(text: string): ResolvedIntent['memoryPreferenceToSave'] | undefined {
  const clean = String(text || '').trim();
  if (!/(?:تذكر أن|تذكر ان|احفظ في ذاكرتك|خلي في بالك|دائما رد علي|دائماً رد علي|لغتي المفضلة|أسلوبي المفضل|مشروعي الحالي)/i.test(clean)) {
    return undefined;
  }

  if (/(?:مختصر|قصير|مباشر|بدون إطالة)/i.test(clean)) {
    return {
      category: 'style',
      key: 'أسلوب الإجابة المفضل',
      value: 'إجابات مختصرة ومباشرة في نقاط واضحة',
    };
  }

  if (/(?:مفصل|تفصيل|عميق|شرح وافي)/i.test(clean)) {
    return {
      category: 'style',
      key: 'أسلوب الإجابة المفضل',
      value: 'إجابات مفصلة وشاملة مع أمثلة عملية',
    };
  }

  if (/(?:دارجة|جزائرية|بالدارجة)/i.test(clean)) {
    return {
      category: 'language',
      key: 'اللغة المفضلة',
      value: 'العربية الفصحى المبسطة والدارجة الجزائرية',
    };
  }

  if (/(?:فرنسية|français|french)/i.test(clean)) {
    return {
      category: 'language',
      key: 'اللغة المفضلة',
      value: 'الفرنسية والعربية',
    };
  }

  if (/(?:مشروعي|نخدم على مشروع|أعمل على مشروع)/i.test(clean)) {
    return {
      category: 'project',
      key: 'المشروع الحالي',
      value: clean.replace(/^(?:تذكر أن|تذكر ان|احفظ في ذاكرتك|خلي في بالك)\s*/i, '').slice(0, 200),
    };
  }

  return {
    category: 'general',
    key: 'تفضيل شخصي',
    value: clean.replace(/^(?:تذكر أن|تذكر ان|احفظ في ذاكرتك|خلي في بالك)\s*/i, '').slice(0, 200),
  };
}

export function resolveUserIntentAndContext(
  rawText: string,
  optionsOrHistory:
    | ConversationTurn[]
    | {
        hasConversationHistory?: boolean;
        hasPreviousSources?: boolean;
        uploadedFilesCount?: number;
      } = {},
  sessionSources: SessionSearchSource[] = []
): ResolvedIntent {
  const originalText = String(rawText || '').trim();
  const correctedText = correctUserTextAndDialect(originalText);
  const appliedCorrections = correctedText !== originalText ? [`${originalText} -> ${correctedText}`] : [];
  const detectedLanguage = detectUserLanguageAndDialect(originalText);
  const memoryPreferenceToSave = detectMemoryPreferenceCommand(originalText);
  const memoryPreferenceCommand = memoryPreferenceToSave
    ? { key: memoryPreferenceToSave.key, value: memoryPreferenceToSave.value }
    : undefined;

  const historyTurns: ConversationTurn[] = Array.isArray(optionsOrHistory) ? optionsOrHistory : [];
  const hasConversationHistory = Array.isArray(optionsOrHistory)
    ? optionsOrHistory.length > 0
    : Boolean(optionsOrHistory.hasConversationHistory);
  const uploadedFilesCount = Array.isArray(optionsOrHistory)
    ? 0
    : Number(optionsOrHistory.uploadedFilesCount || 0);

  const lastAssistantTurn = [...historyTurns]
    .reverse()
    .find((t) => t.role === 'assistant' || t.role === 'model');

  const refs = extractReferencedIndices(correctedText);
  const referencedSourceIndices = refs.sourceIndices || [];
  const isFollowUpReference =
    /(?:زيد كمل|كمل|أكمل|اكمل|اختصرها|اختصره|لخصها|لخصه|نقص منها|حولها|حوله|ردها|ترجمها|ترجمه|اشرحها|اشرحلي كثر|النقطة|العنصر)/i.test(
      correctedText
    ) || refs.pointIndex !== undefined;
  const referencedPreviousTurn = Boolean(isFollowUpReference && lastAssistantTurn);

  let expandedContextualPrompt = correctedText;
  if (referencedPreviousTurn && lastAssistantTurn) {
    expandedContextualPrompt = `${correctedText}\n\n[الرد السابق المرتبط بالطلب]:\n${lastAssistantTurn.content}`;
  } else if (referencedSourceIndices.length > 0 && sessionSources.length > 0) {
    const matchedSources = referencedSourceIndices
      .map((idx) => sessionSources.find((s) => s.index === idx) || sessionSources[idx - 1])
      .filter((s): s is SessionSearchSource => Boolean(s));
    if (matchedSources.length > 0) {
      expandedContextualPrompt = `${correctedText}\n\n[المصادر المطلوبة من الجلسة]:\n${matchedSources
        .map((s) => `[#${s.index}] ${s.title}: ${s.extractedContent || s.snippet}`)
        .join('\n')}`;
    }
  }

  const ambiguity = checkQueryAmbiguity(correctedText, hasConversationHistory);
  const ambiguityCheck = {
    isAmbiguous: ambiguity.isAmbiguous,
    clarificationQuestion: ambiguity.clarification
      ? `${ambiguity.clarification.briefIntro}\n\n${ambiguity.clarification.clarifyingQuestion}`
      : undefined,
    suggestedOptions: ambiguity.clarification?.suggestedInterpretations,
  };

  const baseFields = {
    originalText,
    correctedText,
    appliedCorrections,
    expandedContextualPrompt,
    referencedPreviousTurn,
    referencedSourceIndices,
    detectedLanguage,
    ambiguityCheck,
    ambiguityClarification: ambiguity.clarification,
    memoryPreferenceToSave,
    memoryPreferenceCommand,
  };

  if (ambiguity.isAmbiguous && ambiguity.clarification) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'ambiguous_query',
      explicitFileRequest: false,
      isAmbiguous: true,
    };
  }

  const fileCheck = isExplicitFileGenerationOrConversionRequest(originalText);
  if (fileCheck.isFileRequest && fileCheck.format) {
    return {
      ...baseFields,
      referencedPreviousTurn: fileCheck.isConversionOfPrevious || referencedPreviousTurn,
      searchQuery: correctedText,
      intent: fileCheck.isConversionOfPrevious ? 'convert_previous_to_file' : 'generate_file',
      requestedFileFormat: fileCheck.format,
      explicitFileRequest: true,
      isAmbiguous: false,
    };
  }

  if (uploadedFilesCount >= 2 && /(?:قارن|مقارنة|الفرق|اختلاف|compare)/i.test(correctedText)) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'comparison',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  if (uploadedFilesCount >= 1) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'uploaded_file_analysis',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  if (referencedSourceIndices.length > 0) {
    const isComparison =
      referencedSourceIndices.length >= 2 || /(?:قارن|مقارنة|الفرق بين)/i.test(correctedText);
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: isComparison ? 'comparison' : 'source_explanation',
      explicitFileRequest: false,
      targetSourceIndices: referencedSourceIndices,
      isAmbiguous: false,
    };
  }

  if (refs.pointIndex !== undefined) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'follow_up_explain_point',
      explicitFileRequest: false,
      targetPointIndex: refs.pointIndex,
      isAmbiguous: false,
    };
  }

  if (/^(?:زيد كمل|كمل|أكمل|اكمل|زيد فصل|زيد فصل فيها|فصل أكثر|فصّل أكثر|اشرح أكثر|اشرحلي كثر|زيدني|واش تاني|continue|go on|more details)/i.test(correctedText)) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'follow_up_continue',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  if (/^(?:اختصرها|اختصره|اختصر|لخصها|لخصه|لخص|باختصار|نقص منها|خليها قصيرة|summarize|make it shorter|résume)/i.test(correctedText)) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'follow_up_summarize',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  const translateFollowUpMatch = correctedText.match(
    /^(?:ترجمها|ترجمه|ترجم\s+هذا|ترجم\s+الإجابة|ترجم\s+النص|ردها|حولها)\s*(?:إلى|الى|لـ|ل|بالـ|ب)?\s*(الفرنسية|فرونسي|الفرونسي|الإنجليزية|الانجليزية|إنجليزي|انجليزي|العربية|عربي|الدارجة|الأمازيغية|الإسبانية|الألمانية|français|french|english|arabic)$/i
  );
  if (translateFollowUpMatch) {
    const rawLang = translateFollowUpMatch[1];
    const targetLang =
      /فرنسي|فرونسي|français|french/i.test(rawLang)
        ? 'الفرنسية (Français)'
        : /إنجليزي|انجليزي|english/i.test(rawLang)
        ? 'الإنجليزية (English)'
        : /دارجة/i.test(rawLang)
        ? 'الدارجة الجزائرية'
        : 'العربية الفصحى';
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'follow_up_translate',
      explicitFileRequest: false,
      targetTranslationLang: targetLang,
      isAmbiguous: false,
    };
  }

  if (/(?:صححلي|صحح لي|صحّح لي|دقق لي|صلحلي|تصحيح إملائي|تدقيق لغوي)\s+(?:هاد|هاذ|هذا)?\s*(?:النص|المقال|الفقرة|الرسالة|الكلام)?/i.test(correctedText)) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'proofread_text',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  if (/(?:اكتب كود|كود برمجي|برمج|سكربت|دالة برمجية|python|javascript|typescript|sql|algorithm)/i.test(correctedText)) {
    return {
      ...baseFields,
      searchQuery: correctedText,
      intent: 'code_execution',
      explicitFileRequest: false,
      isAmbiguous: false,
    };
  }

  const needsSearch =
    /(?:ابحث|بحث عن|مصادر|مراجع|وثق|قارن المصادر|اليوم|الآن|حالياً|حاليا|آخر|أحدث|مستجدات|أخبار|سعر|أسعار|طقس|حالة الطريق|مواعيد|نتائج|قانون|إحصاءات|إحصائيات|2025|2026)/i.test(
      correctedText
    );

  const cleanSearchQuery = correctedText
    .replace(/^(?:ابحث لي عن|ابحث عن|ابحث في الانترنت عن|اعطني معلومات حديثة عن|ما هي آخر أخبار|شنو هي|واش هي|وش هي)\s+/i, '')
    .trim();

  return {
    ...baseFields,
    searchQuery: cleanSearchQuery || correctedText,
    intent: needsSearch ? 'web_search' : 'general_chat',
    explicitFileRequest: false,
    isAmbiguous: false,
  };
}
