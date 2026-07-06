import React, { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeClass, updateClassConfig } from "@/services/class.service";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [faceRequired, setFaceRequired] = useState(true);
  const [peerRequired, setPeerRequired] = useState(true);
  const mountedRef = useRef(true);

  // Đã khởi tạo cấu hình face/peer từ doc lớp chưa — chỉ init 1 lần, để các
  // snapshot realtime sau (vd thêm SV) không ghi đè toggle GV đang thao tác.
  const configInitedRef = useRef(false);

  // Chỉ load DANH SÁCH PHIÊN (+ đếm check-in nền). Doc lớp do subscribeClass lo
  // realtime bên dưới. Giữ hàm này cho nút "Thử lại".
  const loadData = useCallback(async (cid: string) => {
    if (!mountedRef.current) return;
    setLoadError(null);
    try {
      const sessionList = await getClassSessions(cid).catch(() => [] as SessionDoc[]);
      if (!mountedRef.current) return;
      // Show sessions ngay với checkedInCount = undefined (UI hiện 0)
      setSessions(sessionList);

      // Background: fetch attendance counts với allSettled — một phiên fail
      // không ảnh hưởng phiên khác. Khi mỗi count xong, update state riêng.
      const results = await Promise.allSettled(
        sessionList.map((s) => getSessionAttendance(s.id))
      );
      if (!mountedRef.current) return;
      const counts: Record<string, number> = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled") counts[sessionList[i].id] = res.value.length;
      });
      setSessions((prev) =>
        prev.map((s) => (s.id in counts ? { ...s, checkedInCount: counts[s.id] } : s))
      );
    } catch (err: any) {
      if (!mountedRef.current) return;
      setLoadError(err?.message || "Không tải được dữ liệu lớp. Kiểm tra kết nối mạng.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!classId) return;
    setLoading(true);
    loadData(classId);
    // Realtime doc lớp: thêm SV vào roster / đổi cấu hình (kể cả từ admin web)
    // → sĩ số & thông tin lớp cập nhật ngay, không cần refresh.
    const unsub = subscribeClass(classId, (cls) => {
      if (!mountedRef.current) return;
      setClassDoc(cls);
      if (cls && !configInitedRef.current) {
        configInitedRef.current = true;
        setFaceRequired(cls.faceRequired !== false);
        setPeerRequired(cls.peerRequired !== false);
      }
      setLoading(false);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, [classId, loadData]);

  const handleToggleConfig = async (field: "faceRequired" | "peerRequired", value: boolean) => {
    if (!classDoc) return;
    if (field === "faceRequired") setFaceRequired(value);
    else setPeerRequired(value);
    const newConfig = {
      faceRequired: field === "faceRequired" ? value : faceRequired,
      peerRequired: field === "peerRequired" ? value : peerRequired,
    };
    await updateClassConfig(classDoc.id, newConfig).catch(() => {});
  };

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
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Chi tiết lớp</span>
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
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Chi tiết lớp</span>
          <div style={{ width: 36 }} />
        </div>
        <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: loadError ? "rgba(239,68,68,0.1)" : "rgba(156,163,175,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={loadError ? "#ef4444" : "#9ca3af"} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p style={{ color: loadError ? "#ef4444" : "#6b7280", fontSize: 14, fontWeight: 600, padding: "0 24px" }}>
            {loadError || "Không tìm thấy lớp học"}
          </p>
          {classId && (
            <button
              onClick={() => loadData(classId)}
              style={{
                background: "#be1d2c", border: "none",
                color: "#fff", fontSize: 14, fontWeight: 600,
                padding: "10px 24px", borderRadius: 10,
              }}
            >
              Thử lại
            </button>
          )}
        </div>
      </Page>
    );
  }

  // Danh sách SV của lớp = roster (danh sách chính thức GV import). Fallback
  // studentIds cho lớp cũ chưa có roster. "Số sinh viên" và danh sách dưới đây
  // đều dựa vào roster, không phải studentIds (chỉ chứa tài khoản đã liên kết).
  const rosterList: { mssv: string; name: string }[] =
    classDoc.roster && classDoc.roster.length > 0
      ? classDoc.roster
      : classDoc.studentIds.map((id) => ({ mssv: id, name: id }));

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
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>MÃ LỚP</span>
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
              {copied ? "Đã copy!" : "Copy mã lớp"}
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
          {/* Sinh viên */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: 12,
            display: "flex", overflow: "hidden",
          }}>
            <div style={{ width: 3, background: "#be1d2c", borderRadius: "12px 0 0 12px" }} />
            <div style={{ padding: "16px 16px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#be1d2c" }}>{rosterList.length}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Sinh viên</span>
            </div>
          </div>
          {/* Phiên */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: 12,
            display: "flex", overflow: "hidden",
          }}>
            <div style={{ width: 3, background: "#a78bfa", borderRadius: "12px 0 0 12px" }} />
            <div style={{ padding: "16px 16px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{sessions.length}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Phiên</span>
            </div>
          </div>
        </div>

        {/* Attendance config */}
        <div style={{
          background: "#fff", borderRadius: 12, overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CẤU HÌNH ĐIỂM DANH</span>
          </div>
          {/* Face toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>Xác minh khuôn mặt</span>
            </div>
            <button
              onClick={() => handleToggleConfig("faceRequired", !faceRequired)}
              style={{
                width: 44, height: 26, borderRadius: 13, border: "none",
                background: faceRequired ? "#22c55e" : "#e5e7eb",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: "#fff",
                position: "absolute", top: 2,
                left: faceRequired ? 20 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </button>
          </div>
          {/* Peer toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>Xác minh ngang hàng</span>
            </div>
            <button
              onClick={() => handleToggleConfig("peerRequired", !peerRequired)}
              style={{
                width: 44, height: 26, borderRadius: 13, border: "none",
                background: peerRequired ? "#22c55e" : "#e5e7eb",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: "#fff",
                position: "absolute", top: 2,
                left: peerRequired ? 20 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </button>
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
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Điểm danh</span>
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
              <span style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 700 }}>Gian lận</span>
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
              <span style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 700 }}>Thống kê</span>
            </button>
          </div>
        </div>

        {/* Danh sách sinh viên (roster chính thức) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>
            DANH SÁCH SINH VIÊN ({rosterList.length})
          </span>
        </div>

        {rosterList.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "24px 16px", textAlign: "center",
            border: "1px solid rgba(0,0,0,0.04)",
          }}>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 4 }}>Chưa có sinh viên trong lớp</p>
            <p style={{ color: "#9ca3af", fontSize: 12 }}>GV import danh sách (MSSV + họ tên) qua trang quản trị</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rosterList.map((s, i) => (
              <div key={s.mssv} style={{
                background: "#fff", borderRadius: 12, padding: 12,
                border: "1px solid rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, background: "#be1d2c",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{s.name.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{s.mssv}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>#{i + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent sessions */}
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>PHIÊN GẦN ĐÂY</span>

        {sessions.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Chưa có phiên nào</p>
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
                    {s.status === "active" ? "Đang điểm danh" : "Hoàn thành"}
                  </span>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    {s.checkedInCount ?? 0}/{rosterList.length} SV
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
