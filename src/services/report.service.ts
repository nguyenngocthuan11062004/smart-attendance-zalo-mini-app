import { getSessionAttendance } from "./attendance.service";
import type { AttendanceDoc, TrustPolicy } from "@/types";

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
    present: records.filter((r) => r.trustPolicy === "present").length,
    review: records.filter((r) => r.trustPolicy === "review").length,
    absent: records.filter((r) => r.trustPolicy === "absent").length,
    records,
  };
}
