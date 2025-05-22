
const CACHE_NAME = 'habitual-cache-v2'; // Incremented version
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png', // Ensure these paths match your actual icon locations
  '/icons/icon-512x512.png',
  // Add paths to critical JS/CSS bundles if known and stable,
  // but Next.js often hashes these, making manual caching tricky.
  // Consider using a Next.js PWA plugin like @ducanh2912/next-pwa for better caching.
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))) // Force reload from network for initial cache
          .catch(error => {
            console.error('[Service Worker] Failed to cache initial assets:', error);
          });
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting(); // Activate new SW immediately
      })
  );
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
    }).then(() => {
      console.log('[Service Worker] Clients claimed');
      return self.clients.claim(); // Take control of all clients
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests (HTML pages), try network first, then cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, clone and cache the response for future offline use.
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache.
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/'); // Fallback to root if specific page not cached
            });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use cache-first strategy.
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        });
      }).catch(error => {
        console.error('[Service Worker] Fetch error:', error);
        // You could return a generic fallback response here for non-critical assets
      })
  );
});

// Placeholder for Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'my-background-sync-tag') {
    console.log('[Service Worker] Background sync event triggered for tag:', event.tag);
    // event.waitUntil(doSomeBackgroundWork());
  }
});

// Placeholder for Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'my-periodic-sync-tag') {
    console.log('[Service Worker] Periodic background sync event triggered for tag:', event.tag);
    // event.waitUntil(doSomePeriodicWork());
  }
});

// Placeholder for Push Notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : 'no data'}"`);
  // const title = 'Habitual Reminder';
  // const options = {
  //   body: event.data ? event.data.text() : 'A new notification!',
  //   icon: '/icons/icon-192x192.png',
  //   badge: '/icons/icon-96x96.png' // Example badge
  // };
  // event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  // event.waitUntil(
  //   clients.openWindow('https://your-app-url.com') // Or a specific URL
  // );
});
