import { clearSessionEncryptionState } from "./crypto";
import { clearOfflineStorage } from "./indexedDbQueue";
import { clearOfflineIndex } from "./opqlIndex";
import { REMOTE_WIPE_ACK_STORAGE_KEY } from "./types";

export interface RemoteWipeEvent {
  reason?: string;
  token?: string;
  timestamp: number;
}

interface RemoteWipeOptions {
  reason?: string;
  token?: string;
  skipBroadcast?: boolean;
}

const REMOTE_WIPE_CHANNEL = "outpaged-remote-wipe";
const REMOTE_WIPE_BROADCAST_KEY = "outpaged-remote-wipe-broadcast";

const listeners = new Set<(event: RemoteWipeEvent) => void>();
let broadcastChannel: BroadcastChannel | null = null;
let listenersInitialized = false;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(REMOTE_WIPE_CHANNEL);
    broadcastChannel.onmessage = (event) => {
      const payload = event.data as RemoteWipeEvent | undefined;
      if (!payload) return;
      void performRemoteWipe({ ...payload, skipBroadcast: true });
    };
  }
  return broadcastChannel;
}

function postStorageBroadcast(event: RemoteWipeEvent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      REMOTE_WIPE_BROADCAST_KEY,
      JSON.stringify({ ...event, at: Date.now() })
    );
  } catch {
    // ignore storage write errors
  }
}

async function purgeCaches() {
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (error) {
      console.warn("Failed to clear caches during remote wipe", error);
    }
  }
}

async function unregisterServiceWorkers() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn("Failed to unregister service workers during remote wipe", error);
  }
}

function notify(event: RemoteWipeEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function broadcast(event: RemoteWipeEvent) {
  const channel = getBroadcastChannel();
  channel?.postMessage(event);
  postStorageBroadcast(event);
}

export async function performRemoteWipe(options: RemoteWipeOptions = {}): Promise<void> {
  const event: RemoteWipeEvent = {
    reason: options.reason,
    token: options.token,
    timestamp: Date.now(),
  };

  await clearOfflineStorage();
  await clearOfflineIndex();
  clearSessionEncryptionState();
  await purgeCaches();
  await unregisterServiceWorkers();

  if (!options.skipBroadcast) {
    broadcast(event);
  }

  notify(event);
}

export function onRemoteWipe(listener: (event: RemoteWipeEvent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initializeRemoteWipeListeners(): void {
  if (listenersInitialized || typeof window === "undefined") return;
  listenersInitialized = true;

  getBroadcastChannel();

  window.addEventListener("storage", (event) => {
    if (event.key === REMOTE_WIPE_BROADCAST_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as RemoteWipeEvent & { at?: number };
        if (parsed.token && parsed.token === window.localStorage.getItem(REMOTE_WIPE_ACK_STORAGE_KEY)) {
          return;
        }
        void performRemoteWipe({ reason: parsed.reason, token: parsed.token, skipBroadcast: true });
      } catch (error) {
        console.warn("Failed to parse remote wipe storage event", error);
      }
    }
  });
}
