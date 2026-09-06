const CACHE_NAME = 'smartattend-shell-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // SPA navigation fallback: always fetch from network or return index.html shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets and data requests
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});