import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { globalLoadingAtom, globalErrorAtom } from "@/store/ui";
import {
  getZaloUser,
  getUserDoc,
  createOrUpdateUser,
  updateUserRole,
} from "@/services/auth.service";
import type { UserRole } from "@/types";

export function useAuth() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const setLoading = useSetAtom(globalLoadingAtom);
  const setError = useSetAtom(globalErrorAtom);

  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const zaloUser = await getZaloUser();
      const existingUser = await getUserDoc(zaloUser.id);

      if (existingUser) {
        const updated = await createOrUpdateUser(
          zaloUser.id,
          zaloUser.name,
          zaloUser.avatar,
          existingUser.role
        );
        setCurrentUser(updated);
        return updated;
      }

      const newUser = await createOrUpdateUser(
        zaloUser.id,
        zaloUser.name,
        zaloUser.avatar
      );
      setCurrentUser(newUser);
      return newUser;
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
      return null;
    } finally {
      setLoading(false);
    }
  }, [setCurrentUser, setLoading, setError]);

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

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("hasSeenWelcome");
  }, [setCurrentUser]);

  return { currentUser, login, selectRole, logout };
}
