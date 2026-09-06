const CACHE_NAME = 'smartattend-cache-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache HTML routes (prevents blank screen on new deploys)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request) || caches.match('/index.html'))
    );
    return;
  }

  // Assets & APIs
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});