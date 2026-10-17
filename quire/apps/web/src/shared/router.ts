import { useSyncExternalStore } from 'react';

export type Route = { kind: 'none' } | { kind: 'note'; path: string; heading?: string } | { kind: 'tag'; tag: string } | { kind: 'graph' };

/** Hash of the global graph view (R-NAV-08). Never a note path: notes end in `.md`. */
export const GRAPH_HASH = '#/~graph';

function decode(s: string, fn: (s: string) => string): string {
  try {
    return fn(s);
  } catch {
    return s;
  }
}

/** `#/<path>` opens a note, `#/<path>#<heading>` a heading in it, `#/tag/<tag>` searches a tag. */
export function parseHash(hash: string): Route {
  if (!hash.startsWith('#/')) return { kind: 'none' };
  const rest = hash.slice(2);
  const at = rest.indexOf('#');
  const rawPath = at < 0 ? rest : rest.slice(0, at);
  const path = decode(rawPath, decodeURIComponent);
  if (!path) return { kind: 'none' };
  if (path === '~graph') return { kind: 'graph' };
  if (path.startsWith('tag/') && !path.toLowerCase().endsWith('.md')) return { kind: 'tag', tag: path.slice(4) };
  const route: Route = { kind: 'note', path };
  if (at >= 0 && rest.length > at + 1) route.heading = decode(rest.slice(at + 1), decodeURIComponent);
  return route;
}

export function noteHash(path: string, heading?: string): string {
  const p = encodeURI(path).replace(/#/g, '%23').replace(/\?/g, '%3F');
  return `#/${p}${heading ? '#' + encodeURIComponent(heading) : ''}`;
}

export function navigate(path: string, heading?: string): void {
  const h = noteHash(path, heading);
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = h;
}

export function clearRoute(): void {
  history.pushState(null, '', location.pathname + location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};

let cachedHash: string | null = null;
let cachedRoute: Route = { kind: 'none' };
let tick = 0;
let cachedTick = -1;
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => tick++, true);

/** Current route; a new object on every hashchange, so navigating to the same note re-scrolls. */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => {
    if (cachedHash !== location.hash || cachedTick !== tick) {
      cachedHash = location.hash;
      cachedTick = tick;
      cachedRoute = parseHash(location.hash);
    }
    return cachedRoute;
  });
}
