export type UserRole = "student" | "teacher" | "admin";

export interface UserDoc {
  id: string;
  zaloId?: string;
  name: string;
  avatar: string;
  role: UserRole;
  mssv?: string;
  phone?: string;
  email?: string;
  birthdate?: string;
  department?: string;
  program?: string;
  className?: string;
  faceRegistered?: boolean;
  cccdNumber?: string;
  cccdName?: string;
  cccdDob?: string;
  cccdGender?: string;
  cccdAddress?: string;
  cccdRegistered?: boolean;
  microsoftEmail?: string;
  hustVerified?: boolean;
  hustStudentId?: string;
  microsoftLinkedAt?: number;
  microsoftDisplayName?: string;
  followedOA?: boolean;
  zaloPhone?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClassSchedule {
  dayOfWeek: number; // 1-7, 1=Thứ Hai ... 7=Chủ Nhật (ISO 8601)
  startTime: string; // "HH:MM"
  endTime: string;
}

export interface ClassDoc {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  faceRequired?: boolean;
  peerRequired?: boolean;
  schedule?: ClassSchedule;
  location?: string;
  createdAt: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SessionDoc {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  status: "active" | "ended";
  hmacSecret: string;
  qrRefreshInterval: number;
  faceRequired?: boolean;
  peerRequired?: boolean;
  startedAt: number;
  endedAt?: number;
  location?: GeoLocation;
  geoFenceRadius?: number;
}

export interface FaceVerificationResult {
  matched: boolean;
  confidence: number;
  selfieImagePath: string;
  verifiedAt: number;
  error?: string;
  skipped?: boolean;
  livenessChecked?: boolean;
}

export interface AttendanceDoc {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  checkedInAt: number;
  peerVerifications: PeerVerification[];
  peerCount: number;
  trustScore: TrustScore;
  teacherOverride?: "present" | "absent";
  faceVerification?: FaceVerificationResult;
  manualBy?: string;
  manualReason?: string;
  manualAt?: number;
}

export interface PeerVerification {
  peerId: string;
  peerName: string;
  verifiedAt: number;
  qrNonce: string;
}

export type TrustScore = "present" | "review" | "absent";

export interface FraudReport {
  id: string;
  sessionId: string;
  classId: string;
  generatedAt: number;
  suspiciousPatterns: SuspiciousPattern[];
  summary: string;
}

export interface SuspiciousPattern {
  type: "always_same_peers" | "rapid_verification" | "low_peer_count" | "face_mismatch" | "ai_detected";
  studentIds: string[];
  description: string;
  severity: "low" | "medium" | "high";
}

export interface AbsenceRequestDoc {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  sessionId: string;
  reason: string;
  attachmentPaths: string[];
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
  createdAt: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSessions: number;
  todayActiveSessions: number;
  pendingAbsenceRequests: number;
  averageAttendanceRate: number;
}
