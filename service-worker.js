// service-worker.js
const CACHE_NAME = 'pawpath-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/images/PawPahtLogo.png',
  '/components/JS/navbar-visitor-component.js',
  '/components/JS/ads-banner-component.js',
  '/components/JS/forum-card-component.js',
  '/components/JS/navbar-admin-component.js'
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