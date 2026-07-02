import React, { useEffect, useState } from "react";
import { Page, useSnackbar } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { useParams, useNavigate } from "react-router-dom";
import { getSessionAttendance, teacherOverride, manualCheckIn } from "@/services/attendance.service";
import { getSession } from "@/services/session.service";
import { getClassById, getClassStudents } from "@/services/class.service";
import { effectiveTrustScore, getTrustScoreReasons } from "@/types";
import { checkGeoFence } from "@/utils/geo";
import DarkModal from "@/components/ui/DarkModal";
import type { AttendanceDoc, ClassDoc, SessionDoc } from "@/types";

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function faceChipText(fv?: AttendanceDoc["faceVerification"]): string {
  if (!fv) return "Chưa xác minh";
  if (fv.skipped) return "Bỏ qua";
  if (fv.matched) return `Khớp ${Math.round((fv.confidence ?? 0) * 100)}%`;
  return "Không khớp";
}

interface AbsentStudent {
  id: string;
  name: string;
  markedPresent?: boolean;
  manualReason?: string;
}

export default function TeacherReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId2, setSessionId2] = useState<string>("");
  const [manualTarget, setManualTarget] = useState<AbsentStudent | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
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
      // Tính lại trust score client-side dùng session config (fix session cũ thiếu field)
      const config = {
        faceRequired: sessionDoc?.faceRequired,
        peerRequired: sessionDoc?.peerRequired,
      };
      const recalculated = attendanceData.map((r) => ({
        ...r,
        trustScore: effectiveTrustScore(r, config),
      }));
      const sorted = recalculated.sort((a, b) => a.peerCount - b.peerCount);
      setRecords(sorted);
      setSessionId2(sid);
      setSession(sessionDoc);

      if (sessionDoc) {
        const classDoc = await getClassById(sessionDoc.classId);
        if (classDoc) {
          setClassDoc(classDoc);
          // Đối chiếu danh sách chính thức (roster) theo MSSV; fallback studentIds (lớp cũ)
          const checkedInKeys = new Set<string>();
          attendanceData.forEach((r) => { if (r.studentMssv) checkedInKeys.add(r.studentMssv); checkedInKeys.add(r.studentId); });
          if (classDoc.roster && classDoc.roster.length > 0) {
            setAbsentStudents(
              classDoc.roster
                .filter((e) => !checkedInKeys.has(e.mssv))
                .map((e) => ({ id: e.mssv, name: e.name }))
            );
          } else if (classDoc.studentIds.length > 0) {
            const absentIds = classDoc.studentIds.filter((id) => !checkedInKeys.has(id));
            if (absentIds.length > 0) {
              const students = await getClassStudents(absentIds);
              setAbsentStudents(students.map((s) => ({ id: s.id, name: s.name })));
            }
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

  const handleOpenManual = (student: AbsentStudent) => {
    setManualTarget(student);
    setManualReason("");
  };

  const handleManualSubmit = async () => {
    if (!manualTarget || !sessionId2) return;
    setManualSubmitting(true);
    try {
      // Lý do tùy chọn — nếu trống dùng default chuẩn cho late arrival sau khi
      // phiên đã kết thúc (B5: bổ sung SV đến muộn).
      const reason = manualReason.trim() || "SV đến muộn — GV bổ sung sau phiên";
      await manualCheckIn(sessionId2, manualTarget.id, manualTarget.name, reason, "present", session?.teacherId);
      setAbsentStudents((prev) =>
        prev.map((s) => s.id === manualTarget.id ? { ...s, markedPresent: true, manualReason: reason } : s)
      );
      openSnackbar({ type: "success", text: `Đã điểm danh thủ công cho ${manualTarget.name}` });
      setManualTarget(null);
    } catch {
      openSnackbar({ type: "default", text: "Lỗi khi điểm danh thủ công. Vui lòng thử lại." });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleUndoManual = async (student: AbsentStudent) => {
    if (!sessionId2) return;
    try {
      await manualCheckIn(sessionId2, student.id, student.name, "Hủy điểm danh thủ công", "absent", session?.teacherId);
      setAbsentStudents((prev) =>
        prev.map((s) => s.id === student.id ? { ...s, markedPresent: false, manualReason: undefined } : s)
      );
      openSnackbar({ type: "success", text: `Đã hủy điểm danh cho ${student.name}` });
    } catch {
      openSnackbar({ type: "default", text: "Lỗi khi hủy. Vui lòng thử lại." });
    }
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
    const header = "STT,Tên,MSSV,Trạng thái,Peer Count,Khuôn mặt,Thời gian check-in,Lý do thủ công";
    const rows = records.map((r, i) => {
      const effectiveStatus = r.teacherOverride ? (r.teacherOverride === "present" ? "present" : "absent") : r.trustScore;
      const manualNote = r.manualReason ? `"${r.manualReason}"` : "";
      return [i + 1, `"${r.studentName}"`, r.studentId, statusMap[effectiveStatus] || effectiveStatus, r.peerCount, faceLabel(r.faceVerification), new Date(r.checkedInAt).toLocaleString("vi-VN"), manualNote].join(",");
    });
    const absentRows = absentStudents.map((s, i) => [records.length + i + 1, `"${s.name}"`, s.id, s.markedPresent ? "Có mặt (GV)" : "Vắng", 0, "N/A", "N/A", s.manualReason ? `"${s.manualReason}"` : ""].join(","));
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
        else { openWebview({ url: downloadUrl }); }
      } catch { openSnackbar({ type: "default", text: "Không thể xuất file. Vui lòng thử lại." }); }
    }
  };

  const borderlineCases = records.filter((r) => r.trustScore === "review" && !r.teacherOverride);
  // Danh sách có mặt (gồm cả GV override present), sắp theo giờ quét
  const presentRecords = records
    .filter((r) => r.trustScore === "present")
    .sort((a, b) => a.checkedInAt - b.checkedInAt);
  // Đã quét QR nhưng bị GV đánh vắng — vẫn phải hiện để GV hoàn tác được
  const absentRecords = records.filter((r) => r.trustScore === "absent");
  const manualPresentCount = absentStudents.filter((s) => s.markedPresent).length;
  const absentRemaining = absentStudents.filter((s) => !s.markedPresent).length;
  const presentCount = presentRecords.length + manualPresentCount;
  const absentTotal = absentRemaining + absentRecords.length;
  const totalStudents = classDoc?.roster?.length ?? classDoc?.studentIds.length ?? 0;
  const presentPercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const durationMin = session?.endedAt
    ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
    : null;

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

        {/* Session info card */}
        {session && (
          <div style={{
            background: "#ffffff", borderRadius: 20, padding: 18,
            border: "1px solid rgba(0,0,0,0.03)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {/* Tên lớp + mã */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p className="truncate" style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{session.className}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af", marginTop: 2 }}>
                  {classDoc?.code ? `Mã lớp: ${classDoc.code.toUpperCase()}` : ""}
                  {classDoc?.location ? ` · Phòng ${classDoc.location.toUpperCase()}` : ""}
                </p>
              </div>
              <div style={{ background: "#f0f0f5", borderRadius: 10, padding: "4px 10px", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>
                  {session.status === "ended" ? "ĐÃ KẾT THÚC" : "ĐANG DIỄN RA"}
                </span>
              </div>
            </div>

            {/* Thời gian */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  {new Date(session.startedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  {fmtTime(session.startedAt)}{session.endedAt ? ` – ${fmtTime(session.endedAt)}` : ""}
                  {durationMin ? ` (${durationMin} phút)` : ""}
                </span>
              </div>
            </div>

            {/* Cấu hình phiên */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: `Khuôn mặt: ${session.faceRequired !== false ? "Bật" : "Tắt"}`, on: session.faceRequired !== false },
                { label: `Ngang hàng: ${session.peerRequired !== false ? "Bật" : "Tắt"}`, on: session.peerRequired !== false },
                ...(session.location ? [{ label: `GPS ≤ ${session.geoFenceRadius || 200}m`, on: true }] : []),
                { label: `QR xoay ${session.qrRefreshInterval || 30}s`, on: true },
              ].map((t) => (
                <div key={t.label} style={{
                  background: t.on ? "rgba(34,197,94,0.08)" : "#f0f0f5",
                  borderRadius: 8, padding: "4px 10px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.on ? "#16a34a" : "#9ca3af" }}>{t.label}</span>
                </div>
              ))}
            </div>

            {/* Tỉ lệ có mặt */}
            {totalStudents > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Tỉ lệ có mặt</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                    {presentCount}/{totalStudents} SV · {presentPercent}%
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{
                    width: `${presentPercent}%`, height: "100%", borderRadius: 4,
                    background: "linear-gradient(90deg, #22c55e, #10b981)",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { value: presentCount, label: "Có mặt", color: "#22c55e", bg: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)", borderColor: "rgba(34,197,94,0.12)", iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" },
            { value: borderlineCases.length, label: "Xem xét", color: "#f59e0b", bg: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)", borderColor: "rgba(245,158,11,0.12)", iconPath: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9v.01" },
            { value: absentTotal, label: "Vắng", color: "#ef4444", bg: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)", borderColor: "rgba(239,68,68,0.12)", iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14M15 9l-6 6M9 9l6 6" },
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

                    {/* Lý do xem xét */}
                    <div style={{ background: "#fffbeb", borderRadius: 10, padding: "8px 12px" }}>
                      {r.reviewReason && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#ef4444", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#b91c1c" }}>{r.reviewReason}</span>
                        </div>
                      )}
                      {getTrustScoreReasons(r.peerCount, r.faceVerification, {
                        faceRequired: session?.faceRequired,
                        peerRequired: session?.peerRequired,
                      }).map((reason, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#f59e0b", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: "#92400e" }}>{reason}</span>
                        </div>
                      ))}
                      {r.location && session?.location && (() => {
                        const geo = checkGeoFence(r.location, session.location, session.geoFenceRadius || 200);
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={geo.inRange ? "#22c55e" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            </svg>
                            <span style={{ fontSize: 11, color: geo.inRange ? "#16a34a" : "#dc2626" }}>
                              {geo.inRange ? `Trong phạm vi (${geo.distance}m)` : `Ngoài phạm vi (${geo.distance}m)`}
                            </span>
                          </div>
                        );
                      })()}
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

            {/* Section: Present — chi tiết từng SV đã điểm danh hợp lệ */}
            {presentRecords.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: "#22c55e" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>CÓ MẶT</span>
                  <div style={{ background: "#dcfce7", borderRadius: 10, padding: "2px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>{presentRecords.length}</span>
                  </div>
                </div>

                {presentRecords.map((r) => {
                  const isManual = !!r.manualReason || r.teacherOverride === "present";
                  const geo = r.location && session?.location
                    ? checkGeoFence(r.location, session.location, session.geoFenceRadius || 200)
                    : null;
                  const faceReq = session?.faceRequired !== false;
                  const peerReq = session?.peerRequired !== false;
                  return (
                    <div key={r.id} style={{
                      background: "#ffffff", borderRadius: 20, padding: 16,
                      border: "1px solid rgba(0,0,0,0.03)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                      display: "flex", flexDirection: "column", gap: 12,
                    }}>
                      {/* Info row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 14,
                          background: "linear-gradient(180deg, #22c55e, #10b981)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{r.studentName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{r.studentName}</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>
                            {r.studentMssv ? `${r.studentMssv} · ` : ""}quét lúc {fmtTime(r.checkedInAt)}
                          </p>
                        </div>
                        <div style={{ background: "#dcfce7", borderRadius: 12, padding: "4px 12px", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                            {isManual ? "GV xác nhận" : "Có mặt"}
                          </span>
                        </div>
                      </div>

                      {/* Detail chips: QR / Face / Peer / GPS */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.08)", borderRadius: 8, padding: "4px 10px" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>QR hợp lệ</span>
                        </div>
                        {(faceReq || r.faceVerification) && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, padding: "4px 10px",
                            background: r.faceVerification?.matched ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.1)",
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={r.faceVerification?.matched ? "#16a34a" : "#f59e0b"} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
                            <span style={{ fontSize: 11, fontWeight: 600, color: r.faceVerification?.matched ? "#16a34a" : "#b45309" }}>
                              Mặt: {faceChipText(r.faceVerification)}
                            </span>
                          </div>
                        )}
                        {peerReq && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, padding: "4px 10px",
                            background: r.peerCount >= 3 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.1)",
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={r.peerCount >= 3 ? "#16a34a" : "#f59e0b"} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                            <span style={{ fontSize: 11, fontWeight: 600, color: r.peerCount >= 3 ? "#16a34a" : "#b45309" }}>
                              {r.peerCount}/3 peers
                            </span>
                          </div>
                        )}
                        {geo && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 8, padding: "4px 10px",
                            background: geo.inRange ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={geo.inRange ? "#16a34a" : "#ef4444"} strokeWidth="2" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                            <span style={{ fontSize: 11, fontWeight: 600, color: geo.inRange ? "#16a34a" : "#dc2626" }}>
                              {geo.inRange ? `Trong phạm vi (${geo.distance}m)` : `Ngoài phạm vi (${geo.distance}m)`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ghi chú thủ công */}
                      {r.manualReason && (
                        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: "#166534" }}>📝 {r.manualReason}</span>
                        </div>
                      )}

                      {/* Action: chuyển sang vắng */}
                      <button
                        onClick={() => handleOverride(r.id, "absent")}
                        style={{
                          height: 36, borderRadius: 12,
                          border: "1px solid rgba(239,68,68,0.25)", background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>Chuyển sang vắng</span>
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Section: Absent */}
            {(absentStudents.length > 0 || absentRecords.length > 0) && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: "#ef4444" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5 }}>VẮNG MẶT</span>
                  <div style={{ background: "#fee2e2", borderRadius: 10, padding: "2px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{absentTotal}</span>
                  </div>
                </div>

                {/* SV ĐÃ quét QR nhưng bị GV đánh vắng — cho phép hoàn tác */}
                {absentRecords.map((r) => (
                  <div key={r.id} style={{
                    background: "#ffffff", borderRadius: 20, padding: 16,
                    border: "1px solid rgba(0,0,0,0.03)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "flex", flexDirection: "column", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 14,
                        background: "linear-gradient(180deg, #ef4444, #f87171)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{r.studentName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{r.studentName}</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>
                          {r.studentMssv ? `${r.studentMssv} · ` : ""}đã quét lúc {fmtTime(r.checkedInAt)} · GV đánh vắng
                        </p>
                      </div>
                      <div style={{ background: "#fee2e2", borderRadius: 12, padding: "4px 12px", flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>Vắng (GV)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOverride(r.id, "present")}
                      style={{
                        height: 36, borderRadius: 12,
                        border: "1px solid rgba(34,197,94,0.3)", background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                      <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>Hoàn tác — chuyển có mặt</span>
                    </button>
                  </div>
                ))}

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
                        background: s.markedPresent
                          ? "linear-gradient(180deg, #22c55e, #10b981)"
                          : "linear-gradient(180deg, #6b7280, #9ca3af)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{s.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{s.name}</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>
                          {s.markedPresent ? "Thủ công bởi GV" : "0 peers · --:--"}
                        </p>
                      </div>
                      <div style={{
                        background: s.markedPresent ? "#dcfce7" : "#fee2e2",
                        borderRadius: 12, padding: "4px 12px",
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.markedPresent ? "#22c55e" : "#ef4444" }}>
                          {s.markedPresent ? "Có mặt (GV)" : "Vắng"}
                        </span>
                      </div>
                    </div>

                    {/* Reason display */}
                    {s.markedPresent && s.manualReason && (
                      <div style={{
                        background: "#f0fdf4", borderRadius: 12, padding: "10px 14px",
                        display: "flex", alignItems: "flex-start", gap: 8,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                        <span style={{ fontSize: 13, color: "#166534" }}>{s.manualReason}</span>
                      </div>
                    )}

                    <div style={{ height: 1, background: "#f3f4f6" }} />

                    {/* Action row */}
                    {!s.markedPresent ? (
                      <button
                        onClick={() => handleOpenManual(s)}
                        style={{
                          height: 40, borderRadius: 14, border: "none",
                          background: "linear-gradient(90deg, #22c55e, #10b981)",
                          boxShadow: "0 3px 10px rgba(34,197,94,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Điểm danh thủ công</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUndoManual(s)}
                        style={{
                          height: 40, borderRadius: 14,
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                        </svg>
                        <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>Hủy điểm danh</span>
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Manual attendance modal */}
      <DarkModal
        visible={!!manualTarget}
        onClose={() => setManualTarget(null)}
        title="Điểm danh thủ công"
      >
        {manualTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Student info */}
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

            {/* Reason input — optional */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Lý do điểm danh thủ công <span style={{ fontWeight: 400, color: "#9ca3af" }}>(không bắt buộc)</span>
              </label>
              <textarea
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="VD: SV đến muộn, điện thoại hết pin..."
                rows={3}
                style={{
                  width: "100%", borderRadius: 12, border: "1px solid #e5e7eb",
                  padding: "10px 14px", fontSize: 14, resize: "none",
                  outline: "none", background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Warning */}
            <div style={{
              background: "#fef3c7", borderRadius: 12, padding: "10px 14px",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              <span style={{ fontSize: 12, color: "#92400e" }}>Hành động này sẽ được ghi log. Lý do sẽ hiển thị trong báo cáo.</span>
            </div>

            {/* Buttons */}
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
    </Page>
  );
}
