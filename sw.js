// Bump VERSION whenever you deploy changes so installed copies refresh.
const VERSION = 'abel-v6';
const CORE = ['./index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Only same-origin files are pre-cached. CDN libraries are cached at runtime
    // from the page's own requests, so the cached response type always matches
    // how the page requested them (CORS vs no-cors).
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);

    // Page loads: network first so updates arrive; fall back to cache offline.
    if (req.mode === 'navigate') {
      try {
        const r = await fetch(req);
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      } catch (_) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
      }
    }

    // Everything else: cache first, otherwise fetch and store.
    let hit = await cache.match(req);
    // Never give an opaque response to a CORS-mode request: the browser would reject it.
    if (hit && hit.type === 'opaque' && req.mode === 'cors') hit = null;
    if (hit) {
      // Refresh quietly in the background.
      fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone());
      return r;
    } catch (_) {
      return Response.error();
    }
  })());
});
