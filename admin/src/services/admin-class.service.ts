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
import type { ClassDoc, ClassSchedule, UserDoc } from "@/types";

const CLASSES_COL = "classes";
const USERS_COL = "users";

export async function getAllClasses(): Promise<ClassDoc[]> {
  const snap = await getDocs(collection(db, CLASSES_COL));
  const classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClassDoc);
  return classes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
  schedule?: ClassSchedule;
  location?: string;
}): Promise<string> {
  // Loại bỏ các field undefined để Firestore không lưu chúng (Firestore không
  // chấp nhận undefined trong field values).
  const payload: Record<string, any> = {
    name: data.name,
    code: data.code,
    teacherId: data.teacherId,
    teacherName: data.teacherName,
    studentIds: [],
    faceRequired: data.faceRequired ?? true,
    peerRequired: data.peerRequired ?? true,
    createdAt: Date.now(),
  };
  if (data.schedule) payload.schedule = data.schedule;
  if (data.location) payload.location = data.location;

  const docRef = await addDoc(collection(db, CLASSES_COL), payload);
  return docRef.id;
}

export async function updateClass(
  classId: string,
  data: Partial<Pick<ClassDoc, "name" | "code" | "teacherId" | "teacherName" | "faceRequired" | "peerRequired" | "schedule" | "location">>
): Promise<void> {
  // Firestore reject undefined trong updateDoc — chỉ giữ các field có giá trị
  // thực sự (caller có thể quên filter undefined).
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleaned[key] = value;
  }
  if (Object.keys(cleaned).length === 0) return; // không có gì để update
  await updateDoc(doc(db, CLASSES_COL, classId), cleaned);
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

  // Lấy từng doc bằng getDoc — đảm bảo tìm được
  const promises = studentIds.map(async (id) => {
    const snap = await getDoc(doc(db, USERS_COL, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserDoc;
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is UserDoc => r !== null);
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
