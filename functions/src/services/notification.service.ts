import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

const ZALO_OA_API = "https://openapi.zalo.me/v3.0/oa/message/cs";

/**
 * Check if Zalo OA token is configured.
 */
function getOAToken(): string | null {
  const token = functions.config().zalo_oa?.access_token;
  return token || null;
}

/**
 * Send a message to a Zalo user via Official Account API.
 * Requires: student follows the OA + OA access token configured.
 * Silently skips if OA token not configured.
 */
async function sendZaloOAMessage(
  zaloUserId: string,
  message: string
): Promise<boolean> {
  const token = getOAToken();
  if (!token) return false;

  try {
    const response = await fetch(ZALO_OA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: token,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text: message },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    return data.error === 0;
  } catch {
    return false;
  }
}

/**
 * Notify students that a session has started.
 * Looks up Zalo IDs from user docs and sends via OA API.
 * Silently skips if OA token not configured.
 */
export async function notifySessionStarted(
  classId: string,
  className: string,
  sessionId: string
): Promise<{ sent: number; failed: number }> {
  const token = getOAToken();
  if (!token) return { sent: 0, failed: 0 };

  const classDoc = await db.collection("classes").doc(classId).get();
  if (!classDoc.exists) return { sent: 0, failed: 0 };

  const studentIds: string[] = classDoc.data()?.studentIds || [];
  if (studentIds.length === 0) return { sent: 0, failed: 0 };

  // Batch look up student Zalo IDs
  let sent = 0;
  let failed = 0;

  // Process in batches of 10 to avoid overwhelming the API
  for (let i = 0; i < studentIds.length; i += 10) {
    const batch = studentIds.slice(i, i + 10);
    const promises = batch.map(async (studentId) => {
      const userDoc = await db.collection("users").doc(studentId).get();
      if (!userDoc.exists) return;

      const zaloId = userDoc.data()?.zaloId;
      if (!zaloId) return;

      const message = `📋 Điểm danh: ${className}\nPhiên điểm danh vừa bắt đầu. Hãy mở app để check-in ngay!`;
      const success = await sendZaloOAMessage(zaloId, message);
      if (success) sent++;
      else failed++;
    });
    await Promise.all(promises);
  }

  return { sent, failed };
}
