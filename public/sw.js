// Offline shell only. The player and the thumbnails live on other origins and still need
// a connection; this keeps the app itself openable and shows what was saved.
const CACHE = 'serein-shell-v1';

async function precache() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/');
  if (!response.ok) return;
  await cache.put('/', response.clone());
  const html = await response.text();
  // The build hashes these names, so read them from the page instead of keeping a list.
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
  await cache.addAll(['/theme.js', '/manifest.webmanifest', '/logo.svg']);
  for (const file of assets.filter((name) => name.endsWith('.css'))) {
    const text = await (await fetch(file)).text();
    const fonts = [...text.matchAll(/url\((\/assets\/[^)]+)\)/g)].map((m) => m[1]);
    await cache.addAll(fonts);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function save(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Data belongs to the client: a cached answer would make Refresh look broken.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) await save('/', response.clone());
          return response;
        } catch {
          return (await caches.match('/')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Built assets carry a content hash and never change. Everything else is revalidated.
  // ignoreVary: the host sends a Vary header that a Request-based match would never satisfy.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request, { ignoreVary: true });
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await save(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await save(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request, { ignoreVary: true })) ?? Response.error();
      }
    })(),
  );
});
