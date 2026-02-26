import React, { useEffect, useState } from "react";
import { Page, Text, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { getClassById } from "@/services/class.service";
import { getClassSessions } from "@/services/session.service";
import { getSessionAttendance } from "@/services/attendance.service";
import ScoreRing from "@/components/ui/ScoreRing";
import DarkStatCard from "@/components/ui/DarkStatCard";
import DarkProgressBar from "@/components/ui/DarkProgressBar";
import type { ClassDoc, SessionDoc, AttendanceDoc } from "@/types";

interface SessionStat {
  session: SessionDoc;
  total: number;
  present: number;
  review: number;
  absent: number;
}

export default function TeacherAnalytics() {
  const { classId } = useParams<{ classId: string }>();
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [stats, setStats] = useState<SessionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    loadData(classId);
  }, [classId]);

  async function loadData(cid: string) {
    try {
      const [cls, sessions] = await Promise.all([
        getClassById(cid),
        getClassSessions(cid),
      ]);
      if (cls) setClassDoc(cls);

      const endedSessions = sessions
        .filter((s) => s.status === "ended")
        .sort((a, b) => a.startedAt - b.startedAt);

      const sessionStats: SessionStat[] = [];
      for (const session of endedSessions.slice(-10)) {
        const records = await getSessionAttendance(session.id);
        const total = cls ? cls.studentIds.length : records.length;
        const present = records.filter(
          (r) => (r.teacherOverride || r.trustScore) === "present"
        ).length;
        const review = records.filter(
          (r) => (r.teacherOverride || r.trustScore) === "review"
        ).length;
        sessionStats.push({
          session,
          total,
          present,
          review,
          absent: total - present - review,
        });
      }
      setStats(sessionStats);
    } finally {
      setLoading(false);
    }
  }

  const avgRate =
    stats.length > 0
      ? Math.round(
          stats.reduce(
            (sum, s) => sum + (s.present / Math.max(s.total, 1)) * 100,
            0
          ) / stats.length
        )
      : 0;

  const totalSessions = stats.length;
  const maxBarHeight = 80;

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title="Thống kê điểm danh" />

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton" style={{ height: 80, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 20 }} />
        </div>
      ) : !classDoc ? (
        <div className="empty-state" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <p style={{ color: "#9ca3af" }}>Không tìm thấy lớp học</p>
        </div>
      ) : (
        <>
          {/* Class header */}
          <div
            className="glass-card animate-fade-in"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f0f0f5 100%)",
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>
                  {classDoc.code}
                </p>
                <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700, marginTop: 2 }}>{classDoc.name}</p>
                <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                  {classDoc.studentIds.length} sinh viên · {totalSessions} phiên
                </p>
              </div>
              <ScoreRing percentage={avgRate} size={72} color="#a78bfa" strokeWidth={6} glow animated>
                <span style={{ color: "#a78bfa", fontSize: 14, fontWeight: 700 }}>{avgRate}%</span>
              </ScoreRing>
            </div>
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="animate-bounce-in animate-stagger-1">
              <DarkStatCard value={`${avgRate}%`} label="TB có mặt" color="#22c55e" enhanced />
            </div>
            <div className="animate-bounce-in animate-stagger-2">
              <DarkStatCard value={totalSessions} label="Số phiên" color="#be1d2c" enhanced />
            </div>
            <div className="animate-bounce-in animate-stagger-3">
              <DarkStatCard value={classDoc.studentIds.length} label="Sinh viên" color="#a78bfa" enhanced />
            </div>
          </div>

          {/* Bar chart */}
          {stats.length > 0 ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <p className="section-label" style={{ marginBottom: 12 }}>
                Tỷ lệ có mặt theo phiên
              </p>
              <div
                className="flex items-end justify-between"
                style={{ height: maxBarHeight + 30 }}
              >
                {stats.map((s, i) => {
                  const rate = s.total > 0 ? s.present / s.total : 0;
                  const barH = Math.max(rate * maxBarHeight, 4);
                  const color =
                    rate >= 0.8
                      ? "#22c55e"
                      : rate >= 0.6
                        ? "#f59e0b"
                        : "#ef4444";
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center"
                      style={{ flex: 1 }}
                    >
                      <p style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>
                        {Math.round(rate * 100)}%
                      </p>
                      <div
                        style={{
                          width: "60%",
                          background: "#e5e7eb",
                          borderRadius: 4,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          height: maxBarHeight,
                        }}
                      >
                        <div
                          className={`animate-stagger-${Math.min(i + 1, 10)}`}
                          style={{
                            width: "100%",
                            height: barH,
                            background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                            borderRadius: 4,
                            transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
                            boxShadow: `0 0 8px ${color}40`,
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: 8,
                          color: "#9ca3af",
                          marginTop: 4,
                          background: "linear-gradient(135deg, #f0f0f5 0%, #ffffff 100%)",
                          padding: "1px 4px",
                          borderRadius: 4,
                        }}
                      >
                        {new Date(s.session.startedAt).toLocaleDateString(
                          "vi-VN",
                          { day: "2-digit", month: "2-digit" }
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
              <p style={{ color: "#9ca3af" }}>Chưa có dữ liệu phiên nào</p>
            </div>
          )}

          {/* Session detail list */}
          {stats.length > 0 && (
            <div>
              <p className="section-label">Chi tiết từng phiên</p>
              {[...stats].reverse().map((s, i) => {
                const rate = s.total > 0 ? (s.present / s.total) * 100 : 0;
                return (
                  <div
                    key={i}
                    className={`hover-lift animate-stagger-${Math.min(i + 1, 10)}`}
                    style={{
                      background: "#ffffff",
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 13 }}>
                          {new Date(s.session.startedAt).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </p>
                        <p style={{ color: "#9ca3af", fontSize: 11 }}>
                          {new Date(s.session.startedAt).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "rgba(34,197,94,0.15)",
                            color: "#22c55e",
                          }}
                        >
                          {s.present} có mặt
                        </span>
                        {s.review > 0 && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 600,
                              background: "rgba(245,158,11,0.15)",
                              color: "#f59e0b",
                            }}
                          >
                            {s.review} xem xét
                          </span>
                        )}
                        {s.absent > 0 && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 600,
                              background: "rgba(239,68,68,0.15)",
                              color: "#ef4444",
                            }}
                          >
                            {s.absent} vắng
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <DarkProgressBar
                        percentage={rate}
                        color={rate >= 80 ? "#22c55e" : rate >= 60 ? "#f59e0b" : "#ef4444"}
                        height={6}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
