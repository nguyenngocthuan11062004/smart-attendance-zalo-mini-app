import * as functions from "firebase-functions";

export async function verifyZaloToken(accessToken: string): Promise<{ userId: string } | null> {
  try {
    const response = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name", {
      headers: { access_token: accessToken },
    });
    const data = await response.json();
    if (data.error) return null;
    return { userId: data.id };
  } catch {
    return null;
  }
}

export function requireAuth(handler: (data: any, context: functions.https.CallableContext, userId: string) => Promise<any>) {
  return async (data: any, context: functions.https.CallableContext) => {
    const token = data?.accessToken;
    if (!token) {
      throw new functions.https.HttpsError("unauthenticated", "Missing access token");
    }
    const verified = await verifyZaloToken(token);
    if (!verified) {
      throw new functions.https.HttpsError("unauthenticated", "Invalid access token");
    }
    return handler(data, context, verified.userId);
  };
}
