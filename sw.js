// WorldWise Service Worker — offline-first PWA
const CACHE = 'worldwise-v1';

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/data/world-paths.js',
  '/data/countries.js',
  '/js/app.js',
  '/js/map.js',
  '/js/quiz.js',
  '/js/progress.js',
  '/js/sounds.js',
  '/js/confetti.js',
];

// Pre-cache all local assets on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // External requests (Google Fonts etc): network-first, cache as fallback
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets: cache-first, network as fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      });
    })
  );
});
