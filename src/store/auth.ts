import { atom } from "jotai";
import type { UserDoc, UserRole } from "@/types";

export const currentUserAtom = atom<UserDoc | null>(null);
export const userRoleAtom = atom<UserRole | null>((get) => get(currentUserAtom)?.role ?? null);
export const isAuthenticatedAtom = atom<boolean>((get) => get(currentUserAtom) !== null);
