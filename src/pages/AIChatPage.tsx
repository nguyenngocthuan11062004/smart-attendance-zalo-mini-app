import React, { useState, useRef, useEffect } from "react";
import { Page } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { sendChatMessage, resetChat } from "@/services/ai.service";

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
}

const SUGGESTIONS = [
  { icon: "calendar-days", label: "Lịch học hôm nay" },
  { icon: "book-open", label: "Tra cứu lớp học" },
  { icon: "timer", label: "Lịch thi sắp tới" },
  { icon: "life-buoy", label: "Hướng dẫn sử dụng" },
];

/* ── Gradient style (reused for avatar & send button) ── */
const GRADIENT_BG = "linear-gradient(225deg, #7c3aed 0%, #be1d2c 50%, #f59e0b 100%)";

/* ── Sparkles SVG icon ── */
const SparklesIcon = ({ size = 20, color = "#ffffff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" /><path d="M22 5h-4" />
  </svg>
);

function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Reset chat session khi unmount
  useEffect(() => {
    return () => { resetChat(); };
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: text.trim(),
      time: getTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text.trim());
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: response,
        time: getTimeString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
        time: getTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <Page style={{ background: "#f8f9fa", minHeight: "100vh", padding: 0, display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <div style={{
        background: "#be1d2c",
        padding: "calc(var(--zaui-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 12px) 16px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Gradient avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: GRADIENT_BG,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SparklesIcon size={20} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>AI Assistant</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.73)", margin: 0 }}>Trợ lý thông minh inHUST</p>
          </div>
        </div>

        <button style={{
          width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.13)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>

      {/* ── Chat Area ── */}
      <div style={{
        flex: 1, overflow: "auto", padding: 16,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Welcome card */}
        {showWelcome && (
          <>
            <div style={{
              background: "#ffffff", borderRadius: 20, padding: "24px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              border: "1px solid #e5e7eb",
            }}>
              {/* Large gradient icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: GRADIENT_BG,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 3px 12px rgba(124,58,237,0.19)",
              }}>
                <SparklesIcon size={28} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Xin chào! 👋</p>
              <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
                Tôi là trợ lý AI của inHUST. Tôi có thể giúp bạn tra cứu thông tin lớp học, lịch thi, điểm danh và nhiều thứ khác.
              </p>
            </div>

            {/* Suggestion chips - 2x2 grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[SUGGESTIONS.slice(0, 2), SUGGESTIONS.slice(2, 4)].map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 8 }}>
                  {row.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => sendMessage(chip.label)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 6,
                        background: "#ffffff", borderRadius: 20, padding: "8px 14px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <SuggestionIcon name={chip.icon} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{chip.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Chat messages */}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                background: "#be1d2c", borderRadius: "18px 4px 18px 18px",
                padding: "10px 14px", maxWidth: "75%",
              }}>
                <p style={{ fontSize: 14, color: "#ffffff", margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              {/* Small gradient avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: GRADIENT_BG,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(124,58,237,0.19)",
              }}>
                <SparklesIcon size={16} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, maxWidth: "75%" }}>
                {/* AI badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  background: "#fce8e8", borderRadius: 8, padding: "2px 6px",
                  alignSelf: "flex-start",
                }}>
                  <SparklesIcon size={10} color="#be1d2c" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#be1d2c" }}>AI</span>
                </div>
                {/* Message body */}
                <div style={{
                  background: "#ffffff", borderRadius: "4px 18px 18px 18px",
                  padding: "10px 14px", border: "1px solid #e5e7eb",
                }}>
                  <p style={{ fontSize: 14, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg.text}</p>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{msg.time}</span>
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: GRADIENT_BG,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(124,58,237,0.19)",
            }}>
              <SparklesIcon size={16} />
            </div>
            <div style={{
              background: "#ffffff", borderRadius: "4px 18px 18px 18px",
              padding: "10px 14px", border: "1px solid #e5e7eb",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: 3, background: "#9ca3af",
                  animation: `typingDot 1.2s infinite ${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        background: "#ffffff", borderTop: "1px solid #e5e7eb",
        padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "#f3f4f6", borderRadius: 22, height: 44, padding: "0 16px",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
            placeholder="Nhập tin nhắn..."
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: "#374151",
            }}
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          style={{
            width: 44, height: 44, borderRadius: 14, border: "none",
            background: GRADIENT_BG,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(124,58,237,0.19)",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
          </svg>
        </button>
      </div>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </Page>
  );
}

/* ── Suggestion chip icons ── */
function SuggestionIcon({ name }: { name: string }) {
  const props = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "#be1d2c", strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "calendar-days":
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>;
    case "book-open":
      return <svg {...props}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>;
    case "timer":
      return <svg {...props}><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></svg>;
    case "life-buoy":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" /><circle cx="12" cy="12" r="4" /></svg>;
    default:
      return null;
  }
}
