import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
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

  const borderlineCases = records.filter(
    (r) => r.trustScore === "review" && !r.teacherOverride
  );

  const presentCount = records.filter(
    (r) => (r.teacherOverride === "present") || (!r.teacherOverride && r.trustScore === "present")
  ).length;

  return (
    <Page className="page">
      <Header title="Xem xet diem danh" />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="stat-card bg-emerald-50 text-emerald-600">
          <p className="text-2xl font-bold">{presentCount}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Co mat</p>
        </div>
        <div className="stat-card bg-amber-50 text-amber-600">
          <p className="text-2xl font-bold">{borderlineCases.length}</p>
          <p className="text-[11px] text-amber-500 mt-0.5 font-medium">Xem xet</p>
        </div>
        <div className="stat-card bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{absentStudents.length}</p>
          <p className="text-[11px] text-red-500 mt-0.5 font-medium">Vang mat</p>
        </div>
      </div>

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
              <p className="section-label">Can xem xet ({borderlineCases.length})</p>
              {borderlineCases.map((r) => (
                <ReviewCard key={r.id} record={r} onOverride={handleOverride} />
              ))}
            </div>
          )}

          {/* Section 2: Absent students */}
          {absentStudents.length > 0 && (
            <div className="mb-5">
              <p className="section-label">Vang mat - Chua check-in ({absentStudents.length})</p>
              {absentStudents.map((s) => (
                <div key={s.id} className="card-flat p-4 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`avatar-circle ${getAvatarColor(s.name)} mr-3`} style={{ width: 36, height: 36, fontSize: 13 }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Text bold size="normal">{s.name}</Text>
                        <Text size="xxSmall" className="text-gray-400">Chua check-in</Text>
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
                    {s.markedPresent ? "Huy danh dau" : "Danh dau co mat (co ly do)"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Section 3: All checked-in records */}
          <div>
            <p className="section-label">Tat ca da check-in ({records.length})</p>
            {records.length === 0 ? (
              <div className="empty-state py-6">
                <Text size="small" className="text-gray-400">Khong co du lieu</Text>
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
          Co mat
        </button>
        <button
          className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 text-sm font-semibold active:bg-red-200"
          onClick={() => onOverride(record.id, "absent")}
        >
          Vang
        </button>
      </div>
    </div>
  );
}

