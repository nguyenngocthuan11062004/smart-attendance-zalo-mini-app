/**
 * In-memory mock database for simulator testing.
 * When mock mode is on, all services use this instead of Firestore.
 */
import type { UserDoc, ClassDoc, SessionDoc, AttendanceDoc, FraudReport } from "@/types";

// ---- Mock mode flag ----
let _mockMode = false;
export function isMockMode(): boolean { return _mockMode; }
export function setMockMode(on: boolean) { _mockMode = on; }

// ---- Collections ----
const store: {
  users: Map<string, UserDoc>;
  classes: Map<string, ClassDoc>;
  sessions: Map<string, SessionDoc>;
  attendance: Map<string, AttendanceDoc>;
  fraud_reports: Map<string, FraudReport>;
} = {
  users: new Map(),
  classes: new Map(),
  sessions: new Map(),
  attendance: new Map(),
  fraud_reports: new Map(),
};

// ---- Helpers ----
let _counter = 0;
function genId(prefix: string) { return `${prefix}_${++_counter}_${Date.now()}`; }

// ---- Public API ----
export const mockDb = {
  // Users
  getUser(id: string) { return store.users.get(id) || null; },
  setUser(u: UserDoc) { store.users.set(u.id, u); },
  getUsersByIds(ids: string[]) { return ids.map(id => store.users.get(id)).filter(Boolean) as UserDoc[]; },

  // Classes
  getClass(id: string) { return store.classes.get(id) || null; },
  setClass(c: ClassDoc) { store.classes.set(c.id, c); },
  getClassByCode(code: string) {
    for (const c of store.classes.values()) if (c.code === code) return c;
    return null;
  },
  getTeacherClasses(teacherId: string) {
    return [...store.classes.values()].filter(c => c.teacherId === teacherId);
  },
  getStudentClasses(studentId: string) {
    return [...store.classes.values()].filter(c => c.studentIds.includes(studentId));
  },
  createClass(data: Omit<ClassDoc, "id">): ClassDoc {
    const id = genId("class");
    const c = { id, ...data };
    store.classes.set(id, c);
    return c;
  },
  joinClass(classId: string, studentId: string) {
    const c = store.classes.get(classId);
    if (c && !c.studentIds.includes(studentId)) {
      c.studentIds.push(studentId);
    }
  },

  // Sessions
  getSession(id: string) { return store.sessions.get(id) || null; },
  setSession(s: SessionDoc) { store.sessions.set(s.id, s); },
  getActiveSessionForClass(classId: string) {
    for (const s of store.sessions.values()) {
      if (s.classId === classId && s.status === "active") return s;
    }
    return null;
  },
  getClassSessions(classId: string) {
    return [...store.sessions.values()]
      .filter(s => s.classId === classId)
      .sort((a, b) => b.startedAt - a.startedAt);
  },
  createSession(data: Omit<SessionDoc, "id">): SessionDoc {
    const id = genId("session");
    const s = { id, ...data };
    store.sessions.set(id, s);
    return s;
  },
  endSession(id: string) {
    const s = store.sessions.get(id);
    if (s) { s.status = "ended"; s.endedAt = Date.now(); }
  },

  // Attendance
  getAttendance(id: string) { return store.attendance.get(id) || null; },
  setAttendance(a: AttendanceDoc) { store.attendance.set(a.id, a); },
  getSessionAttendance(sessionId: string) {
    return [...store.attendance.values()].filter(a => a.sessionId === sessionId);
  },
  getMyAttendance(sessionId: string, studentId: string) {
    for (const a of store.attendance.values()) {
      if (a.sessionId === sessionId && a.studentId === studentId) return a;
    }
    return null;
  },
  getStudentHistory(studentId: string) {
    return [...store.attendance.values()].filter(a => a.studentId === studentId);
  },
  createAttendance(data: Omit<AttendanceDoc, "id">): AttendanceDoc {
    const id = genId("att");
    const a = { id, ...data };
    store.attendance.set(id, a);
    return a;
  },

  // Fraud reports
  getFraudReports(classId: string) {
    return [...store.fraud_reports.values()]
      .filter(r => r.classId === classId)
      .sort((a, b) => b.generatedAt - a.generatedAt);
  },
  addFraudReport(r: FraudReport) { store.fraud_reports.set(r.id, r); },

  // Reset
  clear() {
    store.users.clear();
    store.classes.clear();
    store.sessions.clear();
    store.attendance.clear();
    store.fraud_reports.clear();
    _counter = 0;
  },
};

// ---- Seed data ----
export function seedMockData() {
  mockDb.clear();
  const NOW = Date.now();
  const DAY = 86400000;

  // Users
  const usersData: UserDoc[] = [
    { id: "teacher_001", zaloId: "teacher_001", name: "Tran Thi B (GV)", avatar: "", role: "teacher", createdAt: NOW - DAY * 60, updatedAt: NOW },
    { id: "student_001", zaloId: "s1", name: "Nguyen Van A", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW },
    { id: "student_002", zaloId: "s2", name: "Le Van C", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 50, updatedAt: NOW },
    { id: "student_003", zaloId: "s3", name: "Pham Thi D", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW },
    { id: "student_004", zaloId: "s4", name: "Hoang Van E", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 50, updatedAt: NOW },
    { id: "student_005", zaloId: "s5", name: "Vo Thi F", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 50, updatedAt: NOW },
    { id: "student_006", zaloId: "s6", name: "Tran Van G", avatar: "", role: "student", faceRegistered: false, createdAt: NOW - DAY * 45, updatedAt: NOW },
    { id: "student_007", zaloId: "s7", name: "Bui Thi H", avatar: "", role: "student", faceRegistered: true, createdAt: NOW - DAY * 45, updatedAt: NOW },
  ];
  usersData.forEach(u => mockDb.setUser(u));

  // Classes
  const classesData: ClassDoc[] = [
    { id: "class_001", name: "CNTT K68 - Lap trinh Web", code: "WEB68A", teacherId: "teacher_001", teacherName: "Tran Thi B", studentIds: ["student_001","student_002","student_003","student_004","student_005","student_006","student_007"], createdAt: NOW - DAY * 30 },
    { id: "class_002", name: "CNTT K68 - Co so du lieu", code: "DB68A", teacherId: "teacher_001", teacherName: "Tran Thi B", studentIds: ["student_001","student_002","student_003"], createdAt: NOW - DAY * 20 },
    { id: "class_003", name: "CNTT K68 - Mang may tinh", code: "NET68", teacherId: "teacher_001", teacherName: "Tran Thi B", studentIds: ["student_001","student_006"], createdAt: NOW - DAY * 10 },
  ];
  classesData.forEach(c => mockDb.setClass(c));

  // Sessions
  const sessionsData: SessionDoc[] = [
    { id: "session_001", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "ended", hmacSecret: "s1", qrRefreshInterval: 15, startedAt: NOW - DAY * 7, endedAt: NOW - DAY * 7 + 3600000 },
    { id: "session_002", classId: "class_001", className: "CNTT K68 - Lap trinh Web", teacherId: "teacher_001", status: "ended", hmacSecret: "s2", qrRefreshInterval: 15, startedAt: NOW - DAY * 3, endedAt: NOW - DAY * 3 + 2700000 },
    { id: "session_003", classId: "class_002", className: "CNTT K68 - Co so du lieu", teacherId: "teacher_001", status: "ended", hmacSecret: "s3", qrRefreshInterval: 15, startedAt: NOW - DAY * 5, endedAt: NOW - DAY * 5 + 3000000 },
  ];
  sessionsData.forEach(s => mockDb.setSession(s));

  // Attendance — session_001: 5/7 check-in (student_006, student_007 absent)
  const s1Base = NOW - DAY * 7;
  const att: AttendanceDoc[] = [
    { id: "att_001", sessionId: "session_001", classId: "class_001", studentId: "student_001", studentName: "Nguyen Van A", checkedInAt: s1Base + 300000, peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s1Base + 400000, qrNonce: "n1" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: s1Base + 500000, qrNonce: "n2" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: s1Base + 600000, qrNonce: "n3" },
    ], peerCount: 3, trustScore: "present", faceVerification: { matched: true, confidence: 0.92, selfieImagePath: "", verifiedAt: s1Base + 350000 } },
    { id: "att_002", sessionId: "session_001", classId: "class_001", studentId: "student_002", studentName: "Le Van C", checkedInAt: s1Base + 320000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s1Base + 400000, qrNonce: "n4" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: s1Base + 550000, qrNonce: "n5" },
    ], peerCount: 2, trustScore: "review", faceVerification: { matched: false, confidence: 0, selfieImagePath: "", verifiedAt: 0, skipped: true } },
    { id: "att_003", sessionId: "session_001", classId: "class_001", studentId: "student_003", studentName: "Pham Thi D", checkedInAt: s1Base + 340000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s1Base + 500000, qrNonce: "n6" },
    ], peerCount: 1, trustScore: "review", faceVerification: { matched: false, confidence: 0.35, selfieImagePath: "", verifiedAt: s1Base + 380000 } },
    { id: "att_004", sessionId: "session_001", classId: "class_001", studentId: "student_004", studentName: "Hoang Van E", checkedInAt: s1Base + 360000, peerVerifications: [], peerCount: 0, trustScore: "absent" },
    { id: "att_005", sessionId: "session_001", classId: "class_001", studentId: "student_005", studentName: "Vo Thi F", checkedInAt: s1Base + 380000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s1Base + 600000, qrNonce: "n7" },
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s1Base + 650000, qrNonce: "n8" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: s1Base + 700000, qrNonce: "n9" },
    ], peerCount: 3, trustScore: "present" },
  ];

  // session_002: 6/7 check-in (student_004 absent)
  const s2Base = NOW - DAY * 3;
  att.push(
    { id: "att_006", sessionId: "session_002", classId: "class_001", studentId: "student_001", studentName: "Nguyen Van A", checkedInAt: s2Base + 200000, peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s2Base + 300000, qrNonce: "s2n1" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: s2Base + 400000, qrNonce: "s2n2" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: s2Base + 500000, qrNonce: "s2n3" },
    ], peerCount: 3, trustScore: "present", faceVerification: { matched: true, confidence: 0.95, selfieImagePath: "", verifiedAt: s2Base + 250000 } },
    { id: "att_007", sessionId: "session_002", classId: "class_001", studentId: "student_002", studentName: "Le Van C", checkedInAt: s2Base + 220000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s2Base + 300000, qrNonce: "s2n4" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: s2Base + 350000, qrNonce: "s2n5" },
      { peerId: "student_007", peerName: "Bui Thi H", verifiedAt: s2Base + 450000, qrNonce: "s2n6" },
    ], peerCount: 3, trustScore: "present" },
    { id: "att_008", sessionId: "session_002", classId: "class_001", studentId: "student_003", studentName: "Pham Thi D", checkedInAt: s2Base + 240000, peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s2Base + 350000, qrNonce: "s2n7" },
    ], peerCount: 1, trustScore: "review" },
    { id: "att_009", sessionId: "session_002", classId: "class_001", studentId: "student_005", studentName: "Vo Thi F", checkedInAt: s2Base + 260000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s2Base + 400000, qrNonce: "s2n9" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: s2Base + 420000, qrNonce: "s2n10" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: s2Base + 480000, qrNonce: "s2n11" },
    ], peerCount: 3, trustScore: "present" },
    { id: "att_010", sessionId: "session_002", classId: "class_001", studentId: "student_006", studentName: "Tran Van G", checkedInAt: s2Base + 280000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s2Base + 500000, qrNonce: "s2n12" },
    ], peerCount: 1, trustScore: "review" },
    { id: "att_011", sessionId: "session_002", classId: "class_001", studentId: "student_007", studentName: "Bui Thi H", checkedInAt: s2Base + 300000, peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s2Base + 450000, qrNonce: "s2n13" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: s2Base + 500000, qrNonce: "s2n14" },
      { peerId: "student_006", peerName: "Tran Van G", verifiedAt: s2Base + 550000, qrNonce: "s2n15" },
    ], peerCount: 3, trustScore: "present" },
  );

  // session_003 (class_002): 2/3 check-in (student_003 absent)
  const s3Base = NOW - DAY * 5;
  att.push(
    { id: "att_012", sessionId: "session_003", classId: "class_002", studentId: "student_001", studentName: "Nguyen Van A", checkedInAt: s3Base + 300000, peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: s3Base + 450000, qrNonce: "s3n1" },
    ], peerCount: 1, trustScore: "review" },
    { id: "att_013", sessionId: "session_003", classId: "class_002", studentId: "student_002", studentName: "Le Van C", checkedInAt: s3Base + 350000, peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: s3Base + 450000, qrNonce: "s3n2" },
    ], peerCount: 1, trustScore: "review" },
  );

  att.forEach(a => mockDb.setAttendance(a));
}
