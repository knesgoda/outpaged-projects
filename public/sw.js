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

  const OPQL_CACHE = `outpaged-opql-${APP_VERSION}`;

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

  const OFFLINE_DB_NAME = 'outpaged-offline-opql';
  const OFFLINE_DB_VERSION = 1;
  const ENTITY_STORE = 'entities';
  const QUERY_STORE = 'queries';

  function tokenize(value) {
    if (!value) return [];
    return Array.from(new Set((value.toLowerCase().match(/[a-z0-9]+/g) || []).filter((token) => token.length > 1)));
  }

  function normalizeQueryKey(query) {
    const types = Array.isArray(query.types) ? Array.from(new Set(query.types)).sort() : [];
    const text = (query.text || '').trim().toLowerCase();
    return [`q=${text}`, `project=${query.projectId || ''}`, `types=${types.join(',')}`].join('|');
  }

  function openOfflineIndex() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onerror = () => reject(request.error || new Error('Failed to open offline index'));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ENTITY_STORE)) {
          const store = db.createObjectStore(ENTITY_STORE, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('token', 'tokens', { unique: false, multiEntry: true });
          store.createIndex('updatedAt', 'numericUpdatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(QUERY_STORE)) {
          db.createObjectStore(QUERY_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async function persistOpqlResponse({ query, projectId, types, items, partial, nextCursor }) {
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0 && !partial) {
      return;
    }

    try {
      const db = await openOfflineIndex();
      const tx = db.transaction([ENTITY_STORE, QUERY_STORE], 'readwrite');
      const entityStore = tx.objectStore(ENTITY_STORE);
      const queryStore = tx.objectStore(QUERY_STORE);
      const entityIds = [];
      const now = Date.now();

      for (const item of safeItems) {
        if (!item || !item.id) continue;
        const record = {
          id: String(item.id),
          type: item.type,
          title: item.title,
          snippet: item.snippet || null,
          url: item.url,
          projectId: item.project_id || null,
          updatedAt: item.updated_at || null,
          numericUpdatedAt: item.updated_at ? Date.parse(item.updated_at) : null,
          score: item.score,
          tokens: Array.from(new Set([...tokenize(item.title), ...tokenize(item.snippet)])),
          indexedAt: now,
        };
        entityStore.put(record);
        entityIds.push(record.id);
      }

      const key = normalizeQueryKey({ text: query, projectId: projectId || null, types: types || null });
      queryStore.put({
        key,
        query: { text: query, projectId: projectId || null, types: types || null },
        entityIds,
        partial: Boolean(partial),
        nextCursor: nextCursor || null,
        timestamp: now,
      });

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Offline index transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('Offline index transaction aborted'));
      });
    } catch (error) {
      console.warn('offline-index:store-failed', error);
    }
  }

  async function cacheOpqlResponse(request, response, bodyPromise) {
    const cache = await caches.open(OPQL_CACHE);
    await cache.put(request, response.clone());

    try {
      const body = await bodyPromise;
      if (!body || !body.query) return;
      const payload = await response.clone().json().catch(() => null);
      if (!payload || !Array.isArray(payload.items)) return;
      const meta = {
        query: body.query || body.text || '',
        projectId: body.projectId || (body.context && body.context.projectId) || null,
        types: body.types || (body.context && body.context.types) || null,
        items: payload.items,
        partial: payload.partial,
        nextCursor: payload.nextCursor,
      };
      await persistOpqlResponse(meta);
    } catch (error) {
      console.warn('offline-index:hydrate-failed', error);
    }
  }

  function shouldHandleOpql(url) {
    return url.pathname.includes('/opql');
  }

  workbox.routing.registerRoute(
    ({ request, url }) => request.method === 'POST' && shouldHandleOpql(url),
    async ({ request, event }) => {
      const bodyPromise = request.clone().text().then((text) => {
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch (error) {
          return null;
        }
      });

      try {
        const networkResponse = await fetch(request.clone());
        event.waitUntil(cacheOpqlResponse(request, networkResponse.clone(), bodyPromise));
        return networkResponse;
      } catch (error) {
        const cache = await caches.open(OPQL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    }
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
