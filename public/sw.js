const CACHE_NAME = 'tidikelt-ai-v2.6.0-sec';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept or cache APK binary downloads, APK management endpoints, or Vite dev modules
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

  // Network-first with cache fallback for read-only status APIs
  if (url.pathname === '/api/ain-salah/today' || url.pathname === '/api/health') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Skip other API calls
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network first, fallback to cached root or offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(async () => {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Static assets: Network-first with cache fallback so mobile devices always get latest updates
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
