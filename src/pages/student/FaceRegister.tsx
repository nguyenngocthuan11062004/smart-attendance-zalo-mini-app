import React, { useCallback, useState } from "react";
import { Page, Spinner } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { markFaceRegistered } from "@/services/auth.service";
import { registerFace } from "@/services/face.service";
import { storageSetItem } from "@/utils/storage";
import CameraCapture from "@/components/face/CameraCapture";

type ViewState = "consent" | "instructions" | "capture1" | "capture2" | "processing" | "result" | "error";

export default function FaceRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(currentUserAtom);
  const [view, setView] = useState<ViewState>("consent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [selfie1, setSelfie1] = useState("");
  const [selfie2, setSelfie2] = useState("");

  const processImages = async (img1: string, img2: string) => {
    setView("processing");
    setErrorMsg(null);
    if (!user?.id) {
      setErrorMsg("Chưa đăng nhập. Vui lòng đăng nhập lại.");
      setView("error");
      return;
    }
    try {
      const result = await registerFace(img1, img2, user.id);
      if (result.success) {
        setConfidence(result.confidence ?? 0);
        setView("result");
      } else {
        setErrorMsg(result.message || "Không thể đăng ký khuôn mặt");
        setView("error");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi hệ thống");
      setView("error");
    }
  };

  const handleCapture1 = (base64: string) => {
    setSelfie1(base64);
    setView("capture2");
  };

  const handleCapture2 = (base64: string) => {
    setSelfie2(base64);
    processImages(selfie1, base64);
  };

  const handleComplete = useCallback(async () => {
    if (user) {
      const updates = {
        ...user,
        faceRegistered: true,
        updatedAt: Date.now(),
      };
      setUser(updates);
      await storageSetItem("user_doc", JSON.stringify(updates));
      try {
        await markFaceRegistered(user.id);
      } catch { /* ignore */ }
    }
    navigate("/home", { replace: true });
  }, [user, setUser, navigate]);

  const stepIndex =
    view === "consent" ? 0 :
    view === "instructions" ? 0 :
    view === "capture1" ? 1 :
    view === "capture2" ? 2 :
    view === "processing" ? 2 :
    view === "result" ? 3 : 0;

  const headerTitle =
    view === "consent" ? "Thu thập dữ liệu" :
    view === "instructions" ? "Đăng ký khuôn mặt" :
    view === "capture1" ? "Ảnh thứ nhất" :
    view === "capture2" ? "Ảnh thứ hai" :
    view === "processing" ? "Đang xử lý..." :
    view === "result" ? "Hoàn tất" :
    "Lỗi đăng ký";

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
            if (view === "instructions") setView("consent");
            else if (view === "capture1") setView("instructions");
            else if (view === "capture2") setView("capture1");
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
      {view !== "error" && view !== "consent" && (
        <div style={{ display: "flex", gap: 6, padding: "16px 24px 0", alignItems: "center" }}>
          {["Ảnh 1", "Ảnh 2", "Kết quả"].map((label, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                height: 4, width: "100%", borderRadius: 2,
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

        {/* Consent — face data collection agreement */}
        {view === "consent" && (
          <>
            {/* Shield icon */}
            <div style={{
              width: "100%", height: 180, borderRadius: 20,
              background: "rgba(190,29,44,0.06)",
              border: "1.5px solid rgba(190,29,44,0.15)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Bảo mật dữ liệu khuôn mặt</p>
            </div>

            {/* Consent info card */}
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
                Đồng ý thu thập dữ liệu khuôn mặt
              </p>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                Để sử dụng tính năng điểm danh bằng khuôn mặt, ứng dụng cần thu thập và xử lý dữ liệu sinh trắc học của bạn. Vui lòng đọc kỹ thông tin dưới đây:
              </p>

              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  ),
                  title: "Dữ liệu thu thập",
                  desc: "Ảnh khuôn mặt (selfie) và vector đặc trưng khuôn mặt (face descriptor) 128 chiều.",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  ),
                  title: "Mục đích sử dụng",
                  desc: "Xác minh danh tính khi điểm danh, chống gian lận trong quá trình học tập.",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ),
                  title: "Cách lưu trữ",
                  desc: "Ảnh được xử lý trên thiết bị của bạn. Chỉ vector đặc trưng (không phải ảnh gốc) được lưu trên Firestore, mã hóa theo tài khoản.",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  ),
                  title: "Quyền của bạn",
                  desc: "Bạn có thể từ chối hoặc xóa dữ liệu khuôn mặt bất cứ lúc nào. Việc từ chối không ảnh hưởng đến các tính năng khác.",
                },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(190,29,44,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
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
                Từ chối
              </button>
              <button
                onClick={() => setView("instructions")}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >
                Đồng ý
              </button>
            </div>
          </>
        )}

        {/* Instructions */}
        {view === "instructions" && (
          <>
            {/* Face illustration */}
            <div style={{
              width: "100%", height: 200, borderRadius: 20,
              background: "rgba(190,29,44,0.06)",
              border: "1.5px solid rgba(190,29,44,0.15)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#be1d2c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 10-16 0" />
              </svg>
              <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Đăng ký khuôn mặt</p>
            </div>

            {/* Steps card */}
            <div style={{
              width: "100%", background: "#ffffff", borderRadius: 16, padding: 20,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: 1 }}>CÁC BƯỚC THỰC HIỆN</p>
              {[
                { icon: "1", text: "Chụp ảnh selfie chính diện (nhìn thẳng)" },
                { icon: "2", text: "Chụp ảnh selfie nghiêng nhẹ (xoay mặt 15°)" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: "#be1d2c", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.icon}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#1a1a1a" }}>{s.text}</p>
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
                Đảm bảo ánh sáng đủ, không đội mũ hoặc kính râm. Khuôn mặt nằm trong khung tròn.
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
                Bỏ qua
              </button>
              <button
                onClick={() => setView("capture1")}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#ffffff",
                }}
              >
                Bắt đầu
              </button>
            </div>
          </>
        )}

        {/* Selfie capture 1 — front facing */}
        {view === "capture1" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              width: "100%", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Ảnh chính diện</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>Nhìn thẳng vào camera</p>
            </div>
            <CameraCapture onCapture={handleCapture1} />
          </div>
        )}

        {/* Selfie capture 2 — slight angle */}
        {view === "capture2" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 16,
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              width: "100%", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600, marginBottom: 4 }}>Ảnh nghiêng nhẹ</p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>Xoay mặt sang trái hoặc phải khoảng 15°</p>
            </div>
            <CameraCapture onCapture={handleCapture2} />
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
            <p style={{ color: "#1a1a1a", fontSize: 16, fontWeight: 600 }}>Đang xử lý...</p>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Phân tích và lưu trữ khuôn mặt</p>
            <div style={{
              background: "#fff", borderRadius: 12, padding: 14, width: "100%",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {["Tải ảnh selfie", "Phát hiện khuôn mặt", "Kiểm tra chất lượng", "Lưu vào hệ thống"].map((s, i) => (
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

        {/* Result — success */}
        {view === "result" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <p style={{ color: "#1a1a1a", fontSize: 18, fontWeight: 700 }}>Đăng ký thành công!</p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(34,197,94,0.1)", borderRadius: 20, padding: "4px 14px",
              }}>
                <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                  Chất lượng: {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>

            <div style={{
              background: "#eff6ff", borderRadius: 12, padding: 14,
              border: "1px solid rgba(59,130,246,0.2)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <span style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
                Khuôn mặt của bạn đã được lưu. Hệ thống sẽ dùng để xác minh khi điểm danh.
              </span>
            </div>

            <button
              onClick={handleComplete}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "#be1d2c", border: "none",
                fontSize: 15, fontWeight: 700, color: "#ffffff",
              }}
            >
              Hoàn tất
            </button>
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
            <p style={{ color: "#1a1a1a", fontSize: 16, fontWeight: 700 }}>Đăng ký thất bại</p>
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
                Bỏ qua
              </button>
              <button
                onClick={() => { setSelfie1(""); setSelfie2(""); setView("capture1"); }}
                style={{
                  flex: 1, height: 48, borderRadius: 12,
                  background: "#be1d2c", border: "none",
                  fontSize: 15, fontWeight: 700, color: "#fff",
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
