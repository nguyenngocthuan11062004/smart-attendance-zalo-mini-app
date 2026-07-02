/**
 * AI Chat — gọi Groq API (Llama 3.3 70B) TRỰC TIẾP từ client.
 *
 * Vì dự án dùng Firebase Spark (free) — KHÔNG deploy được Cloud Function có gọi
 * mạng ra ngoài (Groq) — nên gọi thẳng từ client bằng VITE_GROQ_API_KEY.
 *   1. Lấy key miễn phí tại https://console.groq.com (Free tier)
 *   2. Thêm vào file .env:  VITE_GROQ_API_KEY=gsk_xxxxx
 *   3. Khởi động lại:  zmp start
 *
 * ⚠️ Bảo mật: biến VITE_* bị NHÚNG vào bundle (người dùng xem được key). Chấp
 * nhận được cho ĐATN/demo; production nên chuyển sang Cloud Function (Blaze plan).
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

/** AI đã có key chưa — để UI báo hướng dẫn nếu thiếu. */
export function isAiConfigured(): boolean {
  return !!GROQ_API_KEY;
}

export async function sendChatMessage(message: string): Promise<string> {
  if (!GROQ_API_KEY) {
    return "⚠️ Tính năng AI chưa được cấu hình. Vui lòng thêm VITE_GROQ_API_KEY vào file .env (lấy key miễn phí tại console.groq.com) rồi khởi động lại app.";
  }

  const system = SYSTEM_PROMPT + (contextPrompt ? `\n\n${contextPrompt}` : "");
  const messages: ChatMsg[] = [
    { role: "system", content: system },
    ...chatHistory.slice(-20),
    { role: "user", content: String(message).slice(0, 2000) },
  ];

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
      if (res.status === 401) return "Khóa AI không hợp lệ. Vui lòng kiểm tra VITE_GROQ_API_KEY trong .env.";
      return "Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.";
    }

    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content || "Xin lỗi, tôi không hiểu câu hỏi.";

    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    return reply;
  } catch {
    return "Không thể kết nối AI. Vui lòng kiểm tra mạng và thử lại.";
  }
}
