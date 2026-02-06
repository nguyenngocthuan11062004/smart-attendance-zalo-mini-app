import React, { useEffect } from "react";
import { Page, Box } from "zmp-ui";
import { useNavigate } from "zmp-ui";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/static/icon_inhust.png";

const SPLASH_DURATION_MS = 900;

export default function SplashPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const timerId = window.setTimeout(async () => {
      try {
        const user = await login();
        if (user && user.role) {
          navigate("/home", { replace: true });
        } else if (user) {
          navigate("/login", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        navigate("/login", { replace: true });
      }
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timerId);
  }, [navigate, login]);

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
