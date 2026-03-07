const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

let chatHistory: ChatMsg[] = [];

export function resetChat() {
  chatHistory = [];
}

export async function sendChatMessage(message: string): Promise<string> {
  if (!API_KEY) {
    return "Chưa cấu hình API key. Vui lòng thêm VITE_GROQ_API_KEY vào file .env";
  }

  // Build messages with system prompt + history
  if (chatHistory.length === 0) {
    chatHistory.push({ role: "system", content: SYSTEM_PROMPT });
  }
  chatHistory.push({ role: "user", content: message });

  // Keep last 20 messages + system to avoid token overflow
  const systemMsg = chatHistory[0];
  const recent = chatHistory.slice(1).slice(-20);
  const messages = [systemMsg, ...recent];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
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
        return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
      }
      return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Không có phản hồi.";

    chatHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch {
    return "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.";
  }
}
