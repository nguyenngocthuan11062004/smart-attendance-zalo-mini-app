interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

let chatHistory: ChatMsg[] = [];

export function resetChat() {
  chatHistory = [];
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Bạn là trợ lý AI của inHUST — ứng dụng điểm danh thông minh tại Đại học Bách khoa Hà Nội (HUST).
Bạn giúp sinh viên tra cứu lịch học, lịch thi, thông tin lớp học, và hướng dẫn sử dụng app.
Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.`;

export async function sendChatMessage(message: string): Promise<string> {
  if (!GROQ_API_KEY) {
    return "Tính năng AI Chat đang được cập nhật. Vui lòng thử lại sau!";
  }

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message },
    ];

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
      }
      return "Không thể kết nối AI. Vui lòng thử lại sau.";
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Xin lỗi, tôi không hiểu câu hỏi.";

    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });

    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    return reply;
  } catch {
    return "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.";
  }
}
