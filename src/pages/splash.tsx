import React, { useEffect, useState } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom, authInitializedAtom } from "@/store/auth";
import splash from "@/static/splash_inhust.png";

export default function SplashPage() {
  const navigate = useNavigate();
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
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate("/home", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [readyToNavigate, authInitialized, isAuthenticated, navigate]);

  // Fallback timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!authInitialized) {
        setFadeOut(true);
        setTimeout(() => navigate("/login", { replace: true }), 600);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [authInitialized, navigate]);

  return (
    <Page style={{ padding: 0, margin: 0, minHeight: "100vh", background: "#ffffff" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: fadeOut ? 0 : fadeIn ? 1 : 0,
          transition: fadeOut ? "opacity 0.6s ease-out" : "opacity 0.8s ease-in",
        }}
      >
        <img
          src={splash}
          alt="Splash"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </Page>
  );
}
