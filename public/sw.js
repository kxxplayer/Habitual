
const CACHE_NAME = 'habitual-cache-v1';
const APP_SHELL_FILES = [
  '/',
  '/manifest.json',
  // Add paths to your main JS/CSS bundles if known and static
  // e.g., '/_next/static/css/main.css', '/_next/static/chunks/main-app.js'
  // These are often dynamic, so be careful or use Workbox for better handling.
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other critical icons/assets needed for the app shell
];

const API_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  // Add other API hosts your app communicates with for Genkit or other services
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(APP_SHELL_FILES).catch(error => {
        console.error('[Service Worker] Failed to cache app shell files:', error);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API requests
  if (API_HOSTS.includes(url.hostname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (HTML pages), try network first, then cache (Stale-While-Revalidate approach for pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, cache the response for future offline use
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/'); // Fallback to homepage or a generic offline page
          });
        })
    );
    return;
  }

  // For other requests (static assets like CSS, JS, images), use Cache First strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(error => {
        console.error('[Service Worker] Fetch failed for:', event.request.url, error);
        // Optionally