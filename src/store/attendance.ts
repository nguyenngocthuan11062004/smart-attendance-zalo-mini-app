import { atom } from "jotai";
import { effectiveTrustPolicy } from "@/types";
import type { AttendanceDoc, TrustPolicy, FaceVerificationResult } from "@/types";

export const myAttendanceAtom = atom<AttendanceDoc | null>(null);

export const peerCountAtom = atom<number>((get) => {
  const att = get(myAttendanceAtom);
  return att?.peerCount ?? 0;
});

export const trustPolicyAtom = atom<TrustPolicy>((get) => {
  const att = get(myAttendanceAtom);
  if (!att) return "absent";
  return effectiveTrustPolicy(att);
});

export type AttendanceStep = "idle" | "scan-teacher" | "face-verify" | "show-qr" | "scan-peers" | "done";
export const attendanceStepAtom = atom<AttendanceStep>("idle");

export const faceVerificationResultAtom = atom<FaceVerificationResult | null>(null);
