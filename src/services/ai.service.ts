import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

let chatHistory: ChatMsg[] = [];

export function resetChat() {
  chatHistory = [];
}

interface AiChatRequest {
  message: string;
  history: ChatMsg[];
}

interface AiChatResponse {
  reply: string;
}

const aiChatCallable = httpsCallable<AiChatRequest, AiChatResponse>(functions, "aiChat");

export async function sendChatMessage(message: string): Promise<string> {
  try {
    const { data } = await aiChatCallable({
      message,
      history: chatHistory,
    });

    const reply = data?.reply || "Xin lỗi, tôi không hiểu câu hỏi.";

    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });

    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    return reply;
  } catch (err: any) {
    const code = err?.code as string | undefined;
    if (code === "functions/resource-exhausted") {
      return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
    }
    if (code === "functions/failed-precondition") {
      return "Tính năng AI Chat đang được cập nhật. Vui lòng thử lại sau!";
    }
    if (code === "functions/unauthenticated") {
      return "Vui lòng đăng nhập để sử dụng AI Chat.";
    }
    return "Không thể kết nối AI. Vui lòng kiểm tra mạng và thử lại.";
  }
}
