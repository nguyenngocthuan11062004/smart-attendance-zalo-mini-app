import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { globalLoadingAtom, globalErrorAtom } from "@/store/ui";
import {
  signOutUser,
  updateUserRole,
  requestTeacherRole,
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
        if (role === "teacher") {
          // Teacher role must be assigned server-side
          await requestTeacherRole(currentUser.id);
        } else {
          await updateUserRole(currentUser.id, role, mssv);
        }
        setCurrentUser({ ...currentUser, role, mssv: mssv || currentUser.mssv, updatedAt: Date.now() });
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

  return { currentUser, selectRole, logout };
}
