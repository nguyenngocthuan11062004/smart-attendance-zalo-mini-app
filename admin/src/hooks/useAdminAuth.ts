import { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import type { UserDoc } from "@/types";

interface AdminAuthState {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    userDoc: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, userDoc: null, loading: false, error: null });
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setState({
            user: null,
            userDoc: null,
            loading: false,
            error: "Tài khoản không tồn tại trong hệ thống",
          });
          await signOut(auth);
          return;
        }

        const userDoc = { id: userSnap.id, ...userSnap.data() } as UserDoc;

        if (userDoc.role !== "admin") {
          setState({
            user: null,
            userDoc: null,
            loading: false,
            error: "Tài khoản không có quyền admin",
          });
          await signOut(auth);
          return;
        }

        setState({ user: firebaseUser, userDoc, loading: false, error: null });
      } catch {
        setState({
          user: null,
          userDoc: null,
          loading: false,
          error: "Lỗi kết nối. Vui lòng thử lại.",
        });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Email hoặc mật khẩu không đúng",
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { ...state, login, logout };
}
