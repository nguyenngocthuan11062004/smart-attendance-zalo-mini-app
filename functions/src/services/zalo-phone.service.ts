import * as functions from "firebase-functions";

const ZALO_API_URL = "https://graph.zalo.me/v2.0/me/info";

/**
 * Resolve a Zalo phone token into an actual phone number.
 * Requires ZALO_APP_SECRET_KEY set in Firebase functions config:
 *   firebase functions:secrets:set ZALO_APP_SECRET_KEY
 */
export const resolveZaloPhoneToken = functions
  .region("asia-southeast1")
  .https.onCall(async (data: { token: string; accessToken: string }) => {
    const { token, accessToken } = data;

    if (!token || !accessToken) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing token or accessToken"
      );
    }

    const secretKey = process.env.ZALO_APP_SECRET_KEY;
    if (!secretKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "ZALO_APP_SECRET_KEY not configured"
      );
    }

    const url = `${ZALO_API_URL}?access_token=${encodeURIComponent(accessToken)}&code=${encodeURIComponent(token)}&secret_key=${encodeURIComponent(secretKey)}`;

    const resp = await fetch(url);
    const json = await resp.json();

    if (json.error) {
      throw new functions.https.HttpsError(
        "internal",
        json.message || "Zalo API error"
      );
    }

    const phone = json.data?.number;
    if (!phone) {
      throw new functions.https.HttpsError(
        "not-found",
        "Phone number not found in Zalo response"
      );
    }

    return { phone };
  });
