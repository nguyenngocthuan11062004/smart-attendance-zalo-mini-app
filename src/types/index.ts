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
  // 1 = Thứ Hai, 2 = Thứ Ba, ..., 7 = Chủ Nhật (ISO 8601 — phù hợp hiển thị
  // tiếng Việt: bắt đầu tuần từ Thứ Hai)
  dayOfWeek: number;
  startTime: string; // "HH:MM" — VD "07:30"
  endTime: string;   // "HH:MM" — VD "09:00"
}

export interface ClassDoc {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  faceRequired?: boolean;  // default true
  peerRequired?: boolean;  // default true
  // Lịch dạy cố định trong tuần — dùng để hiển thị TKB cho GV
  schedule?: ClassSchedule;
  // Tên phòng/giảng đường — VD "D9-201", "Hội trường C2"
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
  faceRequired?: boolean;  // default true
  peerRequired?: boolean;  // default true
  durationMinutes?: number;  // thời lượng phiên (phút), mặc định 90
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
  location?: GeoLocation;  // student GPS location at check-in
  manualBy?: string;      // teacherId who marked manually
  manualReason?: string;   // reason for manual attendance
  manualAt?: number;       // timestamp of manual action
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
  faceMatchConfidence?: number;
  registeredAt: number;
  updatedAt: number;
}

export interface PairingTokenDoc {
  token: string;
  status: "pending" | "paired";
  sessionId: string | null;
  classId: string | null;
  className: string | null;
  teacherId: string | null;
  createdAt: number;
  expiresAt: number;
  pairedAt?: number;
}

export interface AbsenceRequestDoc {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  // sessionId rỗng => xin nghỉ chung cho lớp, không gắn buổi cụ thể
  sessionId: string;
  reason: string;
  attachmentPaths: string[];
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
  createdAt: number;
}

export function computeTrustScore(
  peerCount: number,
  faceVerification?: FaceVerificationResult,
  config?: { faceRequired?: boolean; peerRequired?: boolean }
): TrustScore {
  const faceReq = config?.faceRequired !== false;
  const peerReq = config?.peerRequired !== false;

  const faceOk =
    faceVerification?.matched === true && (faceVerification.confidence ?? 0) >= 0.7;
  const faceSkipped = faceVerification?.skipped === true;
  const faceAttempted = !!faceVerification && !faceSkipped;

  const facePass = !faceReq || faceOk || faceSkipped || !faceAttempted;
  const peerPass = !peerReq || peerCount >= 3;

  if (facePass && peerPass) return "present";
  if (facePass || peerPass) return "review";
  return "absent";
}

/**
 * Trả về lý do chi tiết tại sao trust score là review/absent
 */
export function getTrustScoreReasons(
  peerCount: number,
  faceVerification?: FaceVerificationResult,
  config?: { faceRequired?: boolean; peerRequired?: boolean }
): string[] {
  const reasons: string[] = [];
  const faceReq = config?.faceRequired !== false;
  const peerReq = config?.peerRequired !== false;

  // Face check
  if (faceReq) {
    if (!faceVerification) {
      reasons.push("Chưa xác minh khuôn mặt");
    } else if (faceVerification.skipped) {
      reasons.push("Đã bỏ qua xác minh khuôn mặt");
    } else if (!faceVerification.matched) {
      reasons.push(`Khuôn mặt không khớp (${Math.round((faceVerification.confidence ?? 0) * 100)}%)`);
    } else if ((faceVerification.confidence ?? 0) < 0.7) {
      reasons.push(`Độ tin cậy khuôn mặt thấp (${Math.round((faceVerification.confidence ?? 0) * 100)}%)`);
    }
  }

  // Peer check
  if (peerReq) {
    if (peerCount === 0) {
      reasons.push("Chưa xác minh ngang hàng (0/3)");
    } else if (peerCount < 3) {
      reasons.push(`Chưa đủ xác minh ngang hàng (${peerCount}/3)`);
    }
  }

  // Location check (info only)
  if (reasons.length === 0) {
    reasons.push("Đã hoàn thành tất cả bước xác minh");
  }

  return reasons;
}
