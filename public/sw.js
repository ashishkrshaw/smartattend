const CACHE_NAME = 'smart-attendance-cache-v1';
const APP_SHELL = ['/', '/index.html', '/logo.svg', '/icon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the app shell; failures shouldn't fail installation entirely.
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('Failed to precache some app shell files:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Simple runtime cache strategy with navigation fallback for SPA
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For navigation requests, try network first, then fallback to cache, then index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Put a copy in the cache for future offline use
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, try cache first then network and cache the network response
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((networkResponse) => {
          // Only cache valid responses (status 200) or opaque responses from CDN
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }
          const respClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, respClone).catch(() => {
              // ignore cache put failures
            });
          });
          return networkResponse;
        })
        .catch(() => {
          // final fallback — try to return cached index.html for HTML requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
