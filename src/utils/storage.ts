/**
 * Async storage wrapper using Zalo SDK storage APIs with localStorage fallback.
 *
 * Zalo Mini App does NOT support browser localStorage directly.
 * This module wraps Zalo SDK's setStorage/getStorage/removeStorage (async)
 * and falls back to localStorage for browser dev mode.
 */
import {
  setStorage,
  getStorage,
  removeStorage,
} from "zmp-sdk/apis";

export async function storageSetItem(key: string, value: string): Promise<void> {
  try {
    await setStorage({ data: { [key]: value } });
  } catch {
    localStorage.setItem(key, value);
  }
}

export async function storageGetItem(key: string): Promise<string | null> {
  try {
    const result = await getStorage({ keys: [key] });
    const val = result[key];
    return val !== undefined && val !== null ? String(val) : null;
  } catch {
    return localStorage.getItem(key);
  }
}

export async function storageRemoveItem(key: string): Promise<void> {
  try {
    await removeStorage({ keys: [key] });
  } catch {
    localStorage.removeItem(key);
  }
}
