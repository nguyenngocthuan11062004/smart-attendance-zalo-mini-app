import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import {
  listenAuthState,
  loadOrCreateUserDoc,
} from "@/services/auth.service";

/**
 * Initializes Firebase Auth state at the app root level.
 * Must be called inside JotaiProvider, only once (in layout).
 */
export function useAuthInit() {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setAuthInitialized = useSetAtom(authInitializedAtom);

  useEffect(() => {
    let mounted = true;

    // Listen to Firebase Auth state (handles page reload / persistence)
    const unsubscribe = listenAuthState(async (firebaseUser) => {
      if (!mounted) return;
      if (firebaseUser) {
        const userDoc = await loadOrCreateUserDoc(firebaseUser);
        if (mounted) {
          setCurrentUser(userDoc);
          setAuthInitialized(true);
        }
      } else {
        setCurrentUser(null);
        setAuthInitialized(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setCurrentUser, setAuthInitialized]);
}
