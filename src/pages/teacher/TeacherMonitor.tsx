import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { activeSessionAtom } from "@/store/session";
import { globalErrorAtom } from "@/store/ui";
import { subscribeToSessionAttendance, getSessionAttendance, manualCheckIn } from "@/services/attendance.service";
import { getSession, endSession } from "@/services/session.service";
import { getClassById, getClassStudents } from "@/services/class.service";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/config/firebase";
import { effectiveTrustScore, getTrustScoreReasons } from "@/types";
import { checkGeoFence } from "@/utils/geo";
import DarkModal from "@/components/ui/DarkModal";
import type { AttendanceDoc, ClassDoc, SessionDoc } from "@/types";

type FilterType = "all" | "present" | "review" | "absent";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "Có mặt", color: "#22c55e", bg: "#dcfce7" },
  review: { label: "Xem xét", color: "#f59e0b", bg: "#fef3c7" },
  absent: { label: "Vắng", color: "#ef4444", bg: "#fee2e2" },
};

export default function TeacherMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = useAtomValue(activeSessionAtom);
  const setActiveSession = useSetAtom(activeSessionAtom);
  const setError = useSetAtom(globalErrorAtom);
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTarget, setManualTarget] = useState<{ id: string; name: string } | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [localSession, setLocalSession] = useState<SessionDoc | null>(null);
  // Guard against double end-session calls when this component races with
  // TeacherSession (or another monitor tab) closing the same session.
  const endingRef = React.useRef(false);

  // Session config cho trust score (ưu tiên localSession > atom)
  const sessionConfig = {
    faceRequired: (localSession || session)?.faceRequired,
    peerRequired: (localSession || session)?.peerRequired,
  };

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId).then((sess) => {
      if (sess) {
        setLocalSession(sess);
        getClassById(sess.classId).then(async (cls) => {
          if (cls) {
            setClassDoc(cls);
            setTotalStudents(cls.roster?.length ?? cls.studentIds.length);
            const students = await getClassStudents(cls.studentIds);
            setAllStudents(students.map((s) => ({ id: s.id, name: s.name })));
          }
        });
      }
    });

    const unsubscribe = subscribeToSessionAttendance(sessionId, (data) => {
      setRecords(data.sort((a, b) => b.checkedInAt - a.checkedInAt));
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Tính lại trust score client-side dùng session config (fix session cũ thiếu field)
  const recordsWithScore = records.map((r) => ({
    ...r,
    trustScore: effectiveTrustScore(r, sessionConfig),
  }));

  const present = recordsWithScore.filter((r) => r.trustScore === "present").length;
  const review = recordsWithScore.filter((r) => r.trustScore === "review").length;
  const checkedIn = recordsWithScore.length;

  // Đối chiếu danh sách chính thức (roster): vắng = SV trong roster chưa điểm danh
  const roster = classDoc?.roster ?? null;
  const useRoster = !!(roster && roster.length);
  const checkedInKeys = new Set<string>();
  records.forEach((r) => { if (r.studentMssv) checkedInKeys.add(r.studentMssv); checkedInKeys.add(r.studentId); });
  const absentStudentList = useRoster
    ? roster!.filter((e) => !checkedInKeys.has(e.mssv)).map((e) => ({ id: e.mssv, name: e.name }))
    : allStudents.filter((s) => !checkedInKeys.has(s.id));
  // Vắng = SV trong danh sách chưa điểm danh + record đã quét nhưng bị chấm absent.
  // Thẻ stat và chip filter phải dùng CÙNG một con số (trước đây chip chỉ đếm
  // records absent → hiện "Vắng 0" trong khi thẻ trên "Vắng 1").
  const absentRecordCount = recordsWithScore.filter((r) => r.trustScore === "absent").length;
  const absentCount =
    (useRoster ? absentStudentList.length : (totalStudents > 0 ? totalStudents - checkedIn : 0)) +
    absentRecordCount;
  const progressPercent = totalStudents > 0 ? Math.round((checkedIn / totalStudents) * 100) : 0;

  const filteredRecords = recordsWithScore.filter((r) => {
    if (filter === "all") return true;
    if (filter === "present") return r.trustScore === "present";
    if (filter === "review") return r.trustScore === "review";
    if (filter === "absent") return r.trustScore === "absent";
    return true;
  });

  const handleEndSession = async () => {
    if (!sessionId) return;
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    try {
      await endSession(sessionId);
      // Đồng bộ trust score cho TẤT CẢ record trong MỘT batch (1 round-trip)
      // thay vì await từng updateDoc nối tiếp → kết thúc phiên nhanh hơn hẳn.
      const records = await getSessionAttendance(sessionId);
      const batch = writeBatch(db);
      let changed = 0;
      for (const r of records) {
        const score = effectiveTrustScore(r, sessionConfig);
        if (score !== r.trustScore) {
          batch.update(doc(db, "attendance", r.id), { trustScore: score });
          changed++;
        }
      }
      // Best-effort: lỗi đồng bộ (mock mode / mạng) không chặn kết thúc phiên;
      // màn review vẫn tính lại trust score client-side.
      if (changed > 0) await batch.commit().catch(() => {});
      setActiveSession(null);
      navigate(`/teacher/review/${sessionId}`);
    } catch {
      setError("Không thể kết thúc phiên. Vui lòng thử lại.");
      endingRef.current = false; // allow retry on user-driven end attempt
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualTarget || !sessionId) return;
    setManualSubmitting(true);
    try {
      // Lý do là tùy chọn — nếu trống, dùng default ngắn gọn để log vẫn có thông tin
      const reason = manualReason.trim() || "GV xác nhận có mặt";
      await manualCheckIn(sessionId, manualTarget.id, manualTarget.name, reason, "present", (localSession || session)?.teacherId);
      setManualTarget(null);
      setManualReason("");
      setShowManualModal(false);
    } catch {
      setError("Lỗi khi điểm danh thủ công");
    } finally {
      setManualSubmitting(false);
    }
  };

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: checkedIn },
    { key: "present", label: "Có mặt", count: present },
    { key: "review", label: "Xem xét", count: review },
    { key: "absent", label: "Vắng", count: absentCount },
  ];

  // Filter "Vắng" → hiện thêm danh sách SV CHƯA điểm danh (không có record)
  const absentStudentsToShow = filter === "absent" ? absentStudentList : [];

  // SVG score ring arc
  const r = 27; const cx = 32; const cy = 32; const strokeW = 5;
  const sweep = (progressPercent / 100) * 360;
  const startRad = -Math.PI / 2;
  const endRad = startRad + (sweep * Math.PI) / 180;
  const largeArc = sweep > 180 ? 1 : 0;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const arcPath = sweep >= 360
    ? `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r}`
    : `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2}`;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: "rgba(255,255,255,0.13)", border: "none",
          width: 36, height: 36, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Theo dõi realtime</span>
        <button style={{
          background: "rgba(255,255,255,0.13)", border: "none",
          width: 36, height: 36, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Progress card */}
        {totalStudents > 0 && (
          <div style={{
            background: "#ffffff", borderRadius: 16, padding: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>
                {checkedIn}/{totalStudents} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>SV</span>
              </span>
              {session?.status === "active" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, background: "#22c55e",
                    boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>Realtime</span>
                </div>
              )}
            </div>

            {/* Score ring */}
            <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx={cx} cy={cy} r={r} stroke="#e5e5e5" strokeWidth={strokeW} fill="none" />
                {sweep > 0 && (
                  <path d={arcPath} stroke="#a78bfa" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
                )}
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{progressPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Stat cards row */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { value: present, label: "Có mặt", color: "#22c55e" },
            { value: review, label: "Xem xét", color: "#f59e0b" },
            { value: absentCount, label: "Vắng", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: "#ffffff", borderRadius: 12,
              padding: "14px 10px", textAlign: "center",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                height: 32, borderRadius: 16,
                padding: "0 14px",
                background: filter === f.key ? "#1a1a1a" : "#ffffff",
                color: filter === f.key ? "#ffffff" : "#6b7280",
                fontSize: 13, fontWeight: 600,
                border: filter === f.key ? "none" : "1px solid rgba(0,0,0,0.08)",
                whiteSpace: "nowrap",
              }}
            >
              {f.label} {f.count}
            </button>
          ))}
        </div>

        {/* Attendance list */}
        {filteredRecords.length === 0 && absentStudentsToShow.length === 0 ? (
          <div style={{
            background: "#ffffff", borderRadius: 16, padding: 32,
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, background: "#f0f0f5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
              {filter === "all" ? "Chưa có sinh viên điểm danh" : "Không có sinh viên"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Dữ liệu sẽ cập nhật realtime</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredRecords.map((rec) => {
              const status = STATUS_CONFIG[rec.trustScore] || STATUS_CONFIG.absent;
              const name = rec.studentName || rec.studentId;
              const initial = name.charAt(0).toUpperCase();
              const reasons = rec.trustScore !== "present"
                ? [
                    ...(rec.reviewReason ? [rec.reviewReason] : []),
                    ...getTrustScoreReasons(rec.peerCount, rec.faceVerification, sessionConfig),
                  ]
                : [];
              // Tính khoảng cách nếu có GPS
              const activeSession = localSession || session;
              const geoInfo = rec.location && activeSession?.location
                ? checkGeoFence(rec.location, (localSession || session)!.location!, (localSession || session)?.geoFenceRadius || 200)
                : null;

              return (
                <div key={rec.id} style={{
                  background: "#ffffff", borderRadius: 12, padding: 14,
                  border: "1px solid rgba(0,0,0,0.04)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 14, background: "#be1d2c",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>{initial}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{name}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {rec.peerCount} peers · {new Date(rec.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div style={{
                      background: status.bg, borderRadius: 8, padding: "4px 10px",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
                    </div>
                  </div>

                  {/* Lý do review/absent */}
                  {reasons.length > 0 && (
                    <div style={{ paddingLeft: 48 }}>
                      {reasons.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: status.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: status.color }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GPS info */}
                  {rec.location && (
                    <div style={{ paddingLeft: 48, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={geoInfo?.inRange ? "#22c55e" : "#ef4444"} strokeWidth="2" strokeLinecap="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      <span style={{ fontSize: 11, color: geoInfo?.inRange ? "#22c55e" : "#ef4444" }}>
                        {geoInfo
                          ? (geoInfo.inRange
                            ? `Trong phạm vi (${geoInfo.distance}m)`
                            : `Ngoài phạm vi (${geoInfo.distance}m / ${activeSession?.geoFenceRadius || 200}m)`)
                          : `${rec.location.latitude.toFixed(4)}°, ${rec.location.longitude.toFixed(4)}°`
                        }
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* SV trong danh sách lớp CHƯA điểm danh (chỉ hiện ở filter "Vắng") */}
            {absentStudentsToShow.map((s) => (
              <div key={`absent_${s.id}`} style={{
                background: "#ffffff", borderRadius: 12, padding: 14,
                border: "1px solid rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 14, background: "#9ca3af",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{s.id}</span>
                </div>
                <div style={{ background: "#fee2e2", borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>Chưa điểm danh</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual attendance button */}
        {session?.status === "active" && absentStudentList.length > 0 && (
          <button
            onClick={() => setShowManualModal(true)}
            style={{
              width: "100%", height: 48, borderRadius: 12,
              background: "#fff", border: "1px solid rgba(34,197,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span style={{ color: "#22c55e", fontSize: 14, fontWeight: 700 }}>Điểm danh thủ công ({absentStudentList.length} SV vắng)</span>
          </button>
        )}

        {/* End session button */}
        {session?.status === "active" && (
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              width: "100%", height: 48, borderRadius: 12,
              background: "#be1d2c", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <span style={{ color: "#ffffff", fontSize: 15, fontWeight: 700 }}>Kết thúc phiên</span>
          </button>
        )}
      </div>

      {/* Manual attendance - student picker modal */}
      <DarkModal
        visible={showManualModal && !manualTarget}
        onClose={() => setShowManualModal(false)}
        title="Chọn sinh viên"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
          {absentStudentList.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 20 }}>Tất cả SV đã điểm danh</p>
          ) : absentStudentList.map((s) => (
            <button
              key={s.id}
              onClick={() => { setManualTarget(s); setManualReason(""); }}
              style={{
                background: "#f8f9fa", borderRadius: 12, padding: 12, border: "none",
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(180deg, #6b7280, #9ca3af)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{s.name.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{s.name}</p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Chưa điểm danh</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
      </DarkModal>

      {/* Manual attendance - reason modal */}
      <DarkModal
        visible={!!manualTarget}
        onClose={() => setManualTarget(null)}
        title="Điểm danh thủ công"
      >
        {manualTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#f8f9fa", borderRadius: 12, padding: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "linear-gradient(180deg, #be1d2c, #dc2626)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{manualTarget.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{manualTarget.name}</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>{manualTarget.id}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Lý do <span style={{ fontWeight: 400, color: "#9ca3af" }}>(không bắt buộc)</span>
              </label>
              <textarea
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="VD: SV có mặt nhưng điện thoại hết pin..."
                rows={3}
                style={{
                  width: "100%", borderRadius: 12, border: "1px solid #e5e7eb",
                  padding: "10px 14px", fontSize: 14, resize: "none",
                  outline: "none", background: "#fff", fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setManualTarget(null)}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f2f2f7", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={manualSubmitting}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: manualSubmitting ? "#d4d4d4" : "#22c55e",
                  border: "none",
                  fontSize: 15, fontWeight: 700, color: "#fff",
                }}
              >
                {manualSubmitting ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        )}
      </DarkModal>

      {/* Confirm end modal */}
      {showEndConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setShowEndConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, background: "#ffffff",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e5e7eb", margin: "0 auto" }} />

            <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>Kết thúc phiên?</span>

            {/* Warning */}
            <div style={{
              background: "#fef3c7", borderRadius: 12, padding: 14,
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              <span style={{ fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
                Đã có {checkedIn}/{totalStudents} sinh viên check-in. Hệ thống sẽ tính điểm tin cậy sau khi kết thúc.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f2f2f7", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#1a1a1a",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: ending ? "#d4d4d4" : "#ef4444", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#ffffff",
                }}
              >
                {ending ? "Đang kết thúc..." : "Kết thúc"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
