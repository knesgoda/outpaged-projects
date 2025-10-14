// Stub file - original disabled due to type issues
// TODO: Re-enable when SearchResult types are updated

export function createOfflineSearchIndex() {
  console.warn("Offline search is temporarily disabled");
  return null;
}

export function searchOfflineIndex() {
  return [];
}

export function executeOfflineQuery(options: any) {
  return Promise.resolve({ items: [], total: 0, reason: 'disabled' });
}

export function recordOpqlResponse() {
  return Promise.resolve();
}

export function planOfflineQuery() {
  return null;
}

export function isOfflineIndexAvailable() {
  return false;
}

export function normalizeQueryKey(query: string) {
  return query;
}

export function clearOfflineIndex() {
  return Promise.resolve();
}

export type OfflineQueryResult = {
  items: any[];
  total: number;
  reason?: string;
  results?: any[];
};

export type OfflineQueryPlan = any;
export type OfflineQueryKey = string;
