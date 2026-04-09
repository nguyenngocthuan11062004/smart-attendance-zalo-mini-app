import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { activeSessionAtom } from "@/store/session";
import { myAttendanceAtom, attendanceStepAtom } from "@/store/attendance";
import { classListAtom, selectedClassAtom } from "@/store/classes";
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
  const setSession = useSetAtom(activeSessionAtom);
  const setAttendance = useSetAtom(myAttendanceAtom);
  const setStep = useSetAtom(attendanceStepAtom);
  const setClassList = useSetAtom(classListAtom);
  const setSelectedClass = useSetAtom(selectedClassAtom);

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
    // Reset tất cả atoms
    setCurrentUser(null);
    setSession(null);
    setAttendance(null);
    setStep("idle");
    setClassList([]);
    setSelectedClass(null);
    setLoading(false);
    setError(null);
  }, [setCurrentUser, setSession, setAttendance, setStep, setClassList, setSelectedClass, setLoading, setError]);

  return { currentUser, selectRole, logout };
}
