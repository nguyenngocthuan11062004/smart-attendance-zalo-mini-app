import { atom } from "jotai";
import type { ClassDoc } from "@/types";

export const classListAtom = atom<ClassDoc[]>([]);
export const selectedClassAtom = atom<ClassDoc | null>(null);
