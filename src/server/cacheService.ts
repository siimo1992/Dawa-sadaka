import { createClient } from "redis";
import { createHash } from "node:crypto";

// Fallback in-memory cache when Redis is not provisioned or during connection blips
const inMemoryCache = new Map<string, { value: any; expiresAt: number }>();

let redisClient: ReturnType<typeof createClient> | null = null;
let redisIsReady = false;

if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on("error", (err) => {
      // سجّل الخطأ دون طباعة كلمات المرور أو بيانات المستخدمين.
      console.error("Redis error:", err.message);
      redisIsReady = false;
    });

    redisClient.on("ready", () => {
      redisIsReady = true;
    });

    redisClient.connect().catch((err) => {
      // إذا تعطّل Redis، يستمر التطبيق دون كاش بدل أن يتوقف.
      console.error("Redis unavailable; cache disabled:", err.message);
      redisIsReady = false;
    });
  } catch (err: any) {
    console.error("Failed to initialize Redis client:", err?.message || err);
    redisClient = null;
  }
}

export const PROMPT_VERSION = "v1";

export function hash(value: any): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function normalizeQuery(query: string): string {
  return query
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ar");
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (redisClient && redisIsReady) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err: any) {
      console.error("Cache read failed:", err.message);
    }
  }

  // Resilient memory cache lookup
  const mem = inMemoryCache.get(key);
  if (mem) {
    if (Date.now() < mem.expiresAt) {
      return mem.value as T;
    }
    inMemoryCache.delete(key);
  }

  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;

  // In-memory cache for fast local access
  inMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  if (inMemoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of inMemoryCache.entries()) {
      if (now >= v.expiresAt) inMemoryCache.delete(k);
    }
  }

  if (redisClient && redisIsReady) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err: any) {
      console.error("Cache write failed:", err.message);
    }
  }
}

export function splitForSSE(text: string, size = 100): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
