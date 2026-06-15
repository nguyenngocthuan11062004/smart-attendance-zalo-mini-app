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
import type { UserRole, UserDoc } from "@/types";

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
    // userOverride: dùng user vừa signIn() trong cùng tick (closure currentUser còn null)
    async (role: UserRole, mssv?: string, userOverride?: UserDoc) => {
      const u = userOverride ?? currentUser;
      if (!u) return;
      try {
        setLoading(true);
        if (role === "teacher") {
          // Teacher role must be assigned server-side
          await requestTeacherRole(u.id);
        } else {
          await updateUserRole(u.id, role, mssv);
        }
        setCurrentUser({ ...u, role, mssv: mssv || u.mssv, updatedAt: Date.now() });
      } catch (err: any) {
        setError(err.message || "Cập nhật vai trò thất bại");
      } finally {
        setLoading(false);
      }
    },
    [currentUser, setCurrentUser, setLoading, setError]
  );

  const logout = useCallback(async () => {
    await signOutUser(currentUser?.id);
    // Reset tất cả atoms
    setCurrentUser(null);
    setSession(null);
    setAttendance(null);
    setStep("idle");
    setClassList([]);
    setSelectedClass(null);
    setLoading(false);
    setError(null);
  }, [currentUser?.id, setCurrentUser, setSession, setAttendance, setStep, setClassList, setSelectedClass, setLoading, setError]);

  return { currentUser, selectRole, logout };
}
