import { atom } from "jotai";
import type { SessionDoc } from "@/types";

export const activeSessionAtom = atom<SessionDoc | null>(null);
export const sessionStatusAtom = atom<"idle" | "active" | "ended">((get) => {
  const session = get(activeSessionAtom);
  if (!session) return "idle";
  return session.status;
});
