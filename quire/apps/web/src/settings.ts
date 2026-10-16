/**
 * Client settings (R-PLT-03): server URL, optional token and this device's name.
 * Stored in localStorage so they survive reloads; never synced.
 */

export interface Settings {
  /** Base URL of the Quire server, without a trailing slash. */
  serverUrl: string;
  /** Bearer token, empty when the server has none. */
  token: string;
  /** Name shown in history, conflicts and live cursors. */
  device: string;
}

const KEY = 'quire.settings';

const ADJECTIVES = ['amber', 'brave', 'calm', 'eager', 'fuzzy', 'gentle', 'happy', 'jolly', 'keen', 'lucky', 'mellow', 'quiet', 'rapid', 'sunny', 'tidy', 'witty'];
const ANIMALS = ['badger', 'crane', 'dolphin', 'falcon', 'gecko', 'heron', 'koala', 'lynx', 'marten', 'otter', 'panda', 'quail', 'robin', 'seal', 'tapir', 'wren'];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** A random, readable device name such as `calm-otter-42`. */
export function randomDeviceName(): string {
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${Math.floor(Math.random() * 90) + 10}`;
}

export function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function defaultServerUrl(): string {
  const origin = globalThis.location?.origin;
  return origin && /^https?:/.test(origin) ? origin : 'http://localhost:8787';
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  const ls = storage();
  let stored: Partial<Settings> = {};
  try {
    stored = JSON.parse(ls?.getItem(KEY) ?? '{}') as Partial<Settings>;
  } catch {
    stored = {};
  }
  const settings: Settings = {
    serverUrl: trimUrl(stored.serverUrl || defaultServerUrl()),
    token: stored.token ?? '',
    device: stored.device?.trim() || randomDeviceName(),
  };
  // Persist the generated device name so it stays stable across reloads.
  if (!stored.device) saveSettings(settings);
  return settings;
}

export function saveSettings(s: Settings): void {
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...s, serverUrl: trimUrl(s.serverUrl) }));
  } catch {
    // Storage full or disabled: settings stay in memory for this session.
  }
}

/** Small per-browser UI preferences (open folders, pane sizes) that are not settings. */
export function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = storage()?.getItem(`quire.pref.${key}`);
    return v === null || v === undefined ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    storage()?.setItem(`quire.pref.${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}
