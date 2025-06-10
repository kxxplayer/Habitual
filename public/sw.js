// public/sw.js
const CACHE_NAME = 'habitual-cache-v3'; // Incremented version
const ESSENTIAL_ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png', // A key icon
  '/icons/icon-512x512.png', // Another key icon
  // Add other truly essential, small, and guaranteed-to-exist assets here.
  // Avoid adding Next.js chunk files here unless their names are stable across builds,
  // or use a more advanced caching strategy (e.g., Workbox) for them.
];

// List of assets that are less critical or might change more often.
// We will try to cache these but won't fail installation if they are missing.
const OPTIONAL_ASSETS_TO_CACHE = [
  '/icons/icon-72x72.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-384x384.png', // Consider if this exists or is needed
  '/icons/apple-touch-icon.png',
];

const NETWORK_ONLY_PATTERNS = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /www\.googleapis\.com/,
  /maps\.googleapis\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  // Add regex for your Genkit API if it's on a different domain
  // e.g., /api\.your-genkit-service\.com/
];

// Install event: cache essential assets and prepare the new service worker.
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker V${CACHE_NAME.split('-v')[1] || 'unknown'}] Install event fired.`);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[ServiceWorker] Caching essential assets...');
        await cache.addAll(ESSENTIAL_ASSETS_TO_CACHE.filter(Boolean)); // Filter out any potential empty strings
        console.log('[ServiceWorker] Essential assets cached.');

        // Attempt to cache optional assets without failing the installation
        // console.log('[ServiceWorker] Attempting to cache optional assets...');
        // try {
        //   await cache.addAll(OPTIONAL_ASSETS_TO_CACHE.filter(Boolean));
        //   console.log('[ServiceWorker] Optional assets cached.');
        // } catch (optionalError) {
        //   console.warn('[ServiceWorker] Failed to cache some optional assets:', optionalError);
        // }

        // Force the waiting service worker to become the active service worker.
        await self.skipWaiting();
        console.log('[ServiceWorker] Installation successful, skipWaiting() called.');
      } catch (error) {
        console.error('[ServiceWorker] Caching essential assets failed during install:', error);
        // If essential caching fails, the SW installation should ideally not complete.
        // Throwing an error here will cause the registration promise to reject if not handled by the browser differently.
        throw error;
      }
    })()
  );
});

// Activate event: clean up old caches and take control of clients.
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker V${CACHE_NAME.split('-v')[1] || 'unknown'}] Activate event fired.`);
  event.waitUntil(
    (async () => {
      try {
        const cacheWhitelist = [CACHE_NAME];
        const cacheNames = await caches.keys();
        
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              await caches.delete(cacheName);
            }
          })
        );
        console.log('[ServiceWorker] Old caches cleaned up.');

        // Take control of all open clients without requiring a reload.
        await self.clients.claim();
        console.log('[ServiceWorker] Clients claimed. Activation complete.');
      } catch (error) {
        console.error('[ServiceWorker] Activation failed:', error);
        throw error;
      }
    })()
  );
});

// Fetch event: handle network requests, serving from cache when appropriate.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch from network for specific domains/patterns (APIs, auth, etc.)
  if (NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(url.hostname) || pattern.test(url.href))) {
    // console.log(`[ServiceWorker] Network-only fetch for: ${event.request.url}`);
    event.respondWith(fetch(event.request));
    return;
  }

  // For GET requests, use a cache-first strategy.
  if (event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            // console.log(`[ServiceWorker] Serving from cache: ${event.request.url}`);
            return cachedResponse;
          }

          // console.log(`[ServiceWorker] Serving from network: ${event.request.url}`);
          const networkResponse = await fetch(event.request);

          // Optional: Dynamically cache successful GET responses for assets
          // if (networkResponse && networkResponse.status === 200) {
          //   // Example: Cache only if it's one of the known assets to avoid caching everything
          //   const allKnownAssets = [...ESSENTIAL_ASSETS_TO_CACHE, ...OPTIONAL_ASSETS_TO_CACHE];
          //   if (allKnownAssets.includes(url.pathname)) {
          //     const responseToCache = networkResponse.clone();
          //     const cache = await caches.open(CACHE_NAME);
          //     await cache.put(event.request, responseToCache);
          //     // console.log(`[ServiceWorker] Cached new resource from network: ${event.request.url}`);
          //   }
          // }
          return networkResponse;
        } catch (error) {
          console.error(`[ServiceWorker] Fetch error for ${event.request.url}:`, error);
          // Optional: Respond with a fallback page for navigation requests if offline.
          // For example, if (event.request.mode === 'navigate') return caches.match('/offline.html');
          // For now, just let the browser handle the error (e.g., show its offline page).
          throw error;
        }
      })()
    );
  } else {
    // For non-GET requests (POST, PUT, DELETE, etc.), always fetch from the network.
    // console.log(`[ServiceWorker] Network fetch (non-GET) for: ${event.request.url}`);
    event.respondWith(fetch(event.request));
  }
});
