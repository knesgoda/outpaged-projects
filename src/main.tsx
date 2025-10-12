import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[main.tsx] Starting OutPaged application');

if (!(globalThis as { __import_meta_env__?: Record<string, unknown> }).__import_meta_env__) {
  (globalThis as { __import_meta_env__?: Record<string, unknown> }).__import_meta_env__ = {
    ...import.meta.env,
  };
}

console.log('[main.tsx] Creating root and rendering App');
createRoot(document.getElementById('root')!).render(<App />);
console.log('[main.tsx] App rendered successfully');

const SERVICE_WORKER_URL = '/sw.js';

type ServiceWorkerMessage =
  | { type: 'SKIP_WAITING' }
  | { type: 'REPLAY_QUEUED_REQUESTS' };

const postMessageToWorker = (registration: ServiceWorkerRegistration | undefined, message: ServiceWorkerMessage) => {
  const worker = registration?.waiting ?? registration?.active;
  worker?.postMessage(message);
};

if ('serviceWorker' in navigator) {
  let registration: ServiceWorkerRegistration | undefined;
  let controllerChanged = false;
  let updatePromptShown = false;
  const MAX_REGISTRATION_RETRIES = 3;
  const RETRY_DELAY_MS = 4000;

  const promptUserToRefresh = (worker: ServiceWorker | null) => {
    if (!worker || updatePromptShown) return;
    updatePromptShown = true;
    const shouldReload = window.confirm(
      'A new version of OutPaged is available. Reload now to update?'
    );

    if (shouldReload) {
      worker.postMessage({ type: 'SKIP_WAITING' } satisfies ServiceWorkerMessage);
    } else {
      // Allow a later retry when the document becomes visible again
      setTimeout(() => {
        updatePromptShown = false;
      }, 1000 * 60 * 5);
    }
  };

  const listenForUpdates = (reg: ServiceWorkerRegistration) => {
    if (reg.waiting) {
      promptUserToRefresh(reg.waiting);
    }

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          promptUserToRefresh(reg.waiting ?? newWorker);
        }
      });
    });
  };

  const registerServiceWorker = async (retry = 0): Promise<void> => {
    try {
      registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
      listenForUpdates(registration);
    } catch (error) {
      if (retry < MAX_REGISTRATION_RETRIES) {
        setTimeout(() => {
          registerServiceWorker(retry + 1).catch(() => {
            /* Handled by retry recursion */
          });
        }, RETRY_DELAY_MS * (retry + 1));
      } else {
        console.error('Service worker registration failed:', error);
      }
    }
  };

  registerServiceWorker().catch((error) => {
    console.error('Service worker initial registration failed:', error);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controllerChanged) return;
    controllerChanged = true;
    window.location.reload();
  });

  const replayBackgroundSyncQueue = () => {
    postMessageToWorker(registration, { type: 'REPLAY_QUEUED_REQUESTS' });
  };

  window.addEventListener('online', () => {
    if (!registration) {
      void registerServiceWorker();
    }
    replayBackgroundSyncQueue();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      replayBackgroundSyncQueue();
    }
  });
}
