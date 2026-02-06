import type { UserDoc, ClassDoc, SessionDoc, AttendanceDoc } from "@/types";

export const mockStudent: UserDoc = {
  id: "student_001",
  zaloId: "student_001",
  name: "Nguyen Van A",
  avatar: "",
  role: "student",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const mockTeacher: UserDoc = {
  id: "teacher_001",
  zaloId: "teacher_001",
  name: "Tran Thi B (GV)",
  avatar: "",
  role: "teacher",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const mockClasses: ClassDoc[] = [
  {
    id: "class_001",
    name: "CNTT K68 - Lap trinh Web",
    code: "WEB68A",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001", "student_002", "student_003", "student_004", "student_005"],
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: "class_002",
    name: "CNTT K68 - Co so du lieu",
    code: "DB68A",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001", "student_002", "student_003"],
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: "class_003",
    name: "CNTT K68 - Mang may tinh",
    code: "NET68",
    teacherId: "teacher_001",
    teacherName: "Tran Thi B",
    studentIds: ["student_001"],
    createdAt: Date.now() - 86400000 * 10,
  },
];

export const mockSession: SessionDoc = {
  id: "session_001",
  classId: "class_001",
  className: "CNTT K68 - Lap trinh Web",
  teacherId: "teacher_001",
  status: "active",
  hmacSecret: "mock_secret_key_for_testing_12345678",
  qrRefreshInterval: 15,
  startedAt: Date.now() - 300000,
};

export const mockSessionEnded: SessionDoc = {
  ...mockSession,
  id: "session_002",
  status: "ended",
  endedAt: Date.now() - 60000,
};

export const mockAttendanceRecords: AttendanceDoc[] = [
  {
    id: "att_001",
    sessionId: "session_001",
    classId: "class_001",
    studentId: "student_001",
    studentName: "Nguyen Van A",
    checkedInAt: Date.now() - 240000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: Date.now() - 200000, qrNonce: "n1" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: Date.now() - 180000, qrNonce: "n2" },
      { peerId: "student_004", peerName: "Hoang Van E", verifiedAt: Date.now() - 160000, qrNonce: "n3" },
    ],
    peerCount: 3,
    trustScore: "present",
  },
  {
    id: "att_002",
    sessionId: "session_001",
    classId: "class_001",
    studentId: "student_002",
    studentName: "Le Van C",
    checkedInAt: Date.now() - 230000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: Date.now() - 200000, qrNonce: "n4" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: Date.now() - 170000, qrNonce: "n5" },
    ],
    peerCount: 2,
    trustScore: "review",
  },
  {
    id: "att_003",
    sessionId: "session_001",
    classId: "class_001",
    studentId: "student_003",
    studentName: "Pham Thi D",
    checkedInAt: Date.now() - 220000,
    peerVerifications: [
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: Date.now() - 180000, qrNonce: "n6" },
    ],
    peerCount: 1,
    trustScore: "review",
  },
  {
    id: "att_004",
    sessionId: "session_001",
    classId: "class_001",
    studentId: "student_004",
    studentName: "Hoang Van E",
    checkedInAt: Date.now() - 210000,
    peerVerifications: [],
    peerCount: 0,
    trustScore: "absent",
  },
  {
    id: "att_005",
    sessionId: "session_001",
    classId: "class_001",
    studentId: "student_005",
    studentName: "Vo Thi F",
    checkedInAt: Date.now() - 200000,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: Date.now() - 190000, qrNonce: "n7" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: Date.now() - 175000, qrNonce: "n8" },
      { peerId: "student_004", peerName: "Hoang Van E", verifiedAt: Date.now() - 165000, qrNonce: "n9" },
      { peerId: "student_001", peerName: "Nguyen Van A", verifiedAt: Date.now() - 155000, qrNonce: "n10" },
    ],
    peerCount: 4,
    trustScore: "present",
  },
];

// History: multiple sessions for student_001
export const mockStudentHistory: AttendanceDoc[] = [
  mockAttendanceRecords[0],
  {
    id: "att_h1",
    sessionId: "session_old_1",
    classId: "class_001",
    studentId: "student_001",
    studentName: "Nguyen Van A",
    checkedInAt: Date.now() - 86400000 * 7,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: Date.now() - 86400000 * 7, qrNonce: "h1" },
      { peerId: "student_003", peerName: "Pham Thi D", verifiedAt: Date.now() - 86400000 * 7, qrNonce: "h2" },
      { peerId: "student_005", peerName: "Vo Thi F", verifiedAt: Date.now() - 86400000 * 7, qrNonce: "h3" },
    ],
    peerCount: 3,
    trustScore: "present",
  },
  {
    id: "att_h2",
    sessionId: "session_old_2",
    classId: "class_002",
    studentId: "student_001",
    studentName: "Nguyen Van A",
    checkedInAt: Date.now() - 86400000 * 14,
    peerVerifications: [
      { peerId: "student_002", peerName: "Le Van C", verifiedAt: Date.now() - 86400000 * 14, qrNonce: "h4" },
    ],
    peerCount: 1,
    trustScore: "review",
  },
  {
    id: "att_h3",
    sessionId: "session_old_3",
    classId: "class_001",
    studentId: "student_001",
    studentName: "Nguyen Van A",
    checkedInAt: Date.now() - 86400000 * 21,
    peerVerifications: [],
    peerCount: 0,
    trustScore: "absent",
  },
];
