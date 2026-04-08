import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { verifyZaloToken } from "../middleware/auth";

/**
 * Exchange a Zalo access token for a Firebase custom token.
 * Client calls this, then uses signInWithCustomToken() to authenticate with Firebase.
 * This links Zalo identity to Firebase Auth, enabling Firestore security rules.
 */
export const createFirebaseToken = functions
  .region("asia-southeast1")
  .https.onCall(async (data) => {
    const { accessToken } = data as { accessToken: string };

    if (!accessToken) {
      throw new functions.https.HttpsError("invalid-argument", "Missing accessToken");
    }

    // Verify Zalo token and get user ID
    const verified = await verifyZaloToken(accessToken);
    if (!verified) {
      throw new functions.https.HttpsError("unauthenticated", "Invalid Zalo access token");
    }

    const zaloUserId = verified.userId;

    // Use Zalo user ID directly as Firebase UID to match existing Firestore docs
    const firebaseUid = zaloUserId;

    // Ensure Firebase Auth user exists
    try {
      await admin.auth().getUser(firebaseUid);
    } catch {
      // User doesn't exist in Firebase Auth — create it
      await admin.auth().createUser({
        uid: firebaseUid,
        displayName: `Zalo User ${zaloUserId}`,
      });
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(firebaseUid);

    return { customToken, firebaseUid };
  });
