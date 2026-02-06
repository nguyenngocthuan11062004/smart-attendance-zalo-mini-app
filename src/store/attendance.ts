import { atom } from "jotai";
import { computeTrustScore } from "@/types";
import type { AttendanceDoc, TrustScore } from "@/types";

export const myAttendanceAtom = atom<AttendanceDoc | null>(null);

export const peerCountAtom = atom<number>((get) => {
  const att = get(myAttendanceAtom);
  return att?.peerCount ?? 0;
});

export const trustScoreAtom = atom<TrustScore>((get) => {
  const att = get(myAttendanceAtom);
  if (!att) return "absent";
  if (att.teacherOverride) return att.teacherOverride === "present" ? "present" : "absent";
  return computeTrustScore(att.peerCount);
});

export type AttendanceStep = "idle" | "scan-teacher" | "show-qr" | "scan-peers" | "done";
export const attendanceStepAtom = atom<AttendanceStep>("idle");
