import { atom } from "jotai";

export const globalLoadingAtom = atom<boolean>(false);
export const globalErrorAtom = atom<string | null>(null);
