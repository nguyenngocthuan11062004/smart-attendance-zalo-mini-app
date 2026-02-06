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
  const ref = doc(collection(db, CLASSES));
  const classDoc: Omit<ClassDoc, "id"> = {
    name,
    code: generateClassCode(),
    teacherId,
    teacherName,
    studentIds: [],
    createdAt: Date.now(),
  };
  await setDoc(ref, classDoc);
  return { id: ref.id, ...classDoc };
}

export async function getClassById(classId: string): Promise<ClassDoc | null> {
  const snap = await getDoc(doc(db, CLASSES, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClassDoc;
}

export async function getClassByCode(code: string): Promise<ClassDoc | null> {
  const q = query(collection(db, CLASSES), where("code", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ClassDoc;
}

export async function getTeacherClasses(teacherId: string): Promise<ClassDoc[]> {
  const q = query(collection(db, CLASSES), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
}

export async function getStudentClasses(studentId: string): Promise<ClassDoc[]> {
  const q = query(
    collection(db, CLASSES),
    where("studentIds", "array-contains", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
}

export async function joinClass(classId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, CLASSES, classId), {
    studentIds: arrayUnion(studentId),
  });
}
