import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { getClassById, getClassStudents } from "@/services/class.service";
import { getClassSessions } from "@/services/session.service";
import { getSessionAttendance } from "@/services/attendance.service";
import type { ClassDoc, SessionDoc } from "@/types";

interface SessionWithCount extends SessionDoc {
  checkedInCount?: number;
}

export default function TeacherClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
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

      const sessionList = await getClassSessions(cid);
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
      <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
        <div style={{
          background: "#be1d2c", borderRadius: "0 0 24px 24px",
          padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => navigate(-1)} style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Chi tiet lop</span>
          <button style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          </button>
        </div>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          <div style={{ display: "flex", gap: 12 }}>
            <div className="skeleton" style={{ height: 80, borderRadius: 12, flex: 1 }} />
            <div className="skeleton" style={{ height: 80, borderRadius: 12, flex: 1 }} />
          </div>
          <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
        </div>
      </Page>
    );
  }

  if (!classDoc) {
    return (
      <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
        <div style={{
          background: "#be1d2c", borderRadius: "0 0 24px 24px",
          padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => navigate(-1)} style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Chi tiet lop</span>
          <div style={{ width: 36 }} />
        </div>
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ color: "#9ca3af" }}>Khong tim thay lop hoc</p>
        </div>
      </Page>
    );
  }

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{classDoc.name}</span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero card - class code */}
        <div style={{
          background: "#be1d2c", borderRadius: 16, padding: 20,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>MA LOP</span>
          <span style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: 4 }}>{classDoc.code}</span>
          <button
            onClick={handleCopyCode}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.19)", borderRadius: 20,
              padding: "8px 16px", border: "none",
            }}
          >
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>
              {copied ? "Da copy!" : "Copy ma lop"}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              {copied ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>
              )}
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12 }}>
          {/* Sinh vien */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: 12,
            display: "flex", overflow: "hidden",
          }}>
            <div style={{ width: 3, background: "#be1d2c", borderRadius: "12px 0 0 12px" }} />
            <div style={{ padding: "16px 16px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#be1d2c" }}>{classDoc.studentIds.length}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Sinh vien</span>
            </div>
          </div>
          {/* Phien */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: 12,
            display: "flex", overflow: "hidden",
          }}>
            <div style={{ width: 3, background: "#a78bfa", borderRadius: "12px 0 0 12px" }} />
            <div style={{ padding: "16px 16px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{sessions.length}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Phien</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => navigate(`/teacher/session/${classDoc.id}`)}
            style={{
              height: 44, borderRadius: 12, background: "#be1d2c", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Diem danh</span>
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigate(`/teacher/fraud/${classDoc.id}`)}
              style={{
                flex: 1, height: 44, borderRadius: 12, background: "#f0f0f5", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 700 }}>Gian lan</span>
            </button>
            <button
              onClick={() => navigate(`/teacher/analytics/${classDoc.id}`)}
              style={{
                flex: 1, height: 44, borderRadius: 12, background: "#f0f0f5", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
              </svg>
              <span style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 700 }}>Thong ke</span>
            </button>
          </div>
        </div>

        {/* Recent sessions */}
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>PHIEN GAN DAY</span>

        {sessions.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Chua co phien nao</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/teacher/review/${s.id}`)}
                style={{
                  background: "#fff", borderRadius: 12, padding: 14,
                  border: "none", width: "100%", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 6,
                }}
              >
                <span style={{ color: "#1a1a1a", fontSize: 14, fontWeight: 600 }}>
                  {new Date(s.startedAt).toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                  })}
                  {" · "}
                  {new Date(s.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  {s.endedAt && `-${new Date(s.endedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 10px", borderRadius: 999,
                    fontSize: 11, fontWeight: 600,
                    background: s.status === "active" ? "rgba(34,197,94,0.15)" : "#dcfce7",
                    color: s.status === "active" ? "#22c55e" : "#22c55e",
                  }}>
                    {s.status === "active" ? "Dang diem danh" : "Hoan thanh"}
                  </span>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    {s.checkedInCount ?? 0}/{classDoc.studentIds.length} SV
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
