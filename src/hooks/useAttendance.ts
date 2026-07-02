import { useCallback, useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { myAttendanceAtom, attendanceStepAtom } from "@/store/attendance";
import {
  checkInStudent,
  addPeerVerification,
  updateFaceVerification,
  subscribeToMyAttendance,
  getMyAttendance,
} from "@/services/attendance.service";
import type { FaceVerificationResult, GeoLocation, PeerVerification, QRPayload } from "@/types";

export function useAttendance(sessionId: string | undefined, studentId: string | undefined) {
  const [myAttendance, setMyAttendance] = useAtom(myAttendanceAtom);
  const [step, setStep] = useAtom(attendanceStepAtom);
  // True after the first Firestore snapshot resolves so callers can avoid
  // flashing a stale step (e.g. "scan-teacher") between mount and first sync.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sessionId || !studentId) return;
    setLoaded(false);
    const unsub = subscribeToMyAttendance(sessionId, studentId, (record) => {
      setMyAttendance(record);
      setLoaded(true);
    });
    return unsub;
  }, [sessionId, studentId, setMyAttendance]);

  const checkIn = useCallback(
    async (classId: string, studentName: string, studentMssv: string, qrPayload?: QRPayload, config?: { faceRequired?: boolean; peerRequired?: boolean }, location?: GeoLocation, review?: { needsReview?: boolean; reason?: string }) => {
      if (!sessionId || !studentId) return null;
      const record = await checkInStudent(sessionId, classId, studentId, studentName, studentMssv, qrPayload, location, config, review);
      setMyAttendance(record);
      const faceReq = config?.faceRequired !== false;
      const peerReq = config?.peerRequired !== false;
      if (!faceReq && !peerReq) setStep("done");
      else if (!faceReq) setStep("show-qr");
      else setStep("face-verify");
      return record; // May include hmacSecret from Cloud Function response
    },
    [sessionId, studentId, setMyAttendance, setStep]
  );

  const completeFaceVerification = useCallback(
    async (result: FaceVerificationResult, config?: { peerRequired?: boolean }) => {
      if (!myAttendance) return;
      await updateFaceVerification(myAttendance.id, result);
      const peerReq = config?.peerRequired !== false;
      if (!peerReq) setStep("done");
      else setStep("show-qr");
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

  return { myAttendance, step, setStep, checkIn, completeFaceVerification, addPeer, loaded };
}
