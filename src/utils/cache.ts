/**
 * Async storage cache with TTL support (Zalo SDK storage with localStorage fallback)
 */

import { storageSetItem, storageGetItem, storageRemoveItem } from "@/utils/storage";

const CACHE_PREFIX = "inhust_";
// Zalo SDK storage không liệt kê được key theo prefix → tự lưu index các key
// đã cache để cacheClearAll() xóa được hết trên Zalo thật (vd logout đổi tài khoản).
const CACHE_INDEX_KEY = `${CACHE_PREFIX}__keys`;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

async function addKeyToIndex(fullKey: string): Promise<void> {
  try {
    const raw = await storageGetItem(CACHE_INDEX_KEY);
    const keys: string[] = raw ? JSON.parse(raw) : [];
    if (!keys.includes(fullKey)) {
      keys.push(fullKey);
      await storageSetItem(CACHE_INDEX_KEY, JSON.stringify(keys));
    }
  } catch {
    // best-effort — index hỏng thì cacheClearAll vẫn quét localStorage
  }
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
    await addKeyToIndex(CACHE_PREFIX + key);
  } catch {
    // storage full or unavailable - silently fail
  }
}

export async function cacheRemove(key: string): Promise<void> {
  await storageRemoveItem(CACHE_PREFIX + key);
}

export async function cacheClearAll(): Promise<void> {
  // 1. Xóa theo index (hoạt động cả trên Zalo SDK storage)
  try {
    const raw = await storageGetItem(CACHE_INDEX_KEY);
    if (raw) {
      const keys: string[] = JSON.parse(raw);
      for (const k of keys) {
        await storageRemoveItem(k);
      }
    }
    await storageRemoveItem(CACHE_INDEX_KEY);
  } catch {
    // ignore
  }
  // 2. Quét thêm localStorage theo prefix (dev mode / fallback)
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) {
      await storageRemoveItem(k);
    }
  } catch {
    // localStorage unavailable in Zalo — no-op
  }
}
