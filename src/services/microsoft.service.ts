import { getAccessToken } from "zmp-sdk";
import { openWebview } from "zmp-sdk";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { callWithFallback } from "@/utils/cloudFallback";

export async function initMicrosoftOAuth(): Promise<{ authUrl: string }> {
  const token = await getAccessToken();
  return callWithFallback<any, { authUrl: string }>(
    "initMicrosoftOAuth",
    { accessToken: token },
    async () => { throw new Error("Microsoft OAuth requires server. Please try again later."); }
  );
}

export function openMicrosoftAuth(authUrl: string): void {
  openWebview({ url: authUrl });
}

export function subscribeToVerification(
  userId: string,
  callback: (verified: boolean) => void
): () => void {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    const data = snap.data();
    if (data?.hustVerified) {
      callback(true);
    }
  });
}
