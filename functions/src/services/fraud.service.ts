import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface SuspiciousPattern {
  type: "always_same_peers" | "rapid_verification" | "low_peer_count";
  studentIds: string[];
  description: string;
  severity: "low" | "medium" | "high";
}

export const analyzeFraud = functions.region("asia-southeast1").https.onCall(
  async (data) => {
    const { classId, startDate, endDate } = data;
    if (!classId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing classId");
    }

    const sessions = await db.collection("sessions")
      .where("classId", "==", classId)
      .where("status", "==", "ended")
      .get();

    const sessionIds = sessions.docs.map((d) => d.id);
    if (sessionIds.length === 0) {
      return { patterns: [], summary: "Không có dữ liệu để phân tích" };
    }

    const patterns: SuspiciousPattern[] = [];

    // Analyze peer verification patterns across sessions
    const peerMap = new Map<string, Map<string, number>>();

    for (const sid of sessionIds) {
      const attendance = await db.collection("attendance")
        .where("sessionId", "==", sid)
        .get();

      attendance.forEach((doc) => {
        const record = doc.data();
        const studentId = record.studentId;
        const verifications = record.peerVerifications || [];

        if (!peerMap.has(studentId)) {
          peerMap.set(studentId, new Map());
        }
        const studentPeers = peerMap.get(studentId)!;

        verifications.forEach((v: any) => {
          const current = studentPeers.get(v.peerId) || 0;
          studentPeers.set(v.peerId, current + 1);
        });
      });
    }

    // Detect always_same_peers pattern
    const totalSessions = sessionIds.length;
    peerMap.forEach((peers, studentId) => {
      peers.forEach((count, peerId) => {
        if (count >= totalSessions * 0.8 && totalSessions >= 3) {
          const existing = patterns.find(
            (p) => p.type === "always_same_peers" && p.studentIds.includes(studentId) && p.studentIds.includes(peerId)
          );
          if (!existing) {
            patterns.push({
              type: "always_same_peers",
              studentIds: [studentId, peerId],
              description: `Sinh viên ${studentId} và ${peerId} luôn xác minh cho nhau (${count}/${totalSessions} buổi)`,
              severity: count === totalSessions ? "high" : "medium",
            });
          }
        }
      });
    });

    // Detect low_peer_count pattern
    const lowPeerStudents: string[] = [];
    peerMap.forEach((peers, studentId) => {
      if (peers.size <= 1 && totalSessions >= 3) {
        lowPeerStudents.push(studentId);
      }
    });

    if (lowPeerStudents.length > 0) {
      patterns.push({
        type: "low_peer_count",
        studentIds: lowPeerStudents,
        description: `${lowPeerStudents.length} sinh viên chỉ có 0-1 peer xác minh qua nhiều buổi`,
        severity: "medium",
      });
    }

    const summary = patterns.length === 0
      ? "Không phát hiện mẫu gian lận đáng ngờ"
      : `Phát hiện ${patterns.length} mẫu đáng ngờ cần xem xét`;

    // Save report
    const reportRef = db.collection("fraud_reports").doc();
    await reportRef.set({
      classId,
      generatedAt: Date.now(),
      suspiciousPatterns: patterns,
      summary,
    });

    return { patterns, summary, reportId: reportRef.id };
  }
);
