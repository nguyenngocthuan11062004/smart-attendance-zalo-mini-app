import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export function requireAdmin(
  handler: (data: any, context: functions.https.CallableContext, userId: string) => Promise<any>
) {
  return async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Chưa đăng nhập");
    }

    const userId = context.auth.uid;
    const userSnap = await db.collection("users").doc(userId).get();

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Tài khoản không tồn tại");
    }

    const userData = userSnap.data();
    if (userData?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Không có quyền admin");
    }

    return handler(data, context, userId);
  };
}
