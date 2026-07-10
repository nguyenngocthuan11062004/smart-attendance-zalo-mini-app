import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  arrayUnion,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { computeTrustPolicy } from "@/types";
import { isMockMode, mockDb } from "@/utils/mock-db";
import { getDeviceId } from "@/utils/device";
import type { AttendanceDoc, FaceVerificationResult, GeoLocation, PeerVerification, QRPayload } from "@/types";

const ATTENDANCE = "attendance";

// ── Tương thích wire ─────────────────────────────────────────────────
// Firestore vẫn LƯU field theo key cũ "trustScore" (dữ liệu lịch sử + admin
// đang query where("trustScore", ...)). Code đã đổi tên khái niệm thành
// trustPolicy → map tại biên: ĐỌC ưu tiên trustPolicy, fallback trustScore;
// GHI luôn ghi CẢ HAI key để bản cũ/admin/dữ liệu lịch sử không vỡ.
function mapAttendanceDoc(d: { id: string; data: () => any }): AttendanceDoc {
  const data = d.data();
  return { id: d.id, ...data, trustPolicy: data.trustPolicy ?? data.trustScore } as AttendanceDoc;
}

/**
 * Check in student — writes directly to Firestore (open rules).
 * TODO: Khi có Blaze plan, chuyển lại dùng Cloud Function scanTeacher
 * để validate QR/HMAC server-side.
 */
export async function checkInStudent(
  sessionId: string,
  classId: string,
  studentId: string,
  studentName: string,
  studentMssv?: string,
  _qrPayload?: QRPayload,
  location?: GeoLocation,
  config?: { faceRequired?: boolean; peerRequired?: boolean },
  review?: { needsReview?: boolean; reason?: string }
): Promise<AttendanceDoc> {
  // Điểm danh xong nghĩa là đã hoàn tất các bước BẮT BUỘC của phiên: với phiên
  // không yêu cầu face/peer thì SV "present" ngay. Tính trustPolicy theo config
  // phiên thay vì ghi cứng "absent" — nếu không, màn Phiên điểm danh (đếm
  // === "present") và máy chiếu (đếm !== "absent") sẽ KHÔNG thấy SV cho tới khi
  // phiên kết thúc (lúc đó backfill mới tính lại). TeacherMonitor tính lại
  // client-side nên không bị, nhưng 2 màn kia đọc thẳng field này.
  const baseScore = computeTrustPolicy(0, undefined, config);
  // Policy chặt: chưa quét mặt = chưa pass → baseScore có thể là "absent" NGAY
  // lúc check-in dù SV vừa quét QR thật (các bước sau còn đang chờ). Sàn ở
  // "review" để máy chiếu/đếm phiên vẫn thấy SV; trạng thái CUỐI do các bước
  // sau + backfill lúc kết thúc phiên tính lại (effectiveTrustPolicy).
  const pendingScore = baseScore === "absent" ? ("review" as const) : baseScore;
  // GPS thiếu / QR cũ / TRÙNG THIẾT BỊ → hạ "present" xuống "review" để GV xem
  // xét. Trùng thiết bị KHÔNG chặn cứng — chỉ đánh dấu deviceConflict + ghi
  // reviewReason; màn GV (Monitor/Review) sẵn hiển thị reviewReason, màn SV
  // hiện banner cảnh báo.
  const buildReview = (deviceConflict: boolean) => {
    const needsReview = !!review?.needsReview || deviceConflict;
    const reasons = [
      ...(review?.reason ? [review.reason] : []),
      ...(deviceConflict ? ["Trùng thiết bị với SV khác trong phiên"] : []),
    ];
    const initialScore = needsReview && pendingScore === "present" ? ("review" as const) : pendingScore;
    const fields = {
      ...(needsReview ? { needsReview: true } : {}),
      ...(reasons.length ? { reviewReason: reasons.join(" · ") } : {}),
      ...(deviceConflict ? { deviceConflict: true } : {}),
    };
    return { initialScore, fields };
  };

  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) return existing;
    const mockDeviceId = await getDeviceId().catch(() => "");
    // Trùng thiết bị → KHÔNG chặn, chỉ đánh dấu cần xem xét
    const mockConflict = !!mockDeviceId && mockDb.getSessionAttendance(sessionId).some(
      (r) => r.deviceId === mockDeviceId && r.studentId !== studentId
    );
    const { initialScore, fields } = buildReview(mockConflict);
    const created = mockDb.createAttendance({
      sessionId, classId, studentId, studentName,
      ...(studentMssv ? { studentMssv } : {}),
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0, trustPolicy: initialScore,
      ...fields,
      ...(mockDeviceId ? { deviceId: mockDeviceId } : {}),
    });
    mockDb.notifyAttendanceChange(sessionId, studentId);
    return created;
  }

  // Check if already checked in
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    const d = existing.docs[0];
    return mapAttendanceDoc(d);
  }

  // Trùng thiết bị: máy này đã điểm danh cho SV khác trong phiên → KHÔNG chặn,
  // chỉ đánh dấu deviceConflict + hạ "review" để GV duyệt. deviceId do Zalo
  // cấp theo THIẾT BỊ (không đổi khi đổi tài khoản Zalo trên cùng máy).
  const deviceId = await getDeviceId().catch(() => "");
  let deviceConflict = false;
  if (deviceId) {
    const devQ = query(
      collection(db, ATTENDANCE),
      where("sessionId", "==", sessionId),
      where("deviceId", "==", deviceId)
    );
    const devSnap = await getDocs(devQ);
    deviceConflict = devSnap.docs.some((d) => (d.data().studentId as string) !== studentId);
  }
  const { initialScore, fields } = buildReview(deviceConflict);

  // Create new attendance record with location
  const record: Omit<AttendanceDoc, "id"> = {
    sessionId,
    classId,
    studentId,
    studentName,
    ...(studentMssv ? { studentMssv } : {}),
    checkedInAt: Date.now(),
    peerVerifications: [],
    peerCount: 0,
    trustPolicy: initialScore,
    ...fields,
    ...(location ? { location } : {}),
    ...(deviceId ? { deviceId } : {}),
  };

  // Ghi kèm key cũ "trustScore" — tương thích admin + dữ liệu lịch sử
  const ref = await addDoc(collection(db, ATTENDANCE), { ...record, trustScore: initialScore });
  return { id: ref.id, ...record } as AttendanceDoc;
}

export async function addPeerVerification(
  attendanceId: string,
  peer: PeerVerification
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    if (a.peerVerifications.some(v => v.peerId === peer.peerId)) return;
    a.peerVerifications.push(peer);
    a.peerCount++;
    a.trustPolicy = computeTrustPolicy(a.peerCount, a.faceVerification);
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    peerVerifications: arrayUnion(peer),
    peerCount: increment(1),
  });
}

/**
 * Bidirectional peer verification — writes directly to Firestore.
 * TODO: Khi có Blaze plan, chuyển lại dùng Cloud Function scanPeer.
 */
/**
 * Xác minh ngang hàng — MỘT CHIỀU. Chỉ bản ghi của NGƯỜI QUÉT (scanner) được
 * cộng peerCount + tính lại trust. Người bị quét KHÔNG được cộng gì vào trust —
 * họ phải TỰ quét 1 bạn mới đủ điều kiện. Ta chỉ ghi scannerId vào scannedBy của
 * họ để họ biết "đã có bạn quét lại QR của mình" (thông tin phụ, không tính trust).
 * => Bắt buộc CẢ HAI cùng chủ động quét; 1 máy không thể điểm danh hộ nhiều nick.
 *
 * Vẫn giữ 2 lớp an toàn: QR phải type "peer" + người bị quét PHẢI đã check-in
 * phiên (chặn "peer ma" / QR giảng viên bơm peerCount).
 */
export async function addPeerScan(
  sessionId: string,
  scannerId: string,
  scannerName: string,
  peerId: string,
  peerName: string,
  qrNonce: string,
  qrPayload?: QRPayload,
  _attendanceId?: string
): Promise<{ scannerUpdated: boolean }> {
  // QR phải là loại "peer" — chặn nhét QR giảng viên/loại khác vào bước ngang hàng
  if (qrPayload && qrPayload.type !== "peer") {
    throw Object.assign(new Error("QR không phải của sinh viên"), { code: "invalid-argument" });
  }

  if (isMockMode()) {
    // Người được quét PHẢI đã check-in phiên — chặn "peer ma" (đồng bộ luật real)
    if (!mockDb.getMyAttendance(sessionId, peerId)) {
      throw Object.assign(
        new Error("Sinh viên được quét chưa check-in phiên này"),
        { code: "peer-not-checked-in" }
      );
    }
    let scannerUpdated = false;
    const scannerAtt = mockDb.getMyAttendance(sessionId, scannerId);
    if (scannerAtt && !scannerAtt.peerVerifications.some((v) => v.peerId === peerId)) {
      scannerAtt.peerVerifications.push({ peerId, peerName, verifiedAt: Date.now(), qrNonce });
      scannerAtt.peerCount++;
      scannerAtt.trustPolicy = computeTrustPolicy(scannerAtt.peerCount, scannerAtt.faceVerification);
      mockDb.notifyAttendanceChange(sessionId, scannerId);
      scannerUpdated = true;
    }
    // Ghi scannedBy cho người bị quét (thông tin — KHÔNG cộng trust cho họ)
    const peerAtt = mockDb.getMyAttendance(sessionId, peerId);
    if (peerAtt) {
      peerAtt.scannedBy = peerAtt.scannedBy || [];
      if (!peerAtt.scannedBy.includes(scannerId)) {
        peerAtt.scannedBy.push(scannerId);
        mockDb.notifyAttendanceChange(sessionId, peerId);
      }
    }
    return { scannerUpdated };
  }

  const now = Date.now();

  // Người được quét PHẢI đã check-in phiên này — chặn "peer ma": quét QR
  // giảng viên / người ngoài phiên để bơm peerCount. (GV không có bản ghi
  // attendance nên QR giảng viên tự bị loại tại đây.)
  const peerQ = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", peerId)
  );
  const peerSnap = await getDocs(peerQ);
  if (peerSnap.empty) {
    throw Object.assign(
      new Error("Sinh viên được quét chưa check-in phiên này"),
      { code: "peer-not-checked-in" }
    );
  }

  // Update scanner's attendance (chỉ NGƯỜI QUÉT được cộng peerCount + trust)
  let scannerUpdated = false;
  const scannerQ = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", scannerId)
  );
  const scannerSnap = await getDocs(scannerQ);
  if (!scannerSnap.empty) {
    const scannerDoc = scannerSnap.docs[0];
    const scannerData = scannerDoc.data() as Omit<AttendanceDoc, "id">;
    if (!scannerData.peerVerifications?.some(v => v.peerId === peerId)) {
      const newPeer: PeerVerification = { peerId, peerName, verifiedAt: now, qrNonce };
      const newCount = (scannerData.peerCount || 0) + 1;
      const newPolicy = computeTrustPolicy(newCount, scannerData.faceVerification);
      await updateDoc(scannerDoc.ref, {
        peerVerifications: arrayUnion(newPeer),
        peerCount: newCount,
        trustPolicy: newPolicy,
        trustScore: newPolicy, // key cũ — tương thích admin + dữ liệu lịch sử
      });
      scannerUpdated = true;
    }
  }

  // Ghi scannedBy cho người bị quét — chỉ để họ biết "đã có bạn quét lại QR của
  // mình", KHÔNG cộng peerCount/trust cho họ. Best-effort: lỗi ở đây KHÔNG được
  // làm hỏng lần quét thành công của scanner.
  try {
    await updateDoc(peerSnap.docs[0].ref, { scannedBy: arrayUnion(scannerId) });
  } catch { /* thông tin phụ — bỏ qua nếu lỗi */ }

  return { scannerUpdated };
}

export async function getMyAttendance(
  sessionId: string,
  studentId: string
): Promise<AttendanceDoc | null> {
  if (isMockMode()) return mockDb.getMyAttendance(sessionId, studentId);
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapAttendanceDoc(d);
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceDoc[]> {
  if (isMockMode()) return mockDb.getSessionAttendance(sessionId);
  const q = query(collection(db, ATTENDANCE), where("sessionId", "==", sessionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAttendanceDoc(d));
}

export async function getStudentHistory(studentId: string): Promise<AttendanceDoc[]> {
  if (isMockMode()) return mockDb.getStudentHistory(studentId);
  const q = query(collection(db, ATTENDANCE), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAttendanceDoc(d));
}

export function subscribeToSessionAttendance(
  sessionId: string,
  callback: (records: AttendanceDoc[]) => void
): Unsubscribe {
  if (isMockMode()) {
    callback(mockDb.getSessionAttendance(sessionId));
    return mockDb.subscribeAttendanceForSession(sessionId, () => {
      callback(mockDb.getSessionAttendance(sessionId));
    });
  }
  const q = query(collection(db, ATTENDANCE), where("sessionId", "==", sessionId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => mapAttendanceDoc(d)));
  });
}

export function subscribeToMyAttendance(
  sessionId: string,
  studentId: string,
  callback: (record: AttendanceDoc | null) => void
): Unsubscribe {
  if (isMockMode()) {
    callback(mockDb.getMyAttendance(sessionId, studentId));
    return mockDb.subscribeAttendanceForStudent(sessionId, studentId, () => {
      callback(mockDb.getMyAttendance(sessionId, studentId));
    });
  }
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback(mapAttendanceDoc(d));
  });
}

export async function updateFaceVerification(
  attendanceId: string,
  faceResult: FaceVerificationResult
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    a.faceVerification = faceResult;
    a.trustPolicy = computeTrustPolicy(a.peerCount, faceResult);
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  // Read current peerCount so we can sync trustPolicy atomically with the
  // face result write (mock path already does this — keep parity).
  const ref = doc(db, ATTENDANCE, attendanceId);
  const snap = await getDoc(ref);
  const peerCount = snap.exists() ? ((snap.data().peerCount as number) ?? 0) : 0;
  const newPolicy = computeTrustPolicy(peerCount, faceResult);
  await updateDoc(ref, {
    faceVerification: faceResult,
    trustPolicy: newPolicy,
    trustScore: newPolicy, // key cũ — tương thích admin + dữ liệu lịch sử
  });
}

export async function teacherOverride(
  attendanceId: string,
  decision: "present" | "absent"
): Promise<void> {
  if (isMockMode()) {
    const a = mockDb.getAttendance(attendanceId);
    if (!a) return;
    a.teacherOverride = decision;
    a.trustPolicy = decision === "present" ? "present" : "absent";
    mockDb.notifyAttendanceChange(a.sessionId, a.studentId);
    return;
  }

  const policy = decision === "present" ? "present" : "absent";
  await updateDoc(doc(db, ATTENDANCE, attendanceId), {
    teacherOverride: decision,
    trustPolicy: policy,
    trustScore: policy, // key cũ — tương thích admin + dữ liệu lịch sử
  });
}

export async function manualCheckIn(
  sessionId: string,
  studentId: string,
  studentName: string,
  reason: string,
  decision: "present" | "absent" = "present",
  manualBy?: string
): Promise<{ id: string; created?: boolean; updated?: boolean }> {
  // Resolve classId from session — without it, new manual records would be
  // invisible to per-class queries (analytics, fraud reports, history).
  const resolveClassId = async (): Promise<string> => {
    if (isMockMode()) return mockDb.getSession(sessionId)?.classId ?? "";
    const sessSnap = await getDoc(doc(db, "sessions", sessionId));
    return sessSnap.exists() ? ((sessSnap.data().classId as string) ?? "") : "";
  };

  if (isMockMode()) {
    const existing = mockDb.getMyAttendance(sessionId, studentId);
    if (existing) {
      existing.teacherOverride = decision;
      existing.trustPolicy = decision;
      (existing as any).manualReason = reason;
      (existing as any).manualAt = Date.now();
      if (manualBy) (existing as any).manualBy = manualBy;
      mockDb.notifyAttendanceChange(sessionId, studentId);
      return { id: existing.id, updated: true };
    }
    const classId = await resolveClassId();
    const record = mockDb.createAttendance({
      sessionId, classId, studentId, studentName,
      checkedInAt: Date.now(), peerVerifications: [], peerCount: 0,
      trustPolicy: decision, teacherOverride: decision,
      ...(manualBy ? { manualBy } : {}),
    });
    mockDb.notifyAttendanceChange(sessionId, studentId);
    return { id: record.id, created: true };
  }

  // Check if student already has attendance
  const q = query(
    collection(db, ATTENDANCE),
    where("sessionId", "==", sessionId),
    where("studentId", "==", studentId)
  );
  const existing = await getDocs(q);

  if (!existing.empty) {
    const d = existing.docs[0];
    await updateDoc(d.ref, {
      teacherOverride: decision,
      trustPolicy: decision,
      trustScore: decision, // key cũ — tương thích admin + dữ liệu lịch sử
      manualReason: reason,
      manualAt: Date.now(),
      ...(manualBy ? { manualBy } : {}),
    });
    return { id: d.id, updated: true };
  }

  const classId = await resolveClassId();
  const record = {
    sessionId,
    classId,
    studentId,
    studentName,
    checkedInAt: Date.now(),
    peerVerifications: [],
    peerCount: 0,
    trustPolicy: decision,
    trustScore: decision, // key cũ — tương thích admin + dữ liệu lịch sử
    teacherOverride: decision,
    manualReason: reason,
    manualAt: Date.now(),
    ...(manualBy ? { manualBy } : {}),
  };
  const ref = await addDoc(collection(db, ATTENDANCE), record);
  return { id: ref.id, created: true };
}
