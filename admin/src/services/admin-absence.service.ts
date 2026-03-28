import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { AbsenceRequestDoc } from "@/types";

const ABSENCE_COL = "absence_requests";

export async function getAbsenceRequests(
  status?: "pending" | "approved" | "rejected"
): Promise<AbsenceRequestDoc[]> {
  const constraints = [];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const q = query(collection(db, ABSENCE_COL), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AbsenceRequestDoc);
}

export async function reviewAbsenceRequest(
  requestId: string,
  decision: "approved" | "rejected",
  reviewerId: string,
  reviewNote?: string
): Promise<void> {
  await updateDoc(doc(db, ABSENCE_COL, requestId), {
    status: decision,
    reviewedBy: reviewerId,
    reviewedAt: Date.now(),
    ...(reviewNote ? { reviewNote } : {}),
  });
}

export async function getPendingCount(): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, ABSENCE_COL), where("status", "==", "pending"))
  );
  return snap.data().count;
}
