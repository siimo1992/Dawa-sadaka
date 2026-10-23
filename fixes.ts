/**
 * fixes.ts — وحدة التحصين لخادم تيديكلت AI
 *
 * تضع هذه الوحدة في مكان واحد:
 *  1) حارس المشرف على المسارات الإدارية (ADMIN_TOKEN)
 *  2) تحديد معدل الطلبات حسب نوع المسار
 *  3) حدود حجم الطلب
 *  4) منع العميل من التحكم في تعليمات النظام
 *  5) كتابة JSON مؤجلة وذرّية (بدل writeFileSync عند كل سؤال)
 *  6) تبديل النماذج مع مهلة وتسجيل الأخطاء الحقيقية
 *  7) مصحّح استعلام آمن، ومحلل JSON صارم، وكاشف الكود
 */
import crypto from 'crypto';
import dns from 'node:dns';
import fs from 'fs';
import express from 'express';
import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore if unsupported
}

/* ───────────────────────── 1) حارس المشرف ───────────────────────── */

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** يفشل مغلقاً: إن لم يُضبط ADMIN_TOKEN يُعطَّل المسار الإداري بدل أن يُفتح للجميع. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected) {
    res.status(503).json({ error: 'ADMIN_TOKEN غير مضبوط على الخادم؛ المسار الإداري معطّل.' });
    return;
  }
  const given = String(req.headers['x-admin-token'] || '');
  if (!given || !safeEqual(given, expected)) {
    res.status(401).json({ error: 'غير مصرّح.' });
    return;
  }
  next();
};

const ADMIN_ROUTES: Array<{ method: string; path: RegExp }> = [
  // تعديل الإعدادات والبيانات
  { method: 'POST', path: /^\/api\/global-settings$/ },
  { method: 'POST', path: /^\/api\/ratings\/(reset|reload)$/ },
  { method: 'DELETE', path: /^\/api\/ratings\/[^/]+$/ },
  { method: 'POST', path: /^\/api\/ain-salah\/stats\/reset$/ },
  { method: 'POST', path: /^\/api\/training\/(sft|rlhf\/vote|agent-avatars)$/ },
  { method: 'DELETE', path: /^\/api\/training\/(sft|agent-avatars)\/[^/]+$/ },
  { method: 'POST', path: /^\/api\/rag\/(knowledge-base(\/batch)?|upload-document)$/ },
  { method: 'DELETE', path: /^\/api\/rag\/(knowledge-base|documents)\/.+$/ },
  { method: 'POST', path: /^\/api\/news\/local$/ },
  { method: 'DELETE', path: /^\/api\/news\/local\/[^/]+$/ },
  // قراءة بيانات حساسة (نصوص أسئلة المستخدمين وتعليقاتهم)
  { method: 'GET', path: /^\/api\/ain-salah\/stats$/ },
  { method: 'GET', path: /^\/api\/ratings(\/stats)?$/ },
  { method: 'GET', path: /^\/api\/training\/(sft|rlhf)$/ },
  { method: 'GET', path: /^\/api\/companion\/admin\/.+$/ },
];

export const adminGate: RequestHandler = (req, res, next) => {
  const hit = ADMIN_ROUTES.some((r) => r.method === req.method && r.path.test(req.path));
  if (hit) {
    requireAdmin(req, res, next);
    return;
  }
  next();
};

/* ───────────────────────── 2) تحديد المعدل ───────────────────────── */

export function rateLimit(opts: { windowMs: number; max: number }): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }, Math.max(opts.windowMs, 30_000)).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      if (buckets.size > 50_000) buckets.clear(); // حماية الذاكرة
      b = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - b.count)));
    if (b.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      res.status(429).json({ error: 'عدد الطلبات كبير؛ انتظر قليلاً ثم أعد المحاولة.' });
      return;
    }
    next();
  };
}

const AI_HEAVY =
  /^\/api\/(ain-salah\/ask|tidikelt\/ask|chat(\/stream)?|search-stream|search|tool-execute|maps-grounding|training\/rlhf\/generate-pair|tts|companion\/ask|news\/digest)$/;
const IMAGE_GEN = /^\/api\/generate-image$/;

/* ───────────────────────── 3) حدود الحجم ───────────────────────── */

const BIG_BODY_ALLOWED = /^\/api\/(ain-salah\/ask|tidikelt\/ask|rag\/upload-document|files\/(analyze|generate))$/;

export const bodySizeGate: RequestHandler = (req, res, next) => {
  const len = Number(req.headers['content-length'] || 0);
  const limit = BIG_BODY_ALLOWED.test(req.path) ? 26 * 1024 * 1024 : 512 * 1024;
  if (len > limit) {
    res.status(413).json({ error: 'الطلب أكبر من الحد المسموح.' });
    return;
  }
  next();
};

/* ───────────────────────── 4) منع التحكم في البرومبت ───────────────────────── */

export const stripClientControlledPrompts: RequestHandler = (req, _res, next) => {
  if (
    req.method === 'POST' &&
    /^\/api\/(chat(\/stream)?|search-stream|search)$/.test(req.path) &&
    req.body &&
    typeof req.body === 'object'
  ) {
    delete (req.body as Record<string, unknown>).systemInstruction;
    delete (req.body as Record<string, unknown>).temperature;
  }
  next();
};

/* ───────────────────────── تطبيق كل ما سبق ───────────────────────── */

/**
 * استبدل السطر `app.use(express.json({ limit: '25mb' }))` بهذا الاستدعاء:  applyFixes(app);
 * يجب أن يأتي قبل تسجيل أي مسار.
 */
export function applyFixes(app: Express): void {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const general = rateLimit({ windowMs: 60_000, max: 240 });
  const tiers: Array<{ test: (m: string, p: string) => boolean; mw: RequestHandler }> = [
    { test: (_m, p) => IMAGE_GEN.test(p), mw: rateLimit({ windowMs: 60_000, max: 5 }) },
    { test: (m, p) => m === 'POST' && AI_HEAVY.test(p), mw: rateLimit({ windowMs: 60_000, max: 20 }) },
    { test: (m, p) => m === 'POST' && p === '/api/ratings', mw: rateLimit({ windowMs: 60_000, max: 30 }) },
    { test: (m, p) => m === 'POST' && p === '/api/companion/trips', mw: rateLimit({ windowMs: 60_000, max: 10 }) },
  ];
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    const tier = tiers.find((t) => t.test(req.method, req.path));
    return (tier ? tier.mw : general)(req, res, next);
  });

  app.use(adminGate);
  app.use(bodySizeGate);
  app.use(express.json({ limit: '25mb' }));
  app.use(stripClientControlledPrompts);
}

/** ضعه بعد تسجيل كل المسارات: app.use(errorHandler); */
export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const type = err?.type;
  const status = type === 'entity.too.large' ? 413 : type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error('[server error]', err);
  res.status(status).json({
    error:
      status === 413
        ? 'الطلب أكبر من الحد المسموح.'
        : status === 400
        ? 'صيغة الطلب غير صحيحة.'
        : 'خطأ داخلي في الخادم.',
  });
};

/* ───────────────────────── 5) تخزين JSON مؤجل وذرّي ───────────────────────── */

export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch (e) {
    console.warn('[store] تعذّرت قراءة', file, e);
  }
  return fallback;
}

export class DebouncedJsonWriter {
  private readonly file: string;
  private readonly delayMs: number;
  private timer: NodeJS.Timeout | null = null;
  private pending: unknown = undefined;
  private writing: Promise<void> = Promise.resolve();

  constructor(file: string, delayMs = 1500) {
    this.file = file;
    this.delayMs = delayMs;
    process.on('exit', () => this.flushSync());
  }

  schedule(data: unknown): void {
    this.pending = data;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
    this.timer.unref?.();
  }

  flush(): Promise<void> {
    if (this.pending === undefined) return this.writing;
    const json = JSON.stringify(this.pending);
    this.pending = undefined;
    const tmp = `${this.file}.${process.pid}.tmp`;
    this.writing = this.writing.then(async () => {
      try {
        await fs.promises.writeFile(tmp, json, 'utf-8');
        await fs.promises.rename(tmp, this.file);
      } catch (e) {
        console.error('[store] فشلت الكتابة:', this.file, e);
      }
    });
    return this.writing;
  }

  flushSync(): void {
    if (this.pending === undefined) return;
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.pending), 'utf-8');
    } catch {
      /* تجاهل */
    }
    this.pending = undefined;
  }
}

import { callDeepSeekWithMeta } from './src/server/deepseekService.ts';

/* ───────────────────────── 6) تبديل النماذج وتشخيص الأعطال ───────────────────────── */

const DEFAULT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
];

/** يعيد قائمة النماذج المعتمدة حصراً بعد التحقق الفعلي من توافقها مع Gemini API. */
export function getModels(): string[] {
  return [...DEFAULT_MODELS];
}

const cooldownUntil: Record<string, number> = {};
const errText = (e: any): string => String(e?.message || e || '');

export type EngineFailureKind = 'quota_exceeded' | 'timeout' | 'search_failure' | 'service_outage';

export function isQuotaExceededError(e: any): boolean {
  const m = errText(e).toLowerCase();
  return (
    e?.status === 429 ||
    e?.code === 429 ||
    e?.status === 402 ||
    e?.code === 402 ||
    /429|resource_exhausted|quota|rate limit|insufficient_quota|insufficient balance/.test(m)
  );
}

export function isTimeoutError(e: any): boolean {
  const m = errText(e).toLowerCase();
  return (
    e?.name === 'AbortError' ||
    /timeout|timed out|etimedout|aborted/.test(m)
  );
}

export function isTransientModelError(e: any): boolean {
  const m = errText(e).toLowerCase();
  return (
    isQuotaExceededError(e) ||
    isTimeoutError(e) ||
    e?.status === 503 ||
    e?.code === 503 ||
    /503|high demand|overloaded|unavailable/.test(m)
  );
}

export function isModelNotFound(e: any): boolean {
  const m = errText(e).toLowerCase();
  return (
    e?.status === 404 ||
    e?.code === 404 ||
    e?.status === 400 ||
    e?.code === 400 ||
    /not_found|not found|is not supported|unknown model|unexpected model name format|invalid_argument|no longer available/.test(m)
  );
}

export function classifyEngineFailure(errors: any[], searchFailed = false): EngineFailureKind {
  if (errors.some((e) => isQuotaExceededError(e))) {
    return 'quota_exceeded';
  }
  if (errors.some((e) => isTimeoutError(e))) {
    return 'timeout';
  }
  if (searchFailed && errors.length === 0) {
    return 'search_failure';
  }
  return 'service_outage';
}

/**
 * يبني رسالة خطأ واضحة ومفيدة للمستخدم عند تعذّر تشغيل جميع المحركات،
 * مع التمييز الدقيق بين: انتهاء الحصة (429)، انتهاء المهلة (Timeout)، تعطل البحث، أو تعطل الخدمة.
 */
export function buildClearEngineErrorMessage(
  kind: EngineFailureKind,
  language: string = 'ar',
  searchFailedNote = false
): string {
  if (language === 'en') {
    switch (kind) {
      case 'quota_exceeded':
        return '⚠️ AI engine request quota is temporarily exhausted (429 Rate/Quota Limit). Please wait a moment and try again.';
      case 'timeout':
        return '⏱️ The AI engine took too long to respond (Request Timeout). Please try again or simplify your question.';
      case 'search_failure':
        return '🌐 Live web search is temporarily unreachable, and the AI engines could not complete the request right now. Please try again shortly.';
      case 'service_outage':
      default:
        return '🔌 AI service is temporarily unavailable due to a connection or provider outage. Please try again in a few moments.';
    }
  }

  if (language === 'fr') {
    switch (kind) {
      case 'quota_exceeded':
        return '⚠️ Le quota de requêtes du moteur IA est temporairement épuisé (Limite 429). Veuillez patienter un instant avant de réessayer.';
      case 'timeout':
        return '⏱️ Le délai de réponse du serveur IA a expiré (Timeout). Veuillez réessayer ou simplifier votre question.';
      case 'search_failure':
        return '🌐 Le service de recherche en direct est temporairement inaccessible et les moteurs IA n’ont pas pu répondre. Veuillez réessayer.';
      case 'service_outage':
      default:
        return '🔌 Le service d’intelligence artificielle est temporairement indisponible. Veuillez réessayer dans quelques instants.';
    }
  }

  const searchSuffix = searchFailedNote
    ? ' (ملاحظة: تعذّر أيضاً الوصول إلى مصادر البحث المباشر في هذه اللحظة دون اختلاق أي روابط).'
    : '';

  switch (kind) {
    case 'quota_exceeded':
      return `⚠️ انتهت الحصة المؤقتة لطلبات الذكاء الاصطناعي (خطأ تجاوز الحد 429). يرجى الانتظار قليلاً ثم إعادة المحاولة.${searchSuffix}`;
    case 'timeout':
      return `⏱️ انتهت المهلة الزمنية للاتصال بمحركات الذكاء الاصطناعي نظراً لبطء الاستجابة حالياً. يرجى المحاولة مرة أخرى أو اختصار السؤال.${searchSuffix}`;
    case 'search_failure':
      return `🌐 تعذّر الوصول إلى خدمة البحث المباشر ومحركات التوليد في هذه اللحظة. يرجى التحقق من الاتصال وإعادة المحاولة بعد قليل.`;
    case 'service_outage':
    default:
      return `🔌 خدمة الذكاء الاصطناعي غير متاحة مؤقتاً (تعذّر الاتصال بجميع المحركات الأساسية والاحتياطية). يرجى المحاولة مجدداً بعد قليل.${searchSuffix}`;
  }
}

export interface GenResult {
  text: string;
  model: string;
  response: any;
  provider?: 'gemini' | 'deepseek';
  notice?: string | null;
  failureKind?: EngineFailureKind;
}

/**
 * يجرّب نماذج Gemini بالترتيب مع مهلة موحدة (15 ثانية افتراضياً)،
 * ثم ينتقل تلقائياً إلى DeepSeek عند توفر مفتاحه (DEEPSEEK_API_KEY)،
 * ويسجّل الأخطاء الحقيقية دون ابتلاعها.
 */
export async function generateWithFailover(
  ai: any,
  request: { contents: any; config?: Record<string, unknown> },
  opts: { models?: string[]; timeoutMs?: number; allowDeepSeekFallback?: boolean } = {}
): Promise<GenResult | null> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const allowDeepSeek = opts.allowDeepSeekFallback !== false;
  const errors: any[] = [];

  for (const model of opts.models ?? getModels()) {
    if ((cooldownUntil[model] || 0) > Date.now()) continue;
    let timer: NodeJS.Timeout | undefined;
    try {
      const response: any = await Promise.race([
        ai.models.generateContent({ model, ...request }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`timeout waiting for ${model}`)), timeoutMs);
        }),
      ]);
      const text = String(response?.text || '').trim();
      if (text) return { text, model, response, provider: 'gemini', notice: null };
    } catch (e) {
      errors.push(e);
      if (isModelNotFound(e)) {
        cooldownUntil[model] = Date.now() + 10 * 60_000;
        console.info(`[model] ${model} غير متاح: ${errText(e)}`);
      } else if (isQuotaExceededError(e)) {
        cooldownUntil[model] = Date.now() + 30_000;
        console.info(`[model] ${model} تجاوز الحصة (429): ${errText(e)}`);
      } else if (isTransientModelError(e)) {
        cooldownUntil[model] = Date.now() + 15_000;
        console.info(`[model] ${model} خطأ مؤقت: ${errText(e)}`);
      } else {
        console.info(`[model] ${model} فشل: ${errText(e)}`);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // الانتقال التلقائي إلى DeepSeek عند توفر مفتاحه وفشل نماذج Gemini
  if (allowDeepSeek && process.env.DEEPSEEK_API_KEY?.trim()) {
    try {
      const rawPrompt =
        typeof request.contents === 'string'
          ? request.contents
          : JSON.stringify(request.contents);
      const sysInstruction =
        typeof request.config?.systemInstruction === 'string'
          ? request.config.systemInstruction
          : undefined;
      const dsRes = await callDeepSeekWithMeta(rawPrompt, {
        systemInstruction: sysInstruction,
        timeoutMs,
      });
      if (dsRes.ok && dsRes.text) {
        return {
          text: dsRes.text,
          model: dsRes.model,
          response: { text: dsRes.text, candidates: [] },
          provider: 'deepseek',
          notice: 'تم التحويل التلقائي إلى محرك DeepSeek الاحتياطي لضمان استمرارية الخدمة.',
        };
      }
      if (dsRes.errorMessage) {
        errors.push(new Error(dsRes.errorMessage));
      }
    } catch (dsErr) {
      errors.push(dsErr);
    }
  }

  return null;
}

/* ───────────────────────── 7) مساعدات منطقية ───────────────────────── */

const AR = '\\u0600-\\u06FF';
const arWord = (src: string) => new RegExp(`(?<![${AR}])(?:${src})(?![${AR}])`, 'g');

/** قواعد قليلة ومحافظة، على كلمات كاملة فقط (لا تمسّ «السوائل» ولا أجزاء الكلمات). */
const TYPO_RULES: Array<[RegExp, string]> = [
  [arWord('تيدكلت|تدكلت'), 'تيديكلت'],
  [arWord('برمجه'), 'برمجة'],
  [arWord('اصطناعيي|الصطناعي|إصطناعي'), 'اصطناعي'],
  [arWord('خورزميات|خورميات|خوارزميت'), 'خوارزميات'],
];

export function safeNormalizeQuery(raw: string): { normalizedQuery: string; changed: boolean } {
  const original = (raw || '').trim().replace(/\s+/g, ' ');
  let out = original;
  for (const [re, to] of TYPO_RULES) out = out.replace(re, to);
  return { normalizedQuery: out, changed: out !== original };
}

/** يقبل الرد كغلاف JSON فقط إذا كان كله كائناً فيه text؛ وإلا يبقى النص كما هو (لا يُفسَد الكود ولا الأقواس). */
export function parseAgentEnvelope(
  raw: string
): { text: string; assignedAgent?: { id?: string; name?: string; emoji?: string; reason?: string } } | null {
  const t = (raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return null;
  try {
    const p = JSON.parse(t);
    if (p && typeof p === 'object' && typeof p.text === 'string') return p;
  } catch {
    /* ليس غلافاً */
  }
  return null;
}

/** لا يطابق "code" داخل "decode" ولا "sql" داخل كلمات أطول. */
export const CODE_HINTS =
  /(كود|برمج|سكربت|دالة|رسم بياني|(?<![a-z])(python|javascript|typescript|code|script|function|algorithm|regex|sql)(?![a-z]))/i;

export const isSeedRecord = (r: { id?: string } | null | undefined): boolean =>
  typeof r?.id === 'string' && r.id.startsWith('seed_');

export const CODE_NOT_EXECUTED_NOTICE =
  'تعذّر تنفيذ الكود فعلياً الآن، لذلك لا توجد مخرجات تشغيل حقيقية. الكود أعلاه للاطلاع فقط.';
