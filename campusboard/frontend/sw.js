const CACHE = 'campusboard-v1';

const PRECACHE = [
  '/',
  '/login',
  '/app',
  '/css/style.css',
  '/css/auth.css',
  '/js/main.js',
  '/js/ui.js',
  '/js/api.js',
  '/js/nav.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/campusboard_app_icon.svg',
  '/assets/istanbul_arel_university_logo_black.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls: network-only (never cache)
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network-first, fallback to cached page
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .catch(() => caches.match(request).then(r => r || caches.match('/app') || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first, update cache in background
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(request, response.clone()));
        }
        return response;
      });
      return cached || network;
    })
  );
});
