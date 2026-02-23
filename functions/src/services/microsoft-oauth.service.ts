import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { requireAuth } from "../middleware/auth";

const db = admin.firestore();

export const initMicrosoftOAuth = functions.region("asia-southeast1").https.onCall(
  requireAuth(async (data, context, userId) => {
    const config = functions.config().microsoft;
    if (!config?.client_id || !config?.redirect_uri) {
      throw new functions.https.HttpsError("failed-precondition", "Microsoft OAuth not configured");
    }

    const state = crypto.randomBytes(32).toString("hex");
    const now = Date.now();

    await db.collection("oauth_states").doc(state).set({
      userId,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
      used: false,
    });

    const params = new URLSearchParams({
      client_id: config.client_id,
      response_type: "code",
      redirect_uri: config.redirect_uri,
      scope: "openid email profile User.Read",
      state,
      prompt: "select_account",
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return { authUrl };
  })
);

export const microsoftOAuthCallback = functions.region("asia-southeast1").https.onRequest(
  async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.status(400).send(errorHtml(`Microsoft login bị từ chối: ${oauthError}`));
      return;
    }

    if (!code || !state || typeof code !== "string" || typeof state !== "string") {
      res.status(400).send(errorHtml("Thiếu tham số code hoặc state"));
      return;
    }

    // Validate state
    const stateRef = db.collection("oauth_states").doc(state);
    const stateDoc = await stateRef.get();

    if (!stateDoc.exists) {
      res.status(400).send(errorHtml("State không hợp lệ"));
      return;
    }

    const stateData = stateDoc.data()!;

    if (stateData.used) {
      res.status(400).send(errorHtml("Link xác minh đã được sử dụng"));
      return;
    }

    if (Date.now() > stateData.expiresAt) {
      res.status(400).send(errorHtml("Link xác minh đã hết hạn. Vui lòng thử lại."));
      return;
    }

    // Mark state as used
    await stateRef.update({ used: true });

    const userId = stateData.userId;

    try {
      // Exchange code for token
      const config = functions.config().microsoft;
      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: config.client_secret,
          code,
          redirect_uri: config.redirect_uri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error("Token exchange failed:", errBody);
        res.status(400).send(errorHtml("Không thể lấy token từ Microsoft"));
        return;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Get user profile from MS Graph
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        console.error("MS Graph /me failed:", await profileRes.text());
        res.status(400).send(errorHtml("Không thể lấy thông tin tài khoản Microsoft"));
        return;
      }

      const profile = await profileRes.json();
      const email: string = (profile.mail || profile.userPrincipalName || "").toLowerCase();
      const displayName: string = profile.displayName || "";

      // Validate HUST email
      if (!email.endsWith("@sis.hust.edu.vn")) {
        res.status(400).send(errorHtml("Email phải thuộc @sis.hust.edu.vn. Email hiện tại: " + email));
        return;
      }

      // Extract MSSV: e.g. thuan.nn225413@sis.hust.edu.vn -> 225413 -> 20225413
      const localPart = email.split("@")[0]; // thuan.nn225413
      const dotIndex = localPart.indexOf(".");
      if (dotIndex === -1) {
        res.status(400).send(errorHtml("Định dạng email không hợp lệ"));
        return;
      }

      const afterDot = localPart.substring(dotIndex + 1); // nn225413
      const digits = afterDot.replace(/[^0-9]/g, ""); // 225413

      if (digits.length < 6) {
        res.status(400).send(errorHtml("Không thể trích xuất MSSV từ email"));
        return;
      }

      const lastSixDigits = digits.slice(-6);
      const hustStudentId = "20" + lastSixDigits;

      // Update user document
      await db.collection("users").doc(userId).update({
        microsoftEmail: email,
        hustVerified: true,
        hustStudentId,
        microsoftLinkedAt: Date.now(),
        microsoftDisplayName: displayName,
      });

      res.status(200).send(successHtml());
    } catch (err) {
      console.error("Microsoft OAuth callback error:", err);
      res.status(500).send(errorHtml("Đã xảy ra lỗi. Vui lòng thử lại."));
    }
  }
);

function successHtml(): string {
  return [
    '<!DOCTYPE html><html>',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Xac minh thanh cong</title>',
    '<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0fdf4;}',
    '.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);}',
    'h1{color:#16a34a;font-size:1.5rem;} p{color:#666;}</style></head>',
    '<body><div class="card"><h1>Xac minh thanh cong!</h1><p>Tai khoan Microsoft da duoc lien ket. Ban co the dong cua so nay.</p></div>',
    '<script>if(window.opener){window.opener.postMessage({type:"microsoft-oauth-success"},"*");setTimeout(function(){window.close()},2000);}</script>',
    '</body></html>',
  ].join("");
}

function errorHtml(message: string): string {
  const safeMessage = escapeHtml(message);
  return [
    '<!DOCTYPE html><html>',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Loi xac minh</title>',
    '<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fef2f2;}',
    '.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);}',
    'h1{color:#dc2626;font-size:1.5rem;} p{color:#666;}</style></head>',
    '<body><div class="card"><h1>Loi xac minh</h1><p>' + safeMessage + '</p></div>',
    '<script>if(window.opener){window.opener.postMessage({type:"microsoft-oauth-error"},"*");}</script>',
    '</body></html>',
  ].join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
