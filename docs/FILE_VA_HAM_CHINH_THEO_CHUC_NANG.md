# FILE chính & HÀM chính theo chức năng — Zimo Check-in

> Với mỗi chức năng: **File chính** (đường dẫn đầy đủ) + bảng **Hàm chính · ở File nào · xử lý gì**.
> Tên hàm lấy trực tiếp từ code (grep). ⭐ = cốt lõi, hội đồng hay hỏi.

---

## 1. Xác thực & Đăng nhập
**File chính:** `src/services/auth.service.ts` · phụ: `src/hooks/useAuth.ts`, `src/pages/login.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| `signIn()` | auth.service.ts | Đăng nhập Zalo — chỉ `getUserID()`, không xin quyền (chính sách 6.1) |
| ⭐ `initAuthState(cb)` | auth.service.ts | Khôi phục phiên khi mở app (storage → làm mới Firestore) |
| `createOrUpdateUser()` | auth.service.ts | Tạo/cập nhật doc user (client chỉ gán được role "student") |
| `requestTeacherApproval()` | auth.service.ts | Gửi yêu cầu làm GV (`pendingTeacher:true`, chờ admin duyệt) |
| `subscribeUserDoc(id,cb)` | auth.service.ts | Realtime 1 user — màn chờ duyệt GV tự nhảy /home |
| `selectRole()` / `logout()` | useAuth.ts | Chọn vai trò / đăng xuất |

---

## 2. Mã QR động + HMAC
**File chính:** `src/utils/crypto.ts`, `src/utils/validation.ts` · phụ: `src/services/qr.service.ts`, `src/hooks/useQRGenerator.ts`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `signPayload(data, secret)` | crypto.ts | Ký HMAC-SHA256 `type:sessionId:userId:timestamp:nonce` |
| ⭐ `verifySignature(data, sig, secret)` | crypto.ts | Ký lại + so sánh → phát hiện giả mạo |
| `createQRContent(...)` | crypto.ts | Đóng gói QR = JSON {…, signature} |
| `generateNonce()` | crypto.ts | Sinh ngẫu nhiên 16 byte (chống trùng/replay) |
| ⭐ `classifyTeacherQR(payload, secret)` | validation.ts | `{authentic, stale}`: chữ ký đúng? quá 90s? → chặn / review |
| `validatePeerQR(...)` | validation.ts | Kiểm QR bạn (đúng ký, không tự quét, chưa trùng) |
| `parseScannedQR(raw)` | qr.service.ts | Chuỗi QR → object |
| `generateQRDataURL(content)` | qr.service.ts | Vẽ ra ảnh QR |
| ⭐ `useQRGenerator(options)` | useQRGenerator.ts | Sinh QR xoay mỗi 30s, đồng bộ theo `anchor` |

---

## 3. Điểm danh (luồng 4 bước)
**File chính:** `src/services/attendance.service.ts` · phụ: `src/hooks/useAttendance.ts`, `src/pages/student/StudentAttendance.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `checkInStudent(...)` | attendance.service.ts | Ghi bản ghi điểm danh (bước 1); cờ `needsReview` khi thiếu GPS/QR cũ |
| `updateFaceVerification(id, r)` | attendance.service.ts | Lưu kết quả khuôn mặt (bước 2) + tính lại trustScore |
| ⭐ `addBidirectionalPeerVerification(...)` | attendance.service.ts | Xác minh ngang hàng **2 chiều** (bước 3), đủ 3 = present |
| `teacherOverride(id, decision)` | attendance.service.ts | GV ghi đè present/absent |
| `manualCheckIn(...)` | attendance.service.ts | Điểm danh thủ công (lưu `manualBy`, `manualReason`) |
| ⭐ `subscribeToSessionAttendance(sid,cb)` | attendance.service.ts | Realtime cả phiên (màn Theo dõi + máy chiếu) |
| `subscribeToMyAttendance(...)` | attendance.service.ts | Realtime bản ghi của SV |
| ⭐ `useAttendance(sessionId, studentId)` | useAttendance.ts | Hook điều phối 4 bước (checkIn/face/peer + quản `step`) |

---

## 4. Nhận diện khuôn mặt
**File chính:** `src/services/face-ai.service.ts`, `src/services/face.service.ts` · phụ: `src/components/face/FaceVerification.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `detectFace(imageBase64)` | face-ai.service.ts | Phát hiện mặt → **vector 128 chiều** (face-api.js) |
| ⭐ `compareFaces(d1, d2)` | face-ai.service.ts | Khoảng cách **Euclid < 0.6** = cùng người; `confidence=1−distance` |
| `loadModels()` | face-ai.service.ts | Nạp 3 mô hình (lazy, 1 lần) |
| ⭐ `registerFace(selfie1, selfie2)` | face.service.ts | Đăng ký: 2 ảnh cùng người → lưu vector `face_registrations` |
| ⭐ `verifyFace(image, ...)` | face.service.ts | Điểm danh: so ảnh sống với vector đã đăng ký |
| `deleteFaceData(userId)` | face.service.ts | Xoá vector (quyền riêng tư) |

---

## 5. Phiên điểm danh
**File chính:** `src/services/session.service.ts` · phụ: `src/pages/teacher/TeacherSession.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `startSession(classId,...)` | session.service.ts | Mở phiên: sinh `hmacSecret`, lấy config face/peer từ lớp |
| ⭐ `endSession(sessionId)` | session.service.ts | Kết thúc (page kéo theo backfill trust score) |
| `getActiveSessionForClass(id)` | session.service.ts | Tìm phiên đang mở (1 phiên active/lớp) |
| `getSessionSecret(id)` | session.service.ts | Lấy khoá HMAC (doc phiên hoặc subcollection) |
| `subscribeToSession(id, cb)` | session.service.ts | Realtime phiên (máy chiếu biết khi kết thúc) |

---

## 6. Lớp & Danh sách chính thức (roster)
**File chính:** `src/services/class.service.ts` · phụ (admin): `admin/src/services/admin-class.service.ts`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `subscribeStudentClasses(mssv,cb)` | class.service.ts | Realtime lớp SV (query `rosterMssv array-contains`) |
| `subscribeTeacherClasses(id,cb)` | class.service.ts | Realtime lớp GV |
| `getStudentClasses/getTeacherClasses` | class.service.ts | Bản đọc-1-lần (cache 2 phút) |
| `updateClassConfig(id, {face,peer})` | class.service.ts | Bật/tắt yêu cầu khuôn mặt / ngang hàng |
| ⭐ `addStudentsToRoster` / `setClassRoster` | admin-class.service.ts | Ghi **danh sách chính thức** của lớp |

---

## 7. Điểm tin cậy (Trust Score)
**File chính:** `src/types/index.ts`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `computeTrustScore(peer, face, config)` | types/index.ts | present/review/absent theo face & peer |
| ⭐ `effectiveTrustScore(record, config)` | types/index.ts | Ưu tiên GV override; `needsReview` hạ present→review |
| `getTrustScoreReasons(...)` | types/index.ts | Liệt kê lý do (hiển thị cho GV) |

---

## 8. GPS / Geofencing
**File chính:** `src/utils/geo.ts`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `calculateDistance(p1, p2)` | geo.ts | Khoảng cách 2 toạ độ theo **Haversine** (mét) |
| ⭐ `checkGeoFence(sv, phiên, r=200)` | geo.ts | Trong/ngoài vùng → `{inRange, distance}` |

---

## 9. Phân tích gian lận
**File chính:** `src/services/fraud.service.ts` · phụ (page): `src/pages/teacher/TeacherFraudReport.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `analyzeFraud(classId)` | fraud.service.ts | Quét lớp: `always_same_peers` (≥80% buổi), `face_mismatch`, `rapid_verification` (<30s), `low_peer_count` |
| `getFraudReports(classId)` | fraud.service.ts | Lấy báo cáo đã lưu |

---

## 10. Cổng máy chiếu (pairing)
**File chính:** `src/services/pairing.service.ts` (GV) + `admin/src/services/pairing.service.ts` (web) · phụ: `admin/src/pages/PresentPage.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| `createPairingToken()` | admin pairing.service.ts | Tạo token (hạn 12h) + hiện QR |
| `subscribePairingToken(t,cb)` | admin pairing.service.ts | Realtime — SV quét là biết |
| ⭐ `claimPairingToken(t, sessionId,...)` | (Mini App) pairing.service.ts | GV quét → gắn phiên vào token → máy chiếu chiếu |
| `parsePairingQRContent(raw)` | pairing.service.ts | Tách token từ `inhust-pair://<token>` |

---

## 11. AI Chat
**File chính:** `src/services/ai.service.ts` · phụ: `src/pages/AIChatPage.tsx`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `sendChatMessage(message)` | ai.service.ts | Gọi Groq (Llama 3.3 70B) → trả lời |
| `setChatContext(ctx)` | ai.service.ts | Nạp dữ liệu thật (lịch hôm nay, lớp) để AI đúng |
| `isAiConfigured()` | ai.service.ts | Kiểm đã có `VITE_GROQ_API_KEY` chưa |

---

## 12. ⚙️ SERVER — Cloud Functions (đã viết, chưa deploy)
**File chính:** `functions/src/services/attendance.service.ts`, `session.service.ts`, `fraud.service.ts`, `role.service.ts`, `admin.service.ts` · middleware: `functions/src/middleware/auth.ts`, `adminAuth.ts`

| Hàm chính | File | Xử lý gì |
|---|---|---|
| ⭐ `scanTeacher` | attendance.service.ts | Điểm danh xác thực SERVER: HMAC + hạn 90s + chống replay + geofence |
| ⭐ `scanPeer` | attendance.service.ts | Ngang hàng qua **transaction** (chống race) |
| ⭐ `verifyHMAC(payload, secret)` *(nội bộ)* | attendance.service.ts | Kiểm chữ ký QR phía server |
| ⭐ `checkAndRecordNonce(nonce)` *(nội bộ)* | attendance.service.ts | **Chống replay**: nonce đã dùng (TTL 120s) → từ chối |
| `haversineDistance(...)` *(nội bộ)* | attendance.service.ts | Khoảng cách GPS server |
| `startSession`/`endSession` | session.service.ts | Tách `hmacSecret` vào subcollection |
| `analyzeFraud`/`weeklyFraudAnalysis` | fraud.service.ts | Rule-based + AI (Claude) + lịch tuần |
| `assignTeacherRole` | role.service.ts | Cấp quyền GV (kiểm domain email) |
| `admin*` (4 hàm) | admin.service.ts | dashboard, bulk assign, duyệt đơn, tạo admin |

---

## 13. Admin (web quản trị)
**File chính:** `admin/src/services/` (admin-user, admin-class, admin-attendance, admin-absence, import-export)

| Hàm chính | File | Xử lý gì |
|---|---|---|
| `approveTeacher`/`rejectTeacher` | admin-user.service.ts | Duyệt/từ chối giảng viên |
| `getUserStats`/`getClassStats`/`getAttendanceStats` | admin-*.service.ts | Thống kê dashboard |
| ⭐ `parseStudentFile`/`parseClassFile` | import-export.service.ts | Đọc file **Excel (.xlsx)** |
| `exportUsersToExcel`/`exportAttendanceToExcel` | import-export.service.ts | Xuất báo cáo Excel |
| `reviewAbsenceRequest` | admin-absence.service.ts | Duyệt/từ chối đơn xin nghỉ |

---

## 14. Tra nhanh: "Hội đồng hỏi → File & Hàm chỉ vào"

| Hội đồng hỏi | File | Hàm |
|---|---|---|
| Kiểm QR chống giả mạo? | crypto.ts / validation.ts | `verifySignature` / `classifyTeacherQR` |
| Chống dùng lại QR (replay)? | functions/…/attendance.service.ts | `checkAndRecordNonce` |
| Tính điểm tin cậy? | types/index.ts | `computeTrustScore` / `effectiveTrustScore` |
| So khớp khuôn mặt? | face-ai.service.ts | `compareFaces` (Euclid < 0.6) |
| Kiểm vị trí? | geo.ts | `checkGeoFence` (Haversine) |
| Xác minh ngang hàng? | attendance.service.ts | `addBidirectionalPeerVerification` |
| Phát hiện gian lận? | fraud.service.ts | `analyzeFraud` |
| Realtime bằng gì? | *.service.ts | các hàm `subscribe*` (onSnapshot) |
| Mở/kết thúc phiên? | session.service.ts | `startSession` / `endSession` |
| Import SV từ Excel? | import-export.service.ts | `parseStudentFile` |
