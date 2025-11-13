const CACHE_NAME = 'smart-attendance-offline-v1';
const APP_SHELL = [
  '/', 
  '/index.html', 
  '/logo.svg', 
  '/icon.svg', 
  '/manifest.json',
  // Face-API models for offline face recognition (all models ~12.6 MB)
  '/models/tiny_face_detector_model-weights_manifest.json',
  '/models/tiny_face_detector_model-shard1',
  '/models/face_landmark_68_model-weights_manifest.json',
  '/models/face_landmark_68_model-shard1',
  '/models/face_recognition_model-weights_manifest.json',
  '/models/face_recognition_model-shard1',
  '/models/face_recognition_model-shard2',
  '/models/ssd_mobilenetv1_model-weights_manifest.json',
  '/models/ssd_mobilenetv1_model-shard1',
  '/models/ssd_mobilenetv1_model-shard2'
];

// CDN assets that will be cached on first use
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  'https://aistudiocdn.com/react-calendar@^6.0.0/dist/Calendar.css'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker for offline use...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching app shell and models...');
      
      // Cache app shell and models - critical for offline
      try {
        await cache.addAll(APP_SHELL);
        console.log('[SW] App shell and models cached successfully');
      } catch (err) {
        console.warn('[SW] Some app shell files failed to cache:', err);
      }
      
      // Attempt to cache CDN assets (non-blocking)
      CDN_ASSETS.forEach(async (url) => {
        try {
          const response = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, response);
          console.log('[SW] Cached CDN asset:', url);
        } catch (err) {
          console.warn('[SW] Failed to cache CDN asset:', url, err);
        }
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
