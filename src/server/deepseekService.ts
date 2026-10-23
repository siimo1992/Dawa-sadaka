/**
 * Server-Side DeepSeek API Integration & Bi-Directional Failover Engine
 * ----------------------------------------------------------------------
 * SECURITY NOTE:
 * This module MUST ONLY run inside the Node.js server runtime (`server.ts`).
 * Never import this file in client-side React components or expose
 * `process.env.DEEPSEEK_API_KEY` to the browser.
 *
 * Configure `DEEPSEEK_API_KEY` via Google AI Studio:
 * Settings (الإعدادات) -> Secrets -> Add `DEEPSEEK_API_KEY` (starts with `sk-`).
 */

export const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekCallOptions {
  model?: string;
  systemInstruction?: string;
  messages?: DeepSeekChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface DeepSeekMetaResult {
  ok: boolean;
  text: string;
  model: string;
  statusCode?: number;
  isBalanceExhausted?: boolean;
  isRateLimited?: boolean;
  isMissingKey?: boolean;
  errorMessage?: string;
}

// Cooldown tracker when DeepSeek encounters 402 (Insufficient Balance), 401, or 429
let deepSeekCooldownUntil = 0;
let lastDeepSeekStatusReason = '';

export function getDeepSeekStatus(): {
  configured: boolean;
  inCooldown: boolean;
  cooldownRemainingMs: number;
  lastReason: string;
} {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const now = Date.now();
  const inCooldown = deepSeekCooldownUntil > now;
  return {
    configured: Boolean(apiKey),
    inCooldown,
    cooldownRemainingMs: inCooldown ? deepSeekCooldownUntil - now : 0,
    lastReason: lastDeepSeekStatusReason,
  };
}

/**
 * الدالة الأساسية للاتصال بواجهة DeepSeek API على جانب الخادم (Node.js)
 * تستدعي https://api.deepseek.com/chat/completions باستخدام fetch المدمج
 * وتقرأ المفتاح حصرياً من process.env.DEEPSEEK_API_KEY.
 */
export async function askDeepSeek(
  userMessage: string,
  options: DeepSeekCallOptions = {}
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return 'خطأ: لم يتم العثور على المفتاح السري DEEPSEEK_API_KEY في إعدادات الخادم (Secrets).';
  }

  const formattedMessages: DeepSeekChatMessage[] =
    Array.isArray(options.messages) && options.messages.length > 0
      ? options.messages
      : [
          ...(options.systemInstruction
            ? [{ role: 'system' as const, content: options.systemInstruction }]
            : []),
          { role: 'user' as const, content: userMessage },
        ];

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || DEEPSEEK_DEFAULT_MODEL,
        messages: formattedMessages,
        ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
        ...(typeof options.maxTokens === 'number' ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 402) {
        deepSeekCooldownUntil = Date.now() + 10 * 60_000; // 10 min cooldown on insufficient balance
        lastDeepSeekStatusReason = 'insufficient_balance_402';
        throw new Error('نفد الرصيد في حساب DeepSeek (402 Insufficient Balance).');
      }
      if (response.status === 401) {
        deepSeekCooldownUntil = Date.now() + 10 * 60_000;
        lastDeepSeekStatusReason = 'invalid_api_key_401';
        throw new Error('مفتاح DEEPSEEK_API_KEY غير صالح أو غير مصرح به (401).');
      }
      if (response.status === 429) {
        deepSeekCooldownUntil = Date.now() + 60_000;
        lastDeepSeekStatusReason = 'rate_limit_429';
        throw new Error('تم تجاوز حد الطلبات في DeepSeek مؤقتاً (429).');
      }
      throw new Error(`فشل طلب DeepSeek API برمز الحالة ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      throw new Error('وصلت استجابة فارغة أو غير متوقعة من DeepSeek API.');
    }

    return content.trim();
  } catch (error: any) {
    console.error('[DeepSeek Server Error]:', error?.message || error);
    return `عذراً، تعذر إتمام الطلب عبر DeepSeek: ${error?.message || 'خطأ غير معروف في الاتصال بالخادم'}`;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * استدعاء متقدم مع بيانات وصفية دقيقة لدعم التبديل التلقائي ثنائي الاتجاه (Gemini <-> DeepSeek)
 * عند نفاد الرصيد (402) أو تجاوز الحصة (429) أو غياب المفتاح.
 */
export async function callDeepSeekWithMeta(
  userMessage: string,
  options: DeepSeekCallOptions & { ignoreCooldown?: boolean } = {}
): Promise<DeepSeekMetaResult> {
  const model = options.model || DEEPSEEK_DEFAULT_MODEL;
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    lastDeepSeekStatusReason = 'missing_api_key';
    return {
      ok: false,
      text: '',
      model,
      isMissingKey: true,
      errorMessage: 'لم يتم ضبط المفتاح السري DEEPSEEK_API_KEY في إعدادات الخادم.',
    };
  }

  if (!options.ignoreCooldown && deepSeekCooldownUntil > Date.now()) {
    return {
      ok: false,
      text: '',
      model,
      isBalanceExhausted: lastDeepSeekStatusReason === 'insufficient_balance_402',
      isRateLimited: lastDeepSeekStatusReason === 'rate_limit_429',
      errorMessage: `محرك DeepSeek في فترة تهدئة مؤقتة (${lastDeepSeekStatusReason}).`,
    };
  }

  const formattedMessages: DeepSeekChatMessage[] =
    Array.isArray(options.messages) && options.messages.length > 0
      ? options.messages
      : [
          ...(options.systemInstruction
            ? [{ role: 'system' as const, content: options.systemInstruction }]
            : []),
          { role: 'user' as const, content: userMessage },
        ];

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.4,
        ...(typeof options.maxTokens === 'number' ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const lowerErr = errText.toLowerCase();
      const isBalanceExhausted =
        response.status === 402 ||
        lowerErr.includes('insufficient balance') ||
        lowerErr.includes('insufficient_quota');
      const isRateLimited = response.status === 429 || lowerErr.includes('rate limit');

      if (isBalanceExhausted) {
        deepSeekCooldownUntil = Date.now() + 10 * 60_000;
        lastDeepSeekStatusReason = 'insufficient_balance_402';
      } else if (response.status === 401) {
        deepSeekCooldownUntil = Date.now() + 10 * 60_000;
        lastDeepSeekStatusReason = 'invalid_api_key_401';
      } else if (isRateLimited) {
        deepSeekCooldownUntil = Date.now() + 60_000;
        lastDeepSeekStatusReason = 'rate_limit_429';
      }

      return {
        ok: false,
        text: '',
        model,
        statusCode: response.status,
        isBalanceExhausted,
        isRateLimited,
        errorMessage: isBalanceExhausted
          ? 'نفد رصيد حساب DeepSeek (402 Insufficient Balance).'
          : `فشل اتصال DeepSeek برمز الحالة ${response.status}.`,
      };
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return {
        ok: false,
        text: '',
        model,
        errorMessage: 'استجابة فارغة من DeepSeek API.',
      };
    }

    lastDeepSeekStatusReason = 'ok';
    return {
      ok: true,
      text: content.trim(),
      model,
      statusCode: 200,
    };
  } catch (err: any) {
    return {
      ok: false,
      text: '',
      model,
      errorMessage: err?.message || 'تعذر الاتصال بخادم DeepSeek.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * بث الردود المتدفقة (SSE Streaming) من DeepSeek API عند التبديل التلقائي.
 */
export async function* streamDeepSeekChat(
  userMessage: string,
  options: DeepSeekCallOptions & { signal?: AbortSignal } = {}
): AsyncGenerator<string, boolean, unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey || deepSeekCooldownUntil > Date.now()) {
    return false;
  }

  const formattedMessages: DeepSeekChatMessage[] =
    Array.isArray(options.messages) && options.messages.length > 0
      ? options.messages
      : [
          ...(options.systemInstruction
            ? [{ role: 'system' as const, content: options.systemInstruction }]
            : []),
          { role: 'user' as const, content: userMessage },
        ];

  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || DEEPSEEK_DEFAULT_MODEL,
        messages: formattedMessages,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.4,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      if (response.status === 402) {
        deepSeekCooldownUntil = Date.now() + 10 * 60_000;
        lastDeepSeekStatusReason = 'insufficient_balance_402';
      } else if (response.status === 429) {
        deepSeekCooldownUntil = Date.now() + 60_000;
        lastDeepSeekStatusReason = 'rate_limit_429';
      }
      return false;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let yieldedAny = false;

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed?.choices?.[0]?.delta?.content;
          if (token) {
            yieldedAny = true;
            yield token;
          }
        } catch {
          continue;
        }
      }

      if (done) break;
    }

    return yieldedAny;
  } catch (err: any) {
    console.warn('[DeepSeek Stream Error]:', err?.message || err);
    return false;
  }
}
