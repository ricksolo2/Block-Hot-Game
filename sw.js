const CACHE = 'blockhot-v2';

const CORE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/src/main.js?v=4',
  '/src/game.js?v=17',
  '/src/entities.js?v=13',
  '/src/animation.js?v=4',
  '/src/constants.js?v=6',
  '/src/input.js?v=5',
  '/src/level.js?v=7',
  '/src/proceduralAnimator.js?v=8',
  '/src/ui.js?v=7',
  '/src/utils.js?v=5',
  '/levels/level1.json',
  '/levels/level2.json',
  '/levels/level3.json',
  '/levels/level4.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res.ok && (e.request.url.includes('/assets/') || e.request.url.includes('/audio/'))) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => e.request.mode === 'navigate' ? caches.match('/index.html') : undefined);
    })
  );
});
