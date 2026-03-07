import React, { useState, useEffect } from "react";
import { Page } from "zmp-ui";
import { useNavigate, Navigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
import { globalErrorAtom } from "@/store/ui";
// useAuth removed – logout is now on the Profile page
import { getStudentClasses, getTeacherClasses } from "@/services/class.service";
import { getActiveSessionForClass } from "@/services/session.service";
import type { ClassDoc, SessionDoc } from "@/types";
import logo from "@/static/icon_inhust.png";
import bkLogo from "@/static/bk_logo.png";

/* ── helpers ─────────────────────────────────────── */

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDates(today: Date) {
  const day = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatViDate(d: Date) {
  return `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

/* ── icons (red line-art, matching eHUST style) ──── */

/* ── Lucide icons (matching Pencil design 5xqQ5) ── */

const IconScanLine = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </svg>
);

const IconHistory = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
  </svg>
);

const IconBookOpen = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </svg>
);

const IconChart = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" x2="6" y1="20" y2="16" /><line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
  </svg>
);

const IconCalendarRange = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" />
    <path d="M3 10h18" /><path d="M17 14h-6" /><path d="M13 18H7" />
  </svg>
);

const IconScanFace = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <path d="M9 9h.01" /><path d="M15 9h.01" />
  </svg>
);

const IconUsers = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconInfo = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);

/* ── component ───────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<{classDoc: ClassDoc; session: SessionDoc}[]>([]);
  const [todayClasses, setTodayClasses] = useState<ClassDoc[]>([]);

  const setGlobalError = useSetAtom(globalErrorAtom);

  useEffect(() => {
    if (!user?.id || !role) return;
    const loadData = async () => {
      try {
        const classes = role === "teacher"
          ? await getTeacherClasses(user.id)
          : await getStudentClasses(user.id);
        setTodayClasses(classes);

        const sessions: {classDoc: ClassDoc; session: SessionDoc}[] = [];
        for (const c of classes) {
          const s = await getActiveSessionForClass(c.id);
          if (s) sessions.push({ classDoc: c, session: s });
        }
        setUpcomingSessions(sessions);
      } catch {
        setGlobalError("Không thể tải dữ liệu trang chủ");
      }
    };
    loadData();
  }, [user?.id, role]);

  if (!user) return null;
  if (!role) return <Navigate to="/login" replace />;

  const today = new Date();
  const weekDates = getWeekDates(today);

  interface MenuItem { title: string; icon: React.ReactNode; path: string; highlight?: boolean }

  const studentMenu: MenuItem[] = [
    { title: "Điểm danh", icon: <IconScanLine />, path: "/student/classes" },
    { title: "Lịch sử", icon: <IconHistory />, path: "/student/history" },
    { title: "Khuôn mặt", icon: <IconScanFace />, path: "/student/face-register", highlight: !user.faceRegistered },
    { title: "Lớp học", icon: <IconBookOpen />, path: "/student/classes" },
    { title: "Thời khóa biểu", icon: <IconCalendarRange />, path: "/student/schedule" },
  ];

  const teacherMenu: MenuItem[] = [
    { title: "Quản lý lớp", icon: <IconUsers />, path: "/teacher/classes" },
    { title: "Thông tin", icon: <IconInfo />, path: "/profile" },
  ];

  const menuItems = role === "student" ? studentMenu : teacherMenu;

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* ── Red header + BK logo overlap ── */}
      <div style={{ position: "relative", marginBottom: 30 }}>
        {/* Red header bar */}
        <div
          style={{
            background: "#be1d2c",
            paddingTop: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px)",
            paddingBottom: 32,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div className="flex items-center justify-between">
            {/* Spacer to balance the bell on the right */}
            <div style={{ width: 26 }} />
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: 1.5,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              inHUST
            </span>
            {/* Notification bell */}
            <div className="relative">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
          </div>
        </div>

        {/* BK logo – straddles the header/body boundary */}
        <img
          src={bkLogo}
          alt="Bách Khoa"
          style={{
            position: "absolute",
            left: 16,
            bottom: -24,
            width: 56,
            height: 56,
            objectFit: "contain",
          }}
        />
      </div>

      <div style={{ padding: "0 16px", paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}>
        {/* ── Profile section ── */}
        <div className="flex items-center" style={{ padding: "0 0 12px" }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover", flexShrink: 0 }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: 24, background: "#be1d2c",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{user.name?.charAt(0)?.toUpperCase() || "?"}</span>
            </div>
          )}
          <div className="flex-1 ml-3 min-w-0">
            <p className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>
              {user.name}
              {user.mssv && (
                <span style={{ fontWeight: 400, color: "#6b7280" }}> | {user.mssv}</span>
              )}
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {role === "student" ? "Kỹ thuật máy tính" : "Giảng viên"}
            </p>
          </div>
          <button
            onClick={() => setShowCalendar((v) => !v)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "none",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M16 2v4M8 2v4" />
            </svg>
          </button>
        </div>

        {/* ── Weekly calendar (design toCr9) ── */}
        {showCalendar && (
          <div style={{
            background: "#ffffff", borderRadius: 24, marginBottom: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            {/* Top: date + week strip */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Date row + close */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  {formatViDate(today)}
                </span>
                <button onClick={() => setShowCalendar(false)} style={{
                  width: 32, height: 32, borderRadius: 16, background: "#f3f4f6",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Week day labels */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {WEEK_LABELS.map((d) => (
                  <span key={d} style={{ width: 42, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>{d}</span>
                ))}
              </div>

              {/* Week dates (circular, selectable) */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {weekDates.map((d, i) => {
                  const dayNum = d.getDate();
                  const isActive = selectedDay === null
                    ? d.toDateString() === today.toDateString()
                    : dayNum === selectedDay;
                  const dow = d.getDay();
                  const hasClass = dow >= 1 && dow <= 5;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(dayNum)}
                      style={{ width: 42, display: "flex", flexDirection: "column", alignItems: "center", background: "transparent", border: "none", padding: 0 }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: isActive ? "#be1d2c" : "#e5e7eb",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{
                          fontSize: 16, fontWeight: isActive ? 700 : 600,
                          color: isActive ? "#ffffff" : "#374151",
                        }}>
                          {String(dayNum).padStart(2, "0")}
                        </span>
                      </div>
                      {hasClass ? (
                        <div style={{
                          width: 6, height: 6, borderRadius: 3, marginTop: 4,
                          background: isActive ? "#60bfff" : "#3b82f6",
                        }} />
                      ) : (
                        <div style={{ width: 6, height: 6, marginTop: 4 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#e5e7eb" }} />

            {/* Bottom: schedule cards */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {upcomingSessions.length > 0 ? (
                upcomingSessions.map(({ classDoc, session }) => {
                  const startTime = new Date(session.startedAt);
                  const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);
                  const fmtTime = (d: Date) => d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(
                        role === "teacher"
                          ? `/teacher/monitor/${session.id}`
                          : `/student/attendance/${session.id}`
                      )}
                      style={{
                        background: "#fef2f2", borderRadius: 16, padding: "18px 16px",
                        display: "flex", alignItems: "center", gap: 16,
                        border: "none", textAlign: "left", width: "100%",
                      }}
                    >
                      {/* Time column */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{fmtTime(startTime)}</span>
                        <div style={{ width: 2, height: 20, borderRadius: 1, background: "#d1d5db" }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af" }}>{fmtTime(endTime)}</span>
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{classDoc.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: "#be1d2c", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>Phiên đang hoạt động</span>
                        </div>
                      </div>
                      {/* Chevron */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  );
                })
              ) : todayClasses.length > 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                  {todayClasses.length} lớp học · Chưa có phiên điểm danh
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Không có lịch hôm nay</p>
              )}
            </div>
          </div>
        )}

        {/* ── Quick stats ── */}
        {role === "student" && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Thống kê nhanh</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: todayClasses.length, label: "Lớp học", color: "#be1d2c" },
                { value: upcomingSessions.length, label: "Phiên hoạt động", color: "#22c55e" },
                { value: user.faceRegistered ? "\u2713" : "\u2717", label: "Khuôn mặt", color: user.faceRegistered ? "#22c55e" : "#f59e0b" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    padding: "14px 8px",
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <p style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === "teacher" && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Thống kê</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: todayClasses.length, label: "Lớp học", color: "#be1d2c" },
                { value: todayClasses.reduce((sum, c) => sum + c.studentIds.length, 0), label: "Sinh viên", color: "#a78bfa" },
                { value: upcomingSessions.length, label: "Phiên hoạt động", color: "#22c55e" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    padding: "14px 8px",
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <p style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Menu grid (Lucide icons, matching design 5xqQ5) ── */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.title}
              className="active:scale-95"
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "18px 12px",
                border: item.highlight ? "1.5px solid rgba(220,38,38,0.3)" : "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                transition: "transform 0.1s",
              }}
              onClick={() => navigate(item.path)}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#fce8e8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {item.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{item.title}</span>
              {item.highlight && (
                <span style={{ fontSize: 9, color: "#ef4444", marginTop: -4 }}>Chưa đăng ký</span>
              )}
            </button>
          ))}
        </div>

      </div>

      {/* ── Floating AI Chat Bubble ── */}
      <button
        onClick={() => navigate("/ai-chat")}
        className="active:scale-90"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          border: "none",
          background: "linear-gradient(225deg, #7c3aed 0%, #be1d2c 50%, #f59e0b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
          transition: "transform 0.15s",
          zIndex: 100,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          <path d="M20 3v4" /><path d="M22 5h-4" />
        </svg>
      </button>
    </Page>
  );
}
