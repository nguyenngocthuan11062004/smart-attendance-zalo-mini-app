import { getDeviceIdAsync } from "zmp-sdk/apis";
import { storageGetItem, storageSetItem } from "@/utils/storage";

// Cache in-memory: deviceId không đổi trong suốt phiên chạy app.
let cached: string | null = null;

/**
 * Định danh THIẾT BỊ (không phải người dùng) — do Zalo cấp, ổn định kể cả khi
 * đổi tài khoản Zalo trên cùng máy. Dùng để bind "1 thiết bị = 1 SV / phiên",
 * chống điểm danh hộ bằng nhiều nick trên một máy.
 *
 * Fallback (browser dev — không có Zalo SDK): UUID ngẫu nhiên lưu bền trong
 * storage để vẫn test được luồng chặn trên trình duyệt.
 * Trả "" nếu mọi cách đều thất bại — khi đó KHÔNG chặn check-in (best-effort).
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const id = await getDeviceIdAsync({});
    if (id) { cached = String(id); return cached; }
  } catch { /* không chạy trong Zalo — rơi xuống fallback dev */ }
  try {
    const stored = await storageGetItem("dev_device_id");
    if (stored) { cached = stored; return cached; }
    const generated = "dev_" + Math.random().toString(36).slice(2, 12);
    await storageSetItem("dev_device_id", generated);
    cached = generated;
    return generated;
  } catch {
    return "";
  }
}
