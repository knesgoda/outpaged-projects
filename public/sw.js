// Service Worker for OutPaged PWA
// Offline-first with background sync and cache management

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `outpaged-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `outpaged-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/pwa-icon.svg',
];

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached || new Response('Offline', { status: 503 }));

          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Navigation: shell + offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        }
        return response;
      }))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});

// Background sync: replay queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-queue') {
    event.waitUntil(replayQueue());
  }
});

// Message: manual sync trigger
self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPLAY_QUEUED_REQUESTS') {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  // Stub: actual queue replay handled by IndexedDB in app layer
  // This just signals the clients to check
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_TRIGGERED' });
  });
}
