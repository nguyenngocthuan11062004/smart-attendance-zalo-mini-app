import React, { useEffect, useState } from "react";
import { Page, useSnackbar } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionAttendance, teacherOverride } from "@/services/attendance.service";
import { getSession } from "@/services/session.service";
import { getClassById, getClassStudents } from "@/services/class.service";
import type { AttendanceDoc } from "@/types";

interface AbsentStudent {
  id: string;
  name: string;
  markedPresent?: boolean;
}

export default function TeacherReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    if (!sessionId) return;
    loadData(sessionId);
  }, [sessionId]);

  async function loadData(sid: string) {
    try {
      const [attendanceData, sessionDoc] = await Promise.all([
        getSessionAttendance(sid),
        getSession(sid),
      ]);
      const sorted = attendanceData.sort((a, b) => a.peerCount - b.peerCount);
      setRecords(sorted);

      if (sessionDoc) {
        const classDoc = await getClassById(sessionDoc.classId);
        if (classDoc && classDoc.studentIds.length > 0) {
          const checkedInIds = new Set(attendanceData.map((r) => r.studentId));
          const absentIds = classDoc.studentIds.filter((id) => !checkedInIds.has(id));
          if (absentIds.length > 0) {
            const students = await getClassStudents(absentIds);
            setAbsentStudents(students.map((s) => ({ id: s.id, name: s.name })));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleOverride = async (attendanceId: string, decision: "present" | "absent") => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === attendanceId
          ? { ...r, teacherOverride: decision, trustScore: decision === "present" ? "present" : "absent" }
          : r
      )
    );
    await teacherOverride(attendanceId, decision);
  };

  const handleAbsentOverride = (studentId: string) => {
    setAbsentStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, markedPresent: !s.markedPresent } : s))
    );
  };

  const handleExport = async () => {
    if (records.length === 0 && absentStudents.length === 0) {
      openSnackbar({ type: "default", text: "Không có dữ liệu để xuất" });
      return;
    }
    const statusMap: Record<string, string> = { present: "Có mặt", review: "Cần xem xét", absent: "Vắng" };
    const faceLabel = (fv?: AttendanceDoc["faceVerification"]): string => {
      if (!fv) return "Chưa";
      if (fv.skipped) return "Bỏ qua";
      if (fv.matched && fv.confidence >= 0.7) return "Khớp";
      return "Không khớp";
    };
    const header = "STT,Tên,MSSV,Trạng thái,Peer Count,Khuôn mặt,Thời gian check-in";
    const rows = records.map((r, i) => {
      const effectiveStatus = r.teacherOverride ? (r.teacherOverride === "present" ? "present" : "absent") : r.trustScore;
      return [i + 1, `"${r.studentName}"`, r.studentId, statusMap[effectiveStatus] || effectiveStatus, r.peerCount, faceLabel(r.faceVerification), new Date(r.checkedInAt).toLocaleString("vi-VN")].join(",");
    });
    const absentRows = absentStudents.map((s, i) => [records.length + i + 1, `"${s.name}"`, s.id, s.markedPresent ? "Có mặt (GV)" : "Vắng", 0, "N/A", "N/A"].join(","));
    const csv = "\uFEFF" + [header, ...rows, ...absentRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `diem-danh-${sessionId}-${date}.csv`;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      openSnackbar({ type: "success", text: "Đã xuất báo cáo" });
    } catch {
      try {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const { storage } = await import("@/config/firebase");
        const storageRef = ref(storage, `exports/${sessionId}/${filename}`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        if (navigator.clipboard) { await navigator.clipboard.writeText(downloadUrl); openSnackbar({ type: "success", text: "Link tải đã được sao chép!" }); }
        else { window.open(downloadUrl, "_blank"); }
      } catch { openSnackbar({ type: "default", text: "Không thể xuất file. Vui lòng thử lại." }); }
    }
  };

  const borderlineCases = records.filter((r) => r.trustScore === "review" && !r.teacherOverride);
  const presentCount = records.filter((r) => (r.teacherOverride === "present") || (!r.teacherOverride && r.trustScore === "present")).length;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderRadius: "0 0 24px 24px",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.12)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Xem xét điểm danh</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.12)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20, background: "#f8f9fa" }}>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { value: presentCount, label: "Có mặt", color: "#22c55e", bg: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)", borderColor: "rgba(34,197,94,0.12)", iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" },
            { value: borderlineCases.length, label: "Xem xét", color: "#f59e0b", bg: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)", borderColor: "rgba(245,158,11,0.12)", iconPath: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9v.01" },
            { value: absentStudents.length, label: "Vắng", color: "#ef4444", bg: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)", borderColor: "rgba(239,68,68,0.12)", iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14M15 9l-6 6M9 9l6 6" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, borderRadius: 20, padding: "16px 12px",
              background: s.bg, border: `1px solid ${s.borderColor}`,
              boxShadow: `0 2px 8px ${s.borderColor}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${s.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.iconPath} />
                </svg>
              </div>
              <span style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          style={{
            width: "100%", height: 48, borderRadius: 16,
            background: "linear-gradient(90deg, #be1d2c 0%, #dc2626 100%)",
            border: "none", boxShadow: "0 3px 10px rgba(190,29,44,0.19)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 600 }}>Xuất báo cáo</span>
        </button>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 100, borderRadius: 24, background: "#e5e7eb", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            ))}
          </div>
        ) : (
          <>
            {/* Section: Review */}
            {borderlineCases.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: "#f59e0b" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>CẦN XEM XÉT</span>
                  <div style={{ background: "#fef3c7", borderRadius: 10, padding: "2px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{borderlineCases.length}</span>
                  </div>
                </div>

                {borderlineCases.map((r) => (
                  <div key={r.id} style={{
                    background: "#ffffff", borderRadius: 24, padding: 20,
                    border: "1px solid rgba(0,0,0,0.03)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "flex", flexDirection: "column", gap: 16,
                  }}>
                    {/* Info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 14,
                        background: "linear-gradient(180deg, #be1d2c, #dc2626)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{r.studentName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{r.studentName}</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>
                          {r.peerCount} peers · {new Date(r.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div style={{ background: "#fef3c7", borderRadius: 12, padding: "4px 12px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>Xem xét</span>
                      </div>
                    </div>

                    <div style={{ height: 1, background: "#f3f4f6" }} />

                    {/* Action row */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => handleOverride(r.id, "present")}
                        style={{
                          flex: 1, height: 40, borderRadius: 14, border: "none",
                          background: "linear-gradient(90deg, #22c55e, #10b981)",
                          boxShadow: "0 3px 10px rgba(34,197,94,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Có mặt</span>
                      </button>
                      <button
                        onClick={() => handleOverride(r.id, "absent")}
                        style={{
                          flex: 1, height: 40, borderRadius: 14, border: "none",
                          background: "linear-gradient(90deg, #ef4444, #f87171)",
                          boxShadow: "0 3px 10px rgba(239,68,68,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Vắng</span>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Section: Absent */}
            {absentStudents.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: "#ef4444" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>VẮNG MẶT</span>
                  <div style={{ background: "#fee2e2", borderRadius: 10, padding: "2px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{absentStudents.length}</span>
                  </div>
                </div>

                {absentStudents.map((s) => (
                  <div key={s.id} style={{
                    background: "#ffffff", borderRadius: 24, padding: 20,
                    border: "1px solid rgba(0,0,0,0.03)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "flex", flexDirection: "column", gap: 16,
                  }}>
                    {/* Info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 14,
                        background: "linear-gradient(180deg, #6b7280, #9ca3af)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{s.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{s.name}</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>0 peers · --:--</p>
                      </div>
                      <div style={{ background: "#fee2e2", borderRadius: 12, padding: "4px 12px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                          {s.markedPresent ? "Có mặt" : "Vắng"}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: 1, background: "#f3f4f6" }} />

                    {/* Toggle row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Đánh dấu có mặt</span>
                      <button
                        onClick={() => handleAbsentOverride(s.id)}
                        style={{
                          width: 52, height: 28, borderRadius: 14, border: "none", padding: 3,
                          background: s.markedPresent ? "#22c55e" : "#e5e7eb",
                          display: "flex", alignItems: s.markedPresent ? "center" : "center",
                          justifyContent: s.markedPresent ? "flex-end" : "flex-start",
                          transition: "background 0.2s",
                        }}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: 11, background: "#ffffff" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
