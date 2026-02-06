import { useCallback, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { myAttendanceAtom, attendanceStepAtom } from "@/store/attendance";
import {
  checkInStudent,
  addPeerVerification,
  subscribeToMyAttendance,
  getMyAttendance,
} from "@/services/attendance.service";
import type { PeerVerification } from "@/types";

export function useAttendance(sessionId: string | undefined, studentId: string | undefined) {
  const [myAttendance, setMyAttendance] = useAtom(myAttendanceAtom);
  const [step, setStep] = useAtom(attendanceStepAtom);

  useEffect(() => {
    if (!sessionId || !studentId) return;
    const unsub = subscribeToMyAttendance(sessionId, studentId, (record) => {
      setMyAttendance(record);
    });
    return unsub;
  }, [sessionId, studentId, setMyAttendance]);

  const checkIn = useCallback(
    async (classId: string, studentName: string) => {
      if (!sessionId || !studentId) return null;
      const record = await checkInStudent(sessionId, classId, studentId, studentName);
      setMyAttendance(record);
      setStep("show-qr");
      return record;
    },
    [sessionId, studentId, setMyAttendance, setStep]
  );

  const addPeer = useCallback(
    async (peer: PeerVerification) => {
      if (!myAttendance) return;
      await addPeerVerification(myAttendance.id, peer);
    },
    [myAttendance]
  );

  return { myAttendance, step, setStep, checkIn, addPeer };
}
