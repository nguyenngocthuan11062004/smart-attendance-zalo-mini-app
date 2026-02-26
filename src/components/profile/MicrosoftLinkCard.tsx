import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { initMicrosoftOAuth, openMicrosoftAuth, subscribeToVerification } from "@/services/microsoft.service";

type LinkState = "idle" | "loading" | "waiting" | "verified" | "error";

export default function MicrosoftLinkCard() {
  const user = useAtomValue(currentUserAtom);
  const [state, setState] = useState<LinkState>(user?.hustVerified ? "verified" : "idle");
  const [errorMsg, setErrorMsg] = useState("");
  const unsubRef = useRef<(() => void) | null>(null);

  // Sync verified state from atom
  useEffect(() => {
    if (user?.hustVerified) {
      setState("verified");
    }
  }, [user?.hustVerified]);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const handleLink = async () => {
    if (!user) return;
    setState("loading");
    setErrorMsg("");
    try {
      const { authUrl } = await initMicrosoftOAuth();
      openMicrosoftAuth(authUrl);
      setState("waiting");

      // Listen for verification update
      unsubRef.current?.();
      unsubRef.current = subscribeToVerification(user.id, (verified) => {
        if (verified) {
          setState("verified");
          unsubRef.current?.();
          unsubRef.current = null;
        }
      });
    } catch (err: any) {
      setState("error");
      setErrorMsg(err?.message || "Liên kết thất bại. Vui lòng thử lại.");
    }
  };

  if (state === "verified") {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <MicrosoftIcon />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Tài khoản Microsoft 365</span>
          <span style={verifiedBadge}>Đã xác thực</span>
        </div>
        {user?.microsoftEmail && (
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>
            Email: <span style={{ color: "#a78bfa" }}>{user.microsoftEmail}</span>
          </p>
        )}
        {user?.hustStudentId && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            MSSV: <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{user.hustStudentId}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <MicrosoftIcon />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Liên kết Microsoft 365</span>
      </div>
      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        Xác thực tài khoản sinh viên HUST bằng email Microsoft 365 (@sis.hust.edu.vn)
      </p>

      {state === "error" && (
        <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{errorMsg}</p>
      )}

      {state === "waiting" ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={spinnerStyle} />
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>
            Đang chờ xác thực...
          </p>
        </div>
      ) : (
        <button
          style={linkButtonStyle}
          onClick={handleLink}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Đang xử lý..." : state === "error" ? "Thử lại" : "Liên kết ngay"}
        </button>
      )}
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 20,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const verifiedBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  background: "#16a34a",
  borderRadius: 20,
  padding: "2px 10px",
  marginLeft: "auto",
};

const linkButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 0",
  borderRadius: 14,
  border: "none",
  background: "#be1d2c",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 0 20px rgba(190,29,44,0.3)",
};

const spinnerStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "3px solid #e5e7eb",
  borderTopColor: "#be1d2c",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  margin: "0 auto",
};
