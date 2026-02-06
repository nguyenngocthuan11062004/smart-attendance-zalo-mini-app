import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { globalLoadingAtom, globalErrorAtom } from "@/store/ui";
import {
  signInWithGoogle,
  signOutUser,
  updateUserRole,
  loadOrCreateUserDoc,
} from "@/services/auth.service";
import type { UserRole } from "@/types";

/**
 * Provides auth actions (login, selectRole, logout).
 * Auth state initialization is handled by useAuthInit() at the root level.
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const setLoading = useSetAtom(globalLoadingAtom);
  const setError = useSetAtom(globalErrorAtom);
  const setAuthInitialized = useSetAtom(authInitializedAtom);

  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const firebaseUser = await signInWithGoogle(); // Opens popup, no page reload
      const userDoc = await loadOrCreateUserDoc(firebaseUser);
      setCurrentUser(userDoc);
      setAuthInitialized(true);
    } catch (err: any) {
      console.error("[Auth] login error:", err.code, err.message);
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentUser, setAuthInitialized]);

  const selectRole = useCallback(
    async (role: UserRole) => {
      if (!currentUser) return;
      try {
        setLoading(true);
        await updateUserRole(currentUser.id, role);
        setCurrentUser({ ...currentUser, role, updatedAt: Date.now() });
      } catch (err: any) {
        setError(err.message || "Cập nhật vai trò thất bại");
      } finally {
        setLoading(false);
      }
    },
    [currentUser, setCurrentUser, setLoading, setError]
  );

  const logout = useCallback(async () => {
    await signOutUser();
    setCurrentUser(null);
  }, [setCurrentUser]);

  return { currentUser, login, selectRole, logout };
}
