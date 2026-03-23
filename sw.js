const CACHE = 'blockhot-v11';

const CORE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/src/main.js?v=12',
  '/src/game.js?v=23',
  '/src/entities.js?v=16',
  '/src/animation.js?v=5',
  '/src/constants.js?v=6',
  '/src/input.js?v=5',
  '/src/level.js?v=9',
  '/src/proceduralAnimator.js?v=9',
  '/src/ui.js?v=10',
  '/src/utils.js?v=5',
  '/levels/level1.json',
  '/levels/level2.json',
  '/levels/level3.json',
  '/levels/level4.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(
        ks.filter(function(k) { return k !== CACHE; }).map(function(k) {
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var request = e.request;
  if (request.method !== 'GET') {
    return;
  }

  var isStaticAsset =
    request.url.indexOf('/assets/') !== -1 ||
    request.url.indexOf('/audio/') !== -1;

  if (isStaticAsset) {
    e.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (response && response.ok) {
            caches.open(CACHE).then(function(cache) {
              cache.put(request, response.clone());
            });
          }
          return response;
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(request)
      .then(function(response) {
        if (response && response.ok) {
          caches.open(CACHE).then(function(cache) {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(request).then(function(cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return undefined;
        });
      })
  );
});
