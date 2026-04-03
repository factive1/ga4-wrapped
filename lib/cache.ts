/**
 * Simple TTL-based in-memory cache. Used by both the GA4 report layer
 * and the Admin API property list to avoid redundant API calls.
 */

interface CacheEntry<T> {
  data: T
  expires: number
}

export function createTTLCache<T>(maxSize: number) {
  const store = new Map<string, CacheEntry<T>>()

  function get(key: string): T | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expires) {
      store.delete(key)
      return undefined
    }
    return entry.data
  }

  function set(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expires: Date.now() + ttlMs })
    if (store.size > maxSize) {
      const now = Date.now()
      for (const [k, v] of store) {
        if (now > v.expires) store.delete(k)
      }
    }
  }

  return { get, set }
}
