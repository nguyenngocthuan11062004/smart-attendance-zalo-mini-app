import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserDoc, ClassDoc, SessionDoc, AttendanceDoc } from "@/types";

const NOW = Date.now();
const DAY = 86400000;

// ---- Users ----
const users: UserDoc[] = [
  { id: "teacher_001", zaloId: "teacher_001", name: "Tran Thi B (GV)", avatar: "", role: "teacher", createdAt: NOW - DAY * 60, updatedAt: NOW - DAY * 60 },
  { id: "student_001", zaloId: "student_001", name: "Nguyen Van A", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW - DAY * 50 },
  { id: "student_002", zaloId: "student_002", name: "Le Van C", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 50, updatedAt: NOW - DAY * 50 },
  { id: "student_003", zaloId: "student_003", name: "Pham Thi D", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW - DAY * 50 },
  { id: "student_004", zaloId: "student_004", name: "Hoang Van E", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 50, updatedAt: NOW - DAY * 50 },
  { id: "student_005", zaloId: "student_005", name: "Vo Thi F", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW - DAY * 50 },
  { id: "student_006", zaloId: "student_006", name: "Tran Van G", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 45, updatedAt: NOW - DAY * 45 },
  { id: "student_007", zaloId: "student_007", name: "Bui Thi H", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 45, updatedAt: NOW - DAY * 45 },
];

// ---- Classes ----
const classes: ClassDoc[] = [
  {
    id: "class_001",
    name: "CNTT K68 - Lap trinh Web",
    code: "WEB68A",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001", "student_002", "student_003", "student_004", "student_005", "student_006", "student_007"],
    createdAt: NOW - DAY * 30,
  },
  {
    id: "class_002",
    name: "CNTT K68 - Co so du lieu",
    code: "DB68A",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001", "student_002", "student_003"],
    createdAt: NOW - DAY * 20,
  },
  {
    id: "class_003",
    name: "CNTT K68 - Mang may tinh",
    code: "NET68",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001", "student_006"],
    createdAt: NOW - DAY * 10,
  },
];

// ---- Sessions ----
const sessions: SessionDoc[] = [
  // class_001: 1 ended session (7 days ago) + 1 ended (3 days ago)
  {
    id: "session_001",
    classId: "class_001",
    className: "CNTT K68 - Lap trinh Web",
    teacherId: "teacher_001",
    status: "ended",
    hmacSecret: "seed_secret_001",
    qrRefreshInterval: 15,
    startedAt: NOW - DAY * 7,
    endedAt: NOW - DAY * 7 + 3600000,
  },
  {
    id: "session_002",
    classId: "class_001",
    className: "CNTT K68 - Lap trinh Web",
    teacherId: "teacher_001",
    status: "ended",
    hmacSecret: "seed_secret_002",
    qrRefreshInterval: 15,
    startedAt: NOW - DAY * 3,
    endedAt: NOW - DAY * 3 + 2700000,
  },
  // class_002: 1 ended session
  {
    id: "session_003",
    classId: "class_002",
    className: "CNTT K68 - Co so du lieu",
    teacherId: "teacher_001",
    status: "ended",
    hmacSecret: "seed_secret_003",
    qrRefreshInterval: 15,
    startedAt: NOW - DAY * 5,
    endedAt: NOW - DAY * 5 + 3000000,
  },
];

// ---- Attendance ----
const attendance: Omit<AttendanceDoc, "id">[] = [
  // session_001 (class_001, 7 days ago) — 5/7 checked in, 2 absent (student_006, student_007)
  {
    sessionId: "session_001", classId: "class_001", studentId: "student_001", studentName: "Nguyen Van A",
    checkedInAt: NOW - DAY * 7 + 300000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 7 + 400000, qrNonce: "s1n1" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: NOW - DAY * 7 + 500000, qrNonce: "s1n2" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: NOW - DAY * 7 + 600000, qrNonce: "s1n3" },
    ],
    peerCount: 3, trustScore: "present",
    faceVerification: { matched: true, confidence: 0.92, selfieImagePath: "", verifiedAt: NOW - DAY * 7 + 350000 },
  },
  {
    sessionId: "session_001", classId: "class_001", studentId: "student_002", studentName: "Le Van C",
    checkedInAt: NOW - DAY * 7 + 320000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 7 + 400000, qrNonce: "s1n4" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: NOW - DAY * 7 + 550000, qrNonce: "s1n5" },
    ],
    peerCount: 2, trustScore: "review",
  },
  {
    sessionId: "session_001", classId: "class_001", studentId: "student_003", studentName: "Pham Thi D",
    checkedInAt: NOW - DAY * 7 + 340000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 7 + 500000, qrNonce: "s1n6" },
    ],
    peerCount: 1, trustScore: "review",
    faceVerification: { matched: false, confidence: 0.35, selfieImagePath: "", verifiedAt: NOW - DAY * 7 + 380000 },
  },
  {
    sessionId: "session_001", classId: "class_001", studentId: "student_004", studentName: "Hoang Van E",
    checkedInAt: NOW - DAY * 7 + 360000,
    peerVerifications: [],
    peerCount: 0, trustScore: "absent",
  },
  {
    sessionId: "session_001", classId: "class_001", studentId: "student_005", studentName: "Vo Thi F",
    checkedInAt: NOW - DAY * 7 + 380000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 7 + 600000, qrNonce: "s1n7" },
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 7 + 650000, qrNonce: "s1n8" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: NOW - DAY * 7 + 700000, qrNonce: "s1n9" },
    ],
    peerCount: 3, trustScore: "present",
  },

  // session_002 (class_001, 3 days ago) — 6/7 checked in, 1 absent (student_004)
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_001", studentName: "Nguyen Van A",
    checkedInAt: NOW - DAY * 3 + 200000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 3 + 300000, qrNonce: "s2n1" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: NOW - DAY * 3 + 400000, qrNonce: "s2n2" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: NOW - DAY * 3 + 500000, qrNonce: "s2n3" },
    ],
    peerCount: 3, trustScore: "present",
    faceVerification: { matched: true, confidence: 0.95, selfieImagePath: "", verifiedAt: NOW - DAY * 3 + 250000 },
  },
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_002", studentName: "Le Van C",
    checkedInAt: NOW - DAY * 3 + 220000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 3 + 300000, qrNonce: "s2n4" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: NOW - DAY * 3 + 350000, qrNonce: "s2n5" },
      { peerId: "student_007", peerName: "Bui Thi H", verifiedAt: NOW - DAY * 3 + 450000, qrNonce: "s2n6" },
    ],
    peerCount: 3, trustScore: "present",
  },
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_003", studentName: "Pham Thi D",
    checkedInAt: NOW - DAY * 3 + 240000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 3 + 350000, qrNonce: "s2n7" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: NOW - DAY * 3 + 420000, qrNonce: "s2n8" },
    ],
    peerCount: 2, trustScore: "review",
  },
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_005", studentName: "Vo Thi F",
    checkedInAt: NOW - DAY * 3 + 260000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 3 + 400000, qrNonce: "s2n9" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: NOW - DAY * 3 + 420000, qrNonce: "s2n10" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: NOW - DAY * 3 + 480000, qrNonce: "s2n11" },
    ],
    peerCount: 3, trustScore: "present",
  },
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_006", studentName: "Tran Van G",
    checkedInAt: NOW - DAY * 3 + 280000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 3 + 500000, qrNonce: "s2n12" },
    ],
    peerCount: 1, trustScore: "review",
  },
  {
    sessionId: "session_002", classId: "class_001", studentId: "student_007", studentName: "Bui Thi H",
    checkedInAt: NOW - DAY * 3 + 300000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 3 + 450000, qrNonce: "s2n13" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: NOW - DAY * 3 + 500000, qrNonce: "s2n14" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: NOW - DAY * 3 + 550000, qrNonce: "s2n15" },
    ],
    peerCount: 3, trustScore: "present",
  },

  // session_003 (class_002, 5 days ago) — 2/3 checked in, 1 absent (student_003)
  {
    sessionId: "session_003", classId: "class_002", studentId: "student_001", studentName: "Nguyen Van A",
    checkedInAt: NOW - DAY * 5 + 300000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: NOW - DAY * 5 + 450000, qrNonce: "s3n1" },
    ],
    peerCount: 1, trustScore: "review",
  },
  {
    sessionId: "session_003", classId: "class_002", studentId: "student_002", studentName: "Le Van C",
    checkedInAt: NOW - DAY * 5 + 350000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: NOW - DAY * 5 + 450000, qrNonce: "s3n2" },
    ],
    peerCount: 1, trustScore: "review",
  },
];

export async function seedTestData(
  onProgress?: (msg: string) => void
): Promise<void> {
  const log = onProgress || console.log;

  // 1. Seed users
  log("Dang tao users...");
  for (const u of users) {
    const { id, ...data } = u;
    await setDoc(doc(db, "users", id), data);
  }
  log(`Da tao ${users.length} users`);

  // 2. Seed classes
  log("Dang tao classes...");
  for (const c of classes) {
    const { id, ...data } = c;
    await setDoc(doc(db, "classes", id), data);
  }
  log(`Da tao ${classes.length} classes`);

  // 3. Seed sessions
  log("Dang tao sessions...");
  for (const s of sessions) {
    const { id, ...data } = s;
    await setDoc(doc(db, "sessions", id), data);
  }
  log(`Da tao ${sessions.length} sessions`);

  // 4. Seed attendance
  log("Dang tao attendance records...");
  for (let i = 0; i < attendance.length; i++) {
    const ref = doc(collection(db, "attendance"));
    await setDoc(ref, attendance[i]);
  }
  log(`Da tao ${attendance.length} attendance records`);

  log("Hoan tat! Du lieu test da duoc tao.");
}
