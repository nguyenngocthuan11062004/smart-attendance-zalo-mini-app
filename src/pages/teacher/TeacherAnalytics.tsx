import React, { useEffect, useState } from "react";
import { Page, Text, Header } from "zmp-ui";
import { useParams } from "react-router-dom";
import { getClassById } from "@/services/class.service";
import { getClassSessions } from "@/services/session.service";
import { getSessionAttendance } from "@/services/attendance.service";
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
    <Page className="page">
      <Header title="Th\u1ed1ng k\u00ea \u0111i\u1ec3m danh" />

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-[80px] rounded-2xl" />
          <div className="skeleton h-[200px] rounded-2xl" />
        </div>
      ) : !classDoc ? (
        <div className="empty-state py-10">
          <Text className="text-gray-400">Kh\u00f4ng t\u00ecm th\u1ea5y l\u1edbp h\u1ecdc</Text>
        </div>
      ) : (
        <>
          {/* Class header */}
          <div className="gradient-red rounded-2xl p-4 mb-4 text-white">
            <p className="text-white/70 text-xs font-medium">
              {classDoc.code}
            </p>
            <p className="text-lg font-bold mt-0.5">{classDoc.name}</p>
            <p className="text-white/60 text-xs mt-1">
              {classDoc.studentIds.length} sinh vi\u00ean \u00b7 {totalSessions} phi\u00ean
            </p>
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div
              className="stat-card"
              style={{ background: "#f0fdf4", color: "#16a34a" }}
            >
              <p style={{ fontSize: 22, fontWeight: 700 }}>{avgRate}%</p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                TB c\u00f3 m\u1eb7t
              </p>
            </div>
            <div
              className="stat-card"
              style={{ background: "#fef2f2", color: "#dc2626" }}
            >
              <p style={{ fontSize: 22, fontWeight: 700 }}>{totalSessions}</p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                S\u1ed1 phi\u00ean
              </p>
            </div>
            <div
              className="stat-card"
              style={{ background: "#eff6ff", color: "#2563eb" }}
            >
              <p style={{ fontSize: 22, fontWeight: 700 }}>
                {classDoc.studentIds.length}
              </p>
              <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                Sinh vi\u00ean
              </p>
            </div>
          </div>

          {/* Bar chart */}
          {stats.length > 0 ? (
            <div className="card-flat p-4 mb-4">
              <p className="section-label mb-3">
                T\u1ef7 l\u1ec7 c\u00f3 m\u1eb7t theo phi\u00ean
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
                      <p
                        style={{
                          fontSize: 9,
                          color: "#9ca3af",
                          marginBottom: 2,
                        }}
                      >
                        {Math.round(rate * 100)}%
                      </p>
                      <div
                        style={{
                          width: "60%",
                          height: barH,
                          background: color,
                          borderRadius: 4,
                          transition: "height 0.3s",
                        }}
                      />
                      <p
                        style={{
                          fontSize: 8,
                          color: "#cbd5e1",
                          marginTop: 4,
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
            <div className="empty-state py-6">
              <Text className="text-gray-400">
                Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u phi\u00ean n\u00e0o
              </Text>
            </div>
          )}

          {/* Session detail list */}
          {stats.length > 0 && (
            <div>
              <p className="section-label">Chi ti\u1ebft t\u1eebng phi\u00ean</p>
              {[...stats].reverse().map((s, i) => (
                <div key={i} className="card-flat p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text bold size="small">
                        {new Date(s.session.startedAt).toLocaleDateString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )}
                      </Text>
                      <Text size="xxSmall" className="text-gray-400">
                        {new Date(s.session.startedAt).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </Text>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                        {s.present} c\u00f3 m\u1eb7t
                      </span>
                      {s.review > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">
                          {s.review} xem x\u00e9t
                        </span>
                      )}
                      {s.absent > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">
                          {s.absent} v\u1eafng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
                    <div
                      className="progress-fill h-full bg-emerald-500"
                      style={{
                        width: `${s.total > 0 ? (s.present / s.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
