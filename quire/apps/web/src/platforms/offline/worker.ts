/**
 * The service worker, written by hand (no library). The build plugin (plugin.ts) replaces
 * `__BUILD__` and `__FILES__` and emits the result as `sw.js`. Kept as a string because the
 * worker is a separate script that must not go through the app bundle.
 */
export const WORKER_SOURCE = `'use strict';
const BUILD = __BUILD__;
const FILES = __FILES__;
const PREFIX = 'quire-app-';
const CACHE = PREFIX + BUILD;
const SCOPE = self.registration.scope;
const url = (file) => new URL(file, SCOPE).href;
const SHELL = url('index.html');
const NEVER = [new URL('api/', SCOPE).pathname, new URL('live', SCOPE).pathname];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(url(f), { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (NEVER.some((p) => u.pathname === p || u.pathname.startsWith(p.endsWith('/') ? p : p + '/'))) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(
        (res) => (res.status >= 500 ? caches.match(SHELL, { cacheName: CACHE }).then((hit) => hit || res) : res),
        () => caches.match(SHELL, { cacheName: CACHE }).then((hit) => hit || Response.error()),
      ),
    );
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
`;
