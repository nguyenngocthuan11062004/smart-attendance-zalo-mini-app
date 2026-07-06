import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { currentUserAtom, authInitializedAtom } from "@/store/auth";
import { initAuthState, markFaceRegistered } from "@/services/auth.service";
import { hasFaceData } from "@/services/face.service";
import { storageSetItem } from "@/utils/storage";

/**
 * Initializes auth state at the app root level.
 * Restores from Zalo SDK storage or auto sign-in with Zalo SDK.
 * Must be called inside JotaiProvider, only once (in layout).
 */
export function useAuthInit() {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setAuthInitialized = useSetAtom(authInitializedAtom);
  // Các id đã xác nhận CÓ face trong DB — dùng để ép cờ faceRegistered đúng kể
  // cả khi bản refresh từ Firestore trả về cờ cũ (false).
  const knownRegistered = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;

    const unsubscribe = initAuthState((userDoc, initialized) => {
      if (!mounted) return;

      // Nếu đã biết id này có face nhưng doc mang cờ false → ép về true để hiển
      // thị đúng (home đọc user.faceRegistered).
      let doc = userDoc;
      if (doc?.id && !doc.faceRegistered && knownRegistered.current.has(doc.id)) {
        doc = { ...doc, faceRegistered: true };
      }
      setCurrentUser(doc);
      if (initialized) setAuthInitialized(true);

      // Đối chiếu cờ với dữ liệu thật (face_registrations/{id}). Sửa trường hợp
      // cờ cache lệch → home báo "Chưa đăng ký" dù tài khoản đã có face.
      if (doc?.id && !doc.faceRegistered) {
        const id = doc.id;
        const snapshot = doc;
        hasFaceData(id)
          .then((has) => {
            if (!has || !mounted) return;
            knownRegistered.current.add(id);
            const synced = { ...snapshot, faceRegistered: true };
            setCurrentUser(synced);
            storageSetItem("user_doc", JSON.stringify(synced)).catch(() => {});
            markFaceRegistered(id).catch(() => {});
          })
          .catch(() => {});
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setCurrentUser, setAuthInitialized]);
}
