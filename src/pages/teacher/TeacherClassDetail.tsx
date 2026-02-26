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
      <Page className="page" style={{ background: "#f2f2f7" }}>
        <Header title="Chi tiết lớp" />
        <div className="space-y-3">
          <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton" style={{ height: 80, borderRadius: 20 }} />
            <div className="skeleton" style={{ height: 80, borderRadius: 20 }} />
          </div>
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
        </div>
      </Page>
    );
  }

  if (!classDoc) {
    return (
      <Page className="page" style={{ background: "#f2f2f7" }}>
        <Header title="Chi tiết lớp" />
        <div className="empty-state">
          <p style={{ color: "#9ca3af" }}>Không tìm thấy lớp học</p>
        </div>
      </Page>
    );
  }

  return (
    <Page className="page" style={{ background: "#f2f2f7" }}>
      <Header title={classDoc.name} />

      {/* Class code hero - glass card */}
      <div
        className="glass-card animate-fade-in"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f0f5 100%)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          textAlign: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Mã lớp</p>
        <p
          style={{
            color: "#1a1a1a",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.3em",
            fontFamily: "monospace",
            marginBottom: 12,
          }}
        >
          {classDoc.code}
        </p>
        <button
          className="press-scale"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.05)",
            color: "#1a1a1a",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
          }}
          onClick={handleCopyCode}
        >
          {copied ? (
            <span className="animate-success-pop" style={{ display: "inline-flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6 }}>
                <path d="M3 7l3 3 5-5" />
              </svg>
              <span style={{ color: "#22c55e" }}>Đã copy!</span>
            </span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6 }}>
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
        <div
          className="animate-bounce-in animate-stagger-1"
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "14px 8px",
            textAlign: "center",
            border: "1px solid rgba(0,0,0,0.06)",
            borderLeft: "3px solid #be1d2c",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: 22, fontWeight: 700, color: "#be1d2c" }}>{classDoc.studentIds.length}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Sinh viên</p>
        </div>
        <div
          className="animate-bounce-in animate-stagger-2"
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "14px 8px",
            textAlign: "center",
            border: "1px solid rgba(0,0,0,0.06)",
            borderLeft: "3px solid #a78bfa",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa" }}>{sessions.length}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Phiên điểm danh</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 mb-5">
        <button
          className="btn-primary-dark glow-red press-scale"
          style={{ flex: 1, padding: "10px 0" }}
          onClick={() => navigate(`/teacher/session/${classDoc.id}`)}
        >
          Điểm danh
        </button>
        <button
          className="btn-secondary-dark press-scale"
          style={{ flex: 1, padding: "10px 0" }}
          onClick={() => navigate(`/teacher/fraud/${classDoc.id}`)}
        >
          Gian lận
        </button>
        <button
          className="btn-secondary-dark press-scale"
          style={{ flex: 1, padding: "10px 0" }}
          onClick={() => navigate(`/teacher/analytics/${classDoc.id}`)}
        >
          Thống kê
        </button>
      </div>

      {/* Session history */}
      <p className="section-label">Lịch sử phiên ({sessions.length})</p>
      {sessions.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Chưa có phiên nào</p>
        </div>
      ) : (
        sessions.map((s, i) => (
          <div
            key={s.id}
            className={`hover-lift animate-stagger-${Math.min(i + 1, 10)}`}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 12,
              marginBottom: 8,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              cursor: "pointer",
            }}
            onClick={() => navigate(`/teacher/review/${s.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(190,29,44,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="9" cy="9" r="7" />
                    <path d="M9 5v4l2.5 2.5" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>
                    {new Date(s.startedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: 11 }}>
                    {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {s.endedAt && (
                      <> - {new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: s.status === "active" ? "rgba(34,197,94,0.15)" : "#f0f0f5",
                    color: s.status === "active" ? "#22c55e" : "#9ca3af",
                  }}
                >
                  {s.status === "active" ? "Đang điểm danh" : "Đã kết thúc"}
                </span>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {s.checkedInCount ?? 0}/{classDoc.studentIds.length} SV
                </p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Student list */}
      <div style={{ marginTop: 20 }}>
        <p className="section-label">Sinh viên ({students.length})</p>
        {students.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Chưa có sinh viên tham gia</p>
          </div>
        ) : (
          students.map((s, i) => {
            const ac = getAvatarColor(s.name);
            return (
              <div
                key={s.id}
                className={`animate-slide-up animate-stagger-${Math.min(i + 1, 10)}`}
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
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
                      overflow: "hidden",
                      border: `2px solid ${ac.text}`,
                    }}
                  >
                    {s.avatar ? (
                      <img src={s.avatar} alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }} />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <p style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Page>
  );
}
