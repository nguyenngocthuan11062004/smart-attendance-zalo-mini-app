import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { functions } from "@/config/firebase";

// Firebase httpsCallable error codes that indicate infrastructure problems
// (CF not deployed, network issue, timeout). These warrant client fallback.
// Business logic errors (invalid-argument, permission-denied, etc.) should
// propagate to the caller so server-side validation is NOT bypassed.
const INFRA_ERROR_CODES = new Set([
  "unavailable",
  "deadline-exceeded",
  "internal",
  "cancelled",
  "unknown",
]);

/**
 * Try calling a Cloud Function. If it fails due to infrastructure issues
 * (not deployed, timeout, network error), run the fallback function instead.
 * Business logic errors from the server (invalid QR, expired, replay, etc.)
 * are re-thrown to prevent bypassing server-side validation.
 */
export async function callWithFallback<TData, TResult>(
  functionName: string,
  data: TData,
  fallback: (data: TData) => Promise<TResult>
): Promise<TResult> {
  try {
    const fn = httpsCallable<TData, TResult>(functions, functionName);
    const result: HttpsCallableResult<TResult> = await fn(data);
    return result.data;
  } catch (err: any) {
    const code = err?.code?.replace("functions/", "") || "";

    // Business logic errors from CF → re-throw, do NOT fallback
    if (code && !INFRA_ERROR_CODES.has(code)) {
      throw err;
    }

    // Infrastructure errors → use client-side fallback
    return fallback(data);
  }
}
