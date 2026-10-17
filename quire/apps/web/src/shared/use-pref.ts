import { useEffect, useState } from 'react';

/** useState persisted in localStorage under `quire.pref.<key>`. */
export function usePref<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => loadPref(key, fallback));
  useEffect(() => savePref(key, value), [key, value]);
  return [value, setValue];
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

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
