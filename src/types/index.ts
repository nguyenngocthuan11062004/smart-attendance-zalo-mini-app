export type UserRole = "student" | "teacher";

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
  microsoftEmail?: string;
  hustVerified?: boolean;
  hustStudentId?: string;
  microsoftLinkedAt?: number;
  microsoftDisplayName?: string;
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
  startedAt: number;
  endedAt?: number;
  location?: GeoLocation;
  geoFenceRadius?: number; // meters, default 200
}

export interface FaceVerificationResult {
  matched: boolean;
  confidence: number; // 0.0 - 1.0
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
  type: "always_same_peers" | "rapid_verification" | "low_peer_count" | "face_mismatch" | "ai_detected";
  studentIds: string[];
  description: string;
  severity: "low" | "medium" | "high";
}

export interface FaceRegistrationDoc {
  id: string;
  studentId: string;
  referenceImagePath: string;
  ekycImageId: string;
  sanityCheckPassed: boolean;
  registeredAt: number;
  updatedAt: number;
}

export function computeTrustScore(
  peerCount: number,
  faceVerification?: FaceVerificationResult
): TrustScore {
  const peerOk = peerCount >= 3;
  const faceOk =
    faceVerification?.matched === true && (faceVerification.confidence ?? 0) >= 0.7;
  const faceSkipped = faceVerification?.skipped === true;
  const faceAttempted = !!faceVerification && !faceSkipped;

  if (peerOk && (faceOk || faceSkipped || !faceAttempted)) return "present";
  if (peerOk && faceAttempted && !faceOk) return "review";
  if (peerCount >= 1 && faceOk) return "review";
  if (peerCount >= 1) return "review";
  return "absent";
}
