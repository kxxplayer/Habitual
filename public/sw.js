
// public/sw.js
const CACHE_NAME = 'habitual-cache-v2'; // Increment cache version
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Key CSS and JS chunks (actual names depend on your Next.js build output)
  // You'd typically get these names from a build manifest if using a PWA library
  // For manual setup, you might inspect network tab after first load or add common ones.
  // '/_next/static/css/main.css', // Example, actual name will vary
  // '/_next/static/chunks/main.js', // Example, actual name will vary
  // '/_next/static/chunks/webpack.js', // Example
  // '/_next/static/chunks/framework.js', // Example
  // '/_next/static/chunks/pages/_app.js', // Example
  // '/_next/static/chunks/pages/index.js', // Example for the main page
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other important static assets or page routes you want to cache
  // e.g., '/auth/login', '/auth/register', '/profile', '/calendar'
  // Be cautious with caching dynamic content or API routes without a proper strategy.
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Using addAll. If any request fails, the whole operation fails.
        // For more resilience, you might cache individually and ignore errors for non-critical assets.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('Service Worker: Install complete');
        return self.skipWaiting(); // Force the waiting service worker to become the active service worker.
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell during install', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activate complete, now controlling client.');
      return self.clients.claim(); // Become the controller for all clients within its scope.
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests, try network first, then cache (Network-first strategy for HTML)
  // This ensures users get the latest HTML if online, but still have offline access.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network is available, cache the response and return it
          if (response && response.ok) { // Ensure response is valid before caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/'); // Fallback to root page if specific page not cached
            });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use Cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Cache hit - return response
          return response;
        }
        // Not in cache, fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 /*|| networkResponse.type !== 'basic'*/) {
              // Allowing non-basic types for cross-origin resources like fonts if needed
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed for', event.request.url, error);
          // Optionally, return a fallback image or asset here if appropriate
        });
      })
  );
});

// Placeholder for Background Sync API
// self.addEventListener('sync', (event) => {
//   if (event.tag === 'my-background-sync-tag') {
//     console.log('Service Worker: Background sync event received for', event.tag);
//     // event.waitUntil(doSomeBackgroundSyncOperation());
//   }
// });

// Placeholder for Periodic Background Sync API
// self.addEventListener('periodicsync', (event) => {
//   if (event.tag === 'my-periodic-sync-tag') {
//     console.log('Service Worker: Periodic sync event received for', event.tag);
//     // event.waitUntil(doSomePeriodicSyncOperation());
//   }
// });

// Placeholder for Push API
// self.addEventListener('push', (event) => {
//   console.log('Service Worker: Push message received.', event.data.text());
//   const title = 'Habitual Reminder';
//   const options = {
//     body: event.data.text(),
//     icon: '/icons/icon-192x192.png',
//     badge: '/icons/icon-96x96.png' // Or other appropriate badge
//   };
//   event.waitUntil(self.registration.showNotification(title, options));
// });

// Placeholder for Notification Click
// self.addEventListener('notificationclick', (event) => {
//   console.log('Service Worker: Notification clicked.');
//   event.notification.close();
//   // Example: Focus an open window or open a new one
//   // event.waitUntil(
//   //   clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
//   //     if (clientList.length > 0) {
//   //       let client = clientList[0];
//   //       for (let i = 0; i < clientList.length; i++) {
//   //         if (clientList[i].focused) {
//   //           client = clientList[i];
//   //         }
//   //       }
//   //       return client.focus();
//   //     }
//   //     return clients.openWindow('/');
//   //   })
//   // );
// });
