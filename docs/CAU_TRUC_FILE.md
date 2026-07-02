# Cấu trúc thư mục & ý nghĩa từng file — Zimo Check-in

> Bản đồ toàn bộ mã nguồn. Mỗi dòng: **đường dẫn → file làm gì**.
> 3 phần: **Mini App (`src/`)**, **Admin web (`admin/`)**, **Cloud Functions (`functions/`)**.

---

## 0. Tổng quan cấp cao nhất

```
my-app/
├── src/          → Mã nguồn ZALO MINI APP (phần chính SV & GV dùng)
├── admin/        → Mã nguồn TRANG QUẢN TRỊ web (phòng đào tạo) + cổng máy chiếu
├── functions/    → Cloud Functions (xác thực phía server — dự phòng cho gói Blaze)
├── docs/         → Tài liệu (báo cáo, hướng dẫn ôn tập — KHÔNG vào gói nộp)
├── legal/        → Trang chính sách/điều khoản (HTML)
├── www/          → BẢN BUILD Mini App (tự sinh khi build; gitignore) — không sửa tay
├── public/       → (rỗng)
└── (file cấu hình gốc — xem mục 1)

Số lượng file mã nguồn (kiểm ngày cập nhật): src/ = 99 · admin/src = 29 · functions/src = 17.
```

---

## 1. File cấu hình ở thư mục gốc

```
package.json          → Khai báo thư viện + script (zmp start / zmp deploy / npm run lint)
package-lock.json     → Khoá phiên bản chính xác của thư viện
tsconfig.json         → Cấu hình trình biên dịch TypeScript
vite.config.mts       → Cấu hình build Vite (+ plugin zmp)
vitest.config.ts      → Cấu hình chạy test (Vitest)
tailwind.config.js    → Cấu hình Tailwind CSS
postcss.config.js     → PostCSS (tự thêm tiền tố CSS)
.eslintrc.cjs         → Cấu hình ESLint (bắt lỗi React Hooks) — mới thêm
app-config.json       → Cấu hình Mini App (tên app, màu header, status bar, danh sách JS/CSS)
zmp-cli.json          → Cấu hình ZMP CLI
index.html            → File HTML gốc, nơi app được "mount" vào
.env.example          → MẪU biến môi trường (copy thành .env rồi điền key)
.gitignore            → Danh sách file/thư mục git bỏ qua (node_modules, .env, www…)
firebase.json         → Cấu hình triển khai Firebase (hosting, rules, functions)
.firebaserc           → Bí danh project Firebase
firestore.rules       → LUẬT BẢO MẬT Firestore (ai được đọc/ghi gì)
firestore.indexes.json→ Khai báo chỉ mục (index) cho truy vấn Firestore
storage.rules         → Luật bảo mật Firebase Storage
HUONG_DAN_CAI_DAT.md  → Hướng dẫn cài đặt (đi kèm gói nộp)
README.md / CLAUDE.md → Ghi chú dự án
```

**File khác ở gốc (KHÔNG phải cấu hình/mã nguồn):**
```
inHUST_Attendance_Manual_Giang_vien.pdf → Sổ tay hướng dẫn GV (thương hiệu CŨ inHUST)
inHUST_Quick_Test_Flow.pdf              → Kịch bản test nhanh (thương hiệu cũ)
inHUST_miniapp_qr.png                   → Ảnh QR mở Mini App
nguyen_ngoc_thuan_April2026.xlsx        → File Excel cá nhân (KHÔNG nên đưa vào gói nộp)
skills-lock.json / .DS_Store            → File công cụ/hệ điều hành (bỏ qua)
```

---

## 2. `src/` — MINI APP (React + TypeScript)

### Gốc
```
src/app.ts            → ĐIỂM VÀO: import CSS, mount <Layout> vào #app
src/css/app.scss      → Toàn bộ style: biến màu, .card, .btn, animation (@keyframes)
src/css/tailwind.scss → Nạp các directive Tailwind
```

### `src/types/` — Định nghĩa dữ liệu (đọc ĐẦU TIÊN)
```
types/index.ts        → TẤT CẢ interface: UserDoc, ClassDoc, SessionDoc, AttendanceDoc,
                        FaceVerificationResult, QRPayload, FraudReport, AbsenceRequestDoc…
                        + computeTrustScore() / effectiveTrustScore() / getTrustScoreReasons()
```

### `src/config/`
```
config/firebase.ts    → Khởi tạo Firebase; export auth, db (Firestore), functions, storage
```

### `src/utils/` — Thuật toán thuần (không dính React)
```
utils/crypto.ts       → HMAC-SHA256: signPayload, verifySignature, createQRContent, generateNonce
utils/validation.ts   → Kiểm QR: validateTeacherQR, classifyTeacherQR, validatePeerQR,
                        parseQRContent (+ hằng QR_EXPIRY_MS = 90s)
utils/geo.ts          → Haversine: calculateDistance, checkGeoFence (bán kính 200m)
utils/sanitize.ts     → Kiểm/làm sạch input: isValidMSSV, isValidHUSTEmail, isValidPhone, sanitizeText(chống XSS)
utils/cache.ts        → Cache có hạn (TTL) — bọc storage, có index key để xoá sạch
utils/storage.ts      → Bọc storage của Zalo SDK (fallback localStorage khi chạy web)
utils/offlineQueue.ts → Hàng đợi thao tác khi offline, xử lý lại khi có mạng
utils/retry.ts        → Thử lại thao tác async với backoff luỹ thừa
utils/cloudFallback.ts→ Gọi Cloud Function; lỗi hạ tầng → chạy hàm fallback ở client
utils/haptic.ts       → Rung phản hồi (tap/success/error)
utils/mock-db.ts      → CSDL GIẢ trong bộ nhớ (chế độ mock/offline để test)
utils/mock-data.ts    → Dữ liệu giả mẫu (SV, lớp, phiên)
utils/seed-data.ts    → Seed dữ liệu test lên Firestore THẬT
utils/*.test.ts       → Test đơn vị (crypto.test, sanitize.test, validation.test)
```

### `src/store/` — State toàn cục (Jotai atom)
```
store/auth.ts         → currentUserAtom, userRoleAtom, isAuthenticatedAtom, authInitializedAtom
store/session.ts      → activeSessionAtom (phiên đang mở)
store/attendance.ts   → myAttendanceAtom, attendanceStepAtom(bước điểm danh), trustScoreAtom
store/classes.ts      → classListAtom, selectedClassAtom
store/ui.ts           → globalLoadingAtom, globalErrorAtom
```

### `src/services/` — Tầng giao tiếp dữ liệu (gọi Firestore/SDK)
```
services/auth.service.ts       → Đăng nhập Zalo, CRUD user, khôi phục phiên, đăng ký/chờ duyệt GV
services/class.service.ts      → CRUD lớp + subscribe realtime + roster (rosterMssv)
services/session.service.ts    → Tạo/kết thúc phiên, lấy phiên active, đọc hmacSecret
services/attendance.service.ts → check-in, peer 2 chiều, cập nhật face, override, thủ công, subscribe
services/face.service.ts       → Điều phối đăng ký/xác minh mặt; lazy-load face-ai (~6.4MB)
services/face-ai.service.ts    → face-api.js: loadModels, detectFace(vector 128), compareFaces(Euclid<0.6)
services/fraud.service.ts      → Phân tích gian lận (client + fallback), lưu fraud_reports
services/qr.service.ts         → Sinh ảnh QR (dataURL), tạo/parse nội dung QR
services/pairing.service.ts    → Ghép cặp máy chiếu: parse + claimPairingToken
services/ai.service.ts         → Chat AI qua Groq (client-side, VITE_GROQ_API_KEY) + nạp context
services/email-verify.service.ts→ Gửi/kiểm OTP email trường (EmailJS) + danh sách bypass MSSV
services/microsoft.service.ts  → Liên kết Microsoft 365 (OAuth) — HIỆN ĐANG ẨN trên UI
services/report.service.ts     → Tổng hợp báo cáo phiên (present/review/absent)
services/api.ts                → Helper gọi Cloud Function (ít dùng)
```

### `src/hooks/` — Logic React tái dùng
```
hooks/useAuthInit.ts    → Khởi tạo auth ở gốc app (chạy 1 lần, set currentUserAtom)
hooks/useAuth.ts        → Hành động auth: selectRole (chọn vai trò), logout
hooks/useAttendance.ts  → State + hành động điểm danh: checkIn, completeFaceVerification, addPeer
hooks/useSession.ts     → Quản lý phiên: create/end/load/subscribe
hooks/useQRGenerator.ts → Sinh QR xoay vòng, ĐỒNG BỘ theo mốc thời gian (anchor) — Mini App & Web khớp nhau
hooks/useQRScanner.ts   → Quét QR bằng scanner native của Zalo
hooks/useGeolocation.ts → Lấy toạ độ GPS
hooks/useCountdown.ts   → Đếm ngược
hooks/useNetworkStatus.ts→ Theo dõi online/offline + kích hoạt xử lý hàng đợi offline
hooks/usePullToRefresh.ts→ Cử chỉ kéo-xuống-làm-mới
```

### `src/components/` — Giao diện tái dùng
```
components/layout.tsx              → Provider (Jotai) + Router + KHAI BÁO TẤT CẢ ROUTE (bản đồ màn hình)
components/guards/AuthGuard.tsx    → Chặn truy cập nếu CHƯA đăng nhập → /login
components/guards/RoleGuard.tsx    → Chặn nếu SAI vai trò → /home
components/navigation/AppBottomNav.tsx → Thanh điều hướng dưới (Trang chủ / Tra cứu / Profile)

components/qr/InlineQRScanner.tsx  → Camera quét QR trực tiếp (thư viện jsqr) — dùng ở điểm danh
components/qr/QRScanner.tsx        → Nút mở scanner QR native
components/qr/QRDisplay.tsx        → Hiển thị ảnh QR + vòng đếm ngược
components/qr/QRCountdown.tsx      → Vòng tròn đếm ngược thời gian QR còn hiệu lực

components/face/CameraCapture.tsx  → Chụp ảnh (khung oval/chữ nhật) — dùng khi ĐĂNG KÝ mặt
components/face/FaceVerification.tsx→ Xác minh mặt TỰ ĐỘNG (camera + tự chụp + retry) — dùng khi điểm danh
components/face/FaceStatusBadge.tsx→ Nhãn "Khớp %/Không khớp/Bỏ qua"
components/face/LivenessChallenge.tsx→ Thử thách chống ảnh tĩnh (cười/quay đầu)

components/attendance/AttendanceCard.tsx → Thẻ 1 sinh viên trong danh sách điểm danh
components/attendance/TrustBadge.tsx     → Nhãn màu: Có mặt / Xem xét / Vắng
components/attendance/PeerCounter.tsx    → Thanh đếm số peer (x/3)
components/attendance/StepIndicator.tsx  → Chỉ báo tiến độ 4 bước

components/class/ClassCard.tsx     → Thẻ hiển thị 1 lớp
components/profile/MicrosoftLinkCard.tsx → Thẻ liên kết MS365 (đang ẩn)

components/ui/DarkModal.tsx        → POPUP bottom-sheet DÙNG CHUNG (mọi modal dùng cái này)
components/ui/DarkStatCard.tsx     → Thẻ số liệu (giá trị + nhãn)
components/ui/DarkProgressBar.tsx  → Thanh tiến trình
components/ui/ScoreRing.tsx        → Vòng tròn phần trăm (SVG donut)
components/ui/ErrorBoundary.tsx    → Bắt lỗi React toàn app → hiện màn "Đã xảy ra lỗi"
components/ui/ErrorToast.tsx       → Toast lỗi toàn cục (đọc globalErrorAtom)
components/ui/GlobalLoading.tsx    → Lớp phủ loading toàn màn
components/ui/OfflineBanner.tsx    → Banner "Mất kết nối"
components/ui/PullToRefresh.tsx    → Bọc nội dung để kéo-làm-mới
```

### `src/pages/` — Các màn hình hoàn chỉnh
```
pages/splash.tsx      → Màn chờ khởi động → điều hướng theo trạng thái (welcome/login/home)
pages/welcome.tsx     → Onboarding lần đầu (giới thiệu tính năng)
pages/login.tsx       → Đăng nhập: nhập MSSV → email → OTP; hoặc luồng đăng ký Giảng viên
pages/home.tsx        → TRANG CHỦ: lịch tuần + phiên đang chạy + lưới menu + thống kê
pages/profile.tsx     → Hồ sơ: xem/sửa thông tin, xoá dữ liệu khuôn mặt, đăng xuất
pages/search.tsx      → Tra cứu GV / SV / lớp toàn hệ thống (realtime)
pages/dev.tsx         → Trang DEV: bật mock mode + nút vào nhanh mọi màn (chỉ môi trường DEV)
pages/AIChatPage.tsx  → Chat với trợ lý AI

pages/student/StudentClasses.tsx   → Danh sách lớp của SV (badge LIVE khi có phiên)
pages/student/StudentAttendance.tsx→ ĐIỂM DANH 4 BƯỚC (QR→Mặt→Ngang hàng→Xong)
pages/student/StudentHistory.tsx   → Lịch sử điểm danh + tỉ lệ có mặt
pages/student/StudentSchedule.tsx  → Thời khoá biểu (lịch tháng)
pages/student/FaceRegister.tsx     → Đăng ký khuôn mặt (đồng ý → chụp 2 ảnh)
pages/student/AbsenceRequest.tsx   → Gửi & xem đơn xin nghỉ

pages/teacher/TeacherClasses.tsx    → Danh sách lớp của GV
pages/teacher/TeacherClassDetail.tsx→ Chi tiết lớp: mã lớp, cấu hình face/peer, roster, phiên
pages/teacher/TeacherSession.tsx    → MỞ/QUẢN LÝ PHIÊN: hiện QR, GPS, quét máy chiếu, kết thúc
pages/teacher/TeacherMonitor.tsx    → Theo dõi REALTIME + điểm danh thủ công
pages/teacher/TeacherReview.tsx     → Xem xét/ghi đè kết quả + xuất báo cáo CSV
pages/teacher/TeacherFraudReport.tsx→ Phân tích gian lận
pages/teacher/TeacherAnalytics.tsx  → Thống kê điểm danh theo phiên (biểu đồ)
```

### `src/static/` — Ảnh
```
icon_zimo.png    → Icon app MỚI (Zimo)     bk_logo.png / icon_inhust.png → logo/icon CŨ (inHUST)
bgprofile.jpg    → Nền trang hồ sơ          bg.svg → nền trang trí
```

---

## 3. `admin/` — TRANG QUẢN TRỊ (React + Ant Design)

```
admin/src/main.tsx     → Điểm vào admin
admin/src/App.tsx      → Router + theme Ant Design + khai báo route admin
admin/src/config/firebase.ts → Khởi tạo Firebase (admin)
admin/src/types/index.ts     → Kiểu dữ liệu (giống Mini App)
admin/src/utils/crypto.ts    → HMAC — sinh QR teacher cho cổng máy chiếu

admin/src/hooks/useAdminAuth.ts → Đăng nhập Firebase Auth (email/mật khẩu) + kiểm role="admin"
admin/src/hooks/useTeacherQR.ts → Sinh QR teacher đồng bộ (hiển thị trên máy chiếu)

admin/src/components/guards/AdminGuard.tsx   → Chặn nếu không phải admin
admin/src/components/layout/AdminLayout.tsx  → Khung sidebar + header + chuông thông báo

admin/src/services/admin-user.service.ts     → Quản lý người dùng + DUYỆT giảng viên + thống kê
admin/src/services/admin-class.service.ts    → Quản lý lớp + roster (thêm/đặt danh sách SV)
admin/src/services/admin-attendance.service.ts→ Đọc phiên/điểm danh + thống kê (getCountFromServer)
admin/src/services/admin-absence.service.ts  → Đơn xin nghỉ (đọc + duyệt)
admin/src/services/import-export.service.ts  → Đọc file Excel (.xlsx) + xuất Excel/CSV (thư viện xlsx)
admin/src/services/pairing.service.ts        → Tạo token ghép cặp máy chiếu
admin/src/services/qr.service.ts             → Sinh ảnh QR (máy chiếu, kích thước lớn)
admin/src/services/geocode.service.ts        → Đảo toạ độ GPS → địa chỉ (OpenStreetMap Nominatim)

admin/src/pages/LoginPage.tsx          → Đăng nhập admin
admin/src/pages/DashboardPage.tsx      → Tổng quan hệ thống + biểu đồ (recharts)
admin/src/pages/UsersPage.tsx          → Danh sách người dùng + lọc + xuất Excel
admin/src/pages/UserDetailPage.tsx     → Chi tiết 1 người dùng + lớp + tổng quan điểm danh
admin/src/pages/TeacherRequestsPage.tsx→ DUYỆT giảng viên (approve/reject)
admin/src/pages/ClassesPage.tsx        → Quản lý lớp: tạo/sửa/xoá + IMPORT lớp từ Excel
admin/src/pages/ClassDetailPage.tsx    → Chi tiết lớp + thêm SV (tìm/nhập tay) + IMPORT SV
admin/src/pages/AttendancePage.tsx     → Báo cáo điểm danh (tab Phiên / tab Bản ghi) + xuất Excel
admin/src/pages/SessionDetailPage.tsx  → Chi tiết 1 phiên: danh sách SV + trạng thái
admin/src/pages/AbsenceRequestsPage.tsx→ Duyệt đơn xin nghỉ
admin/src/pages/FraudReportsPage.tsx   → Xem báo cáo gian lận
admin/src/pages/PresentPage.tsx        → CỔNG MÁY CHIẾU (công khai, ghép cặp qua QR, hiện QR to + đếm realtime)

admin/dist/            → BẢN BUILD SẴN của admin (chạy ngay: npx serve admin/dist)
admin/public/          → Ảnh tĩnh admin (logo, ảnh campus cho máy chiếu)
```

---

## 4. `functions/` — CLOUD FUNCTIONS (Firebase, TypeScript)

> Xác thực phía SERVER. Hiện chưa deploy (gói Spark); giữ sẵn để nâng Blaze là bật.

```
functions/src/index.ts                       → Export tất cả Cloud Function

functions/src/middleware/auth.ts             → requireAuth: xác thực Zalo access token
functions/src/middleware/adminAuth.ts        → requireAdmin: kiểm role="admin"
functions/src/middleware/rateLimit.ts        → Giới hạn tần suất gọi (chống spam)

functions/src/services/session.service.ts    → startSession/endSession (server, tách hmacSecret vào subcollection)
functions/src/services/attendance.service.ts → scanTeacher/scanPeer/submitFace/manual/review:
                                               KIỂM HMAC + CHỐNG REPLAY (nonce) + GEOFENCE (bản server đầy đủ)
functions/src/services/trust.service.ts      → calculateTrustScores (tính lại hàng loạt)
functions/src/services/fraud.service.ts      → analyzeFraud (rule-based + AI Claude) + lịch chạy tuần
functions/src/services/face.service.ts       → STUB (face chạy client; giữ chỗ cho eKYC server sau)
functions/src/services/ai.service.ts         → aiChat qua Groq (bản server — client hiện gọi thẳng)
functions/src/services/role.service.ts       → assignTeacherRole (kiểm domain email @hust.edu.vn)
functions/src/services/auth-token.service.ts → Đổi Zalo token → Firebase custom token
functions/src/services/zalo-phone.service.ts → Giải mã token số điện thoại Zalo
functions/src/services/notification.service.ts→ Gửi thông báo phiên qua Zalo OA
functions/src/services/microsoft-oauth.service.ts→ Luồng OAuth Microsoft 365
functions/src/services/admin.service.ts      → 4 hàm admin: dashboardStats, bulkAssignStudents,
                                               reviewAbsenceRequest, createAccount
functions/src/types/ekyc.ts                  → Kiểu dữ liệu eKYC của Zalo
```

---

## 5. Ghi chú "code chết / cũ" (nên biết khi bảo vệ)

- `functions/.../face.service.ts` là **stub** (ném lỗi) — nhận diện mặt chạy **client** (`src/services/face-ai.service.ts`).
- `src/services/microsoft.service.ts` + `MicrosoftLinkCard.tsx`: tính năng MS365 **đang ẩn** trên UI.
- `bk_logo.png`, `icon_inhust.png`: ảnh **thương hiệu cũ** (inHUST) — app đã đổi tên Zimo.
- Cloud Functions **chưa deploy** (gói Spark) → app chạy theo hướng **client-side**; đây là đánh đổi có chủ đích.
```
