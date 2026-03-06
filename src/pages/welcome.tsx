import React from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M17 17h3v3M14 20h3" />
      </svg>
    ),
    iconBg: "rgba(190,29,44,0.08)",
    title: "QR Code",
    desc: "Quét mã từ giảng viên",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" /><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2" />
      </svg>
    ),
    iconBg: "rgba(167,139,250,0.08)",
    title: "Khuôn mặt",
    desc: "Nhận diện AI chống gian lận",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    iconBg: "rgba(34,197,94,0.08)",
    title: "P2P",
    desc: "Xác minh ngang hàng với bạn bè",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
      </svg>
    ),
    iconBg: "rgba(245,158,11,0.08)",
    title: "Bảo mật",
    desc: "Chống gian lận đa lớp",
  },
];

const TRUST_SEGMENTS = [
  { color: "#22c55e", label: "Có mặt" },
  { color: "#f59e0b", label: "Xem xét" },
  { color: "#ef4444", label: "Vắng" },
];

/* Circuit-board decorations for hero */
function HeroPattern() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 360" fill="none" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="90" width="390" height="1" fill="rgba(255,255,255,0.04)" />
      <rect x="0" y="180" width="390" height="1" fill="rgba(255,255,255,0.03)" />
      <rect x="0" y="270" width="390" height="1" fill="rgba(255,255,255,0.02)" />
      <polygon points="335,40 360,55 360,80 335,95 310,80 310,55" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <polygon points="357,75 375,86 375,107 357,118 339,107 339,86" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      <circle cx="128" cy="88" r="3" fill="rgba(255,255,255,0.19)" />
      <circle cx="258" cy="178" r="3" fill="rgba(255,255,255,0.15)" />
      <rect x="130" y="89" width="130" height="1.5" rx="1" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();

  const onStart = () => {
    localStorage.setItem("hasSeenWelcome", "1");
    navigate("/login", { replace: true });
  };

  return (
    <Page style={{ background: "#ffffff", minHeight: "100vh", padding: 0 }}>
      {/* Hero section */}
      <div style={{
        background: "#be1d2c", height: 360, position: "relative",
        borderRadius: "0 0 32px 32px", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <HeroPattern />
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", letterSpacing: 3 }}>inHUST</span>
          <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>Điểm danh thông minh</span>
        </div>
      </div>

      {/* Content section */}
      <div style={{ padding: "28px 24px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Section label */}
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CÁCH THỨC HOẠT ĐỘNG</span>

        {/* Feature grid - row 1 */}
        <div style={{ display: "flex", gap: 12 }}>
          {FEATURES.slice(0, 2).map((f) => (
            <div key={f.title} style={{
              flex: 1, background: "#f8f8fc", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: f.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {f.icon}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{f.title}</span>
              <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{f.desc}</span>
            </div>
          ))}
        </div>

        {/* Feature grid - row 2 */}
        <div style={{ display: "flex", gap: 12 }}>
          {FEATURES.slice(2, 4).map((f) => (
            <div key={f.title} style={{
              flex: 1, background: "#f8f8fc", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: f.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {f.icon}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{f.title}</span>
              <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{f.desc}</span>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div style={{
          display: "flex", alignItems: "center",
          background: "#f8f8fc", borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.04)",
        }}>
          {TRUST_SEGMENTS.map((seg, i) => (
            <React.Fragment key={seg.label}>
              {i > 0 && <div style={{ width: 1, height: 24, background: "#e5e5e5" }} />}
              <div style={{
                flex: 1, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: seg.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: seg.color }}>{seg.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onStart}
          style={{
            width: "100%", height: 54, borderRadius: 16,
            background: "#be1d2c", border: "none",
            boxShadow: "0 4px 16px rgba(190,29,44,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 700 }}>Bắt đầu ngay</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Page>
  );
}
