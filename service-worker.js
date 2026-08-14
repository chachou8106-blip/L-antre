const CACHE_NAME = 'l-antre-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/scripts/app.js',
  '/scripts/filters.js',
  '/scripts/geolocation.js',
  '/scripts/scraping.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});