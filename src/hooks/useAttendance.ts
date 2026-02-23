import { useCallback, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { myAttendanceAtom, attendanceStepAtom } from "@/store/attendance";
import {
  checkInStudent,
  addPeerVerification,
  updateFaceVerification,
  subscribeToMyAttendance,
  getMyAttendance,
} from "@/services/attendance.service";
import type { FaceVerificationResult, PeerVerification, QRPayload } from "@/types";

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
    async (classId: string, studentName: string, qrPayload?: QRPayload) => {
      if (!sessionId || !studentId) return null;
      const record = await checkInStudent(sessionId, classId, studentId, studentName, qrPayload);
      setMyAttendance(record);
      setStep("face-verify");
      return record;
    },
    [sessionId, studentId, setMyAttendance, setStep]
  );

  const completeFaceVerification = useCallback(
    async (result: FaceVerificationResult) => {
      if (!myAttendance) return;
      await updateFaceVerification(myAttendance.id, result);
      setStep("show-qr");
    },
    [myAttendance, setStep]
  );

  const addPeer = useCallback(
    async (peer: PeerVerification) => {
      if (!myAttendance) return;
      await addPeerVerification(myAttendance.id, peer);
    },
    [myAttendance]
  );

  return { myAttendance, step, setStep, checkIn, completeFaceVerification, addPeer };
}
