# Kiến trúc, Database & Bản đồ luồng file — Zimo Check-in

> Tài liệu tham chiếu: **database chi tiết**, **các tầng hệ thống**, và **"mỗi chức năng cần file nào, gọi nhau ra sao"**.
> Đọc cùng `ON_TAP_HIEU_MA_NGUON.md`. Ký hiệu: `→` nghĩa là "gọi tới"; ⓕ = Firestore.

---

# PHẦN A — CƠ SỞ DỮ LIỆU (Firestore)

Firestore là **NoSQL dạng document**: dữ liệu nằm trong các **collection** (như "bảng"), mỗi collection chứa nhiều **document** (như "dòng", nhưng là JSON tự do). Không có JOIN — quan hệ thể hiện bằng cách **lưu id tham chiếu**.

Định nghĩa kiểu của tất cả: **`src/types/index.ts`** (Mini App) và **`admin/src/types/index.ts`** (giống nhau).

### Bảng tổng các collection

| Collection | ID document | Mục đích | File đọc/ghi chính |
|---|---|---|---|
| `users` | Zalo userID (hoặc MSSV với tài khoản admin tạo) | Hồ sơ người dùng + vai trò | `services/auth.service.ts`, `admin/services/admin-user.service.ts` |
| `classes` | auto-id | Lớp học + danh sách SV chính thức | `services/class.service.ts`, `admin/services/admin-class.service.ts` |
| `sessions` | auto-id | Phiên điểm danh | `services/session.service.ts` |
| `sessions/{id}/secrets/hmac` | "hmac" | Khoá HMAC của phiên (tách riêng) | `functions/session.service.ts`; client fallback `getSessionSecret` |
| `attendance` | auto-id | 1 bản ghi / SV / phiên | `services/attendance.service.ts` |
| `face_registrations` | studentId | Vector khuôn mặt 128 chiều | `services/face.service.ts` |
| `fraud_reports` | auto-id | Báo cáo gian lận | `services/fraud.service.ts` |
| `absence_requests` | auto-id | Đơn xin nghỉ | `services/absence.service.ts`, `admin/services/admin-absence.service.ts` |
| `pairing_tokens` | token (32 hex) | Ghép cặp máy chiếu | `services/pairing.service.ts`, `admin/services/pairing.service.ts` |
| `verified_students` | userId | Trạng thái xác minh email SV | `services/email-verify.service.ts` |
| `oauth_states` | state | (Cloud Function) OAuth Microsoft | `functions/microsoft-oauth.service.ts` |

### Chi tiết các collection quan trọng

**`users`** (interface `UserDoc`)
`name, avatar, role("student"|"teacher"|"admin"), mssv, phone, email, department, program, className, faceRegistered, pendingTeacher, teacherRejected, teacherRequestedAt, hustVerified, microsoftEmail, followedOA, createdAt, updatedAt`
→ Client chỉ tự gán được role "student"; "teacher" do **admin duyệt** (`pendingTeacher` → admin set `role:"teacher"`).

**`classes`** (interface `ClassDoc`)
`name, code, teacherId, teacherName, studentIds[], rosterMssv[], roster[{mssv,name}], faceRequired, peerRequired, schedule{dayOfWeek,startTime,endTime}, location, createdAt`
→ **Quan trọng:** `roster`/`rosterMssv` = **danh sách chính thức** (GV import) = **sĩ số thật**. `studentIds` chỉ chứa tài khoản Zalo đã đăng nhập (tập con). SV thấy lớp khi `mssv ∈ rosterMssv` (query `array-contains`).

**`sessions`** (interface `SessionDoc`)
`classId, className, teacherId, status("active"|"ended"), hmacSecret, qrRefreshInterval(30), faceRequired, peerRequired, durationMinutes, startedAt, endedAt, location{latitude,longitude}, geoFenceRadius(200)`
→ `hmacSecret` dùng để ký/kiểm QR. `status` chỉ có 1 phiên "active"/lớp.

**`attendance`** (interface `AttendanceDoc`) — **trái tim hệ thống**
`sessionId, classId, studentId, studentName, studentMssv, checkedInAt, peerVerifications[{peerId,peerName,verifiedAt,qrNonce}], peerCount, trustScore("present"|"review"|"absent"), teacherOverride, faceVerification{matched,confidence,skipped}, location, manualBy, manualReason, manualAt, needsReview, reviewReason`
→ Tham chiếu: `sessionId`→sessions, `classId`→classes, `studentId`→users.

**`face_registrations`**
`studentId, descriptor(number[128]), confidence, registeredAt` → chỉ vector, **không có ảnh**.

---

# PHẦN B — CÁC TẦNG HỆ THỐNG (Mini App `src/`)

Dữ liệu chảy từ dưới (data) lên trên (UI):

```
types/      ← Định nghĩa kiểu dữ liệu + hàm thuần (computeTrustScore)
utils/      ← Thuật toán không phụ thuộc React (crypto HMAC, validation, geo, cache, storage)
config/     ← Khởi tạo Firebase (firebase.ts)
services/   ← Giao tiếp Firestore/SDK (auth, class, session, attendance, face, fraud, qr, pairing...)
store/      ← State toàn cục Jotai (auth, session, attendance, classes, ui)
hooks/      ← Logic React tái dùng (useAttendance, useQRGenerator, useSession, useGeolocation...)
components/ ← UI nhỏ tái dùng (qr/, face/, attendance/, ui/, guards/, navigation/)
pages/      ← Màn hình hoàn chỉnh (student/, teacher/, + home, login, profile, search...)
components/layout.tsx ← Định tuyến (routes) + Provider
```

**Quy tắc:** pages gọi hooks/services; hooks gọi services; services gọi Firestore. **Không** để pages gọi thẳng Firestore (trừ vài chỗ tối ưu). State chung để ở `store/` (atom), state cục bộ dùng `useState`.

**Định tuyến:** tất cả route khai báo ở `src/components/layout.tsx`. Mỗi route bọc `AuthGuard` (đã đăng nhập?) + `RoleGuard` (đúng vai trò?).

---

# PHẦN C — BẢN ĐỒ LUỒNG FILE THEO CHỨC NĂNG

> Format: **Cần gì** · **File liên quan** · **Luồng gọi** · **ⓕ Firestore**.

## C1. Khởi động app & Đăng nhập tự động
- **Cần:** Zalo SDK lấy userID; khôi phục phiên từ storage.
- **File:** `components/layout.tsx` → `hooks/useAuthInit.ts` → `services/auth.service.ts` (`initAuthState`, `signIn`) → `store/auth.ts` (`currentUserAtom`).
- **Luồng:** App mở → `useAuthInit()` chạy 1 lần → `initAuthState()` đọc `storage("user_doc")` (tức thì) → nền: `getUserDoc()` làm mới từ ⓕ `users` → set `currentUserAtom`.
- **ⓕ:** đọc `users/{uid}`.

## C2. Đăng nhập Sinh viên (MSSV → email OTP → vào app)
- **Cần:** MSSV hợp lệ; xác minh email trường (EmailJS) hoặc bypass.
- **File:** `pages/login.tsx` → `services/auth.service.ts` (signIn, requestTeacherApproval) + `services/email-verify.service.ts` (sendOTP, verifyOTP, isBypassMSSV) + `utils/sanitize.ts` (isValidMSSV, isValidHUSTEmail) + `hooks/useAuth.ts` (selectRole).
- **Luồng:** nhập MSSV → `isValidMSSV` → `isStudentVerified()`? nếu chưa & không bypass → bước email → `sendOTP` (EmailJS) → nhập OTP → `verifyOTP` (lưu ⓕ `verified_students` + cập nhật `users`) → `selectRole("student", mssv)` → `/home`.
- **ⓕ:** `verified_students`, `users`.

## C3. Đăng ký Giảng viên + Admin duyệt
- **File:** `pages/login.tsx` (`requestTeacherApproval`) → ⓕ `users` (set `pendingTeacher:true`). Admin: `admin/pages/TeacherRequestsPage.tsx` → `admin/services/admin-user.service.ts` (`getPendingTeachers`, `approveTeacher` set `role:"teacher"`).
- **Realtime chờ duyệt:** `login.tsx` dùng `subscribeUserDoc()` (onSnapshot) → admin duyệt xong, màn SV tự nhảy `/home`.

## C4. Trang chủ (lịch tuần + phiên đang chạy)
- **File:** `pages/home.tsx` → `services/class.service.ts` (`subscribeStudentClasses`/`subscribeTeacherClasses`) + `services/session.service.ts` (`getActiveSessionForClass`).
- **Luồng:** lắng nghe realtime lớp → với mỗi lớp `getActiveSessionForClass` → hiện badge "Phiên đang hoạt động"; bấm thẻ → GV vào `/teacher/session/:classId`, SV vào `/student/attendance/:sessionId`.
- **ⓕ:** `classes` (onSnapshot), `sessions` (query active).

## C5. ĐIỂM DANH — Bước 1: Quét QR giảng viên
- **Cần:** QR hợp lệ (HMAC) + (tùy chọn) trong vùng GPS.
- **File:** `pages/student/StudentAttendance.tsx` → `components/qr/InlineQRScanner.tsx` (camera + `jsqr`) → `services/qr.service.ts` (`parseScannedQR`) → `utils/validation.ts` (`classifyTeacherQR`) → `utils/crypto.ts` (`verifySignature`) → `hooks/useGeolocation.ts` + `utils/geo.ts` (`checkGeoFence`) → `hooks/useAttendance.ts` (`checkIn`) → `services/attendance.service.ts` (`checkInStudent`).
- **Luồng:** quét → `parseScannedQR` → `classifyTeacherQR` (đúng chữ ký? cũ >90s?) → lấy GPS → `checkGeoFence` → `checkIn()` ghi bản ghi → chuyển bước.
- **ⓕ:** tạo doc trong `attendance`.

## C6. ĐIỂM DANH — Bước 2: Khuôn mặt
- **File:** `components/face/FaceVerification.tsx` (camera tự chụp) → `services/face.service.ts` (`verifyFace`) → `services/face-ai.service.ts` (`detectFace`, `compareFaces`, face-api.js) → đọc ⓕ `face_registrations/{studentId}` → `hooks/useAttendance.ts` (`completeFaceVerification`) → `services/attendance.service.ts` (`updateFaceVerification`).
- **Luồng:** chụp khung hình → `detectFace` (vector 128) → so với vector đã đăng ký (Euclid < 0.6) → lưu kết quả vào bản ghi `attendance`.
- **ⓕ:** đọc `face_registrations`, cập nhật `attendance`.

## C7. ĐIỂM DANH — Bước 3: Xác minh ngang hàng (P2P)
- **File:** `StudentAttendance.tsx` → `hooks/useQRGenerator.ts` (sinh QR của mình, `qr.service.ts`+`crypto.ts`) + `InlineQRScanner` (quét QR bạn) → `services/attendance.service.ts` (`addBidirectionalPeerVerification`).
- **Luồng:** hiện QR mình + quét QR bạn → cập nhật **2 chiều** (`peerCount++` cho cả hai) → đủ 3 peer → "present".
- **ⓕ:** cập nhật 2 doc `attendance` (của mình + của bạn).

## C8. ĐIỂM DANH — Bước 4: Hoàn tất + Trust Score
- **File:** `src/types/index.ts` (`computeTrustScore`, `effectiveTrustScore`) — tính từ `peerCount` + `faceVerification` + config phiên.
- Trust score được tính ở nhiều nơi: lúc check-in, lúc thêm peer, lúc face, và **backfill khi GV kết thúc phiên**.

## C9. Đăng ký khuôn mặt (làm 1 lần)
- **File:** `pages/student/FaceRegister.tsx` → `components/face/CameraCapture.tsx` (chụp 2 ảnh) → `services/face.service.ts` (`registerFace`) → `face-ai.service.ts` (detect + compare 2 ảnh cùng người) → ghi ⓕ `face_registrations` + `auth.service.ts` (`markFaceRegistered` set `users.faceRegistered=true`).

## C10. GV mở / kết thúc phiên
- **File:** `pages/teacher/TeacherSession.tsx` → `services/session.service.ts` (`startSession`, `endSession`, `updateSessionLocation`) + `hooks/useQRGenerator.ts` (QR teacher) + `hooks/useGeolocation.ts`.
- **Mở:** `startSession()` tạo doc `sessions` (sinh `hmacSecret`, config từ lớp) → set GPS. Hiện QR teacher xoay 30s (đồng bộ theo `startedAt`).
- **Kết thúc:** `endSession()` set `status:"ended"` → **backfill**: đọc hết `attendance` của phiên → tính lại `effectiveTrustScore` → cập nhật → điều hướng `/teacher/review/:id`.
- **ⓕ:** `sessions`, đọc/ghi `attendance`.

## C11. GV theo dõi realtime
- **File:** `pages/teacher/TeacherMonitor.tsx` → `services/attendance.service.ts` (`subscribeToSessionAttendance` = onSnapshot) + `class.service.ts` (`getClassById`, roster) + `utils/geo.ts` (hiện khoảng cách).
- **Luồng:** onSnapshot `attendance` theo `sessionId` → tự cập nhật danh sách + thống kê + lọc Có mặt/Xem xét/Vắng (đối chiếu roster).

## C12. GV điểm danh thủ công
- **File:** `TeacherMonitor.tsx` / `TeacherReview.tsx` → `services/attendance.service.ts` (`manualCheckIn`, truyền `manualBy=teacherId`).
- **Luồng:** chọn SV vắng → nhập lý do → tạo/ghi `attendance` với `teacherOverride` + `manualReason` + `manualBy`.

## C13. GV xem xét & ghi đè (override) + Xuất báo cáo
- **File:** `pages/teacher/TeacherReview.tsx` → `attendance.service.ts` (`getSessionAttendance`, `teacherOverride`) + `class.service.ts` (`getClassStudents` để biết ai vắng) + xuất CSV (tạo Blob tải về; fallback upload Storage).
- **ⓕ:** đọc/ghi `attendance`; (fallback) ghi Storage.

## C14. Phân tích gian lận
- **File:** `pages/teacher/TeacherFraudReport.tsx` → `services/fraud.service.ts` (`analyzeFraud`, `getFraudReports`) → `utils/cloudFallback.ts` (thử Cloud Function, lỗi hạ tầng thì chạy client-side) → đọc `sessions`+`attendance` → ghi `fraud_reports`.
- **Luật phát hiện:** `always_same_peers` (luôn cùng nhóm ≥80% buổi), `face_mismatch`, `rapid_verification` (peer quá nhanh <30s), `low_peer_count`.

## C15. Thống kê lớp
- **File:** `pages/teacher/TeacherAnalytics.tsx` → `session.service.ts` (`getClassSessions`) + `attendance.service.ts` (`getSessionAttendance`) → tính tỉ lệ theo phiên → `components/ui/` (ScoreRing, DarkProgressBar, DarkStatCard).

## C16. Cổng máy chiếu (pairing QR)
- **Cần:** ghép máy chiếu (web) với phiên của GV (Mini App) qua token.
- **File (web):** `admin/pages/PresentPage.tsx` → `admin/services/pairing.service.ts` (`createPairingToken`, `subscribePairingToken`) → ⓕ `pairing_tokens`. **File (GV):** `TeacherSession.tsx` (`handlePairProjector`) → `services/pairing.service.ts` (`parsePairingQRContent`, `claimPairingToken`).
- **Luồng:** Web tạo token + hiện QR `inhust-pair://<token>` → GV quét → `claimPairingToken` ghi `sessionId` vào token → Web (onSnapshot) thấy "paired" → tải `session` + hiện QR điểm danh to + đếm realtime (`hooks/useTeacherQR.ts` đồng bộ theo `startedAt`).
- **ⓕ:** `pairing_tokens` (realtime), `sessions`, `attendance` (realtime).

## C17. Tra cứu (search toàn hệ thống)
- **File:** `pages/search.tsx` → `class.service.ts` (`subscribeAllClasses`) + `auth.service.ts` (`subscribeUsersByRole` cho GV & SV) → lọc client theo tên/mã/MSSV.

## C18. Thời khóa biểu
- **File:** `pages/student/StudentSchedule.tsx` → `class.service.ts` (`getStudentClasses`/`getTeacherClasses`) → đọc field `schedule` của từng lớp → dựng lịch tháng.

## C19. Đơn xin nghỉ (SV gửi → Admin duyệt)
- **File (SV):** `pages/student/AbsenceRequest.tsx` → `services/absence.service.ts` (`createAbsenceRequest`, `subscribeToMyAbsenceRequests`). **File (Admin):** `admin/pages/AbsenceRequestsPage.tsx` → `admin/services/admin-absence.service.ts` (`getAbsenceRequests`, `reviewAbsenceRequest`).
- **ⓕ:** `absence_requests`.

## C20. AI Chat
- **File:** `pages/AIChatPage.tsx` → `services/ai.service.ts` (`sendChatMessage`, `setChatContext`) → gọi thẳng Groq API (`VITE_GROQ_API_KEY`). Context lấy từ `class.service.ts` (lịch hôm nay + lớp thật).
- **Luồng:** mở chat → nạp dữ liệu thật vào `setChatContext` → SV hỏi → `sendChatMessage` gửi system+context+history tới Groq → hiện trả lời.

## C21. Admin — Quản lý lớp + Import Excel + Roster
- **File:** `admin/pages/ClassesPage.tsx` + `ClassDetailPage.tsx` → `admin/services/admin-class.service.ts` (`createClass`, `updateClass`, `addStudentsToRoster`, `setClassRoster`) + `admin/services/import-export.service.ts` (`parseStudentFile`/`parseClassFile` đọc `.xlsx` bằng thư viện `xlsx`) → ghi ⓕ `classes` (`roster`+`rosterMssv`).
- **Quan trọng:** import = ghi vào **roster** (KHÔNG tạo tài khoản giả). SV thật tự liên kết khi đăng nhập (đối chiếu MSSV).

## C22. Admin — Dashboard thống kê
- **File:** `admin/pages/DashboardPage.tsx` → `admin-user/class/attendance.service.ts` (`getUserStats`, `getClassStats`, `getAttendanceStats` dùng `getCountFromServer`) → biểu đồ `recharts`.

---

# PHẦN D — SƠ ĐỒ QUAN HỆ DỮ LIỆU (ERD dạng chữ)

```
users (1) ───< (n) classes        [classes.teacherId → users.id]
classes (1) ───< (n) sessions      [sessions.classId → classes.id]
sessions (1) ───< (n) attendance   [attendance.sessionId → sessions.id]
users (1) ───< (n) attendance      [attendance.studentId → users.id]
users (1) ─── (0..1) face_registrations   [id = studentId]
classes (1) ───< (n) fraud_reports [fraud_reports.classId → classes.id]
users (1) ───< (n) absence_requests
sessions (1) ─── (0..1) pairing_tokens (khi ghép máy chiếu)
```
Quan hệ "n–n" SV↔lớp **không** dùng bảng trung gian (kiểu SQL) mà nhúng mảng `classes.rosterMssv[]` + `classes.studentIds[]` (đặc trưng NoSQL).

---

# PHẦN E — TRA NHANH: "Chức năng → file chính"

| Muốn hiểu/sửa… | Mở file |
|---|---|
| Kiểu dữ liệu, trust score | `src/types/index.ts` |
| Ký/kiểm QR (HMAC) | `src/utils/crypto.ts`, `src/utils/validation.ts` |
| Sinh QR xoay vòng | `src/hooks/useQRGenerator.ts` |
| Khoảng cách GPS | `src/utils/geo.ts` |
| Nhận diện khuôn mặt | `src/services/face-ai.service.ts` |
| Ghi/đọc điểm danh | `src/services/attendance.service.ts` |
| Phiên điểm danh | `src/services/session.service.ts` |
| Lớp + roster | `src/services/class.service.ts` |
| Đăng nhập/Zalo | `src/services/auth.service.ts` |
| Gian lận | `src/services/fraud.service.ts` |
| Màn điểm danh SV (4 bước) | `src/pages/student/StudentAttendance.tsx` |
| Màn GV mở phiên | `src/pages/teacher/TeacherSession.tsx` |
| Định tuyến + guard | `src/components/layout.tsx` |
| Cloud Functions (server, dự phòng) | `functions/src/services/*.ts` |
| Admin web | `admin/src/pages/*.tsx` + `admin/src/services/*.ts` |
```
