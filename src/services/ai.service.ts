import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { getAccessToken } from "@/services/auth.service";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

let chatHistory: ChatMsg[] = [];

export function resetChat() {
  chatHistory = [];
}

export async function sendChatMessage(message: string): Promise<string> {
  try {
    const accessToken = await getAccessToken();
    const fn = httpsCallable<
      { message: string; history: ChatMsg[]; accessToken: string },
      { reply: string }
    >(functions, "aiChat");

    const result = await fn({ message, history: chatHistory, accessToken });
    const reply = result.data.reply;

    // Update local history
    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });

    // Keep last 20 messages
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    return reply;
  } catch (err: any) {
    const code = err?.code?.replace("functions/", "") || "";
    if (code === "resource-exhausted") {
      return "Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.";
    }
    if (code === "unauthenticated") {
      return "Vui lòng đăng nhập để sử dụng AI chat.";
    }
    return "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.";
  }
}
