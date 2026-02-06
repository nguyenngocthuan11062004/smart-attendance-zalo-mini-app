export type UserRole = "student" | "teacher";

export interface UserDoc {
  id: string;
  zaloId: string;
  name: string;
  avatar: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface ClassDoc {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  createdAt: number;
}

export interface SessionDoc {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  status: "active" | "ended";
  hmacSecret: string;
  qrRefreshInterval: number;
  startedAt: number;
  endedAt?: number;
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
}

export interface PeerVerification {
  peerId: string;
  peerName: string;
  verifiedAt: number;
  qrNonce: string;
}

export type TrustScore = "present" | "review" | "absent";

export interface QRPayload {
  type: "teacher" | "peer";
  sessionId: string;
  userId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface FraudReport {
  id: string;
  sessionId: string;
  classId: string;
  generatedAt: number;
  suspiciousPatterns: SuspiciousPattern[];
  summary: string;
}

export interface SuspiciousPattern {
  type: "always_same_peers" | "rapid_verification" | "low_peer_count";
  studentIds: string[];
  description: string;
  severity: "low" | "medium" | "high";
}

export function computeTrustScore(peerCount: number): TrustScore {
  if (peerCount >= 3) return "present";
  if (peerCount >= 1) return "review";
  return "absent";
}
