# KẾ HOẠCH KIỂM THỬ THỦ CÔNG - inHUST Attendance

**Ứng dụng:** inHUST Attendance - Zalo Mini App  
**Phiên bản:** 1.0  
**Ngày tạo:** 03/04/2026  
**Người tạo:** Nguyễn Ngọc Thuận - 20225413  
**Môi trường:** Zalo Mini App trên điện thoại thực (iOS / Android)

---

## MỤC LỤC

1. [Luồng xác thực & Onboarding](#1-luồng-xác-thực--onboarding)
2. [Trang chủ (Dashboard)](#2-trang-chủ-dashboard)
3. [Quản lý lớp học - Giảng viên](#3-quản-lý-lớp-học---giảng-viên)
4. [Tham gia lớp học - Sinh viên](#4-tham-gia-lớp-học---sinh-viên)
5. [Phiên điểm danh - Giảng viên](#5-phiên-điểm-danh---giảng-viên)
6. [Điểm danh 4 bước - Sinh viên](#6-điểm-danh-4-bước---sinh-viên)
7. [Theo dõi realtime - Giảng viên](#7-theo-dõi-realtime---giảng-viên)
8. [Kết thúc phiên & Trust Score](#8-kết-thúc-phiên--trust-score)
9. [Xem xét điểm danh & Override](#9-xem-xét-điểm-danh--override)
10. [Điểm danh thủ công](#10-điểm-danh-thủ-công)
11. [Lịch sử điểm danh - Sinh viên](#11-lịch-sử-điểm-danh---sinh-viên)
12. [Đăng ký khuôn mặt](#12-đăng-ký-khuôn-mặt)
13. [Hồ sơ người dùng](#13-hồ-sơ-người-dùng)
14. [AI Chat](#14-ai-chat)
15. [Fraud Report - Giảng viên](#15-fraud-report---giảng-viên)
16. [Analytics - Giảng viên](#16-analytics---giảng-viên)
17. [Cấu hình Optional Steps](#17-cấu-hình-optional-steps)
18. [Lịch học - Sinh viên](#18-lịch-học---sinh-viên)
19. [Edge Cases & Lỗi](#19-edge-cases--lỗi)

---

## THIẾT BỊ CẦN CHUẨN BỊ

| STT | Thiết bị | Mục đích |
|-----|----------|----------|
| 1 | Điện thoại A (SV 1) | Cài Zalo, đăng nhập tài khoản SV |
| 2 | Điện thoại B (GV) | Cài Zalo, đăng nhập tài khoản GV |
| 3 | Điện thoại C (SV 2) | Peer QR exchange với SV 1 |
| 4 | Điện thoại D (SV 3) | Peer QR exchange với SV 1 |
| 5 | Kết nối internet | Wi-Fi hoặc 4G/5G |

---

## 1. LUỒNG XÁC THỰC & ONBOARDING

### TC-01: Splash screen hiển thị đúng
**Điều kiện:** Mở ứng dụng lần đầu tiên (chưa có dữ liệu localStorage)
**Các bước:**
1. Mở Zalo Mini App inHUST Attendance
2. Quan sát màn hình splash

**Kết quả mong đợi:**
- Hiển thị logo inHUST (icon_inhust.png) với animation fade-in
- Nền đỏ HUST (#be1d2c) với circuit board pattern
- Sau 2-3 giây, tự động chuyển sang màn hình Welcome
- Nếu đã đăng nhập trước đó, chuyển thẳng sang /home

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-02: Màn hình Welcome (Onboarding)
**Điều kiện:** Lần đầu mở app, chưa bao giờ nhấn "Bắt đầu"
**Các bước:**
1. Sau khi splash kết thúc, màn hình Welcome hiện ra
2. Đọc các feature cards: QR Code, Khuôn mặt, P2P, Bảo mật
3. Nhấn nút "Bắt đầu"

**Kết quả mong đợi:**
- Hiển thị hero section với circuit pattern
- 4 feature cards hiển thị đúng icon và mô tả
- Trust segments (Có mặt / Xem xét / Vắng) hiển thị
- Nhấn "Bắt đầu" -> chuyển sang /login
- localStorage lưu "hasSeenWelcome" = "1"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-03: Đăng nhập vai trò Sinh viên
**Điều kiện:** Đã qua màn hình Welcome, Zalo đã cấp quyền userInfo
**Các bước:**
1. Tại trang Login, quan sát avatar + tên từ Zalo hiển thị
2. Chọn vai trò "Sinh viên"
3. Nhập MSSV: `20225413`
4. Nhấn "Tiếp tục"

**Kết quả mong đợi:**
- Avatar Zalo (chữ cái đầu tên) và tên người dùng hiển thị
- Khi chọn "Sinh viên", ô nhập MSSV hiện ra
- MSSV hợp lệ (8 số, bắt đầu 20) -> chuyển sang /home
- Role lưu là "student", MSSV lưu vào Firestore

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-04: Đăng nhập vai trò Giảng viên
**Điều kiện:** Đã qua màn hình Welcome, Zalo đã cấp quyền
**Các bước:**
1. Tại trang Login, chọn vai trò "Giảng viên"
2. Nhấn "Tiếp tục" (không cần nhập MSSV)

**Kết quả mong đợi:**
- Không hiện ô nhập MSSV khi chọn GV
- Chuyển sang /home với giao diện GV
- Role lưu là "teacher"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-05: Validation MSSV không hợp lệ
**Điều kiện:** Tại màn hình Login, đã chọn vai trò "Sinh viên"
**Các bước:**
1. Nhập MSSV: `12345` (chỉ 5 số)
2. Nhấn "Tiếp tục"
3. Xóa, nhập MSSV: `30225413` (bắt đầu bằng 30)
4. Nhấn "Tiếp tục"
5. Xóa, để trống, nhấn "Tiếp tục"

**Kết quả mong đợi:**
- Bước 2: Hiện thông báo "MSSV không hợp lệ (8 chữ số, bắt đầu bằng 20)"
- Bước 4: Hiện thông báo tương tự
- Bước 5: Hiện thông báo "Vui lòng nhập MSSV"
- Không chuyển trang trong cả 3 trường hợp

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-06: Chuyển hướng khi đã đăng nhập
**Điều kiện:** Người dùng đã đăng nhập thành công trước đó
**Các bước:**
1. Đóng app hoàn toàn
2. Mở lại Zalo Mini App inHUST

**Kết quả mong đợi:**
- Splash screen hiện nhanh
- Tự động chuyển thẳng sang /home (bỏ qua Welcome và Login)
- Dữ liệu người dùng khôi phục từ localStorage trước, refresh từ Zalo SDK sau

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 2. TRANG CHỦ (DASHBOARD)

### TC-07: Dashboard Sinh viên
**Điều kiện:** Đăng nhập thành công với vai trò Sinh viên
**Các bước:**
1. Quan sát trang Home
2. Kiểm tra header với logo BK + HUST
3. Kiểm tra lịch tuần (calendar strip)
4. Kiểm tra menu grid các chức năng
5. Nhấn vào từng menu item

**Kết quả mong đợi:**
- Header: Logo BK, tên "inHUST", ngày hiện tại (VD: "3 Tháng 4, 2026")
- Calendar strip: 7 ngày trong tuần, ngày hiện tại được highlight
- Menu grid hiển thị: Điểm danh (ScanLine), Lịch sử (History), Lớp học (BookOpen), Thống kê (Chart), Lịch học (CalendarRange), Khuôn mặt (ScanFace)
- Nhấn "Điểm danh" -> /student/classes
- Nhấn "Lịch sử" -> /student/history
- Nhấn "Lớp học" -> /student/classes
- Nhấn "Lịch học" -> /student/schedule
- Nhấn "Khuôn mặt" -> /student/face-register

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-08: Dashboard Giảng viên
**Điều kiện:** Đăng nhập thành công với vai trò Giảng viên
**Các bước:**
1. Quan sát trang Home với giao diện GV
2. Kiểm tra menu grid GV
3. Nhấn vào từng menu item

**Kết quả mong đợi:**
- Menu grid GV khác với SV: có "Quản lý lớp", "Thống kê", "Sinh viên" ...
- Nhấn từng menu đều chuyển sang trang tương ứng
- Bottom navigation hiển thị 3 tab: Home, Search, Profile

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-09: Bottom Navigation
**Điều kiện:** Đăng nhập thành công (SV hoặc GV)
**Các bước:**
1. Tại trang Home, nhấn tab "Search" (giữa)
2. Nhấn tab "Profile" (phải)
3. Nhấn tab "Home" (trái)

**Kết quả mong đợi:**
- Tab Search -> hiện trang /search
- Tab Profile -> hiện trang /profile
- Tab Home -> quay lại trang /home
- Tab đang active được highlight

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 3. QUẢN LÝ LỚP HỌC - GIẢNG VIÊN

### TC-10: Tạo lớp học mới
**Điều kiện:** Đăng nhập vai trò GV, vào màn hình Quản lý lớp (/teacher/classes)
**Các bước:**
1. Nhấn nút "+" hoặc "Tạo lớp mới"
2. Modal hiện ra, nhập tên lớp: "Lập trình Web K68"
3. Nhấn "Tạo"

**Kết quả mong đợi:**
- Modal tạo lớp hiển thị với input tên lớp
- Sau khi tạo: lớp mới xuất hiện trong danh sách
- Lớp có mã code tự động (2-10 ký tự alphanumeric)
- Hiển thị số SV: 0 (chưa có ai tham gia)
- Card lớp hiện đúng: tên, mã, số SV

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-11: Xem chi tiết lớp học
**Điều kiện:** Đã tạo ít nhất 1 lớp học
**Các bước:**
1. Nhấn vào lớp "Lập trình Web K68" trong danh sách
2. Quan sát trang chi tiết lớp (/teacher/class/:classId)

**Kết quả mong đợi:**
- Hiển thị tên lớp, mã lớp, số SV
- Nút sao chép mã lớp (copy to clipboard)
- Danh sách phiên điểm danh trước đó (nếu có)
- Toggle cấu hình: "Xác minh khuôn mặt" (bật/tắt), "Xác minh ngang hàng" (bật/tắt)
- Mặc định cả 2 toggle đều BẬT

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-12: Sao chép mã lớp
**Điều kiện:** Đang ở trang chi tiết lớp
**Các bước:**
1. Nhấn nút sao chép mã lớp
2. Dán vào bất kỳ ô nhập nào

**Kết quả mong đợi:**
- Hiện thông báo "Đã sao chép" (hoặc icon check)
- Clipboard chứa đúng mã lớp

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 4. THAM GIA LỚP HỌC - SINH VIÊN

### TC-13: Tham gia lớp bằng mã code
**Điều kiện:** Đăng nhập SV, vào /student/classes, đã biết mã lớp từ GV
**Các bước:**
1. Nhấn nút "Tham gia lớp"
2. Modal hiện ra, nhập mã lớp (VD: "WEB68")
3. Nhấn "Tham gia"

**Kết quả mong đợi:**
- Modal hiện input nhập mã lớp
- Validation: mã 2-10 ký tự alphanumeric
- Tìm thấy lớp -> hiện snackbar "Đã tham gia lớp Lập trình Web K68"
- Lớp mới xuất hiện trong danh sách của SV
- Nếu lớp có phiên đang active -> hiện badge "LIVE"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-14: Nhập mã lớp không tồn tại
**Điều kiện:** Đang ở modal tham gia lớp
**Các bước:**
1. Nhập mã lớp: "XXXXXX"
2. Nhấn "Tham gia"

**Kết quả mong đợi:**
- Hiện lỗi "Không tìm thấy lớp với mã này"
- Không đóng modal, có thể nhập lại

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-15: Tham gia lớp đã tham gia
**Điều kiện:** SV đã tham gia lớp "Lập trình Web K68"
**Các bước:**
1. Nhấn "Tham gia lớp"
2. Nhập lại chính mã lớp đó
3. Nhấn "Tham gia"

**Kết quả mong đợi:**
- Hiện lỗi "Bạn đã tham gia lớp này rồi"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-16: Validation mã lớp không hợp lệ
**Điều kiện:** Đang ở modal tham gia lớp
**Các bước:**
1. Nhập mã lớp: "A" (chỉ 1 ký tự)
2. Nhấn "Tham gia"
3. Nhập mã lớp có ký tự đặc biệt: "WEB@#68"
4. Nhấn "Tham gia"

**Kết quả mong đợi:**
- Bước 2: Hiện lỗi "Mã lớp không hợp lệ (2-10 ký tự chữ/số)"
- Bước 4: Hiện lỗi tương tự

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 5. PHIÊN ĐIỂM DANH - GIẢNG VIÊN

### TC-17: Bắt đầu phiên điểm danh
**Điều kiện:** GV đã tạo lớp, lớp có ít nhất 1 SV
**Các bước:**
1. Vào trang Quản lý lớp -> chọn lớp
2. Nhấn "Bắt đầu điểm danh" (hoặc vào /teacher/session/:classId)
3. Quan sát màn hình phiên điểm danh

**Kết quả mong đợi:**
- Hiện card thông tin lớp: tên, mã, số SV
- Nút "Bắt đầu điểm danh" với icon play
- Nhấn -> tạo phiên mới, trạng thái Active
- Badge "LIVE" xanh lá nhấp nháy

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-18: QR code hiển thị và xoay 30s
**Điều kiện:** Phiên điểm danh đang active
**Các bước:**
1. Quan sát QR code hiển thị
2. Đọc dòng đếm ngược "Xoay sau Xs"
3. Đợi 30 giây, quan sát QR thay đổi
4. Ghi nhận QR cũ và QR mới khác nhau

**Kết quả mong đợi:**
- QR code 200x200 hiển thị trong card trắng
- Dòng đếm ngược bắt đầu từ 30, giảm dần về 0
- Khi hết 30s, QR tự động thay đổi (HMAC-SHA256 mới)
- QR mới khác hoàn toàn với QR cũ
- Label "QR CODE ĐIỂM DANH" ở trên

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-19: Thống kê realtime trên màn hình phiên
**Điều kiện:** Phiên đang active, một số SV đã check-in
**Các bước:**
1. Quan sát 3 stat cards: Có mặt (xanh), Xem xét (vàng), Vắng (đỏ)
2. Khi có SV check-in, kiểm tra số liệu cập nhật

**Kết quả mong đợi:**
- 3 card stat hiển thị đúng màu: xanh #22c55e, vàng #f59e0b, đỏ #ef4444
- Số liệu tự động cập nhật mỗi 10 giây
- Tổng số = số SV của lớp

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-20: GPS vị trí hiển thị
**Điều kiện:** Phiên đang active, thiết bị cho phép GPS
**Các bước:**
1. Quan sát card "Vị trí hiện tại"
2. Kiểm tra tọa độ GPS hiển thị

**Kết quả mong đợi:**
- Card GPS hiển thị tọa độ dạng "XX.XXXX* N, YYY.YYYY* E"
- Nếu đang lấy vị trí: "Đang lấy vị trí..."
- Nếu không có quyền GPS: "Chưa có vị trí"
- Vị trí được lưu vào session document trên Firestore

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-21: Nút Theo dõi và Kết thúc
**Điều kiện:** Phiên đang active
**Các bước:**
1. Nhấn nút "Theo dõi"
2. Quay lại, nhấn nút "Kết thúc"
3. Hiện confirm modal, nhấn "Hủy"

**Kết quả mong đợi:**
- "Theo dõi" -> chuyển sang /teacher/monitor/:sessionId
- "Kết thúc" -> hiện modal xác nhận với cảnh báo vàng
- Nhấn "Hủy" -> đóng modal, không kết thúc phiên

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 6. ĐIỂM DANH 4 BƯỚC - SINH VIÊN

### TC-22: Bước 1 - Quét QR giảng viên
**Điều kiện:** SV đã tham gia lớp, phiên đang active, SV vào /student/attendance/:sessionId
**Các bước:**
1. Màn hình hiện Step Indicator: 4 bước (Quét QR -> Khuôn mặt -> Ngang hàng -> Hoàn tất)
2. Camera tự động bật
3. Hướng camera vào QR của GV (hiện trên điện thoại GV)
4. Đợi tự động nhận diện

**Kết quả mong đợi:**
- Step Indicator hiện đúng 4 bước, bước 1 active (đỏ #be1d2c)
- InlineQRScanner hiện camera live với khung quét
- Tự động nhận diện khi thấy QR (không cần nhấn nút)
- Hiện "Tự động nhận diện khi thấy mã QR"
- Quét thành công -> GPS được lấy kèm (nếu có quyền)
- Chuyển sang Bước 2 (Face verify)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-23: Bước 2 - Xác minh khuôn mặt (auto-scan)
**Điều kiện:** Đã hoàn thành Bước 1
**Các bước:**
1. Màn hình hiện camera với oval clip
2. Đặt khuôn mặt vào khung oval
3. Đợi hệ thống tự động chụp và xác minh

**Kết quả mong đợi:**
- Camera front hiện với oval clip hướng dẫn
- Tự động scan khuôn mặt (không cần nhấn nút)
- Kết quả xác minh: matched + confidence score
- Chuyển sang Bước 3 (Peer QR)
- Nếu khuôn mặt không khớp: hiện cảnh báo, cho phép thử lại
- Có nút "Bỏ qua" để skip face verify

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-24: Bước 3 - Trao đổi QR ngang hàng
**Điều kiện:** Đã hoàn thành Bước 2, cần ít nhất 3 SV khác đã check-in
**Các bước:**
1. Màn hình chia 2 cột: QR của bạn (trái) + Camera quét bạn bè (phải)
2. Cho SV2 quét QR của bạn (SV1 không cần làm gì)
3. Dùng camera bên phải quét QR của SV2
4. Lặp lại với SV3 và SV4

**Kết quả mong đợi:**
- Cột trái: QR code của bạn với countdown timer (MM:SS)
- Cột phải: Camera live auto-scan QR bạn bè
- Peer progress: "X/3 peers đã xác minh" với 3 chấm tròn
- Mỗi peer verified -> chấm tròn chuyển xanh (checkmark)
- Khi đủ 3 peers -> camera tắt, hiện icon check xanh
- Nút "Hoàn tất" hiện khi đủ 3 peers
- QR xoay mỗi 30 giây (countdown hiển thị)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-25: Bước 4 - Hoàn tất điểm danh
**Điều kiện:** Đã hoàn thành cả 3 bước trước
**Các bước:**
1. Nhấn "Hoàn tất" hoặc tự động chuyển khi đủ 3 peers
2. Quan sát màn hình kết quả

**Kết quả mong đợi:**
- Hiện icon thành công (checkmark xanh lá) với confetti dots
- Hiện TrustBadge với điểm tin cậy (present/review/absent)
- Thông tin: số peers, face verified, thời gian check-in
- Màn hình celebration với các chấm màu (confetti)
- Step Indicator hiện tất cả 4 bước đã hoàn thành

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 7. THEO DÕI REALTIME - GIẢNG VIÊN

### TC-26: Màn hình Monitor realtime
**Điều kiện:** GV mở /teacher/monitor/:sessionId, phiên đang active
**Các bước:**
1. Quan sát progress card: X/Y SV với score ring
2. Quan sát 3 stat cards
3. Kiểm tra filter chips: Tất cả, Có mặt, Xem xét, Vắng
4. Đợi SV mới check-in, quan sát cập nhật

**Kết quả mong đợi:**
- Progress: "X/Y SV" với ring chart (%) màu tím #a78bfa
- Badge "Realtime" với chấm xanh nhấp nháy
- 3 stat cards: Có mặt (xanh), Xem xét (vàng), Vắng (đỏ)
- Filter chips hoạt động: lọc danh sách theo trạng thái
- Danh sách SV: avatar (chữ cái đầu), tên, peer count, thời gian, badge trạng thái
- Khi SV mới check-in -> danh sách tự động cập nhật (realtime subscription)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-27: Filter danh sách SV
**Điều kiện:** Có ít nhất 2 SV đã check-in với trạng thái khác nhau
**Các bước:**
1. Nhấn chip "Có mặt" -> chỉ hiện SV có mặt
2. Nhấn chip "Xem xét" -> chỉ hiện SV cần xem xét
3. Nhấn chip "Vắng" -> chỉ hiện SV absent
4. Nhấn chip "Tất cả" -> hiện tất cả

**Kết quả mong đợi:**
- Mỗi chip hiện số lượng tương ứng
- Chip active: nền đen #1a1a1a, chữ trắng
- Chip inactive: nền trắng, viền xám
- Danh sách lọc chính xác theo trạng thái

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-28: Điểm danh thủ công từ Monitor
**Điều kiện:** Phiên đang active, có SV vắng
**Các bước:**
1. Nhấn nút "Điểm danh thủ công (X SV vắng)" ở cuối trang
2. Modal danh sách SV vắng hiện ra
3. Chọn 1 SV
4. Nhập lý do: "SV có mặt nhưng điện thoại hết pin"
5. Nhấn "Xác nhận"

**Kết quả mong đợi:**
- Modal 1: Danh sách SV chưa điểm danh (avatar, tên, "Chưa điểm danh")
- Chọn SV -> Modal 2: Nhập lý do (bắt buộc)
- Nút "Xác nhận" disable khi chưa nhập lý do
- Sau xác nhận: SV xuất hiện trong danh sách đã check-in
- Snackbar "Đã điểm danh thủ công cho [Tên SV]"

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 8. KẾT THÚC PHIÊN & TRUST SCORE

### TC-29: Kết thúc phiên điểm danh
**Điều kiện:** Phiên đang active, đã có SV check-in
**Các bước:**
1. Từ màn hình Monitor hoặc Session, nhấn "Kết thúc phiên"
2. Modal xác nhận hiện ra với cảnh báo
3. Đọc cảnh báo: "Đã có X/Y sinh viên check-in. Hệ thống sẽ tính điểm tin cậy..."
4. Nhấn "Kết thúc"

**Kết quả mong đợi:**
- Modal bottom-sheet hiện: title "Kết thúc phiên?"
- Cảnh báo vàng với số liệu check-in hiện tại
- 2 nút: "Hủy" (xám) và "Kết thúc" (đỏ)
- Nhấn "Kết thúc" -> loading "Đang kết thúc..."
- Trust score được tính cho tất cả records
- Chuyển sang trang /teacher/review/:sessionId
- Phiên chuyển trạng thái "ended"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-30: Trust score tính đúng
**Điều kiện:** Phiên vừa kết thúc, có nhiều SV với các điều kiện khác nhau
**Các bước:**
1. Quan sát kết quả trust score trên trang Review
2. Kiểm tra logic:
   - SV có face match + >= 3 peers = "present" (xanh)
   - SV có face match + < 3 peers = "review" (vàng)
   - SV không face match = "review" (vàng)
   - SV không check-in = absent (đỏ)

**Kết quả mong đợi:**
- computeTrustScore() tính đúng dựa trên peerCount và faceVerification
- present: face verified + >=3 peers
- review: thiếu face hoặc thiếu peers
- absent: không check-in
- Badge màu sắc tương ứng hiện đúng

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 9. XEM XÉT ĐIỂM DANH & OVERRIDE

### TC-31: Trang Review hiển thị đúng
**Điều kiện:** Phiên đã kết thúc, có dữ liệu điểm danh
**Các bước:**
1. Vào /teacher/review/:sessionId
2. Quan sát 3 stat cards
3. Quan sát section "CẦN XEM XÉT" và "VẮNG MẶT"

**Kết quả mong đợi:**
- 3 stat cards: Có mặt (xanh), Xem xét (vàng), Vắng (đỏ) với số liệu
- Section "CẦN XEM XÉT": danh sách SV có trustScore = "review"
- Mỗi card SV hiện: avatar, tên, peer count, thời gian, badge "Xem xét"
- Section "VẮNG MẶT": danh sách SV không check-in
- Nút "Xuất báo cáo" ở trên

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-32: Override SV từ "Xem xét" sang "Có mặt"
**Điều kiện:** Có ít nhất 1 SV trạng thái "Xem xét"
**Các bước:**
1. Tìm SV trạng thái "Xem xét"
2. Nhấn nút "Có mặt" (xanh) trên card đó
3. Quan sát thay đổi

**Kết quả mong đợi:**
- Card SV có 2 nút: "Có mặt" (xanh) và "Vắng" (đỏ)
- Nhấn "Có mặt" -> SV chuyển sang trạng thái present
- trustScore và teacherOverride được cập nhật trên Firestore
- Stat card "Có mặt" tăng 1, "Xem xét" giảm 1

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-33: Override SV từ "Xem xét" sang "Vắng"
**Điều kiện:** Có ít nhất 1 SV trạng thái "Xem xét"
**Các bước:**
1. Tìm SV trạng thái "Xem xét"
2. Nhấn nút "Vắng" (đỏ) trên card đó

**Kết quả mong đợi:**
- SV chuyển sang trạng thái absent
- teacherOverride = "absent" lưu trên Firestore
- Stat card "Vắng" tăng 1, "Xem xét" giảm 1

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-34: Xuất báo cáo CSV
**Điều kiện:** Có dữ liệu điểm danh trên trang Review
**Các bước:**
1. Nhấn nút "Xuất báo cáo"
2. Kiểm tra file CSV tải về

**Kết quả mong đợi:**
- File CSV tên: `diem-danh-{sessionId}-{YYYY-MM-DD}.csv`
- Cột: STT, Tên, MSSV, Trạng thái, Peer Count, Khuôn mặt, Thời gian check-in, Lý do thủ công
- Mã UTF-8 BOM để hiện tiếng Việt đúng trong Excel
- Snackbar "Đã xuất báo cáo"
- Nếu không tải được (Zalo Mini App) -> upload Firebase Storage -> copy link

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 10. ĐIỂM DANH THỦ CÔNG

### TC-35: Điểm danh thủ công từ Review (phiên đã kết thúc)
**Điều kiện:** Phiên đã kết thúc, có SV vắng trong section "VẮNG MẶT"
**Các bước:**
1. Tìm SV trạng thái "Vắng" trong section VẮNG MẶT
2. Nhấn "Điểm danh thủ công"
3. Modal hiện, nhập lý do: "SV có mặt nhưng quên mang điện thoại"
4. Nhấn "Xác nhận"

**Kết quả mong đợi:**
- Modal hiện thông tin SV (avatar, tên, ID)
- Input lý do bắt buộc (*)
- Cảnh báo vàng: "Hành động này sẽ được ghi log. Lý do sẽ hiển thị trong báo cáo."
- Nút "Xác nhận" disable khi chưa nhập lý do
- Sau xác nhận: SV hiện "Có mặt (GV)" với badge xanh
- Lý do hiện trong card (nền xanh nhạt với icon giấy)
- Snackbar "Đã điểm danh thủ công cho [Tên]"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-36: Hủy điểm danh thủ công
**Điều kiện:** Đã điểm danh thủ công cho 1 SV (hiện "Có mặt (GV)")
**Các bước:**
1. Tìm SV đã được điểm danh thủ công
2. Nhấn "Hủy điểm danh"
3. Quan sát thay đổi

**Kết quả mong đợi:**
- SV chuyển lại trạng thái "Vắng"
- Avatar đổi màu từ xanh sang xám
- Snackbar "Đã hủy điểm danh cho [Tên]"
- Nút "Điểm danh thủ công" xuất hiện lại

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 11. LỊCH SỬ ĐIỂM DANH - SINH VIÊN

### TC-37: Xem lịch sử điểm danh
**Điều kiện:** SV đã điểm danh ít nhất 1 phiên
**Các bước:**
1. Từ Home, nhấn "Lịch sử" hoặc vào /student/history
2. Quan sát trang lịch sử

**Kết quả mong đợi:**
- Header đỏ: "Lịch sử điểm danh"
- Thống kê tổng quát: score ring (% có mặt), số liệu có mặt/xem xét/vắng
- Danh sách các record sắp xếp theo thời gian giảm dần (mới nhất trên)
- Mỗi record hiện: tên lớp, thời gian, badge trạng thái (màu sắc đúng)
- Pull-to-refresh để tải lại dữ liệu
- Nếu chưa có record: hiện empty state

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-38: Teacher override hiện trong lịch sử SV
**Điều kiện:** GV đã override 1 record của SV từ "review" sang "present"
**Các bước:**
1. SV vào lịch sử điểm danh
2. Tìm record tương ứng

**Kết quả mong đợi:**
- Record hiện trạng thái "Có mặt" (đã được GV override)
- getEffectiveScore() ưu tiên teacherOverride trước trustScore

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 12. ĐĂNG KÝ KHUÔN MẶT

### TC-39: Luồng đăng ký khuôn mặt
**Điều kiện:** SV chưa đăng ký khuôn mặt, vào /student/face-register
**Các bước:**
1. Đọc hướng dẫn trang "instructions"
2. Nhấn "Bắt đầu"
3. Camera front bật, chụp ảnh thứ nhất
4. Camera bật lại, chụp ảnh thứ hai (góc khác)
5. Đợi xử lý ("processing")
6. Quan sát kết quả

**Kết quả mong đợi:**
- Bước 1: Màn hình hướng dẫn với step indicator (4 bước)
- Bước 3: Header đổi sang "Ảnh thứ nhất", camera front bật, oval clip hướng dẫn
- Bước 4: Header đổi sang "Ảnh thứ hai"
- Bước 5: Header "Đang xử lý...", spinner/loading
- Bước 6: Kết quả thành công -> hiện confidence score, nút "Hoàn tất"
- Nhấn "Hoàn tất" -> lưu faceRegistered = true, quay về /home
- Nếu lỗi: hiện thông báo lỗi, nút "Thử lại"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-40: Đăng ký khuôn mặt thất bại
**Điều kiện:** Camera bật nhưng ảnh không rõ khuôn mặt
**Các bước:**
1. Bắt đầu đăng ký
2. Chụp ảnh 1 (đúng)
3. Chụp ảnh 2 (che mặt hoặc không có khuôn mặt)

**Kết quả mong đợi:**
- Trang "error" hiện ra với thông báo lỗi
- Nút "Thử lại" để bắt đầu lại từ đầu
- Không lưu faceRegistered = true

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 13. HỒ SƠ NGƯỜI DÙNG

### TC-41: Xem hồ sơ
**Điều kiện:** Đã đăng nhập (SV hoặc GV)
**Các bước:**
1. Nhấn tab Profile trên bottom nav
2. Quan sát thông tin hiển thị

**Kết quả mong đợi:**
- Ảnh nền profile (bgprofile.jpg)
- Avatar với chữ cái đầu tên
- Hiển thị: Tên, MSSV (nếu SV), Số điện thoại, Email, Vai trò
- Logo BK (bk_logo.png)
- Nút "Chỉnh sửa", nút "Đăng xuất"
- MicrosoftLinkCard cho liên kết tài khoản Microsoft

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-42: Chỉnh sửa hồ sơ
**Điều kiện:** Đang ở trang Profile
**Các bước:**
1. Nhấn "Chỉnh sửa"
2. Modal hiện ra với các trường: Số điện thoại, Email, Ngày sinh, Khoa, Chương trình, Lớp
3. Sửa số điện thoại: "0367444143"
4. Sửa email: "thuan.nn225413@sis.hust.edu.vn"
5. Nhấn "Lưu"

**Kết quả mong đợi:**
- Modal DarkModal bottom-sheet hiện đầy đủ trường
- Validation: số điện thoại VN (0|+84)(3|5|7|8|9)XXXXXXXX
- Validation: email có @
- Lưu thành công -> cập nhật giao diện + localStorage + Firestore (background)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-43: Validation hồ sơ sai
**Điều kiện:** Đang chỉnh sửa hồ sơ
**Các bước:**
1. Nhập SĐT: "012345" (sai định dạng)
2. Nhấn "Lưu"
3. Sửa SĐT đúng, nhập email: "khonghople" (thiếu @)
4. Nhấn "Lưu"

**Kết quả mong đợi:**
- Bước 2: Hiện "Số điện thoại không hợp lệ"
- Bước 4: Hiện "Email không hợp lệ"
- Không lưu khi có lỗi

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-44: Đăng xuất
**Điều kiện:** Đang đăng nhập
**Các bước:**
1. Tại trang Profile, nhấn "Đăng xuất"
2. Xác nhận (nếu có)

**Kết quả mong đợi:**
- Xóa dữ liệu đăng nhập (localStorage)
- Chuyển về màn hình Login (/login)
- Không thể truy cập trang protected (/home, /student/*, /teacher/*)

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 14. AI CHAT

### TC-45: Mở trợ lý AI
**Điều kiện:** Đã đăng nhập, vào /ai-chat
**Các bước:**
1. Từ Home, nhấn menu AI Chat (hoặc navigate trực tiếp)
2. Quan sát giao diện chat

**Kết quả mong đợi:**
- Header gradient (tím-đỏ-vàng) với icon Sparkles
- 4 suggestion chips: "Lịch học hôm nay", "Tra cứu lớp học", "Lịch thi sắp tới", "Hướng dẫn sử dụng"
- Ô nhập tin nhắn ở cuối
- Nút gửi (gradient icon)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-46: Gửi tin nhắn và nhận phản hồi AI
**Điều kiện:** Đang ở trang AI Chat
**Các bước:**
1. Nhấn chip "Hướng dẫn sử dụng" hoặc gõ: "Hướng dẫn cách điểm danh"
2. Đợi phản hồi AI

**Kết quả mong đợi:**
- Tin nhắn user hiện bên phải (gradient bg)
- "Đang suy nghĩ..." hiện khi chờ AI
- Phản hồi AI hiện bên trái (nền trắng, avatar gradient)
- Hiện thời gian gửi (HH:MM)
- Auto-scroll xuống tin nhắn mới
- Nội dung phản hồi liên quan đến câu hỏi

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-47: AI Chat nhiều lượt
**Điều kiện:** Đã gửi 1 tin nhắn, nhận phản hồi
**Các bước:**
1. Gửi thêm: "Cho tôi biết về trust score"
2. Đợi phản hồi
3. Gửi thêm: "Cảm ơn"
4. Đợi phản hồi

**Kết quả mong đợi:**
- Lịch sử hội thoại hiện đầy đủ (user + AI xen kẽ)
- AI nhớ ngữ cảnh các tin nhắn trước
- Scroll hoạt động trơn tru

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-48: Reset chat khi rời trang
**Điều kiện:** Đã có nhiều tin nhắn trong AI Chat
**Các bước:**
1. Nhấn Back quay về Home
2. Vào lại AI Chat

**Kết quả mong đợi:**
- Lịch sử chat được xóa (resetChat() gọi khi unmount)
- Giao diện quay về trạng thái ban đầu với suggestion chips

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 15. FRAUD REPORT - GIẢNG VIÊN

### TC-49: Xem báo cáo gian lận
**Điều kiện:** GV vào /teacher/fraud/:classId
**Các bước:**
1. Từ chi tiết lớp hoặc menu, vào Fraud Report
2. Quan sát trang báo cáo

**Kết quả mong đợi:**
- Header đỏ: tiêu đề
- Thông tin lớp: tên, mã, số SV
- Danh sách báo cáo gian lận cũ (nếu có)
- Nút "Phân tích gian lận"

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-50: Chạy phân tích gian lận
**Điều kiện:** Có ít nhất 1 phiên điểm danh đã kết thúc
**Các bước:**
1. Nhấn "Phân tích gian lận"
2. Đợi kết quả phân tích

**Kết quả mong đợi:**
- Loading state khi đang phân tích
- Kết quả hiện: danh sách suspicious patterns
- Mỗi pattern có: severity (Thấp/Trung bình/Cao), mô tả, SV liên quan
- Màu severity: xanh (low), vàng (medium), đỏ (high)
- Summary tổng hợp
- Báo cáo được lưu vào Firestore

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 16. ANALYTICS - GIẢNG VIÊN

### TC-51: Xem thống kê lớp học
**Điều kiện:** GV vào /teacher/analytics/:classId, có ít nhất 1 phiên đã kết thúc
**Các bước:**
1. Vào trang Analytics
2. Quan sát các biểu đồ và số liệu

**Kết quả mong đợi:**
- Header đỏ: "Thống kê lớp học"
- ScoreRing: % trung bình điểm danh
- DarkStatCard: số phiên, tổng SV, trung bình có mặt
- DarkProgressBar: tỷ lệ có mặt, xem xét, vắng
- Danh sách 10 phiên gần nhất với số liệu từng phiên
- Loading skeleton khi đang tải

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 17. CẤU HÌNH OPTIONAL STEPS

### TC-52: Tắt xác minh khuôn mặt
**Điều kiện:** GV vào chi tiết lớp (/teacher/class/:classId)
**Các bước:**
1. Tìm toggle "Xác minh khuôn mặt" (đang BẬT)
2. Tắt toggle
3. Bắt đầu phiên điểm danh mới
4. SV vào điểm danh

**Kết quả mong đợi:**
- Toggle chuyển sang OFF
- Cập nhật Firestore: faceRequired = false
- Phiên mới có faceRequired = false
- SV chỉ thấy 3 bước: Quét QR -> Ngang hàng -> Hoàn tất (bỏ qua Face)
- Step Indicator chỉ hiện 3 bước

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-53: Tắt xác minh ngang hàng
**Điều kiện:** GV vào chi tiết lớp
**Các bước:**
1. Tìm toggle "Xác minh ngang hàng" (đang BẬT)
2. Tắt toggle
3. Bắt đầu phiên điểm danh mới
4. SV vào điểm danh

**Kết quả mong đợi:**
- Toggle chuyển sang OFF, cập nhật Firestore: peerRequired = false
- Phiên mới có peerRequired = false
- SV chỉ thấy 3 bước: Quét QR -> Khuôn mặt -> Hoàn tất (bỏ qua Peer)
- Không có màn hình QR ngang hàng

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-54: Tắt cả hai xác minh
**Điều kiện:** GV tắt cả face và peer
**Các bước:**
1. Tắt "Xác minh khuôn mặt"
2. Tắt "Xác minh ngang hàng"
3. Bắt đầu phiên, SV vào điểm danh

**Kết quả mong đợi:**
- SV chỉ thấy 2 bước: Quét QR -> Hoàn tất
- Sau khi quét QR thành công -> chuyển thẳng sang Done
- Nhanh nhất, không cần camera cho face hay peer

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 18. LỊCH HỌC - SINH VIÊN

### TC-55: Xem thời khóa biểu
**Điều kiện:** SV vào /student/schedule
**Các bước:**
1. Quan sát giao diện lịch học
2. Chuyển tab: Thời khóa biểu / Danh sách lớp / Lịch thi
3. Chuyển tháng trước/sau

**Kết quả mong đợi:**
- 3 tab: Thời khóa biểu, Danh sách lớp, Lịch thi
- Calendar hiện ngày hiện tại highlight
- Nhấn vào ngày -> hiện lịch học ngày đó
- Mỗi môn hiện: mã lớp, tên môn, mã môn, giờ, phòng, tiết
- Card schedule có nền hồng nhạt (#fce8e8)
- Chuyển tháng bằng nút < > trên calendar

**Trạng thái:** [ ] Pass / [ ] Fail

---

## 19. EDGE CASES & LỖI

### TC-56: QR hết hạn (expired)
**Điều kiện:** SV đang ở Bước 1 quét QR
**Các bước:**
1. GV hiện QR
2. SV đợi quá 90 giây (QR_EXPIRY_MS) không quét
3. SV quét QR cũ (đã expire)

**Kết quả mong đợi:**
- Lỗi: "QR giảng viên không hợp lệ hoặc hết hạn"
- Hiện trong error box đỏ nhạt
- SV có thể quét lại QR mới (GV QR đã xoay)
- Không tạo record điểm danh

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-57: Quét QR của chính mình (peer step)
**Điều kiện:** SV đang ở Bước 3 (Peer QR), dùng camera quay lại chính QR của mình
**Các bước:**
1. Dùng camera bên phải quét chính QR bên trái (của bạn)

**Kết quả mong đợi:**
- Lỗi: "Không thể quét QR của chính mình"
- Không tăng peer count
- Camera vẫn hoạt động, có thể quét tiếp QR khác

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-58: Quét QR trùng peer (đã verified)
**Điều kiện:** SV đã quét thành công QR của SV2
**Các bước:**
1. Quét lại QR của SV2 lần nữa

**Kết quả mong đợi:**
- Lỗi: "Đã xác minh bạn này rồi"
- Peer count không tăng
- Camera vẫn hoạt động để quét SV khác

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-59: Mất kết nối internet
**Điều kiện:** Đang sử dụng app bình thường
**Các bước:**
1. Tắt Wi-Fi và 4G (bật chế độ máy bay)
2. Thao tác trong app (VD: vào danh sách lớp)
3. Bật lại internet

**Kết quả mong đợi:**
- OfflineBanner hiện ở cuối màn hình (hoặc trên cùng)
- Các thao tác đọc dữ liệu từ cache (nếu có)
- Các thao tác ghi (điểm danh, tạo lớp...) có thể vào offline queue
- Khi có lại internet: banner biến mất
- Dữ liệu đồng bộ lại (retry logic)

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-60: Camera bị từ chối quyền
**Điều kiện:** SV vào Bước 1 (Quét QR) hoặc Bước 2 (Face)
**Các bước:**
1. Khi app xin quyền camera, nhấn "Từ chối"
2. Quan sát hành vi app

**Kết quả mong đợi:**
- Hiện thông báo yêu cầu cấp quyền camera
- Hướng dẫn người dùng vào Cài đặt để cấp quyền
- Không crash app
- Không tạo record điểm danh sai

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-61: Truy cập trang không có quyền
**Điều kiện:** SV cố gắng truy cập URL của GV
**Các bước:**
1. SV navigate trực tiếp đến /teacher/classes
2. SV navigate đến /teacher/session/class_001

**Kết quả mong đợi:**
- RoleGuard chặn truy cập
- Chuyển hướng về /home
- Không hiện nội dung trang GV

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-62: Truy cập trang khi chưa đăng nhập
**Điều kiện:** Chưa đăng nhập (localStorage trống)
**Các bước:**
1. Navigate trực tiếp đến /home
2. Navigate đến /student/classes
3. Navigate đến /ai-chat

**Kết quả mong đợi:**
- AuthGuard chặn truy cập
- Chuyển hướng về /login
- Hiện loading spinner trong khi kiểm tra auth

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-63: Phiên đã kết thúc - SV cố gắng điểm danh
**Điều kiện:** GV đã kết thúc phiên, SV mở link điểm danh cũ
**Các bước:**
1. SV navigate đến /student/attendance/:sessionId (phiên đã ended)

**Kết quả mong đợi:**
- Hiện màn hình "Phiên đã kết thúc"
- Icon đồng hồ xám
- Nếu SV đã điểm danh: hiện TrustBadge với điểm của họ
- Không cho điểm danh thêm

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-64: QR payload không hợp lệ
**Điều kiện:** SV đang quét QR (Bước 1 hoặc Bước 3)
**Các bước:**
1. Cho SV quét một QR bất kỳ (VD: QR website, QR thanh toán)

**Kết quả mong đợi:**
- Lỗi: "QR không hợp lệ"
- parseScannedQR() trả về null
- Không tạo record, không crash
- Camera vẫn hoạt động, có thể quét lại

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-65: Pull-to-refresh
**Điều kiện:** Đang ở trang có PullToRefresh (Student Classes, Student History, Teacher Classes)
**Các bước:**
1. Kéo màn hình từ trên xuống
2. Thả ra

**Kết quả mong đợi:**
- Hiện indicator loading khi kéo
- Dữ liệu được tải lại từ Firestore
- Danh sách cập nhật với dữ liệu mới nhất
- Loading tắt sau khi xong

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-66: App bị background và foreground
**Điều kiện:** Đang điểm danh (bất kỳ bước nào)
**Các bước:**
1. Nhấn Home trên điện thoại (app đi vào background)
2. Đợi 30 giây
3. Mở lại app (foreground)

**Kết quả mong đợi:**
- App resume đúng trạng thái trước đó
- Camera (nếu đang bật) khởi động lại
- QR code (nếu đang hiện) cập nhật mới
- Dữ liệu realtime reconnect
- EventName.AppPaused/AppResumed xử lý đúng

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-67: Nhiều SV điểm danh đồng thời
**Điều kiện:** 5+ SV cùng quét QR GV trong vòng 5 giây
**Các bước:**
1. GV bật phiên điểm danh
2. 5 SV đồng thời quét QR GV
3. Kiểm tra trên màn hình Monitor của GV

**Kết quả mong đợi:**
- Tất cả 5 SV đều check-in thành công
- Không có conflict hay duplicate
- Monitor GV hiện đầy đủ 5 SV
- Thống kê đúng: Có mặt = 5

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-68: SV không có trong lớp cố gắng điểm danh
**Điều kiện:** SV chưa tham gia lớp nhưng có link điểm danh
**Các bước:**
1. SV navigate đến /student/attendance/:sessionId của phiên thuộc lớp chưa tham gia
2. Quét QR giảng viên

**Kết quả mong đợi:**
- Server từ chối check-in (Cloud Functions validate)
- Hiện lỗi phù hợp
- Không tạo record điểm danh

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-69: SV điểm danh 2 lần cùng phiên
**Điều kiện:** SV đã hoàn thành điểm danh, cố gắng vào lại
**Các bước:**
1. SV đã hoàn thành 4 bước điểm danh
2. SV navigate lại /student/attendance/:sessionId

**Kết quả mong đợi:**
- App nhận biết đã có myAttendance record
- Tự động chuyển sang bước tương ứng (done nếu đã hoàn tất)
- Không tạo record mới / duplicate

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-70: Điểm danh thủ công - không nhập lý do
**Điều kiện:** GV đang điểm danh thủ công, modal nhập lý do hiện ra
**Các bước:**
1. Để trống ô lý do
2. Nhấn "Xác nhận"

**Kết quả mong đợi:**
- Nút "Xác nhận" bị disable (màu xám #d4d4d4)
- Không gửi request
- Phải nhập lý do (bắt buộc) mới enable nút

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-71: Error Boundary - lỗi crash
**Điều kiện:** Ứng dụng gặp lỗi không mong đợi
**Các bước:**
1. (Mô phỏng bằng dev mode: navigate đến route không tồn tại hoặc dữ liệu bị null)

**Kết quả mong đợi:**
- ErrorBoundary bắt lỗi, hiện màn hình lỗi thân thiện
- Không hiện trang trắng hoặc crash Zalo
- Có nút reload hoặc quay về Home

**Trạng thái:** [ ] Pass / [ ] Fail

---

### TC-72: GlobalLoading hiện đúng
**Điều kiện:** Thực hiện thao tác mất nhiều thời gian (tạo lớp, bắt đầu phiên...)
**Các bước:**
1. Nhấn "Bắt đầu điểm danh"
2. Quan sát loading indicator

**Kết quả mong đợi:**
- GlobalLoading overlay hiện khi đang xử lý
- Spinner hiện ở giữa màn hình
- Tắt sau khi thao tác hoàn tất
- Không block UI quá lâu (timeout xử lý)

**Trạng thái:** [ ] Pass / [ ] Fail

---

## BẢNG TỔNG HỢP KẾT QUẢ

| Nhóm | Số TC | Pass | Fail | Chưa test |
|------|-------|------|------|-----------|
| 1. Onboarding & Auth | 6 | | | |
| 2. Dashboard | 3 | | | |
| 3. Lớp học - GV | 3 | | | |
| 4. Tham gia lớp - SV | 4 | | | |
| 5. Phiên điểm danh - GV | 5 | | | |
| 6. Điểm danh 4 bước - SV | 4 | | | |
| 7. Theo dõi realtime | 3 | | | |
| 8. Kết thúc & Trust Score | 2 | | | |
| 9. Xem xét & Override | 4 | | | |
| 10. Điểm danh thủ công | 2 | | | |
| 11. Lịch sử - SV | 2 | | | |
| 12. Đăng ký khuôn mặt | 2 | | | |
| 13. Hồ sơ | 4 | | | |
| 14. AI Chat | 4 | | | |
| 15. Fraud Report | 2 | | | |
| 16. Analytics | 1 | | | |
| 17. Optional Steps | 3 | | | |
| 18. Lịch học | 1 | | | |
| 19. Edge Cases | 17 | | | |
| **TỔNG** | **72** | | | |

---

## GHI CHÚ KỸ THUẬT

### Thời gian QR
- QR refresh interval: **30 giây** (qrRefreshInterval trong session)
- QR hết hạn sau: **90 giây** (QR_EXPIRY_MS trong validation.ts)
- HMAC-SHA256 dùng crypto-js để tạo chữ ký

### Trust Score Logic
```
computeTrustScore(peerCount, faceVerification):
  - peerCount >= 3 AND face matched (confidence >= 0.7) -> "present"
  - peerCount >= 1 OR face matched -> "review"
  - Còn lại -> "absent"
```

### MSSV Validation
- Format: 8 chữ số, bắt đầu bằng "20"
- Regex: `/^20\d{6}$/`

### Class Code Validation
- Format: 2-10 ký tự alphanumeric
- Regex: `/^[A-Za-z0-9]{2,10}$/`

### Phone Validation
- Format: Số VN (0|+84)(3|5|7|8|9)XXXXXXXX
- Regex: `/^(0|\+84)(3|5|7|8|9)\d{8}$/`

### Routes cần quyền
- Public: `/splash`, `/welcome`, `/login`, `/dev`
- AuthGuard: `/home`, `/search`, `/profile`, `/ai-chat`
- AuthGuard + RoleGuard(student): `/student/*`
- AuthGuard + RoleGuard(teacher): `/teacher/*`

### Mock Mode (Dev)
- Trang /dev cho phép bật Mock Mode
- Dữ liệu mock: 3 lớp, 8 SV, 3 phiên, 13 records
- Có thể test từng bước điểm danh riêng lẻ (session_step1 -> session_step4)
- Có test cấu hình optional steps (Face OFF, Peer OFF, Both OFF)

---

*Tài liệu này bao gồm 72 test case bao phủ tất cả luồng chính và edge cases của ứng dụng inHUST Attendance. Cần thực hiện trên thiết bị thực với Zalo để đảm bảo tính chính xác.*
