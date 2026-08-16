// Service worker de L'Antre.
//
// Stratégie : cache-first pour la coquille de l'application (elle change
// rarement), et réseau exclusif pour les appels aux sources — une annonce
// mise en cache serait une annonce périmée, donc on ne les cache jamais.

const CACHE_NAME = 'l-antre-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './scripts/config.js',
  './scripts/cities.js',
  './scripts/util.js',
  './scripts/notifications.js',
  './scripts/filters.js',
  './scripts/geo.js',
  './scripts/sources/base.js',
  './scripts/sources/reddit.js',
  './scripts/sources/bluesky.js',
  './scripts/sources/lemmy.js',
  './scripts/sources/mastodon.js',
  './scripts/search.js',
  './scripts/render.js',
  './scripts/favorites.js',
  './scripts/history.js',
  './scripts/app.js',
  './assets/default-profile.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll échoue en bloc si une seule entrée manque : on tolère les absents.
      .then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Tout ce qui n'est pas servi par notre origine est une source de données :
  // on laisse passer sans jamais mettre en cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
