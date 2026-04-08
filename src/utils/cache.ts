/**
 * Async storage cache with TTL support (Zalo SDK storage with localStorage fallback)
 */

import { storageSetItem, storageGetItem, storageRemoveItem } from "@/utils/storage";

const CACHE_PREFIX = "inhust_";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await storageGetItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await storageRemoveItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
    await storageSetItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full or unavailable - silently fail
  }
}

export async function cacheRemove(key: string): Promise<void> {
  await storageRemoveItem(CACHE_PREFIX + key);
}

export async function cacheClearAll(): Promise<void> {
  // Note: Zalo SDK does not expose a way to list keys with a prefix.
  // Fall back to localStorage for prefix-based cleanup (dev mode).
  // In production Zalo environment, individual cacheRemove calls
  // should be used for known keys.
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) {
      await storageRemoveItem(k);
    }
  } catch {
    // localStorage unavailable in Zalo — no-op
  }
}
