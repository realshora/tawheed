// twh service worker v3 — يفتح من النسخة المحفوظة فورًا (من غير ما يستنى النت)، ويحدّثها في الخلفية
const CACHE = 'twh-simple-v7';
const PRECACHE = ["./", "./index.html", "./manifest.json", "./logo.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./assets/ribbon-guide-1.jpg", "./assets/ribbon-guide-2.jpg", "./assets/ribbon-guide-3.jpg", "./assets/ribbon-guide-4.jpg", "./assets/ribbon-guide-5.jpg", "./assets/ribbon-guide-6.jpg", "./assets/ribbon-guide-7.jpg", "./assets/ribbon-guide-8.jpg"];

// ردود الـ redirect مينفعش تتقدّم لطلب تنقّل (navigate)، فبنعمل منها نسخة نضيفة
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(async u => {
    try { const r = await fetch(u); if (r.ok) await c.put(u, await clean(r)); } catch (err) {}
  }))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let cached = await cache.match(req, { ignoreSearch: true });
    // طلبات التنقّل: لو الرابط من غير .html نلاقيه بالـ .html والعكس
    if (!cached && req.mode === 'navigate' && sameOrigin) {
      let p = url.pathname;
      const alt = p.endsWith('.html') ? p.slice(0, -5) : (p.endsWith('/') ? p + 'index.html' : p + '.html');
      cached = await cache.match(alt, { ignoreSearch: true });
    }
    const refresh = fetch(req).then(async res => {
      if (res && (res.ok || res.type === 'opaque')) await cache.put(req, (await clean(res.clone())));
      return res;
    }).catch(() => null);

    if (cached) { e.waitUntil(refresh); return cached; }       // فوري من النسخة المحفوظة
    const net = await refresh;
    if (net) return net;
    return (await cache.match('./index.html')) || Response.error();
  })());
});
