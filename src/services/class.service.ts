import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  arrayUnion,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { isMockMode, mockDb } from "@/utils/mock-db";
import { cacheGet, cacheSet, cacheRemove } from "@/utils/cache";
import type { ClassDoc } from "@/types";

// ── Realtime subscriptions ──────────────────────────────────────────
// Trả về dữ liệu sống: tạo/sửa/xóa lớp (kể cả từ admin web) phản ánh ngay
// trên Mini App, không phải chờ cache 2 phút hết hạn hay refresh tay.

/** Toàn bộ lớp — dùng cho trang tra cứu. */
export function subscribeAllClasses(cb: (classes: ClassDoc[]) => void): Unsubscribe {
  if (isMockMode()) { cb(mockDb.getAllClasses()); return () => {}; }
  return onSnapshot(collection(db, CLASSES), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc));
  }, (err) => { console.error("subscribeAllClasses error:", err); cb([]); });
}

/** Lớp GV đang dạy. */
export function subscribeTeacherClasses(teacherId: string, cb: (classes: ClassDoc[]) => void): Unsubscribe {
  if (isMockMode()) { cb(mockDb.getTeacherClasses(teacherId)); return () => {}; }
  const q = query(collection(db, CLASSES), where("teacherId", "==", teacherId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc));
  }, (err) => { console.error("subscribeTeacherClasses error:", err); cb([]); });
}

/** Lớp SV thuộc về (MSSV nằm trong rosterMssv). */
export function subscribeStudentClasses(mssv: string, cb: (classes: ClassDoc[]) => void): Unsubscribe {
  if (!mssv) { cb([]); return () => {}; }
  if (isMockMode()) { cb(mockDb.getStudentClasses(mssv)); return () => {}; }
  const q = query(collection(db, CLASSES), where("rosterMssv", "array-contains", mssv));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc));
  }, (err) => { console.error("subscribeStudentClasses error:", err); cb([]); });
}

const CLASSES = "classes";

function generateClassCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createClass(
  teacherId: string,
  teacherName: string,
  name: string
): Promise<ClassDoc> {
  const data: Omit<ClassDoc, "id"> = {
    name,
    code: generateClassCode(),
    teacherId,
    teacherName,
    studentIds: [],
    createdAt: Date.now(),
  };
  if (isMockMode()) {
    return mockDb.createClass(data);
  }
  const ref = doc(collection(db, CLASSES));
  await setDoc(ref, data);
  return { id: ref.id, ...data };
}

export async function getClassById(classId: string): Promise<ClassDoc | null> {
  if (isMockMode()) return mockDb.getClass(classId);
  const snap = await getDoc(doc(db, CLASSES, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClassDoc;
}

export async function getClassByCode(code: string): Promise<ClassDoc | null> {
  if (isMockMode()) return mockDb.getClassByCode(code.toUpperCase());
  const q = query(collection(db, CLASSES), where("code", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ClassDoc;
}

/** Toàn bộ lớp trong hệ thống — dùng cho trang tìm kiếm. */
export async function getAllClasses(): Promise<ClassDoc[]> {
  if (isMockMode()) return mockDb.getAllClasses();
  const cached = await cacheGet<ClassDoc[]>("all_classes");
  if (cached) return cached;
  const snap = await getDocs(collection(db, CLASSES));
  const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
  await cacheSet("all_classes", result, 2 * 60 * 1000);
  return result;
}

export async function getTeacherClasses(teacherId: string): Promise<ClassDoc[]> {
  if (isMockMode()) return mockDb.getTeacherClasses(teacherId);
  const cached = await cacheGet<ClassDoc[]>(`teacher_classes_${teacherId}`);
  if (cached) return cached;
  const q = query(collection(db, CLASSES), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
  await cacheSet(`teacher_classes_${teacherId}`, result, 2 * 60 * 1000);
  return result;
}

/**
 * SV chỉ thấy lớp mà MSSV của họ nằm trong danh sách chính thức (rosterMssv).
 * Truyền MSSV của SV (không phải userId).
 */
export async function getStudentClasses(mssv: string): Promise<ClassDoc[]> {
  if (!mssv) return [];
  if (isMockMode()) return mockDb.getStudentClasses(mssv);
  const cached = await cacheGet<ClassDoc[]>(`student_classes_${mssv}`);
  if (cached) return cached;
  const q = query(
    collection(db, CLASSES),
    where("rosterMssv", "array-contains", mssv)
  );
  const snap = await getDocs(q);
  const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
  await cacheSet(`student_classes_${mssv}`, result, 2 * 60 * 1000);
  return result;
}

export async function joinClass(classId: string, studentId: string): Promise<void> {
  if (isMockMode()) { mockDb.joinClass(classId, studentId); return; }
  await updateDoc(doc(db, CLASSES, classId), {
    studentIds: arrayUnion(studentId),
  });
  await cacheRemove(`student_classes_${studentId}`);
}

export async function updateClassConfig(
  classId: string,
  config: { faceRequired: boolean; peerRequired: boolean }
): Promise<void> {
  if (isMockMode()) {
    const cls = mockDb.getClass(classId);
    if (cls) {
      (cls as any).faceRequired = config.faceRequired;
      (cls as any).peerRequired = config.peerRequired;
    }
    return;
  }
  await updateDoc(doc(db, CLASSES, classId), {
    faceRequired: config.faceRequired,
    peerRequired: config.peerRequired,
  });
  // Xoá cache đúng key. Key cũ `teacher_classes_` THIẾU teacherId nên không bao
  // giờ khớp entry `teacher_classes_${teacherId}` → cache không bị xoá, GV vẫn
  // thấy cấu hình cũ tới 2 phút. Đọc teacherId từ doc rồi xoá đúng key + all_classes.
  try {
    const snap = await getDoc(doc(db, CLASSES, classId));
    const teacherId = snap.exists() ? (snap.data().teacherId as string | undefined) : undefined;
    if (teacherId) await cacheRemove(`teacher_classes_${teacherId}`);
  } catch { /* ignore — cache best-effort */ }
  await cacheRemove("all_classes");
}

export async function getClassStudents(
  studentIds: string[]
): Promise<{ id: string; name: string; avatar: string }[]> {
  if (studentIds.length === 0) return [];
  if (isMockMode()) {
    return mockDb.getUsersByIds(studentIds).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));
  }
  const results: { id: string; name: string; avatar: string }[] = [];
  const batches: string[][] = [];
  for (let i = 0; i < studentIds.length; i += 30) {
    batches.push(studentIds.slice(i, i + 30));
  }
  for (const batch of batches) {
    const q = query(collection(db, "users"), where("__name__", "in", batch));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data();
      results.push({ id: d.id, name: data.name || d.id, avatar: data.avatar || "" });
    });
  }
  return results;
}
