import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { AbsenceRequestDoc } from "@/types";

// Mock mode skipped — absence requests luôn dùng Firestore thật vì mock-db
// chưa seed dữ liệu cho collection này. Nếu cần test offline, để placeholder
// trống là chấp nhận được cho ĐATN demo.

const ABSENCE_COL = "absence_requests";

type CreateInput = Omit<
  AbsenceRequestDoc,
  "id" | "status" | "createdAt" | "reviewedBy" | "reviewedAt" | "reviewNote"
>;

export async function createAbsenceRequest(
  data: CreateInput
): Promise<AbsenceRequestDoc> {
  const record: Omit<AbsenceRequestDoc, "id"> = {
    ...data,
    status: "pending",
    createdAt: Date.now(),
  };

  const ref = await addDoc(collection(db, ABSENCE_COL), record);
  return { id: ref.id, ...record } as AbsenceRequestDoc;
}

export async function getMyAbsenceRequests(
  studentId: string
): Promise<AbsenceRequestDoc[]> {
  // Tránh dùng orderBy("createdAt") để khỏi cần composite index — sort client.
  const q = query(collection(db, ABSENCE_COL), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  const records = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as AbsenceRequestDoc
  );
  return records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function subscribeToMyAbsenceRequests(
  studentId: string,
  callback: (records: AbsenceRequestDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, ABSENCE_COL), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as AbsenceRequestDoc
    );
    callback(records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
  });
}

// Re-export type for convenience
export type { AbsenceRequestDoc };
