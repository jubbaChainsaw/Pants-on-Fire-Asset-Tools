export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface StorageSaveResult {
  ok: boolean;
  reason?: 'quota' | 'unavailable' | 'unknown';
}

function detectStorageErrorReason(error: unknown): StorageSaveResult['reason'] {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'quota';
  }
  return 'unknown';
}

export function trySaveToStorage<T>(key: string, value: T): StorageSaveResult {
  if (typeof window === 'undefined') return { ok: false, reason: 'unavailable' };

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    // Prevent quota/serialization crashes from breaking the entire app.
    console.warn(`[Storage] Failed to save key "${key}"`, error);
    return { ok: false, reason: detectStorageErrorReason(error) };
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  void trySaveToStorage(key, value);
}
