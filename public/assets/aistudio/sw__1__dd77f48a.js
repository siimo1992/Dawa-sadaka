"use strict";
const CACHE_NAME = 'tidikelt-ai-v2.6.2-sec';
const OFFLINE_URL = '/offline.html';
const MAX_DYNAMIC_ENTRIES = 80;

// Critical assets that MUST be cached for offline survival mode
const CRITICAL_PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/',
];

// Secondary assets cached best-effort so a single missing icon never aborts SW install
const OPTIONAL_PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Protected paths that must NEVER be evicted by dynamic cache trimming
const PROTECTED_PATHS = new Set([
  ...CRITICAL_PRECACHE_ASSETS,
  ...OPTIONAL_PRECACHE_ASSETS,
]);

const ALLOWED_READONLY_APIS = new Set([
  '/api/ain-salah/today',
  '/api/health',
]);

let isTrimming = false;

/**
 * Helper: Trim dynamic cache entries without ever evicting protected offline survival assets.
 * Uses a concurrency lock (`isTrimming`) to prevent race conditions during parallel asset loads.
 */
async function trimCache(cacheName, maxItems) {
  if (isTrimming) return;
  isTrimming = true;
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const deletableKeys = keys.filter((req) => {
      try {
        const reqUrl = new URL(req.url);
        return !PROTECTED_PATHS.has(reqUrl.pathname);
      } catch (_) {
        return true;
      }
    });

    if (deletableKeys.length > maxItems) {
      const excess = deletableKeys.length - maxItems;
      for (let i = 0; i < excess; i++) {
        await cache.delete(deletableKeys[i]);
      }
    }
  } catch (_) {
    // Ignore storage quota / lock errors
  } finally {
    isTrimming = false;
  }
}

/**
 * Helper: Fetch with real AbortController cancellation so timed-out requests on
 * slow satellite/2G connections do not keep consuming bandwidth in the background.
 */
async function fetchWithTimeout(request, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Helper: Check whether a response is safe and valid to store in Cache Storage.
 * Rejects redirected responses (Captive Portal protection), non-200 status codes,
 * opaque/CORS responses, and enforces optional Content-Type prefixes.
 */
function isCacheableResponse(response, expectedMimePrefix = '') {
  if (
    !response ||
    response.status !== 200 ||
    response.type !== 'basic' ||
    response.redirected
  ) {
    return false;
  }
  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }
  if (expectedMimePrefix) {
    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.includes(expectedMimePrefix.toLowerCase())) {
      return false;
    }
  }
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Force fresh network fetch for critical offline survival files
      await Promise.all(
        CRITICAL_PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );

      // 2. Best-effort caching for icons/manifest so one missing file doesn't break SW install
      await Promise.allSettled(
        OPTIONAL_PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only intercept standard GET requests
  if (request.method !== 'GET') return;

  // Bypass partial content (Range) requests and Server-Sent Events (SSE) streams
  if (request.headers.has('range')) return;
  const acceptHeader = request.headers.get('accept') || '';
  if (acceptHeader.includes('text/event-stream')) return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // 2. Security boundary: Only intercept HTTP/HTTPS requests from the exact same origin
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // 3. Never intercept or cache APK binary downloads, APK management endpoints, or Vite dev modules
  if (
    url.pathname.startsWith('/downloads/') ||
    url.pathname.startsWith('/api/apk/') ||
    url.pathname.endsWith('.apk') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // 4. Direct access to /offline.html: serve fresh HTML if online, fallback to cached copy
  if (url.pathname === OFFLINE_URL) {
    event.respondWith(
      (async () => {
        try {
          const netRes = await fetchWithTimeout(request, 5000);
          if (isCacheableResponse(netRes, 'text/html')) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(OFFLINE_URL, netRes.clone());
            return netRes;
          }
        } catch (_) {
          // Fallback to cached offline.html below
        }
        const cachedOffline = await caches.match(OFFLINE_URL, { ignoreSearch: true });
        return (
          cachedOffline ||
          new Response('وضع عدم الاتصال - يرجى الاتصال بالشبكة', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })()
    );
    return;
  }

  // 5. Network-first with validated JSON cache fallback for whitelisted read-only status APIs
  if (ALLOWED_READONLY_APIS.has(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetchWithTimeout(request, 7000);
          // Only cache valid 200 OK non-redirected JSON responses (blocks Captive Portal HTML poisoning)
          if (isCacheableResponse(response, 'application/json')) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
            return response;
          }
          if (response.redirected || response.status >= 500) {
            throw new Error('Invalid or captive-redirected API response');
          }
          return response;
        } catch (_) {
          const cachedApi = await caches.match(request);
          if (cachedApi) return cachedApi;

          return new Response(
            JSON.stringify({
              ok: false,
              offline: true,
              message: 'لا يوجد اتصال بالشبكة حالياً، تعذر جلب البيانات الحية.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
      })()
    );
    return;
  }

  // 6. Never cache or intercept other API calls
  if (url.pathname.startsWith('/api/')) return;

  // 7. Navigation requests: network first with timeout, fallback to offline.html emergency page
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetchWithTimeout(request, 8000);
          if (isCacheableResponse(response, 'text/html') && url.pathname === '/') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/', response.clone());
          }
          // If server returns 5xx error or captive portal redirect while navigating, fall back to offline emergency page
          if (response.status >= 500) {
            throw new Error('Server 5xx error');
          }
          return response;
        } catch (_) {
          // Prioritize offline.html emergency page when offline so survival/SOS tools always work immediately
          const cachedOffline = await caches.match(OFFLINE_URL, { ignoreSearch: true });
          if (cachedOffline) return cachedOffline;

          const cachedRoot = await caches.match('/', { ignoreSearch: true });
          if (cachedRoot) return cachedRoot;

          return new Response('أنت في وضع عدم الاتصال.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // 8. Static assets: Network-first with cache fallback and protected quota trimming
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetchWithTimeout(request, 8000);
        if (isCacheableResponse(networkResponse)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
          trimCache(CACHE_NAME, MAX_DYNAMIC_ENTRIES);
        }
        return networkResponse;
      } catch (_) {
        const cachedAsset =
          (await caches.match(request)) ||
          (await caches.match(request, { ignoreSearch: true }));
        if (cachedAsset) return cachedAsset;
        return Response.error();
      }
    })()
  );
});