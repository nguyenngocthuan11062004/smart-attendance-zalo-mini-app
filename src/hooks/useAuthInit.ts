import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { initAuthState } from "@/services/auth.service";

/**
 * Initializes auth state at the app root level.
 * Restores from localStorage or auto sign-in with Zalo SDK.
 * Must be called inside JotaiProvider, only once (in layout).
 */
export function useAuthInit() {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setAuthInitialized = useSetAtom(authInitializedAtom);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = initAuthState((userDoc, initialized) => {
      if (!mounted) return;
      setCurrentUser(userDoc);
      if (initialized) setAuthInitialized(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setCurrentUser, setAuthInitialized]);
}
