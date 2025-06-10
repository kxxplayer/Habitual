// public/sw.js
const CACHE_NAME = 'habitual-cache-v4'; // Incremented version for the fix
const ESSENTIAL_ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const NETWORK_ONLY_PATTERNS = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /www\.googleapis\.com/,
  /maps\.googleapis\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

// Install event: cache essential assets
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker V${CACHE_NAME.split('-v')[1] || 'unknown'}] Install event fired.`);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[ServiceWorker] Caching essential assets...');
        
        // Cache assets individually to handle potential failures
        for (const asset of ESSENTIAL_ASSETS_TO_CACHE) {
          try {
            await cache.add(asset);
            console.log(`[ServiceWorker] Successfully cached: ${asset}`);
          } catch (error) {
            console.warn(`[ServiceWorker] Failed to cache ${asset}:`, error.message);
            // Continue with other assets even if one fails
          }
        }
        
        console.log('[ServiceWorker] Essential assets caching completed.');
        await self.skipWaiting();
        console.log('[ServiceWorker] Installation successful, skipWaiting() called.');
      } catch (error) {
        console.error('[ServiceWorker] Installation failed:', error);
        throw error;
      }
    })()
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker V${CACHE_NAME.split('-v')[1] || 'unknown'}] Activate event fired.`);
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        console.log('[ServiceWorker] Current caches:', cacheNames);
        
        const deletionPromises = cacheNames
          .filter(cacheName => cacheName.startsWith('habitual-cache-') && cacheName !== CACHE_NAME)
          .map(async (cacheName) => {
            console.log(`[ServiceWorker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletionPromises);
        console.log('[ServiceWorker] Old caches cleaned up.');
        
        await self.clients.claim();
        console.log('[ServiceWorker] Clients claimed. Activation complete.');
      } catch (error) {
        console.error('[ServiceWorker] Activation failed:', error);
      }
    })()
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip network-only patterns
  if (NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.error(`[ServiceWorker] Fetch failed for ${request.url}:`, error);
        
        // Return offline fallback for navigation requests
        if (request.destination === 'document') {
          return new Response('App is offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }
        
        throw error;
      }
    })()
  );
});