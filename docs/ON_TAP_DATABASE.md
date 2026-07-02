# Ôn tập DATABASE — Zimo Check-in (Firestore)

> File ôn riêng về cơ sở dữ liệu. Nguồn: `src/types/index.ts` (đọc tươi, chính xác từng field).

---

## 0. ĐIỂM CỐT LÕI (phải nắm trước — hội đồng hay bẫy)

**`types/index.ts` KHÔNG phải là database.** Nó là **lược đồ MÔ TẢ** database bằng TypeScript.

| | Giải thích |
|---|---|
| Database THẬT | **Firestore** (NoSQL, trên cloud Google) — dạng document, **schemaless** (không ép kiểu) |
| `types/index.ts` | **Interface mô tả** cấu trúc document, chỉ tồn tại trong **code** để dev viết an toàn kiểu (TypeScript). Firestore không đọc/ép file này. |

Trong `types/index.ts` có **3 loại thứ** — đừng nhầm tất cả là "database":
1. **Interface ↔ collection** (ĐÂY là database): UserDoc, ClassDoc, SessionDoc, AttendanceDoc, FraudReport, AbsenceRequestDoc, PairingTokenDoc, FaceRegistrationDoc.
2. **Kiểu NHÚNG** (nằm BÊN TRONG document khác, không phải collection riêng): GeoLocation, ClassSchedule, PeerVerification, FaceVerificationResult, SuspiciousPattern.
3. **Không phải database** (chỉ ở code): `QRPayload` (nội dung mã QR, truyền qua camera, **không lưu**), `UserRole`/`TrustScore` (nhãn union), và **3 hàm**: `computeTrustScore`, `effectiveTrustScore`, `getTrustScoreReasons`.

> **Câu trả lời chuẩn:** *"Firestore là NoSQL schemaless, nên em định nghĩa 'lược đồ' bằng TypeScript interface trong `types/index.ts` để code an toàn kiểu — nhưng ràng buộc/bảo mật thực thi ở phía server bằng **Firestore Rules**, không phải file types."*

---

## 1. Bản đồ: Interface ↔ Collection

| Collection (Firestore) | Interface | ID document |
|---|---|---|
| `users` | UserDoc | Zalo userID (hoặc MSSV nếu admin tạo) |
| `classes` | ClassDoc | auto-id |
| `sessions` | SessionDoc | auto-id |
| `attendance` | AttendanceDoc | auto-id |
| `face_registrations` | FaceRegistrationDoc* | studentId |
| `fraud_reports` | FraudReport | auto-id |
| `absence_requests` | AbsenceRequestDoc | auto-id |
| `pairing_tokens` | PairingTokenDoc | token (32 hex) |
| `verified_students` | *(không có interface — email-verify.service)* | userId |

`(*)` xem ghi chú ở Mục 3 — thực tế lưu khác interface.

---

## 2. Chi tiết TỪNG collection (mọi field · `?` = tùy chọn)

### `users` — Người dùng
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id | string | = Zalo userID |
| name, avatar | string | Tên, ảnh đại diện |
| **role** | "student"｜"teacher"｜"admin" | **Vai trò** (client chỉ tự gán "student") |
| mssv? | string | Mã số sinh viên |
| phone?, email?, birthdate? | string | Liên hệ |
| department?, program?, className? | string | Khoa/Viện, hệ, lớp |
| faceRegistered? | boolean | Đã đăng ký khuôn mặt chưa |
| pendingTeacher? | boolean | Đang chờ duyệt làm GV |
| teacherRequestedAt? | number | Thời điểm gửi yêu cầu GV |
| teacherRejected? | boolean | Yêu cầu GV bị từ chối |
| hustVerified?, hustStudentId? | bool/string | Đã xác minh email trường |
| microsoftEmail?, microsoftLinkedAt?… | | Liên kết MS365 (đang ẩn) |
| cccdNumber?…cccdRegistered? | | Thông tin CCCD (chưa dùng nhiều) |
| followedOA?, zaloPhone? | | Theo dõi OA, SĐT Zalo |
| createdAt, updatedAt | number | Mốc thời gian (Unix ms) |

### `classes` — Lớp học
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id, name, code | string | Định danh, tên, mã lớp |
| teacherId, teacherName | string | GV phụ trách |
| **studentIds** | string[] | Tài khoản Zalo ĐÃ liên kết (tập con) |
| **rosterMssv?** | string[] | **Danh sách MSSV chính thức** (query `array-contains`) |
| **roster?** | {mssv,name}[] | Danh sách chính thức có tên |
| faceRequired?, peerRequired? | boolean | Bật/tắt bước mặt/ngang hàng (mặc định true) |
| schedule? | ClassSchedule | Lịch dạy cố định |
| location? | string | Phòng học |
| createdAt | number | |

> ⭐ **rosterMssv/roster = sĩ số THẬT** (GV import). `studentIds` chỉ là tài khoản đã đăng nhập → đây là lý do trước lớp 5 SV hiện "1".

### `sessions` — Phiên điểm danh
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id, classId, className, teacherId | string | Thuộc lớp nào, GV nào |
| **status** | "active"｜"ended" | Đang mở / đã đóng (1 active/lớp) |
| **hmacSecret** | string | Khoá bí mật ký QR |
| qrRefreshInterval | number | Chu kỳ xoay QR (giây, =30) |
| faceRequired?, peerRequired? | boolean | Config bước điểm danh |
| durationMinutes? | number | Thời lượng (mặc định 90) |
| startedAt, endedAt? | number | Mốc bắt đầu/kết thúc |
| location? | GeoLocation | Vị trí lớp (để geofence) |
| geoFenceRadius? | number | Bán kính cho phép (mét, =200) |

### `attendance` — Bản ghi điểm danh (⭐ trái tim, 1 SV/phiên)
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id, sessionId, classId, studentId, studentName | string | Ai, phiên/lớp nào |
| studentMssv? | string | MSSV để đối chiếu roster |
| checkedInAt | number | Thời điểm check-in |
| **peerVerifications** | PeerVerification[] | Danh sách bạn đã xác minh |
| **peerCount** | number | Số peer (đủ ≥3 = present) |
| **trustScore** | "present"｜"review"｜"absent" | Kết quả tin cậy |
| teacherOverride? | "present"｜"absent" | GV ghi đè (ưu tiên tuyệt đối) |
| faceVerification? | FaceVerificationResult | Kết quả khuôn mặt |
| location? | GeoLocation | GPS lúc check-in |
| manualBy?, manualReason?, manualAt? | | Điểm danh thủ công (GV nào, lý do, khi nào) |
| needsReview?, reviewReason? | | Cờ "cần xem xét" (thiếu GPS / QR cũ) |

### `fraud_reports` — Báo cáo gian lận
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id, classId, sessionId, generatedAt | | Của lớp nào, khi nào |
| suspiciousPatterns | SuspiciousPattern[] | Danh sách mẫu nghi vấn |
| summary | string | Tóm tắt |

### `absence_requests` — Đơn xin nghỉ
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id, studentId, studentName, classId, className | | Ai, lớp nào |
| sessionId | string | Rỗng = nghỉ chung cho lớp |
| reason | string | Lý do |
| attachmentPaths | string[] | File đính kèm |
| status | "pending"｜"approved"｜"rejected" | Trạng thái |
| reviewedBy?, reviewedAt?, reviewNote? | | Ai duyệt, khi nào, ghi chú |
| createdAt | number | |

### `pairing_tokens` — Ghép cặp máy chiếu
| Field | Kiểu | Ý nghĩa |
|---|---|---|
| token | string | ID = mã 32 hex |
| status | "pending"｜"paired" | Chờ / đã ghép |
| sessionId, classId, className, teacherId | string｜null | Gán sau khi GV quét |
| createdAt, expiresAt, pairedAt? | number | Tạo / hết hạn (12h) / lúc ghép |

---

## 3. Kiểu NHÚNG (embedded — nằm bên trong document khác)

| Kiểu | Nhúng ở đâu | Field |
|---|---|---|
| **GeoLocation** | `sessions.location`, `attendance.location` | latitude, longitude, accuracy? |
| **ClassSchedule** | `classes.schedule` | dayOfWeek (1=T2…7=CN, ISO), startTime, endTime ("HH:MM") |
| **PeerVerification** | `attendance.peerVerifications[]` | peerId, peerName, verifiedAt, qrNonce |
| **FaceVerificationResult** | `attendance.faceVerification` | matched, confidence(0-1), selfieImagePath, verifiedAt, skipped?, livenessChecked? |
| **SuspiciousPattern** | `fraud_reports.suspiciousPatterns[]` | type, studentIds[], description, severity(low/med/high) |

> ⭐ **Đặc trưng NoSQL:** dữ liệu con được **NHÚNG thẳng** vào document cha (vd cả danh sách peer nằm trong 1 bản ghi attendance) thay vì tách bảng riêng như SQL. Gọi là **denormalization** — đọc nhanh, không cần JOIN.

**⚠️ Lưu ý trung thực về `face_registrations`:** interface `FaceRegistrationDoc` (referenceImagePath, ekycImageId…) là **thiết kế eKYC dự kiến**. Còn code THẬT (`face.service.ts`) lưu: `{ studentId, descriptor: number[128], confidence, registeredAt, updatedAt }` — tức **vector 128 chiều**, không phải ảnh. Nếu hội đồng hỏi, nói theo cái THẬT: chỉ lưu vector.

---

## 4. Quan hệ dữ liệu (ERD)

```
users(GV) 1 ──< n classes ──< n sessions ──< n attendance >── 1 users(SV)
                  │                                  │
                  │                                  └─ nhúng: peerVerifications[], faceVerification, location
classes ──< n fraud_reports        users(SV) 1 ──< n absence_requests
users(SV) 1 ── 0..1 face_registrations (id=studentId)
sessions 1 ── 0..1 pairing_tokens (khi chiếu)
```
- Quan hệ **n–n** (SV ↔ lớp) KHÔNG dùng bảng trung gian như SQL, mà **nhúng mảng** `classes.rosterMssv[]`.
- Không có JOIN → muốn "lớp của SV" thì query `where rosterMssv array-contains <mssv>`.

---

## 5. NoSQL vs SQL (câu hỏi kinh điển)

| | Firestore (NoSQL) | SQL (MySQL…) |
|---|---|---|
| Đơn vị | Collection → Document (JSON) | Table → Row |
| Lược đồ | **Schemaless** (linh hoạt) | Cố định (CREATE TABLE) |
| Quan hệ | Nhúng / lưu id tham chiếu, **không JOIN** | Khóa ngoại + JOIN |
| Truy vấn | `where`, `array-contains`, không JOIN | SQL đầy đủ |
| Realtime | **Có sẵn** (`onSnapshot`) | Phải tự làm |
| Mở rộng | Tự động (managed) | Cần cấu hình |

**Vì sao chọn NoSQL/Firestore?** *"Vì cần **realtime** (điểm danh hiện ngay), dữ liệu dạng document hợp với bản ghi điểm danh (nhúng peer/face gọn), và Firebase lo sẵn hạ tầng — phù hợp phạm vi ĐATN."*

---

## 6. Câu hỏi vấn đáp về Database

- CSDL của em là gì? NoSQL hay SQL? Khác nhau ra sao?
- `types/index.ts` có phải database không? *(→ Mục 0)*
- Firestore không có schema thì làm sao đảm bảo dữ liệu đúng? *(→ TypeScript ở client + Firestore Rules ở server)*
- Quan hệ SV–lớp lưu thế nào khi không có JOIN? *(→ `rosterMssv[]` + `array-contains`)*
- Vì sao `attendance` nhúng cả `peerVerifications` thay vì tách bảng? *(→ denormalization, đọc nhanh, hợp NoSQL)*
- 1 bản ghi điểm danh gồm những gì? *(→ đọc bảng `attendance`)*
- Điểm tin cậy lưu ở đâu, tính thế nào? *(→ field `trustScore` + hàm `computeTrustScore`)*
- Bảo mật dữ liệu (ai đọc/ghi được gì)? *(→ `firestore.rules`)*

---

## 7. Việc cần làm khi ôn phần này
1. Mở `src/types/index.ts` đọc **cùng lúc** với file này — đối chiếu từng interface với bảng field.
2. **Vẽ lại ERD** (Mục 4) không nhìn.
3. Học thuộc bảng **NoSQL vs SQL** (Mục 5) — gần như chắc chắn bị hỏi.
4. Nhớ phân biệt: **collection thật** vs **kiểu nhúng** vs **không phải DB** (Mục 0).
