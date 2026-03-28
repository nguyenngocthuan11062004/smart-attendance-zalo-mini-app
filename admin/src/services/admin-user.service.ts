import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  getCountFromServer,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { ImportedStudent } from "./import-export.service";
import { db } from "@/config/firebase";
import type { UserDoc, UserRole } from "@/types";

const USERS_COL = "users";
const PAGE_SIZE = 20;

export async function getUsers(options: {
  role?: UserRole;
  department?: string;
  search?: string;
  lastDoc?: DocumentSnapshot;
}): Promise<{ users: UserDoc[]; lastDoc: DocumentSnapshot | null; total: number }> {
  const constraints = [];

  if (options.role) {
    constraints.push(where("role", "==", options.role));
  }
  if (options.department) {
    constraints.push(where("department", "==", options.department));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (options.lastDoc) {
    constraints.push(startAfter(options.lastDoc));
  }
  constraints.push(limit(PAGE_SIZE));

  const q = query(collection(db, USERS_COL), ...constraints);
  const snap = await getDocs(q);

  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);

  // Client-side search filter (Firestore doesn't support text search)
  const filtered = options.search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(options.search!.toLowerCase()) ||
          u.mssv?.toLowerCase().includes(options.search!.toLowerCase()) ||
          u.phone?.includes(options.search!) ||
          u.email?.toLowerCase().includes(options.search!.toLowerCase())
      )
    : users;

  // Count total
  const countQuery = options.role
    ? query(collection(db, USERS_COL), where("role", "==", options.role))
    : query(collection(db, USERS_COL));
  const countSnap = await getCountFromServer(countQuery);

  return {
    users: filtered,
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    total: countSnap.data().count,
  };
}

export async function getUserById(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserDoc;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS_COL, userId), {
    role,
    updatedAt: Date.now(),
  });
}

export async function getUserStats(): Promise<{
  total: number;
  students: number;
  teachers: number;
  admins: number;
}> {
  const [totalSnap, studentSnap, teacherSnap, adminSnap] = await Promise.all([
    getCountFromServer(query(collection(db, USERS_COL))),
    getCountFromServer(query(collection(db, USERS_COL), where("role", "==", "student"))),
    getCountFromServer(query(collection(db, USERS_COL), where("role", "==", "teacher"))),
    getCountFromServer(query(collection(db, USERS_COL), where("role", "==", "admin"))),
  ]);

  return {
    total: totalSnap.data().count,
    students: studentSnap.data().count,
    teachers: teacherSnap.data().count,
    admins: adminSnap.data().count,
  };
}

/**
 * Find existing students by MSSV or create new user docs.
 * Returns array of user IDs (existing or newly created).
 */
export async function createOrFindStudents(
  students: Pick<ImportedStudent, "mssv" | "name" | "email" | "department">[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const student of students) {
    if (!student.mssv || !student.name) continue;

    // Search for existing user by MSSV
    const q = query(
      collection(db, USERS_COL),
      where("mssv", "==", student.mssv),
      limit(1)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      ids.push(snap.docs[0].id);
    } else {
      // Create new user doc with MSSV as doc ID
      const userId = student.mssv;
      await setDoc(doc(db, USERS_COL, userId), {
        name: student.name,
        avatar: "",
        role: "student",
        mssv: student.mssv,
        email: student.email || "",
        department: student.department || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(userId);
    }
  }

  return ids;
}
