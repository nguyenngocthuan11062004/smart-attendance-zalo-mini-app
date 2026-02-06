import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { activeSessionAtom } from "@/store/session";
import {
  startSession,
  endSession as endSessionService,
  getSession,
  getActiveSessionForClass,
  subscribeToSession,
} from "@/services/session.service";

export function useSession() {
  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);

  const createSession = useCallback(
    async (classId: string, className: string, teacherId: string) => {
      const session = await startSession(classId, className, teacherId);
      setActiveSession(session);
      return session;
    },
    [setActiveSession]
  );

  const endCurrentSession = useCallback(async () => {
    if (!activeSession) return;
    await endSessionService(activeSession.id);
    setActiveSession({ ...activeSession, status: "ended", endedAt: Date.now() });
  }, [activeSession, setActiveSession]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      const session = await getSession(sessionId);
      setActiveSession(session);
      return session;
    },
    [setActiveSession]
  );

  const loadActiveSessionForClass = useCallback(
    async (classId: string) => {
      const session = await getActiveSessionForClass(classId);
      setActiveSession(session);
      return session;
    },
    [setActiveSession]
  );

  return {
    activeSession,
    createSession,
    endCurrentSession,
    loadSession,
    loadActiveSessionForClass,
    setActiveSession,
  };
}

export function useSessionSubscription(sessionId: string | undefined) {
  const [, setActiveSession] = useAtom(activeSessionAtom);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSession(sessionId, (session) => {
      setActiveSession(session);
    });
    return unsub;
  }, [sessionId, setActiveSession]);
}
