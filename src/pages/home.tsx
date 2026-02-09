import React, { useState } from "react";
import { Page, Avatar } from "zmp-ui";
import { useNavigate, Navigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/store/auth";
// useAuth removed – logout is now on the Profile page
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
    <rect x="8" y="5" width="20" height="26" rx="3" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M8 11h20" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M15 5V3M25 5V3" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="28" cy="28" r="7" fill="#fff" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M25 28l2 2 4-4" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconHistory = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="21" r="12" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M20 14v7l4.5 4.5" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 7l-3-2.5M27 7l3-2.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconFace = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="6" width="24" height="28" rx="4" stroke="#dc2626" strokeWidth="1.7" />
    <circle cx="20" cy="17" r="5" stroke="#dc2626" strokeWidth="1.5" />
    <path d="M13 30c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18" cy="16" r="0.8" fill="#dc2626" />
    <circle cx="22" cy="16" r="0.8" fill="#dc2626" />
  </svg>
);

const IconClasses = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="6" y="8" width="28" height="24" rx="3" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M6 14h28" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M14 8V5M26 8V5" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="11" y="18" width="5" height="4" rx="1" stroke="#dc2626" strokeWidth="1.2" />
    <rect x="24" y="18" width="5" height="4" rx="1" stroke="#dc2626" strokeWidth="1.2" />
    <rect x="11" y="25" width="5" height="4" rx="1" stroke="#dc2626" strokeWidth="1.2" />
    <rect x="24" y="25" width="5" height="4" rx="1" stroke="#dc2626" strokeWidth="1.2" />
  </svg>
);

const IconInfo = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <rect x="7" y="6" width="26" height="28" rx="3" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M13 14h14M13 20h14M13 26h10" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 10l4-4M33 10l-4-4" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconManage = () => (
  <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
    <path d="M8 10h24v22a3 3 0 01-3 3H11a3 3 0 01-3-3V10z" stroke="#dc2626" strokeWidth="1.7" />
    <path d="M8 10l4-4h16l4 4" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 18h8M16 23h5" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/* ── component ───────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const role = useAtomValue(userRoleAtom);
  const [showCalendar, setShowCalendar] = useState(true);

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
    { title: "Thông tin", icon: <IconInfo />, path: "/teacher/classes" },
  ];

  const menuItems = role === "student" ? studentMenu : teacherMenu;

  return (
    <Page style={{ background: "#f3f4f6", minHeight: "100vh", padding: 0 }}>
      {/* ── Red header + BK logo overlap ── */}
      <div style={{ position: "relative", marginBottom: 30 }}>
        {/* Red header bar */}
        <div
          style={{
            background: "linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)",
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

        {/* BK logo – straddles the red/gray boundary */}
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
            <p className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "#1f2937" }}>
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
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M16 2v4M8 2v4" />
            </svg>
          </button>
        </div>

        {/* ── Calendar widget ── */}
        {showCalendar && (
          <div className="card-flat" style={{ padding: "16px 16px 14px", marginBottom: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                {formatViDate(today)}
              </p>
              <button onClick={() => setShowCalendar(false)} style={{ padding: 4 }}>
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
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isToday ? "#7f1d1d" : "#f3f4f6",
                        color: isToday ? "#fff" : "#374151",
                        fontSize: 14,
                        fontWeight: isToday ? 700 : 500,
                      }}
                    >
                      {String(d.getDate()).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#d1d5db" }}>Không có lịch</p>
            </div>
          </div>
        )}

        {/* ── Menu grid ── */}
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.title}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "22px 12px 18px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                border: item.highlight ? "1.5px solid #fca5a5" : "1.5px solid transparent",
                transition: "transform 0.1s",
              }}
              className="active:scale-95"
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
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.title}</p>
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
