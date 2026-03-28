import * as functions from "firebase-functions";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/rateLimit";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng inHUST - ứng dụng điểm danh thông minh của Đại học Bách khoa Hà Nội (HUST).

Nhiệm vụ của bạn:
- Hỗ trợ sinh viên tra cứu thông tin lớp học, lịch thi, điểm danh
- Hướng dẫn sử dụng ứng dụng inHUST
- Trả lời các câu hỏi liên quan đến học tập tại HUST
- Luôn trả lời bằng tiếng Việt, thân thiện và ngắn gọn
- Sử dụng emoji phù hợp để tin nhắn sinh động hơn

Thông tin về ứng dụng inHUST:
- Điểm danh bằng QR code + xác minh khuôn mặt
- Sinh viên cần đăng ký khuôn mặt trước khi điểm danh
- Giảng viên tạo phiên điểm danh, sinh viên quét QR để check-in
- Có hệ thống chống gian lận (peer-to-peer verification)`;

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export const aiChat = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    if (!checkRateLimit(`ai_${userId}`, 20, 60_000)) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many requests");
    }

    if (!GROQ_API_KEY) {
      throw new functions.https.HttpsError("failed-precondition", "AI service not configured");
    }

    const { message, history } = data;
    if (!message || typeof message !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing message");
    }

    // Build messages: system + recent history + new message
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
      // Only take last 20 messages, validate structure
      const recent = history.slice(-20);
      for (const msg of recent) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: String(msg.content).slice(0, 2000) });
        }
      }
    }

    messages.push({ role: "user", content: String(message).slice(0, 2000) });

    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new functions.https.HttpsError("resource-exhausted", "AI rate limit exceeded");
        }
        throw new functions.https.HttpsError("internal", "AI service error");
      }

      const result = await res.json();
      const reply = result.choices?.[0]?.message?.content || "Không có phản hồi.";
      return { reply };
    } catch (err: any) {
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", "AI service unavailable");
    }
  })
);
