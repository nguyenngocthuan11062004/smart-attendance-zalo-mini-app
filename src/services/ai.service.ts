/**
 * AI Chat — gọi Groq API (Llama 3.3 70B) TRỰC TIẾP từ client.
 *
 * Vì dự án dùng Firebase Spark (free) — KHÔNG deploy được Cloud Function có gọi
 * mạng ra ngoài (Groq) — nên gọi thẳng từ client.
 *
 * NGUỒN KEY (ưu tiên override runtime > bundle):
 *   1. Firestore `app_config/ai.groqApiKey` — SỬA ĐƯỢC trong Firebase Console mà
 *      KHÔNG cần deploy lại app. Đổi key ở đây là app tự dùng key mới khi mở lại.
 *   2. `.env` VITE_GROQ_API_KEY — key mặc định nhúng trong bundle (dự phòng khi
 *      chưa cấu hình Firestore hoặc đọc Firestore lỗi/offline).
 * Lấy key miễn phí tại https://console.groq.com (Free tier).
 *
 * ⚠️ Bảo mật: cả 2 nguồn đều lộ key cho client (bundle hoặc Firestore read mở).
 * Chấp nhận được cho ĐATN/demo; production nên chuyển sang Cloud Function (Blaze).
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

const GROQ_ENV_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Key override đọc từ Firestore (nạp 1 lần/phiên rồi cache trong bộ nhớ). Mở lại
// app = đọc lại → key rotate trong Console có hiệu lực mà không cần deploy.
let remoteKey: string | null = null;
let remoteKeyLoaded = false;
let remoteKeyPromise: Promise<void> | null = null;

async function loadRemoteKey(): Promise<void> {
  if (remoteKeyLoaded) return;
  if (!remoteKeyPromise) {
    remoteKeyPromise = (async () => {
      try {
        const snap = await getDoc(doc(db, "app_config", "ai"));
        const k = snap.exists() ? (snap.data().groqApiKey as string | undefined) : undefined;
        if (k && k.trim()) remoteKey = k.trim();
      } catch {
        /* offline / rule chặn — rơi về key .env */
      }
      remoteKeyLoaded = true;
    })();
  }
  await remoteKeyPromise;
}

/** Key hiệu lực: Firestore override nếu có, ngược lại dùng .env. */
async function getGroqKey(): Promise<string> {
  await loadRemoteKey();
  return remoteKey || GROQ_ENV_KEY;
}

// Model chính + model dự phòng (nhẹ, hạn mức cao hơn nhiều). Khi model chính bị
// rate-limit (429) hoặc tạm ngừng phục vụ (5xx) — hay xảy ra lúc demo nhiều —
// tự động thử model kế tiếp thay vì báo lỗi cho người dùng. Giúp buổi bảo vệ
// không bị "chết" tính năng AI vì hạn mức free-tier.
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng Zimo Checkin - ứng dụng điểm danh thông minh.

Nhiệm vụ:
- Hỗ trợ sinh viên tra cứu thông tin lớp học, lịch học, điểm danh
- Hướng dẫn sử dụng ứng dụng Zimo Checkin
- Trả lời các câu hỏi liên quan học tập
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, có emoji phù hợp

Về ứng dụng: điểm danh bằng QR + xác minh khuôn mặt + xác minh ngang hàng (P2P) chống gian lận. Sinh viên đăng ký khuôn mặt trước; giảng viên mở phiên, sinh viên quét QR để check-in.`;

// Lịch sử hội thoại (chỉ user/assistant; system + context thêm khi gửi)
let chatHistory: ChatMsg[] = [];
// Ngữ cảnh dữ liệu thật do trang chat nạp vào (lịch hôm nay, lớp của user...)
let contextPrompt = "";

export function resetChat(): void {
  chatHistory = [];
}

/** Trang chat nạp dữ liệu thật để AI trả lời chính xác thay vì bịa. */
export function setChatContext(ctx: string): void {
  contextPrompt = ctx;
}

/** AI đã có key chưa — để UI báo hướng dẫn nếu thiếu (dựa trên key .env + cache). */
export function isAiConfigured(): boolean {
  return !!(GROQ_ENV_KEY || remoteKey);
}

export async function sendChatMessage(message: string): Promise<string> {
  const apiKey = await getGroqKey();
  if (!apiKey) {
    return "⚠️ Tính năng AI chưa được cấu hình. Thêm key vào Firestore `app_config/ai.groqApiKey` (Firebase Console) hoặc VITE_GROQ_API_KEY trong .env (lấy key miễn phí tại console.groq.com).";
  }

  const system = SYSTEM_PROMPT + (contextPrompt ? `\n\n${contextPrompt}` : "");
  const messages: ChatMsg[] = [
    { role: "system", content: system },
    ...chatHistory.slice(-20),
    { role: "user", content: String(message).slice(0, 2000) },
  ];

  // Thử lần lượt từng model; lỗi tạm thời (429/5xx) thì rơi sang model kế tiếp.
  // 401 (key sai) là lỗi vĩnh viễn → dừng ngay, không phí lượt.
  let lastStatus = 0;
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.7 }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply: string = data?.choices?.[0]?.message?.content || "Xin lỗi, tôi không hiểu câu hỏi.";

        chatHistory.push({ role: "user", content: message });
        chatHistory.push({ role: "assistant", content: reply });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

        return reply;
      }

      lastStatus = res.status;
      // 401 = key không hợp lệ (đã bị xoá/regenerate). Đổi model cũng vô ích.
      if (res.status === 401) {
        return "Khóa AI không hợp lệ. Vui lòng kiểm tra VITE_GROQ_API_KEY trong .env.";
      }
      // 429 (hết hạn mức) / 5xx (server) → thử model tiếp theo trong danh sách.
    } catch {
      lastStatus = -1; // lỗi mạng — vẫn thử model kế tiếp
    }
  }

  if (lastStatus === 429) return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
  if (lastStatus === -1) return "Không thể kết nối AI. Vui lòng kiểm tra mạng và thử lại.";
  return "Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.";
}
