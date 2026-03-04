// public/service-worker.js
// HerbGuard PWA Service Worker

const CACHE_NAME  = 'herbguard-v3';  // ← bumped to force fresh install
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/offline',
  '/css/main.css',
  '/css/dashboard.css',
  '/css/plant-detail.css',
  '/css/auth.css',
  '/css/settings.css',
  '/css/plants.css',
  '/css/customer.css',
  '/js/main.js',
  '/js/dashboard.js',
  '/js/plant-detail.js',
  '/js/customer.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ── Install ───────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Failed to cache ${url}:`, err)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — single handler ────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip API — always live data
  if (url.pathname.startsWith('/api/')) return;

  // Skip websocket
  if (event.request.headers.get('upgrade') === 'websocket') return;

  // Never cache manifests — always fetch fresh from server
  if (url.pathname.includes('manifest')) return;

  // Never cache ngrok warning pages
  // If response is not ok or wrong content type, don't cache
  if (url.hostname.includes('ngrok')) return;

  // CSS, JS, icons — cache first, network fallback
  if (
    url.pathname.startsWith('/css/')    ||
    url.pathname.startsWith('/js/')     ||
    url.pathname.startsWith('/icons/')  ||
    url.pathname.startsWith('/uploads/')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            // Only cache valid responses
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
            return response;
          });
        })
    );
    return;
  }

  // All HTML pages (/, /plant/x, /p/x, /plants, /settings)
  // Network first, cache fallback, offline page last resort
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache valid HTML responses
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL));
      })
  );
});

// ── Message ───────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});