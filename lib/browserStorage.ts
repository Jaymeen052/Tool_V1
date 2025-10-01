// lib/browserStorage.ts
import { debounce } from './debounce';

const isBrowser = () => typeof window !== 'undefined';

export function readJSON<T = any>(key: string, fallback: T | null = null): T | null {
  if (!isBrowser()) return fallback;
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function _writeJSON(key: string, value: any) {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// debounced writer to avoid UI jank while typing
export const writeJSON = debounce(_writeJSON, 400);

export function clearKeys(keys: string[]) {
  if (!isBrowser()) return;
  try {
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {}
}
