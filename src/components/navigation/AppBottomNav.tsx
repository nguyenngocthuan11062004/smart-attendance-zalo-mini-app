import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAtomValue } from "jotai";
import { userRoleAtom } from "@/store/auth";

const IconHome = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#b91c1c" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 20V9.5z" />
    <path d="M9 21.5V14h6v7.5" />
  </svg>
);

const IconSearch = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#b91c1c" : "#9ca3af"} strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconUser = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#b91c1c" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
  </svg>
);

interface Tab {
  key: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: Tab[] = [
  { key: "/home", label: "Trang chủ", icon: (a) => <IconHome active={a} /> },
  { key: "/search", label: "Tra cứu", icon: (a) => <IconSearch active={a} /> },
  { key: "/profile", label: "Profile", icon: (a) => <IconUser active={a} /> },
];

export default function AppBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAtomValue(userRoleAtom);

  if (!role) return null;

  const hiddenPaths = ["/splash", "/welcome", "/login"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  const activePath = location.pathname;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        left: 30,
        right: 30,
        background: "#fff",
        borderRadius: 999,
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 1000,
      }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activePath === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 0 8px",
                background: "transparent",
                border: "none",
                position: "relative",
              }}
            >
              {tab.icon(isActive)}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#b91c1c" : "#9ca3af",
                  marginTop: 3,
                }}
              >
                {tab.label}
              </span>
              {/* Active indicator line */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "25%",
                    right: "25%",
                    height: 2.5,
                    borderRadius: 2,
                    background: "#b91c1c",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
