const CACHE_NAME = 'smart-attendance-cache-v2';
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// This list includes the app shell, key CDN assets, and all face-api models
// required for offline face detection and recognition.
const urlsToCache = [
  // App Shell
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon.svg',
  '/index.tsx', // Will be cached on first load regardless, but good to have

  // Key CDN assets
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react-calendar@^6.0.0/dist/Calendar.css',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  
  // Face-API Models (critical for offline functionality)
  `${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`,
  `${MODEL_URL}/tiny_face_detector_model-shard1`,
  `${MODEL_URL}/face_landmark_68_model-weights_manifest.json`,
  `${MODEL_URL}/face_landmark_68_model-shard1`,
  `${MODEL_URL}/face_recognition_model-weights_manifest.json`,
  `${MODEL_URL}/face_recognition_model-shard1`,
  `${MODEL_URL}/face_recognition_model-shard2`,
  `${MODEL_URL}/ssd_mobilenetv1_model-weights_manifest.json`,
  `${MODEL_URL}/ssd_mobilenetv1_model-shard1`,
  `${MODEL_URL}/ssd_mobilenetv1_model-shard2`,
];


self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching assets for offline use.');
        const promises = urlsToCache.map(url => {
            // Create a 'no-cors' request for third-party resources to prevent CORS errors.
            // This is essential for caching assets from CDNs during installation.
            const request = new Request(url, { mode: 'no-cors' });
            return fetch(request)
                .then(response => cache.put(url, response))
                .catch(err => console.warn(`Failed to cache ${url}:`, err));
        });
        return Promise.all(promises);
      })
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, fetch from network
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response because it's a stream and can be consumed once by cache and browser.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We now cache all valid GET responses, including 'opaque' ones from CDNs.
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open clients immediately
  );
});