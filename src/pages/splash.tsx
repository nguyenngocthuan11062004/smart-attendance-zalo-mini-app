import React, { useEffect } from "react";
import { Page, Box } from "zmp-ui";
import { useNavigate } from "zmp-ui";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom, authInitializedAtom } from "@/store/auth";
import logo from "@/static/icon_inhust.png";

export default function SplashPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authInitialized = useAtomValue(authInitializedAtom);

  useEffect(() => {
    if (!authInitialized) return; // Wait for auth state to be determined

    if (isAuthenticated) {
      navigate("/home", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [authInitialized, isAuthenticated, navigate]);

  // Fallback timeout — if auth init takes too long, go to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!authInitialized) {
        navigate("/login", { replace: true });
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [authInitialized, navigate]);

  return (
    <Page
      className="flex items-center justify-center"
      style={{ background: "#9d2929", minHeight: "100vh" }}
    >
      <Box className="flex flex-col items-center justify-center">
        <img
          src={logo}
          alt="logo"
          style={{ width: 140, height: 140, borderRadius: 28, objectFit: "contain" }}
        />
      </Box>
    </Page>
  );
}
