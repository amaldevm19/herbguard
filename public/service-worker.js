// public/service-worker.js
// HerbGuard PWA Service Worker

const CACHE_NAME    = 'herbguard-v1';
const OFFLINE_URL   = '/offline';

// Assets to cache on install
// Only static shell — never API or sensor data
const STATIC_ASSETS = [
  '/',
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
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ── Install ───────────────────────────────
// Cache all static assets when SW first installs
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        // Cache what we can — don't fail if some external URLs miss
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
// Remove old caches when SW activates
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
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

// ── Fetch ─────────────────────────────────
// Network-first for API and HTML pages
// Cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — always fresh data
  if (url.pathname.startsWith('/api/')) return;

  // Skip socket/websocket
  if (event.request.headers.get('upgrade') === 'websocket') return;

  // Static assets — cache first, network fallback
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/')  ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/uploads/')||
    url.pathname.startsWith('/p/')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request)
          .then(response => {
            // Cache a copy of new static assets
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
            return response;
          })
        )
    );
    return;
  }

  // HTML pages — network first, offline fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a copy of successful HTML responses
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Offline — try cache first
        return caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL));
      })
  );
});

// ── Background sync message ───────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});