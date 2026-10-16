/**
 * Client side of R-PLT-06: register the worker built by plugin.ts and keep track of a new
 * version that waits for the person to accept it.
 */

type Listener = () => void;

let waiting: ServiceWorker | null = null;
let accepted = false;
const listeners = new Set<Listener>();

function setWaiting(worker: ServiceWorker | null): void {
  if (waiting === worker) return;
  waiting = worker;
  for (const l of listeners) l();
}

/** The worker of a new version that is installed and waiting, or null. */
export function waitingWorker(): ServiceWorker | null {
  return waiting;
}

export function onWaitingChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tell the waiting worker to take over; the page reloads once it controls it (once). */
export function applyUpdate(): void {
  const worker = waiting;
  if (!worker) return;
  accepted = true;
  worker.postMessage({ type: 'SKIP_WAITING' });
}

/** Production builds on http(s) only: Capacitor's own scheme already bundles the app. */
export function offlineSupported(): boolean {
  return import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);
}

export function registerOffline(): void {
  if (!offlineSupported()) return;
  const sw = navigator.serviceWorker;
  let reloaded = false;
  sw.addEventListener('controllerchange', () => {
    if (!accepted || reloaded) return;
    reloaded = true;
    location.reload();
  });
  const start = () => {
    sw.register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          const check = () => {
            // With no controller this is the first install, which activates by itself.
            if (worker.state === 'installed' && sw.controller) setWaiting(worker);
            if (worker.state === 'redundant' && waiting === worker) setWaiting(null);
          };
          worker.addEventListener('statechange', check);
          check();
        };
        watch(reg.waiting);
        reg.addEventListener('updatefound', () => watch(reg.installing));
        // A long-lived tab asks for a new version whenever it comes back into view.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => {});
        });
      })
      .catch(() => {
        // No worker (private window, blocked): the app simply needs the network to start.
      });
  };
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}
