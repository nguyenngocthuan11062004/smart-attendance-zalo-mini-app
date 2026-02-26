import React, { useState, useEffect } from "react";
import { Page, Avatar } from "zmp-ui";
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

const IconAttendance = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="5" width="20" height="26" rx="3" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M8 11h20" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M15 5V3M25 5V3" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="28" cy="28" r="7" fill="#ffffff" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M25 28l2 2 4-4" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconHistory = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="21" r="12" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M20 14v7l4.5 4.5" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 7l-3-2.5M27 7l3-2.5" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconFace = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="6" width="24" height="28" rx="4" stroke="#be1d2c" strokeWidth="1.7" />
    <circle cx="20" cy="17" r="5" stroke="#be1d2c" strokeWidth="1.5" />
    <path d="M13 30c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18" cy="16" r="0.8" fill="#be1d2c" />
    <circle cx="22" cy="16" r="0.8" fill="#be1d2c" />
  </svg>
);

const IconClasses = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="6" y="8" width="28" height="24" rx="3" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M6 14h28" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M14 8V5M26 8V5" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="11" y="18" width="5" height="4" rx="1" stroke="#be1d2c" strokeWidth="1.2" />
    <rect x="24" y="18" width="5" height="4" rx="1" stroke="#be1d2c" strokeWidth="1.2" />
    <rect x="11" y="25" width="5" height="4" rx="1" stroke="#be1d2c" strokeWidth="1.2" />
    <rect x="24" y="25" width="5" height="4" rx="1" stroke="#be1d2c" strokeWidth="1.2" />
  </svg>
);

const IconInfo = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="7" y="6" width="26" height="28" rx="3" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M13 14h14M13 20h14M13 26h10" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 10l4-4M33 10l-4-4" stroke="#be1d2c" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconManage = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <path d="M8 10h24v22a3 3 0 01-3 3H11a3 3 0 01-3-3V10z" stroke="#be1d2c" strokeWidth="1.7" />
    <path d="M8 10l4-4h16l4 4" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 18h8M16 23h5" stroke="#be1d2c" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/* ── component ───────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const [showCalendar, setShowCalendar] = useState(true);
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
    { title: "Điểm danh", icon: <IconAttendance />, path: "/student/classes" },
    { title: "Lịch sử", icon: <IconHistory />, path: "/student/history" },
    { title: "Khuôn mặt", icon: <IconFace />, path: "/student/face-register", highlight: !user.faceRegistered },
    { title: "Lớp học", icon: <IconClasses />, path: "/student/classes" },
  ];

  const teacherMenu: MenuItem[] = [
    { title: "Quản lý lớp", icon: <IconManage />, path: "/teacher/classes" },
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
            paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 10px)",
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

      <div style={{ padding: "0 16px 100px 16px" }}>
        {/* ── Profile section ── */}
        <div className="flex items-center" style={{ padding: "0 0 12px" }}>
          <Avatar src={user.avatar} size={48} />
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

        {/* ── Calendar widget ── */}
        {showCalendar && (
          <div
            style={{
              padding: "16px 16px 14px",
              marginBottom: 20,
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
                {formatViDate(today)}
              </p>
              <button onClick={() => setShowCalendar(false)} style={{ padding: 4, background: "transparent", border: "none" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Week day labels */}
            <div className="grid grid-cols-7" style={{ marginBottom: 6 }}>
              {WEEK_LABELS.map((d) => (
                <p
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#9ca3af",
                  }}
                >
                  {d}
                </p>
              ))}
            </div>

            {/* Week dates */}
            <div className="grid grid-cols-7" style={{ marginBottom: 14 }}>
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div key={i} className="flex justify-center">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isToday ? "#8b1a1a" : "#e8e8ed",
                        color: isToday ? "#fff" : "#4b5563",
                        fontSize: 15,
                        fontWeight: isToday ? 700 : 500,
                      }}
                    >
                      {String(d.getDate()).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
              {upcomingSessions.length > 0 ? (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 8 }}>Phiên đang hoạt động</p>
                  {upcomingSessions.map(({ classDoc, session }) => (
                    <button
                      key={session.id}
                      className="w-full"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 0",
                        background: "transparent",
                        border: "none",
                        textAlign: "left",
                      }}
                      onClick={() => navigate(
                        role === "teacher"
                          ? `/teacher/monitor/${session.id}`
                          : `/student/attendance/${session.id}`
                      )}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", marginRight: 10, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{classDoc.name}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>
                          {new Date(session.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 2l5 5-5 5" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : todayClasses.length > 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                  {todayClasses.length} lớp học · Chưa có phiên điểm danh
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Không có lịch</p>
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

        {/* ── Menu grid ── */}
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.title}
              className="active:scale-95"
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "22px 12px 18px",
                textAlign: "center",
                border: item.highlight ? "1.5px solid rgba(220,38,38,0.3)" : "none",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                transition: "transform 0.1s",
              }}
              onClick={() => navigate(item.path)}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                {item.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{item.title}</p>
              {item.highlight && (
                <p style={{ fontSize: 10, color: "#ef4444", marginTop: 3 }}>Chưa đăng ký</p>
              )}
            </button>
          ))}
        </div>

      </div>
    </Page>
  );
}
