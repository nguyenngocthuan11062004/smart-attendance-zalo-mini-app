import React, { useEffect, useState } from "react";
import { Page, Box, Text, Button, Header } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { getClassById, getClassStudents } from "@/services/class.service";
import { getClassSessions } from "@/services/session.service";
import { getSessionAttendance } from "@/services/attendance.service";
import type { ClassDoc, SessionDoc } from "@/types";

interface StudentInfo {
  id: string;
  name: string;
  avatar: string;
}

interface SessionWithCount extends SessionDoc {
  checkedInCount?: number;
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

export default function TeacherClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!classId) return;
    loadData(classId);
  }, [classId]);

  async function loadData(cid: string) {
    try {
      const cls = await getClassById(cid);
      if (!cls) return;
      setClassDoc(cls);

      const [studentList, sessionList] = await Promise.all([
        cls.studentIds.length > 0 ? getClassStudents(cls.studentIds) : Promise.resolve([]),
        getClassSessions(cid),
      ]);

      setStudents(studentList);

      const sessionsWithCounts = await Promise.all(
        sessionList.map(async (s) => {
          const attendance = await getSessionAttendance(s.id);
          return { ...s, checkedInCount: attendance.length };
        })
      );
      setSessions(sessionsWithCounts);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyCode = () => {
    if (!classDoc) return;
    navigator.clipboard.writeText(classDoc.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <Page className="page">
        <Header title="Chi tiết lớp" />
        <div className="space-y-3">
          <div className="skeleton h-[120px] rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-[80px] rounded-2xl" />
            <div className="skeleton h-[80px] rounded-2xl" />
          </div>
          <div className="skeleton h-[48px] rounded-xl" />
        </div>
      </Page>
    );
  }

  if (!classDoc) {
    return (
      <Page className="page">
        <Header title="Chi tiết lớp" />
        <div className="empty-state">
          <Text className="text-gray-500">Không tìm thấy lớp học</Text>
        </div>
      </Page>
    );
  }

  return (
    <Page className="page">
      <Header title={classDoc.name} />

      {/* Class code hero */}
      <div className="gradient-blue rounded-2xl p-5 mb-4 text-center text-white">
        <p className="text-white/70 text-xs font-medium mb-1">Mã lớp</p>
        <p className="text-3xl font-bold tracking-[0.3em] font-mono mb-3">{classDoc.code}</p>
        <button
          className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium active:bg-white/30"
          onClick={handleCopyCode}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5">
                <path d="M3 7l3 3 5-5" />
              </svg>
              Đã copy!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5">
                <rect x="5" y="5" width="7" height="7" rx="1.5" />
                <path d="M9 5V3.5A1.5 1.5 0 007.5 2h-4A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
              </svg>
              Copy mã lớp
            </>
          )}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{classDoc.studentIds.length}</p>
          <p className="text-xs text-red-500 mt-0.5">Sinh viên</p>
        </div>
        <div className="stat-card bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-xs text-red-500 mt-0.5">Phiên điểm danh</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 mb-5">
        <Button
          className="flex-1"
          variant="primary"
          onClick={() => navigate(`/teacher/session/${classDoc.id}`)}
        >
          Điểm danh
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          onClick={() => navigate(`/teacher/fraud/${classDoc.id}`)}
        >
          Gian lận
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          onClick={() => navigate(`/teacher/analytics/${classDoc.id}`)}
        >
          Thống kê
        </Button>
      </div>

      {/* Session history */}
      <p className="section-label">Lịch sử phiên ({sessions.length})</p>
      {sessions.length === 0 ? (
        <div className="empty-state py-6">
          <Text size="small" className="text-gray-400">Chưa có phiên nào</Text>
        </div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className="card-flat p-3 mb-2 active:bg-gray-50"
            onClick={() => navigate(`/teacher/review/${s.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mr-3">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="9" cy="9" r="7" />
                    <path d="M9 5v4l2.5 2.5" />
                  </svg>
                </div>
                <div>
                  <Text bold size="normal">
                    {new Date(s.startedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                  <Text size="xxSmall" className="text-gray-400">
                    {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {s.endedAt && (
                      <> - {new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </Text>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    s.status === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.status === "active" ? "Đang điểm danh" : "Đã kết thúc"}
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {s.checkedInCount ?? 0}/{classDoc.studentIds.length} SV
                </p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Student list */}
      <div className="mt-5">
        <p className="section-label">Sinh viên ({students.length})</p>
        {students.length === 0 ? (
          <div className="empty-state py-6">
            <Text size="small" className="text-gray-400">Chưa có sinh viên tham gia</Text>
          </div>
        ) : (
          students.map((s) => (
            <div key={s.id} className="card-flat p-3 mb-2">
              <div className="flex items-center">
                <div className={`avatar-circle ${getAvatarColor(s.name)} mr-3`} style={{ width: 36, height: 36, fontSize: 13 }}>
                  {s.avatar ? (
                    <img src={s.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </div>
                <Text bold size="normal">{s.name}</Text>
              </div>
            </div>
          ))
        )}
      </div>
    </Page>
  );
}
