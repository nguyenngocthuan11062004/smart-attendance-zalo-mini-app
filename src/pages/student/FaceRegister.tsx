import React, { useCallback, useState, useRef } from "react";
import { Page, Spinner } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { markFaceRegistered } from "@/services/auth.service";
import CameraCapture from "@/components/face/CameraCapture";
import { registerCCCD } from "@/services/face.service";

type ViewState =
  | "instructions"
  | "cccd_front"
  | "cccd_back"
  | "selfie"
  | "processing"
  | "result"
  | "error";

interface CCCDData {
  frontBase64: string;
  backBase64: string;
  selfieBase64: string;
}

export default function FaceRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(currentUserAtom);
  const [view, setView] = useState<ViewState>("instructions");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");
  const [ocrData, setOcrData] = useState<Record<string, any> | null>(null);
  const [faceConfidence, setFaceConfidence] = useState(0);
  const cccdDataRef = useRef<CCCDData>({ frontBase64: "", backBase64: "", selfieBase64: "" });

  const handleComplete = useCallback(async () => {
    if (user && ocrData) {
      const updates: Record<string, any> = {
        faceRegistered: true,
        cccdRegistered: true,
        updatedAt: Date.now(),
      };
      if (ocrData.full_name) updates.cccdName = ocrData.full_name;
      if (ocrData.id_number) updates.cccdNumber = ocrData.id_number;
      if (ocrData.date_of_birth) updates.cccdDob = ocrData.date_of_birth;
      if (ocrData.gender) updates.cccdGender = ocrData.gender;
      if (ocrData.place_of_residence) updates.cccdAddress = ocrData.place_of_residence;
      // Auto-fill name and birthdate
      if (ocrData.full_name && !user.name) updates.name = ocrData.full_name;
      if (ocrData.date_of_birth && !user.birthdate) updates.birthdate = ocrData.date_of_birth;

      setUser({ ...user, ...updates });
      localStorage.setItem("user_doc", JSON.stringify({ ...user, ...updates }));

      try {
        await markFaceRegistered(user.id);
      } catch { /* ignore */ }
    }
    navigate("/home", { replace: true });
  }, [user, setUser, navigate, ocrData]);

  const processAllImages = async () => {
    setView("processing");
    setErrorMsg(null);
    setErrorStep(null);

    try {
      setProcessingStep("Dang tai anh CCCD...");
      await new Promise((r) => setTimeout(r, 300));

      setProcessingStep("Dang OCR thong tin...");
      const result = await registerCCCD(
        cccdDataRef.current.frontBase64,
        cccdDataRef.current.backBase64,
        cccdDataRef.current.selfieBase64
      );

      if (result.success) {
        setOcrData(result.ocrData || null);
        setFaceConfidence(result.faceMatchConfidence || 0);
        setView("result");
      } else {
        setErrorStep(result.step || "unknown");
        setErrorMsg(result.message || result.issues?.join(", ") || "Loi xu ly");
        setView("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Loi he thong");
      setView("error");
    }
  };

  const handleCaptureFront = (imageBase64: string) => {
    cccdDataRef.current.frontBase64 = imageBase64;
    setView("cccd_back");
  };

  const handleCaptureBack = (imageBase64: string) => {
    cccdDataRef.current.backBase64 = imageBase64;
    setView("selfie");
  };

  const handleCaptureSelfie = (imageBase64: string) => {
    cccdDataRef.current.selfieBase64 = imageBase64;
    processAllImages();
  };

  const getRetryView = (): ViewState => {
    if (errorStep === "sanity_check") return "cccd_front";
    if (errorStep === "face_match") return "selfie";
    return "cccd_front";
  };

  const stepIndex =
    view === "instructions" ? 0 :
    view === "cccd_front" ? 1 :
    view === "cccd_back" ? 2 :
    view === "selfie" ? 3 :
    view === "processing" ? 3 :
    view === "result" ? 4 : 0;

  const headerTitle =
    view === "instructions" ? "Xac minh CCCD" :
    view === "cccd_front" ? "Chup mat truoc CCCD" :
    view === "cccd_back" ? "Chup mat sau CCCD" :
    view === "selfie" ? "Chup anh selfie" :
    view === "processing" ? "Dang xu ly..." :
    view === "result" ? "Ket qua xac minh" :
    "Loi xac minh";

  return (
    <Page style={{ background: "#f2f2f7", minHeight: "100vh", padding: 0 }}>
      {/* Header */}
      <div style={{
        background: "#be1d2c", borderRadius: "0 0 24px 24px",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 14px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => {
            if (view === "cccd_front") setView("instructions");
            else if (view === "cccd_back") setView("cccd_front");
            else if (view === "selfie") setView("cccd_back");
            else navigate(-1);
          }}
          style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{headerTitle}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Step indicator */}
      {view !== "error" && (
        <div style={{ display: "flex", gap: 6, padding: "16px 24px 0", alignItems: "center" }}>
          {["CCCD truoc", "CCCD sau", "Selfie", "Ket qua"].map((label, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                height: 4,
                width: "100%",
                borderRadius: 2,
                background: i + 1 <= stepIndex ? "#be1d2c" : "#e5e7eb",
                transition: "background 0.3s",
              }} />
              <span style={{
                fontSize: 10,
                color: i + 1 <= stepIndex ? "#be1d2c" : "#9ca3af",
                fontWeight: i + 1 === stepIndex ? 700 : 400,
              }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>

        {/* Instructions */}
        {view === "instructions" && (
          <>
            {/* CCCD illustration */}
            <div style={{
              width: "100%", height: 200, borderRadius: 20,
              background: "rgba(190,29,44,0.06)",
              border: "1.5px solid rgba(190,29,44,0.15)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
                <rect x="1" y="1" width="118" height="78" rx="8" stroke="#be1d2c" strokeWidth="2" />
                <circle cx="35" cy="35" r="14" stroke="#be1d2c" strokeWidth="1.5" />
                <line x1="60" y1="25" x2="105" y2="25" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="60" y1="35" x2="95" y2="35" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="60" y1="45" x2="100" y2="45" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="15" y1="62" x2="105" y2="62" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Can cuoc cong dan</p>
            </div>

            {/* Steps card */}
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CAC BUOC THUC HIEN</p>
              {[
                { icon: "1", text: "Chup mat truoc CCCD (co anh va thong tin)" },
                { icon: "2", text: "Chup mat sau CCCD" },
                { icon: "3", text: "Chup anh selfie de so khop khuon mat" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: "#be1d2c", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{step.icon}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#1a1a1a" }}>{step.text}</p>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div style={{
              width: "100%", background: "#fff7ed", borderRadius: 12, padding: 14,
              border: "1px solid rgba(245,158,11,0.2)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                Dam bao anh sáng du, khong bi loa sang. Dat CCCD tren mat phang va chup thang goc.
              </div>
            </div>

            {/* Buttons */}
            <div style={{ width: "100%", display: "flex", gap: 12 }}>
              <button
                onClick={() => navigate("/home", { replace: true })}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Bo qua
              </button>
              <button
                onClick={() => setView("cccd_front")}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >
                Bat dau
              </button>
            </div>
          </>
        )}

        {/* CCCD Front capture */}
        {view === "cccd_front" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              width: "100%", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Mat truoc CCCD</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>Dat CCCD vao khung va chup ro rang</p>
            </div>
            <CameraCapture onCapture={handleCaptureFront} facingMode="environment" frameShape="rect" />
          </div>
        )}

        {/* CCCD Back capture */}
        {view === "cccd_back" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              width: "100%", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Mat sau CCCD</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>Lat CCCD va chup mat sau</p>
            </div>
            <CameraCapture onCapture={handleCaptureBack} facingMode="environment" frameShape="rect" />
          </div>
        )}

        {/* Selfie capture */}
        {view === "selfie" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              width: "100%", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Chup anh selfie</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>Nhin thang vao camera de so khop khuon mat</p>
            </div>
            <CameraCapture onCapture={handleCaptureSelfie} />
          </div>
        )}

        {/* Processing */}
        {view === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "40px 0" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(190,29,44,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Spinner />
            </div>
            <p style={{ color: "#1a1a1a", fontSize: 16, fontWeight: 600 }}>Dang xu ly...</p>
            <p style={{ color: "#6b7280", fontSize: 14 }}>{processingStep}</p>
            <div style={{
              background: "#fff", borderRadius: 12, padding: 14, width: "100%",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {["Tai anh CCCD", "Kiem tra chat luong anh", "OCR trich xuat thong tin", "So khop khuon mat"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 10,
                    background: i <= 1 ? "rgba(34,197,94,0.15)" : "rgba(0,0,0,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {i <= 1 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: "#d4d4d4" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: i <= 1 ? "#22c55e" : "#9ca3af" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {view === "result" && ocrData && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Success badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Xac minh thanh cong!</p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(34,197,94,0.1)", borderRadius: 20, padding: "4px 14px",
              }}>
                <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                  Do khop: {Math.round(faceConfidence * 100)}%
                </span>
              </div>
            </div>

            {/* OCR data card */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>THONG TIN CCCD</p>
              {[
                { label: "Ho va ten", value: ocrData.full_name },
                { label: "So CCCD", value: ocrData.id_number },
                { label: "Ngay sinh", value: ocrData.date_of_birth },
                { label: "Gioi tinh", value: ocrData.gender },
                { label: "Dia chi", value: ocrData.place_of_residence },
              ].filter(item => item.value).map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, color: "#6b7280", flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, textAlign: "right", marginLeft: 12 }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Info note */}
            <div style={{
              background: "#eff6ff", borderRadius: 12, padding: 14,
              border: "1px solid rgba(59,130,246,0.2)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <span style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
                Thong tin se duoc tu dong dien vao ho so cua ban.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  cccdDataRef.current = { frontBase64: "", backBase64: "", selfieBase64: "" };
                  setView("cccd_front");
                }}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Lam lai
              </button>
              <button
                onClick={handleComplete}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >
                Xac nhan
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {view === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0", width: "100%" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(239,68,68,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
            </div>
            <p style={{ color: "#1a1a1a", fontSize: 16, fontWeight: 700 }}>Xac minh that bai</p>
            {errorMsg && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{errorMsg}</p>}
            <div style={{ width: "100%", display: "flex", gap: 12 }}>
              <button
                onClick={() => navigate("/home", { replace: true })}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#f0f0f5", border: "none",
                  fontSize: 15, fontWeight: 600, color: "#6b7280",
                }}
              >
                Bo qua
              </button>
              <button
                onClick={() => setView(getRetryView())}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#fff",
                }}
              >
                Thu lai
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
