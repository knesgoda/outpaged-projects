/* eslint-disable no-restricted-globals */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (!self.workbox) {
  console.error('Workbox failed to load.');
} else {
  const APP_VERSION = 'v1';
  const { workbox } = self;

  workbox.core.clientsClaim();
  workbox.core.setCacheNameDetails({
    prefix: 'outpaged',
    suffix: APP_VERSION,
    precache: 'app-shell',
    runtime: 'runtime'
  });

  const APP_SHELL = [
    { url: '/', revision: APP_VERSION },
    { url: '/index.html', revision: APP_VERSION },
    { url: '/manifest.json', revision: APP_VERSION },
    { url: '/offline.html', revision: APP_VERSION },
    { url: '/favicon.ico', revision: APP_VERSION },
    { url: '/pwa-icon.svg', revision: APP_VERSION },
    { url: '/pwa-icon-maskable.svg', revision: APP_VERSION },
    { url: '/pwa-screenshot-wide.svg', revision: APP_VERSION },
    { url: '/pwa-screenshot-narrow.svg', revision: APP_VERSION }
  ];

  workbox.precaching.precacheAndRoute(APP_SHELL);
  workbox.precaching.cleanupOutdatedCaches();

  const pageStrategy = new workbox.strategies.NetworkFirst({
    cacheName: `outpaged-pages-${APP_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        purgeOnQuotaError: true
      })
    ]
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (options) => {
      try {
        const response = await pageStrategy.handle(options);
        if (!response) {
          throw new Error('No response from network or cache');
        }
        return response;
      } catch (error) {
        return caches.match('/offline.html');
      }
    }
  );

  const assetStrategy = new workbox.strategies.StaleWhileRevalidate({
    cacheName: `outpaged-assets-${APP_VERSION}`,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true
      })
    ]
  });

  workbox.routing.registerRoute(
    ({ request }) => ['style', 'script', 'image', 'font'].includes(request.destination),
    assetStrategy
  );

  const apiCache = new workbox.strategies.StaleWhileRevalidate({
    cacheName: `outpaged-api-${APP_VERSION}`,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 15
      })
    ]
  });

  workbox.routing.registerRoute(
    ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api'),
    apiCache
  );

  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin(
    `outpaged-api-queue-${APP_VERSION}`,
    {
      maxRetentionTime: 24 * 60, // Retry for up to 24 hours
    }
  );

  const queueStrategy = new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin]
  });

  const queueRoute = new workbox.routing.Route(
    ({ request, url }) =>
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && url.pathname.startsWith('/api'),
    async (options) => {
      try {
        return await queueStrategy.handle(options);
      } catch (error) {
        return new Response(
          JSON.stringify({ queued: true, offline: true }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
  );

  workbox.routing.registerRoute(queueRoute);

  self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'REPLAY_QUEUED_REQUESTS') {
      event.waitUntil(bgSyncPlugin.queue.replayRequests());
    }
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
}
