import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header, useSnackbar, Icon } from "zmp-ui";
import { useParams } from "react-router-dom";
import { getSessionAttendance, teacherOverride } from "@/services/attendance.service";
import { getSession } from "@/services/session.service";
import { getClassById, getClassStudents } from "@/services/class.service";
import TrustBadge from "@/components/attendance/TrustBadge";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import DarkStatCard from "@/components/ui/DarkStatCard";
import ScoreRing from "@/components/ui/ScoreRing";
import type { AttendanceDoc } from "@/types";

interface AbsentStudent {
  id: string;
  name: string;
  markedPresent?: boolean;
}

const avatarColorsDark = [
  { bg: "rgba(220,38,38,0.15)", text: "#ef4444" },
  { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarColorsDark[Math.abs(h) % avatarColorsDark.length];
}

export default function TeacherReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);

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

  const { openSnackbar } = useSnackbar();

  const handleExport = async () => {
    if (records.length === 0 && absentStudents.length === 0) {
      openSnackbar({ type: "default", text: "Không có dữ liệu để xuất" });
      return;
    }

    const statusMap: Record<string, string> = {
      present: "Có mặt",
      review: "Cần xem xét",
      absent: "Vắng",
    };

    const faceLabel = (fv?: AttendanceDoc["faceVerification"]): string => {
      if (!fv) return "Chưa";
      if (fv.skipped) return "Bỏ qua";
      if (fv.matched && fv.confidence >= 0.7) return "Khớp";
      return "Không khớp";
    };

    const header = "STT,Tên,MSSV,Trạng thái,Peer Count,Khuôn mặt,Thời gian check-in";
    const rows = records.map((r, i) => {
      const effectiveStatus = r.teacherOverride
        ? (r.teacherOverride === "present" ? "present" : "absent")
        : r.trustScore;
      const checkinTime = new Date(r.checkedInAt).toLocaleString("vi-VN");
      return [
        i + 1,
        `"${r.studentName}"`,
        r.studentId,
        statusMap[effectiveStatus] || effectiveStatus,
        r.peerCount,
        faceLabel(r.faceVerification),
        checkinTime,
      ].join(",");
    });

    const absentRows = absentStudents.map((s, i) => {
      return [
        records.length + i + 1,
        `"${s.name}"`,
        s.id,
        s.markedPresent ? "Có mặt (GV)" : "Vắng",
        0,
        "N/A",
        "N/A",
      ].join(",");
    });

    const csv = "\uFEFF" + [header, ...rows, ...absentRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `diem-danh-${sessionId}-${date}.csv`;

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      openSnackbar({ type: "success", text: "Đã xuất báo cáo" });
    } catch {
      try {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const { storage } = await import("@/config/firebase");
        const storageRef = ref(storage, `exports/${sessionId}/${filename}`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(downloadUrl);
          openSnackbar({ type: "success", text: "Link tải đã được sao chép!" });
        } else {
          window.open(downloadUrl, "_blank");
        }
      } catch {
        openSnackbar({ type: "default", text: "Không thể xuất file. Vui lòng thử lại." });
      }
    }
  };

  const borderlineCases = records.filter(
    (r) => r.trustScore === "review" && !r.teacherOverride
  );

  const presentCount = records.filter(
    (r) => (r.teacherOverride === "present") || (!r.teacherOverride && r.trustScore === "present")
  ).length;

  const totalCheckedIn = records.length;
  const totalAll = totalCheckedIn + absentStudents.length;
  const attendPercent = totalAll > 0 ? Math.round((presentCount / totalAll) * 100) : 0;

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title="Xem xét điểm danh" />

      {/* Summary stats with ScoreRing */}
      <div className="flex items-center justify-between mb-4">
        <div className="grid grid-cols-3 gap-2" style={{ flex: 1, marginRight: 12 }}>
          <div className="animate-bounce-in animate-stagger-1">
            <DarkStatCard value={presentCount} label="Có mặt" color="#22c55e" enhanced />
          </div>
          <div className="animate-bounce-in animate-stagger-2">
            <DarkStatCard value={borderlineCases.length} label="Xem xét" color="#f59e0b" enhanced />
          </div>
          <div className="animate-bounce-in animate-stagger-3">
            <DarkStatCard value={absentStudents.length} label="Vắng mặt" color="#ef4444" enhanced />
          </div>
        </div>
      </div>

      {/* Export button */}
      <Button
        variant="secondary"
        fullWidth
        style={{ marginBottom: 16 }}
        onClick={handleExport}
      >
        Xuất báo cáo
      </Button>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`skeleton animate-stagger-${i}`} style={{ height: 80 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Section 1: Borderline cases */}
          {borderlineCases.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p className="section-label">Cần xem xét ({borderlineCases.length})</p>
              {borderlineCases.map((r, i) => (
                <div key={r.id} className={`animate-stagger-${Math.min(i + 1, 10)}`}>
                  <ReviewCard record={r} onOverride={handleOverride} />
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Absent students */}
          {absentStudents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p className="section-label">Vắng mặt - Chưa check-in ({absentStudents.length})</p>
              {absentStudents.map((s, i) => {
                const ac = getAvatarColor(s.name);
                return (
                  <div
                    key={s.id}
                    className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)}`}
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            background: ac.bg,
                            color: ac.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            marginRight: 12,
                            border: `2px solid ${ac.text}`,
                          }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                          <p style={{ color: "#9ca3af", fontSize: 11 }}>Chưa check-in</p>
                        </div>
                      </div>
                      <TrustBadge score={s.markedPresent ? "present" : "absent"} size="small" />
                    </div>
                    <Button
                      variant={s.markedPresent ? "secondary" : "primary"}
                      type={s.markedPresent ? "neutral" : "highlight"}
                      fullWidth
                      size="small"
                      onClick={() => handleAbsentOverride(s.id)}
                    >
                      {s.markedPresent ? "Hủy đánh dấu" : "Đánh dấu có mặt (có lý do)"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 3: All checked-in records */}
          <div>
            <p className="section-label">Tất cả đã check-in ({records.length})</p>
            {records.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
                <p style={{ color: "#9ca3af", fontSize: 14 }}>Không có dữ liệu</p>
              </div>
            ) : (
              records.map((r, i) => {
                const ac = getAvatarColor(r.studentName);
                return (
                  <div
                    key={r.id}
                    className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)}`}
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-center">
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: ac.bg,
                          color: ac.text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          marginRight: 12,
                          flexShrink: 0,
                          border: `2px solid ${ac.text}`,
                        }}
                      >
                        {r.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }} className="truncate">{r.studentName}</p>
                        <div className="flex items-center flex-wrap gap-1 mt-0.5">
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>{r.peerCount} peer</span>
                          <FaceStatusBadge faceVerification={r.faceVerification} size="small" />
                        </div>
                      </div>
                      <TrustBadge
                        score={r.teacherOverride ? (r.teacherOverride === "present" ? "present" : "absent") : r.trustScore}
                        size="small"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </Page>
  );
}

function ReviewCard({
  record,
  onOverride,
}: {
  record: AttendanceDoc;
  onOverride: (id: string, decision: "present" | "absent") => void;
}) {
  const ac = getAvatarColor(record.studentName);
  return (
    <div
      className="glass-card-amber"
      style={{
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderLeft: "4px solid #f59e0b",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: ac.bg,
              color: ac.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              marginRight: 12,
              border: `2px solid ${ac.text}`,
            }}
          >
            {record.studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>{record.studentName}</p>
            <p style={{ color: "#9ca3af", fontSize: 11 }}>
              {record.peerCount} peer | {new Date(record.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <TrustBadge score="review" size="small" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <FaceStatusBadge faceVerification={record.faceVerification} />
      </div>
      <div className="flex space-x-2">
        <Button
          type="highlight"
          size="small"
          style={{ flex: 1 }}
          onClick={() => onOverride(record.id, "present")}
        >
          Có mặt
        </Button>
        <Button
          variant="secondary"
          size="small"
          style={{ flex: 1 }}
          onClick={() => onOverride(record.id, "absent")}
        >
          Vắng
        </Button>
      </div>
    </div>
  );
}
