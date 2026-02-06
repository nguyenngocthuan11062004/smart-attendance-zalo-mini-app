import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

export function callFunction<T = unknown, R = unknown>(name: string) {
  return httpsCallable<T, R>(functions, name);
}
