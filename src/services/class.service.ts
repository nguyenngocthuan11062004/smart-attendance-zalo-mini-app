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
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { isMockMode, mockDb } from "@/utils/mock-db";
import type { ClassDoc } from "@/types";

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

export async function getTeacherClasses(teacherId: string): Promise<ClassDoc[]> {
  if (isMockMode()) return mockDb.getTeacherClasses(teacherId);
  const q = query(collection(db, CLASSES), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
}

export async function getStudentClasses(studentId: string): Promise<ClassDoc[]> {
  if (isMockMode()) return mockDb.getStudentClasses(studentId);
  const q = query(
    collection(db, CLASSES),
    where("studentIds", "array-contains", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
}

export async function joinClass(classId: string, studentId: string): Promise<void> {
  if (isMockMode()) { mockDb.joinClass(classId, studentId); return; }
  await updateDoc(doc(db, CLASSES, classId), {
    studentIds: arrayUnion(studentId),
  });
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
