
// Basic service worker for caching static assets

const CACHE_NAME = 'habitual-cache-v1';
const urlsToCache = [
  '/',
  // Add paths to your critical static assets here
  // e.g., '/_next/static/...', '/fonts/...', '/icons/...'
  // This list will be populated by Next.js build process for essential chunks
  // For a very basic setup, caching the root and essential icons can be a start.
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add essential assets for offline fallback.
        // Note: Next.js handles its own chunk caching. This is more for PWA shell.
        return cache.addAll(urlsToCache.filter(url => !url.startsWith('/_next/')));
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Basic cache-first strategy for non-Next.js managed assets
  // Next.js has its own caching mechanisms for its build artifacts
  if (!event.request.url.includes('/_next/') && !event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(
            (fetchResponse) => {
              // Check if we received a valid response
              if(!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }

              // IMPORTANT: Clone the response. A response is a stream
              // and because we want the browser to consume the response
              // as well as the cache consuming the response, we need
              // to clone it so we have two streams.
              const responseToCache = fetchResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return fetchResponse;
            }
          );
        })
    );
  }
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
