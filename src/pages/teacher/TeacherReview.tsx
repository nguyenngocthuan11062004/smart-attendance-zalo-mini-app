import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header, useSnackbar } from "zmp-ui";
import { useParams } from "react-router-dom";
import { getSessionAttendance, teacherOverride } from "@/services/attendance.service";
import { getSession } from "@/services/session.service";
import { getClassById, getClassStudents } from "@/services/class.service";
import TrustBadge from "@/components/attendance/TrustBadge";
import FaceStatusBadge from "@/components/face/FaceStatusBadge";
import type { AttendanceDoc } from "@/types";

interface AbsentStudent {
  id: string;
  name: string;
  markedPresent?: boolean;
}

const avatarColors = [
  "bg-red-100 text-red-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-rose-100 text-rose-600",
  "bg-orange-100 text-orange-600",
];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
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

    // Add absent students at the end of CSV
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

    // Try standard download first
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
      // Fallback for Zalo WebView: upload to Firebase Storage and share URL
      try {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const { storage } = await import("@/config/firebase");
        const storageRef = ref(storage, `exports/${sessionId}/${filename}`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        // Copy URL to clipboard or open in browser
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

  return (
    <Page className="page">
      <Header title="Xem xét điểm danh" />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="stat-card bg-emerald-50 text-emerald-600">
          <p className="text-2xl font-bold">{presentCount}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Có mặt</p>
        </div>
        <div className="stat-card bg-amber-50 text-amber-600">
          <p className="text-2xl font-bold">{borderlineCases.length}</p>
          <p className="text-[11px] text-amber-500 mt-0.5 font-medium">Xem xét</p>
        </div>
        <div className="stat-card bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{absentStudents.length}</p>
          <p className="text-[11px] text-red-500 mt-0.5 font-medium">Vắng mặt</p>
        </div>
      </div>

      {/* Export button */}
      <button
        className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center space-x-2 active:bg-gray-50 mb-4"
        onClick={handleExport}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>Xuất báo cáo</span>
      </button>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[80px]" />
          ))}
        </div>
      ) : (
        <>
          {/* Section 1: Borderline cases */}
          {borderlineCases.length > 0 && (
            <div className="mb-5">
              <p className="section-label">Cần xem xét ({borderlineCases.length})</p>
              {borderlineCases.map((r) => (
                <ReviewCard key={r.id} record={r} onOverride={handleOverride} />
              ))}
            </div>
          )}

          {/* Section 2: Absent students */}
          {absentStudents.length > 0 && (
            <div className="mb-5">
              <p className="section-label">Vắng mặt - Chưa check-in ({absentStudents.length})</p>
              {absentStudents.map((s) => (
                <div key={s.id} className="card-flat p-4 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`avatar-circle ${getAvatarColor(s.name)} mr-3`} style={{ width: 36, height: 36, fontSize: 13 }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Text bold size="normal">{s.name}</Text>
                        <Text size="xxSmall" className="text-gray-400">Chưa check-in</Text>
                      </div>
                    </div>
                    <TrustBadge score={s.markedPresent ? "present" : "absent"} size="small" />
                  </div>
                  <button
                    className={`w-full py-2 rounded-xl text-sm font-semibold ${
                      s.markedPresent
                        ? "bg-gray-100 text-gray-600 active:bg-gray-200"
                        : "bg-emerald-500 text-white active:bg-emerald-600"
                    }`}
                    onClick={() => handleAbsentOverride(s.id)}
                  >
                    {s.markedPresent ? "Hủy đánh dấu" : "Đánh dấu có mặt (có lý do)"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Section 3: All checked-in records */}
          <div>
            <p className="section-label">Tất cả đã check-in ({records.length})</p>
            {records.length === 0 ? (
              <div className="empty-state py-6">
                <Text size="small" className="text-gray-400">Không có dữ liệu</Text>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="card-flat p-3 mb-2">
                  <div className="flex items-center">
                    <div className={`avatar-circle ${getAvatarColor(r.studentName)} mr-3`} style={{ width: 36, height: 36, fontSize: 13 }}>
                      {r.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text bold size="normal" className="truncate">{r.studentName}</Text>
                      <div className="flex items-center flex-wrap gap-1 mt-0.5">
                        <Text size="xxSmall" className="text-gray-400">{r.peerCount} peer</Text>
                        <FaceStatusBadge faceVerification={r.faceVerification} size="small" />
                      </div>
                    </div>
                    <TrustBadge
                      score={r.teacherOverride ? (r.teacherOverride === "present" ? "present" : "absent") : r.trustScore}
                      size="small"
                    />
                  </div>
                </div>
              ))
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
  return (
    <div className="card-flat p-4 mb-2 border-l-4 border-amber-400">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className={`avatar-circle ${getAvatarColor(record.studentName)} mr-3`} style={{ width: 36, height: 36, fontSize: 13 }}>
            {record.studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Text bold size="normal">{record.studentName}</Text>
            <Text size="xxSmall" className="text-gray-400">
              {record.peerCount} peer | {new Date(record.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </div>
        </div>
        <TrustBadge score="review" size="small" />
      </div>
      <div className="mb-3">
        <FaceStatusBadge faceVerification={record.faceVerification} />
      </div>
      <div className="flex space-x-2">
        <button
          className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600"
          onClick={() => onOverride(record.id, "present")}
        >
          Có mặt
        </button>
        <button
          className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 text-sm font-semibold active:bg-red-200"
          onClick={() => onOverride(record.id, "absent")}
        >
          Vắng
        </button>
      </div>
    </div>
  );
}

