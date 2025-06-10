// public/sw.js

const CACHE_NAME = 'habitual-cache-v1'; // Increment version (e.g., v2, v3) when you update critical assets or sw.js logic
const urlsToCacheOnInstall = [
  // '/', // Caching root path can be tricky with Next.js routing. Often better handled by Next-PWA plugins.
  // '/manifest.json', // Manifest is usually fetched directly
  // '/icons/icon-192x192.png', // Icons are good candidates if they don't change often
  // '/icons/icon-512x512.png',
  // Add other critical static assets that are part of your app shell and don't change frequently.
  // Next.js's build process usually hashes assets, so they get new URLs when they change,
  // making aggressive caching here less critical for those hashed assets.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache and attempting to pre-cache assets');
        // Pre-caching is optional. If urlsToCacheOnInstall is empty, this does nothing.
        // return cache.addAll(urlsToCacheOnInstall);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting(); // Ensures the new service worker activates upon installation
      })
      .catch(error => {
        console.error('[Service Worker] Pre-caching failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) { // Delete all caches except the current one
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim(); // Takes control of open pages without requiring a reload
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Always bypass cache for navigation requests (HTML pages) in a Next.js app
  // to ensure the latest page structure is fetched, especially with SSR/ISR.
  // For a more SPA-like PWA, you might cache the app shell.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // Do not cache requests to Firebase, Google APIs, or Vercel's internal/data routes.
  const DENY_LIST_URL_PATTERNS = [
    /https:\/\/[a-zA-Z0-9.-]*\.firebaseio\.com/,
    /https:\/\/firestore\.googleapis\.com/,
    /https:\/\/securetoken\.googleapis\.com/,
    /https:\/\/firebaseinstallations\.googleapis\.com/,
    /https:\/\/www\.googleapis\.com/,
    /https:\/\/apis\.google\.com/,
    /https:\/\/fonts\.gstatic\.com/, // Google Fonts
    // Add Vercel specific patterns if you identify any causing issues (e.g., _next/data/)
    // However, Next.js hashed assets in _next/static are generally safe to cache.
  ];

  if (DENY_LIST_URL_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(fetch(request));
    return;
  }
  
  // For other GET requests (static assets like CSS, JS, images), try cache-first.
  if (request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).then(networkResponse => {
            // Check if we received a valid response
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              // IMPORTANT: Clone the response. A response is a stream
              // and because we want the browser to consume the response
              // as well as the cache consuming the response, we need
              // to clone it so we have two streams.
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
            }
            return networkResponse;
          }).catch(error => {
            console.error('[Service Worker] Fetch failed; returning offline page if available or error.', error);
            // Optionally, return a custom offline page:
            // return caches.match('/offline.html'); 
            // Or just rethrow the error if no offline page.
            throw error;
          });
        });
      })
    );
  } else {
    // For non-GET requests, just fetch from network.
    event.respondWith(fetch(request));
  }
});

// You can add message listeners here for advanced communication with the client pages
// self.addEventListener('message', event => {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });
