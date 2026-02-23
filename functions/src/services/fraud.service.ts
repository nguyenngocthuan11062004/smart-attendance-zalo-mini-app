import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface SuspiciousPattern {
  type: "always_same_peers" | "rapid_verification" | "low_peer_count" | "face_mismatch" | "ai_detected";
  studentIds: string[];
  description: string;
  severity: "low" | "medium" | "high";
}

interface AttendanceStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  attendedSessions: number;
  avgPeerCount: number;
  uniquePeers: string[];
  peerFrequency: Record<string, number>;
}

async function callClaudeAPI(prompt: string): Promise<string | null> {
  const apiKey = functions.config().claude?.api_key;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Claude API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (data.content && data.content[0]?.text) {
      return data.content[0].text;
    }
    return null;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("Claude API timeout after 30s");
    } else {
      console.error("Claude API call failed:", err.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse JSON from Claude response, handling markdown-wrapped JSON
 * (e.g., ```json\n{...}\n```)
 */
function parseClaudeJSON(text: string): any | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildAnalysisPrompt(stats: AttendanceStats[], className: string): string {
  const statsText = stats.map((s) => {
    const topPeers = Object.entries(s.peerFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => `${id}:${count}`)
      .join(", ");

    return `- ${s.studentName} (${s.studentId}): attended ${s.attendedSessions}/${s.totalSessions}, avg peers: ${s.avgPeerCount.toFixed(1)}, unique peers: ${s.uniquePeers.length}, top peers: [${topPeers}]`;
  }).join("\n");

  return `Bạn là chuyên gia phân tích gian lận điểm danh tại trường đại học Việt Nam.

Lớp: ${className}
Dữ liệu điểm danh:
${statsText}

Hãy phân tích và trả về JSON (KHÔNG có text khác):
{
  "patterns": [
    {
      "type": "ai_detected",
      "studentIds": ["id1", "id2"],
      "description": "Mô tả bằng tiếng Việt",
      "severity": "low|medium|high"
    }
  ],
  "summary": "Tóm tắt bằng tiếng Việt cho giảng viên"
}

Tìm các mẫu:
1. Nhóm sinh viên luôn xác minh cho nhau (clique)
2. Sinh viên có ít peer đa dạng bất thường
3. Tốc độ xác minh bất thường (quá nhanh)
4. Sinh viên đi điểm danh nhưng peer count thấp liên tục`;
}

export const analyzeFraud = functions.region("asia-southeast1").https.onCall(
  async (data) => {
    const { classId } = data;
    if (!classId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing classId");
    }

    const classDoc = await db.collection("classes").doc(classId).get();
    const className = classDoc.exists ? classDoc.data()?.name || "" : "";

    const sessions = await db.collection("sessions")
      .where("classId", "==", classId)
      .where("status", "==", "ended")
      .get();

    const sessionIds = sessions.docs.map((d) => d.id);
    if (sessionIds.length === 0) {
      return { patterns: [], summary: "Không có dữ liệu để phân tích" };
    }

    // Build per-student statistics
    const statsMap = new Map<string, AttendanceStats>();

    for (const sid of sessionIds) {
      const attendance = await db.collection("attendance")
        .where("sessionId", "==", sid)
        .get();

      attendance.forEach((doc) => {
        const record = doc.data();
        const studentId = record.studentId;

        if (!statsMap.has(studentId)) {
          statsMap.set(studentId, {
            studentId,
            studentName: record.studentName || studentId,
            totalSessions: sessionIds.length,
            attendedSessions: 0,
            avgPeerCount: 0,
            uniquePeers: [],
            peerFrequency: {},
          });
        }

        const stats = statsMap.get(studentId)!;
        stats.attendedSessions++;
        stats.avgPeerCount += record.peerCount || 0;

        const verifications = record.peerVerifications || [];
        verifications.forEach((v: any) => {
          if (!stats.uniquePeers.includes(v.peerId)) {
            stats.uniquePeers.push(v.peerId);
          }
          stats.peerFrequency[v.peerId] = (stats.peerFrequency[v.peerId] || 0) + 1;
        });
      });
    }

    // Finalize averages
    const allStats = Array.from(statsMap.values()).map((s) => ({
      ...s,
      avgPeerCount: s.attendedSessions > 0 ? s.avgPeerCount / s.attendedSessions : 0,
    }));

    // Rule-based detection
    const patterns: SuspiciousPattern[] = [];
    const totalSessions = sessionIds.length;

    // Detect always_same_peers
    const checkedPairs = new Set<string>();
    allStats.forEach((s) => {
      Object.entries(s.peerFrequency).forEach(([peerId, count]) => {
        const pairKey = [s.studentId, peerId].sort().join(":");
        if (checkedPairs.has(pairKey)) return;
        checkedPairs.add(pairKey);

        if (count >= totalSessions * 0.8 && totalSessions >= 3) {
          patterns.push({
            type: "always_same_peers",
            studentIds: [s.studentId, peerId],
            description: `${s.studentName} và ${peerId} luôn xác minh cho nhau (${count}/${totalSessions} buổi)`,
            severity: count === totalSessions ? "high" : "medium",
          });
        }
      });
    });

    // Detect low_peer_count
    const lowPeerStudents = allStats.filter(
      (s) => s.uniquePeers.length <= 1 && totalSessions >= 3
    );
    if (lowPeerStudents.length > 0) {
      patterns.push({
        type: "low_peer_count",
        studentIds: lowPeerStudents.map((s) => s.studentId),
        description: `${lowPeerStudents.length} sinh viên chỉ có 0-1 peer xác minh qua nhiều buổi`,
        severity: "medium",
      });
    }

    // Detect face_mismatch: students who failed face verification
    for (const sid of sessionIds) {
      const attendance = await db.collection("attendance")
        .where("sessionId", "==", sid)
        .get();

      attendance.forEach((doc) => {
        const record = doc.data();
        const face = record.faceVerification;
        if (face && !face.skipped && face.matched === false) {
          patterns.push({
            type: "face_mismatch",
            studentIds: [record.studentId],
            description: `${record.studentName || record.studentId} khong khop khuon mat (confidence: ${Math.round((face.confidence || 0) * 100)}%)`,
            severity: (face.confidence || 0) < 0.3 ? "high" : "medium",
          });
        }
      });
    }

    // AI-powered analysis (if Claude API key configured)
    let aiSummary = "";
    try {
      const aiResponse = await callClaudeAPI(buildAnalysisPrompt(allStats, className));
      if (aiResponse) {
        const aiResult = parseClaudeJSON(aiResponse);
        if (aiResult?.patterns && Array.isArray(aiResult.patterns)) {
          // Validate and sanitize AI patterns before adding
          for (const p of aiResult.patterns) {
            if (p.type && p.studentIds && p.description && p.severity) {
              patterns.push({
                type: "ai_detected",
                studentIds: Array.isArray(p.studentIds) ? p.studentIds : [],
                description: String(p.description),
                severity: ["low", "medium", "high"].includes(p.severity) ? p.severity : "low",
              });
            }
          }
        }
        aiSummary = typeof aiResult?.summary === "string" ? aiResult.summary : "";
      }
    } catch (err: any) {
      console.error("AI fraud analysis failed:", err.message);
      // Continue with rule-based only
    }

    const summary = aiSummary || (
      patterns.length === 0
        ? "Không phát hiện mẫu gian lận đáng ngờ"
        : `Phát hiện ${patterns.length} mẫu đáng ngờ cần xem xét`
    );

    // Save report
    const reportRef = db.collection("fraud_reports").doc();
    await reportRef.set({
      classId,
      className,
      generatedAt: Date.now(),
      suspiciousPatterns: patterns,
      summary,
      studentStats: allStats,
      aiEnabled: !!aiSummary,
    });

    return { patterns, summary, reportId: reportRef.id };
  }
);

// Scheduled weekly analysis for all active classes
export const weeklyFraudAnalysis = functions.region("asia-southeast1")
  .pubsub.schedule("every monday 08:00")
  .timeZone("Asia/Ho_Chi_Minh")
  .onRun(async () => {
    const classes = await db.collection("classes").get();

    for (const classDoc of classes.docs) {
      try {
        const classId = classDoc.id;
        const sessions = await db.collection("sessions")
          .where("classId", "==", classId)
          .where("status", "==", "ended")
          .get();

        if (sessions.size >= 3) {
          // Trigger analysis for classes with enough data
          await analyzeFraud.run({ classId }, {} as any);
        }
      } catch {
        // Continue with next class
      }
    }
  });
