// Bump VERSION whenever you deploy changes so installed copies refresh.
const VERSION = 'abel-v1';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const CDN = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@0.460.0/dist/umd/lucide.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // Cache CDN libraries too (no-cors => opaque, which is fine for <script>)
    await Promise.all(CDN.map(async (u) => {
      try { await cache.put(u, await fetch(new Request(u, { mode: 'no-cors' }))); } catch (_) {}
    }));
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
    const hit = await cache.match(req, { ignoreSearch: true });
    // Pages: network first so updates arrive; fall back to cache offline.
    if (req.mode === 'navigate') {
      try { const r = await fetch(req); cache.put(req, r.clone()); return r; }
      catch (_) { return hit || cache.match('./index.html'); }
    }
    // Everything else: cache first, refresh in background.
    const refresh = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await refresh) || Response.error();
  })());
});
