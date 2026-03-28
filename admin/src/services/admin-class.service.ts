import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { ClassDoc, UserDoc } from "@/types";

const CLASSES_COL = "classes";
const USERS_COL = "users";

export async function getAllClasses(): Promise<ClassDoc[]> {
  const q = query(collection(db, CLASSES_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
}

export async function getClassById(classId: string): Promise<ClassDoc | null> {
  const snap = await getDoc(doc(db, CLASSES_COL, classId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClassDoc;
}

export async function createClass(data: {
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  faceRequired?: boolean;
  peerRequired?: boolean;
}): Promise<string> {
  const docRef = await addDoc(collection(db, CLASSES_COL), {
    ...data,
    studentIds: [],
    faceRequired: data.faceRequired ?? true,
    peerRequired: data.peerRequired ?? true,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateClass(
  classId: string,
  data: Partial<Pick<ClassDoc, "name" | "code" | "teacherId" | "teacherName" | "faceRequired" | "peerRequired">>
): Promise<void> {
  await updateDoc(doc(db, CLASSES_COL, classId), data);
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, CLASSES_COL, classId));
}

export async function addStudentsToClass(classId: string, studentIds: string[]): Promise<void> {
  await updateDoc(doc(db, CLASSES_COL, classId), {
    studentIds: arrayUnion(...studentIds),
  });
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, CLASSES_COL, classId), {
    studentIds: arrayRemove(studentId),
  });
}

export async function getClassStudents(studentIds: string[]): Promise<UserDoc[]> {
  if (studentIds.length === 0) return [];

  // Firestore 'in' operator supports max 30 items per query
  const batches: UserDoc[] = [];
  for (let i = 0; i < studentIds.length; i += 30) {
    const batch = studentIds.slice(i, i + 30);
    const q = query(collection(db, USERS_COL), where("__name__", "in", batch));
    const snap = await getDocs(q);
    batches.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc));
  }

  return batches;
}

export async function getTeachers(): Promise<UserDoc[]> {
  const q = query(collection(db, USERS_COL), where("role", "==", "teacher"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);
}

export async function getClassStats(): Promise<{ total: number; avgStudents: number }> {
  const countSnap = await getCountFromServer(query(collection(db, CLASSES_COL)));
  const total = countSnap.data().count;

  const allClasses = await getAllClasses();
  const totalStudents = allClasses.reduce((sum, c) => sum + c.studentIds.length, 0);

  return {
    total,
    avgStudents: total > 0 ? Math.round(totalStudents / total) : 0,
  };
}
