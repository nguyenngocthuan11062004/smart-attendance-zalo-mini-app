import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { globalLoadingAtom, globalErrorAtom } from "@/store/ui";
import {
  signOutUser,
  updateUserRole,
} from "@/services/auth.service";
import type { UserRole } from "@/types";

/**
 * Provides auth actions (selectRole, logout).
 * Auto sign-in is handled by useAuthInit() at the root level.
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const setLoading = useSetAtom(globalLoadingAtom);
  const setError = useSetAtom(globalErrorAtom);

  const selectRole = useCallback(
    async (role: UserRole, mssv?: string) => {
      if (!currentUser) return;
      try {
        setLoading(true);
        await updateUserRole(currentUser.id, role, mssv);
        setCurrentUser({ ...currentUser, role, mssv: mssv || currentUser.mssv, updatedAt: Date.now() });
      } catch (err: any) {
        setError(err.message || "Cap nhat vai tro that bai");
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

  return { currentUser, selectRole, logout };
}
