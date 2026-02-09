import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { functions, db } from "@/config/firebase";
import { isMockMode, mockDb } from "@/utils/mock-db";
import type { FraudReport, SuspiciousPattern } from "@/types";

export async function analyzeFraud(
  classId: string
): Promise<{ patterns: SuspiciousPattern[]; summary: string; reportId: string }> {
  if (isMockMode()) {
    // Mock fraud analysis based on in-memory data
    const sessions = mockDb.getClassSessions(classId);
    const patterns: SuspiciousPattern[] = [];

    // Check always_same_peers
    const peerMap = new Map<string, Map<string, number>>();
    for (const s of sessions) {
      const records = mockDb.getSessionAttendance(s.id);
      for (const r of records) {
        if (!peerMap.has(r.studentId)) peerMap.set(r.studentId, new Map());
        const m = peerMap.get(r.studentId)!;
        for (const v of r.peerVerifications) {
          m.set(v.peerId, (m.get(v.peerId) || 0) + 1);
        }
      }
    }

    const checked = new Set<string>();
    for (const [sid, peers] of peerMap) {
      for (const [pid, count] of peers) {
        const key = [sid, pid].sort().join(":");
        if (checked.has(key)) continue;
        checked.add(key);
        if (count >= sessions.length * 0.8 && sessions.length >= 2) {
          const sName = mockDb.getUser(sid)?.name || sid;
          const pName = mockDb.getUser(pid)?.name || pid;
          patterns.push({
            type: "always_same_peers",
            studentIds: [sid, pid],
            description: `${sName} va ${pName} luon xac minh cho nhau (${count}/${sessions.length} buoi)`,
            severity: count === sessions.length ? "high" : "medium",
          });
        }
      }
    }

    // Check face_mismatch
    for (const s of sessions) {
      const records = mockDb.getSessionAttendance(s.id);
      for (const r of records) {
        const face = r.faceVerification;
        if (face && !face.skipped && face.matched === false) {
          patterns.push({
            type: "face_mismatch",
            studentIds: [r.studentId],
            description: `${r.studentName} khong khop khuon mat (confidence: ${Math.round((face.confidence || 0) * 100)}%)`,
            severity: (face.confidence || 0) < 0.3 ? "high" : "medium",
          });
        }
      }
    }

    const summary = patterns.length === 0
      ? "Khong phat hien mau gian lan dang ngo"
      : `Phat hien ${patterns.length} mau dang ngo can xem xet`;

    const reportId = `mock_report_${Date.now()}`;
    mockDb.addFraudReport({
      id: reportId, sessionId: "", classId, generatedAt: Date.now(),
      suspiciousPatterns: patterns, summary,
    });

    return { patterns, summary, reportId };
  }

  const fn = httpsCallable(functions, "analyzeFraud");
  const result = await fn({ classId });
  return result.data as { patterns: SuspiciousPattern[]; summary: string; reportId: string };
}

export async function getFraudReports(classId: string): Promise<FraudReport[]> {
  if (isMockMode()) return mockDb.getFraudReports(classId);
  const q = query(
    collection(db, "fraud_reports"),
    where("classId", "==", classId),
    orderBy("generatedAt", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FraudReport);
}
