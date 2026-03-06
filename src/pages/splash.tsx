import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { currentUserAtom, isAuthenticatedAtom, authInitializedAtom } from "@/store/auth";

/* Circuit board SVG background pattern */
function CircuitPattern() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 390 844"
      fill="none"
      style={{ position: "absolute", inset: 0 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Grid lines */}
      <rect x="0" y="168" width="390" height="1" fill="rgba(255,255,255,0.04)" />
      <rect x="0" y="336" width="390" height="1" fill="rgba(255,255,255,0.04)" />
      <rect x="0" y="504" width="390" height="1" fill="rgba(255,255,255,0.04)" />
      <rect x="0" y="672" width="390" height="1" fill="rgba(255,255,255,0.04)" />
      <rect x="78" y="0" width="1" height="844" fill="rgba(255,255,255,0.03)" />
      <rect x="195" y="0" width="1" height="844" fill="rgba(255,255,255,0.03)" />
      <rect x="312" y="0" width="1" height="844" fill="rgba(255,255,255,0.03)" />

      {/* Traces */}
      <rect x="78" y="168" width="117" height="1.5" rx="1" fill="rgba(255,255,255,0.09)" />
      <rect x="195" y="168" width="1.5" height="168" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="195" y="504" width="117" height="1.5" rx="1" fill="rgba(255,255,255,0.09)" />
      <rect x="78" y="504" width="1.5" height="168" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="312" y="336" width="78" height="1.5" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="312" y="336" width="1.5" height="168" rx="1" fill="rgba(255,255,255,0.07)" />

      {/* Circuit nodes */}
      <circle cx="78" cy="168" r="3" fill="rgba(255,255,255,0.19)" />
      <circle cx="312" cy="168" r="3" fill="rgba(255,255,255,0.15)" />
      <circle cx="195" cy="336" r="3" fill="rgba(255,255,255,0.12)" />
      <circle cx="78" cy="504" r="3" fill="rgba(255,255,255,0.15)" />
      <circle cx="312" cy="504" r="3" fill="rgba(255,255,255,0.19)" />
      <circle cx="195" cy="672" r="3" fill="rgba(255,255,255,0.12)" />
      <circle cx="78" cy="672" r="3" fill="rgba(255,255,255,0.13)" />
      <circle cx="312" cy="336" r="3" fill="rgba(255,255,255,0.13)" />

      {/* Node rings */}
      <circle cx="78" cy="168" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx="312" cy="504" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Chips */}
      <rect x="140" y="160" width="24" height="16" rx="3" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <rect x="250" y="498" width="20" height="12" rx="2" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      <rect x="120" y="663" width="28" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Hexagons */}
      <polygon points="50,80 70,91 70,113 50,124 30,113 30,91" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <polygon points="85,100 105,111 105,133 85,144 65,133 65,111" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <polygon points="330,620 350,631 350,653 330,664 310,653 310,631" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <polygon points="365,640 385,651 385,673 365,684 345,673 345,651" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <polygon points="335,60 350,69 350,86 335,95 320,86 320,69" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Flow dots */}
      <circle cx="132" cy="168" r="2" fill="rgba(255,255,255,0.31)" />
      <circle cx="195" cy="242" r="2" fill="rgba(255,255,255,0.27)" />
      <circle cx="252" cy="504" r="2" fill="rgba(255,255,255,0.31)" />
      <circle cx="78" cy="582" r="2" fill="rgba(255,255,255,0.27)" />

      {/* Brackets */}
      <rect x="48" y="320" width="12" height="24" rx="0" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      <rect x="330" y="410" width="12" height="24" rx="0" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Center glow */}
      <ellipse cx="195" cy="422" rx="150" ry="150" fill="url(#centerGlow)" />
      <defs>
        <radialGradient id="centerGlow">
          <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Binary text */}
      <text x="20" y="48" fontFamily="Roboto Mono, monospace" fontSize="10" letterSpacing="2" fill="rgba(255,255,255,0.05)">01001001 01101110</text>
      <text x="220" y="798" fontFamily="Roboto Mono, monospace" fontSize="10" letterSpacing="2" fill="rgba(255,255,255,0.05)">10110100 01010011</text>

      {/* Code symbols */}
      <text x="30" y="755" fontFamily="Roboto Mono, monospace" fontSize="14" fontWeight="600" fill="rgba(255,255,255,0.08)">&lt;/&gt;</text>
      <text x="340" y="755" fontFamily="Roboto Mono, monospace" fontSize="14" fontWeight="600" fill="rgba(255,255,255,0.08)">{"{ }"}</text>

      {/* Scan lines */}
      <rect x="20" y="260" width="50" height="1" fill="url(#scanLine)" />
      <rect x="320" y="560" width="50" height="1" fill="url(#scanLine2)" />
      <defs>
        <linearGradient id="scanLine">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="scanLine2">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function SplashPage() {
  const navigate = useNavigate();
  const currentUser = useAtomValue(currentUserAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authInitialized = useAtomValue(authInitializedAtom);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // After 2s, mark ready to navigate
  useEffect(() => {
    const timer = setTimeout(() => setReadyToNavigate(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // When ready + auth resolved, start fade-out then navigate
  useEffect(() => {
    if (!readyToNavigate || !authInitialized) return;

    setFadeOut(true);
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome") === "1";
    const hasRole = isAuthenticated && currentUser?.role && currentUser.role !== "";

    const timer = setTimeout(() => {
      if (!hasSeenWelcome) {
        navigate("/welcome", { replace: true });
      } else if (!hasRole) {
        navigate("/login", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [readyToNavigate, authInitialized, isAuthenticated, currentUser, navigate]);

  // Fallback timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!authInitialized) {
        setFadeOut(true);
        const hasSeenWelcome = localStorage.getItem("hasSeenWelcome") === "1";
        setTimeout(() => navigate(hasSeenWelcome ? "/login" : "/welcome", { replace: true }), 600);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [authInitialized, navigate]);

  return (
    <Page style={{ padding: 0, margin: 0, minHeight: "100vh", background: "#be1d2c" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#be1d2c",
          opacity: fadeOut ? 0 : fadeIn ? 1 : 0,
          transition: fadeOut ? "opacity 0.6s ease-out" : "opacity 0.8s ease-in",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Circuit board background */}
        <CircuitPattern />

        {/* Brand name */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: 46,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: 5,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          inHUST
        </span>
      </div>
    </Page>
  );
}
