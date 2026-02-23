import { collection, doc, getDocs, setDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/config/firebase";
import { callWithFallback } from "@/utils/cloudFallback";
import { isMockMode, mockDb } from "@/utils/mock-db";
import type { AttendanceDoc, FraudReport, SessionDoc, SuspiciousPattern } from "@/types";

/**
 * Data access abstraction so the analysis logic can run against
 * either the in-memory mock store or real Firestore collections.
 */
interface FraudDataProvider {
  getSessions(classId: string): Promise<SessionDoc[]>;
  getAttendance(sessionId: string): Promise<AttendanceDoc[]>;
  resolveStudentName(studentId: string): Promise<string>;
  saveReport(report: FraudReport): Promise<void>;
}

const mockProvider: FraudDataProvider = {
  async getSessions(classId) {
    return mockDb.getClassSessions(classId);
  },
  async getAttendance(sessionId) {
    return mockDb.getSessionAttendance(sessionId);
  },
  async resolveStudentName(studentId) {
    return mockDb.getUser(studentId)?.name || studentId;
  },
  async saveReport(report) {
    mockDb.addFraudReport(report);
  },
};

const firestoreProvider: FraudDataProvider = {
  async getSessions(classId) {
    const q = query(
      collection(db, "sessions"),
      where("classId", "==", classId),
      orderBy("startedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc);
  },
  async getAttendance(sessionId) {
    const q = query(collection(db, "attendance"), where("sessionId", "==", sessionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
  },
  async resolveStudentName(studentId) {
    return studentId; // Firestore attendance records already contain studentName
  },
  async saveReport(report) {
    const ref = doc(db, "fraud_reports", report.id);
    await setDoc(ref, report);
  },
};

/**
 * Run fraud analysis locally using the given data provider.
 * Works identically for mock and real Firestore data.
 */
async function localAnalyzeFraud(
  classId: string,
  provider: FraudDataProvider
): Promise<{ patterns: SuspiciousPattern[]; summary: string; reportId: string }> {
  const sessions = await provider.getSessions(classId);
  const patterns: SuspiciousPattern[] = [];

  // Pre-fetch all attendance records per session
  const sessionAttendance = new Map<string, AttendanceDoc[]>();
  for (const s of sessions) {
    sessionAttendance.set(s.id, await provider.getAttendance(s.id));
  }

  // Check always_same_peers
  const peerMap = new Map<string, Map<string, number>>();
  for (const s of sessions) {
    const records = sessionAttendance.get(s.id) || [];
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
        const sName = await provider.resolveStudentName(sid);
        const pName = await provider.resolveStudentName(pid);
        patterns.push({
          type: "always_same_peers",
          studentIds: [sid, pid],
          description: `${sName} và ${pName} luôn xác minh cho nhau (${count}/${sessions.length} buổi)`,
          severity: count === sessions.length ? "high" : "medium",
        });
      }
    }
  }

  // Check face_mismatch
  for (const s of sessions) {
    const records = sessionAttendance.get(s.id) || [];
    for (const r of records) {
      const face = r.faceVerification;
      if (face && !face.skipped && face.matched === false) {
        patterns.push({
          type: "face_mismatch",
          studentIds: [r.studentId],
          description: `${r.studentName} không khớp khuôn mặt (confidence: ${Math.round((face.confidence || 0) * 100)}%)`,
          severity: (face.confidence || 0) < 0.3 ? "high" : "medium",
        });
      }
    }
  }

  // Check rapid_verification
  for (const s of sessions) {
    const records = sessionAttendance.get(s.id) || [];
    for (const r of records) {
      if (r.peerVerifications.length < 2) continue;
      const sorted = [...r.peerVerifications].sort((a, b) => a.verifiedAt - b.verifiedAt);
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i].verifiedAt - sorted[i - 1].verifiedAt) / 1000;
        if (gap < 30) {
          const studentName = r.studentName || await provider.resolveStudentName(r.studentId);
          patterns.push({
            type: "rapid_verification",
            studentIds: [r.studentId],
            description: `${studentName} có ${sorted.length} peer verify trong ${Math.round(gap)}s`,
            severity: gap < 10 ? "high" : "medium",
          });
          break; // one flag per student per session is enough
        }
      }
    }
  }

  // Check low_peer_count
  const studentSessionCount = new Map<string, { low: number; total: number }>();
  for (const s of sessions) {
    const records = sessionAttendance.get(s.id) || [];
    for (const r of records) {
      if (!studentSessionCount.has(r.studentId)) {
        studentSessionCount.set(r.studentId, { low: 0, total: 0 });
      }
      const entry = studentSessionCount.get(r.studentId)!;
      entry.total++;
      if (r.peerCount < 3) entry.low++;
    }
  }
  for (const [sid, counts] of studentSessionCount) {
    if (counts.total >= 2 && counts.low / counts.total >= 0.5) {
      const studentName = await provider.resolveStudentName(sid);
      const majorityZero = (() => {
        let zeroCount = 0;
        for (const s of sessions) {
          const records = sessionAttendance.get(s.id) || [];
          for (const r of records) {
            if (r.studentId === sid && r.peerCount === 0) zeroCount++;
          }
        }
        return zeroCount > counts.total / 2;
      })();
      patterns.push({
        type: "low_peer_count",
        studentIds: [sid],
        description: `${studentName} có peer count thấp trong ${counts.low}/${counts.total} buổi`,
        severity: majorityZero ? "high" : "medium",
      });
    }
  }

  const summary = patterns.length === 0
    ? "Không phát hiện mẫu gian lận đáng ngờ"
    : `Phát hiện ${patterns.length} mẫu đáng ngờ cần xem xét`;

  const reportId = `local_report_${Date.now()}`;
  await provider.saveReport({
    id: reportId, sessionId: "", classId, generatedAt: Date.now(),
    suspiciousPatterns: patterns, summary,
  });

  return { patterns, summary, reportId };
}

export async function analyzeFraud(
  classId: string
): Promise<{ patterns: SuspiciousPattern[]; summary: string; reportId: string }> {
  if (isMockMode()) {
    return localAnalyzeFraud(classId, mockProvider);
  }

  return callWithFallback(
    "analyzeFraud",
    { classId },
    () => localAnalyzeFraud(classId, firestoreProvider)
  );
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
