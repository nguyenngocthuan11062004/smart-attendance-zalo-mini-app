import { atom } from "jotai";
import type { UserDoc, UserRole } from "@/types";

export const currentUserAtom = atom<UserDoc | null>(null);
export const userRoleAtom = atom<UserRole | null>((get) => get(currentUserAtom)?.role ?? null);
export const isAuthenticatedAtom = atom<boolean>((get) => get(currentUserAtom) !== null);
export const authInitializedAtom = atom<boolean>(false);
export const hustVerifiedAtom = atom((get) => get(currentUserAtom)?.hustVerified ?? false);
export const microsoftEmailAtom = atom((get) => get(currentUserAtom)?.microsoftEmail ?? null);
