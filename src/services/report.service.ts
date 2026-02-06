import { getSessionAttendance } from "./attendance.service";
import type { AttendanceDoc, TrustScore } from "@/types";

export interface SessionReport {
  total: number;
  present: number;
  review: number;
  absent: number;
  records: AttendanceDoc[];
}

export async function getSessionReport(sessionId: string): Promise<SessionReport> {
  const records = await getSessionAttendance(sessionId);
  return {
    total: records.length,
    present: records.filter((r) => r.trustScore === "present").length,
    review: records.filter((r) => r.trustScore === "review").length,
    absent: records.filter((r) => r.trustScore === "absent").length,
    records,
  };
}
