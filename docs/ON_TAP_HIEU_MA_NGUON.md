# Ôn tập để HIỂU mã nguồn & bảo vệ ĐATN — Zimo Check-in

> Mục tiêu: tự tin trả lời mọi câu hỏi của hội đồng, chứng minh **bạn hiểu code của mình**.
> Cách dùng: đọc mục này → mở đúng file được trỏ tới → đọc code thật → tự trả lời câu hỏi cuối mỗi phần.
> **Nguyên tắc vàng khi bảo vệ:** thành thật về điểm yếu + giải thích *vì sao chọn vậy* + *nếu lên production sẽ sửa thế nào*. Hội đồng đánh giá cao sự hiểu biết về **đánh đổi (trade-off)** hơn là một hệ thống "hoàn hảo giả tạo".

---

## 0. Cách học hiệu quả (thứ tự đọc code)

Đừng đọc lung tung. Đọc theo tầng, từ dữ liệu lên giao diện:
1. `src/types/index.ts` — **hiểu mô hình dữ liệu trước tiên** (UserDoc, ClassDoc, SessionDoc, AttendanceDoc, trust score).
2. `src/utils/` — các thuật toán lõi (`crypto.ts`, `validation.ts`, `geo.ts`).
3. `src/services/` — tầng giao tiếp dữ liệu (auth, class, session, attendance, face).
4. `src/hooks/` — logic React tái sử dụng (useAttendance, useQRGenerator…).
5. `src/pages/` — màn hình (ghép mọi thứ lại).

**Mẹo:** chọn **1 luồng** và trace xuyên suốt (xem Mục 4). Hiểu sâu 1 luồng > đọc lướt 50 file.

---

## 1. Toàn cảnh hệ thống (bài "pitch" 1 phút)

> "Zimo Check-in là hệ thống điểm danh thông minh trên **Zalo Mini App**, chống gian lận **đa lớp**: mã QR động ký HMAC, nhận diện khuôn mặt trên thiết bị, xác minh ngang hàng giữa sinh viên, và định vị GPS. Mỗi lượt điểm danh được quy thành **điểm tin cậy** 3 mức (có mặt / cần xem xét / vắng). Hệ thống có 3 vai trò: sinh viên, giảng viên, phòng đào tạo (web quản trị)."

**3 vai trò:**
- **Sinh viên:** điểm danh 4 bước (Quét QR → Khuôn mặt → Ngang hàng → Xong).
- **Giảng viên:** mở phiên, hiện QR, theo dõi realtime, điểm danh thủ công, phân tích gian lận, chiếu QR lên máy chiếu.
- **Phòng đào tạo (admin web):** quản lý lớp/người dùng, duyệt GV, duyệt đơn nghỉ, nhập/xuất Excel.

---

## 2. Kiến trúc (chuẩn bị để VẼ lên bảng)

```
┌─────────────────┐     ┌─────────────────┐
│  Zalo Mini App  │     │   Admin Web     │
│ React+ZMP+Jotai │     │ React+Ant Design│
└────────┬────────┘     └────────┬────────┘
         │   Firebase SDK (realtime)        │
         ▼                                  ▼
┌───────────────────────────────────────────┐
│                 FIREBASE                    │
│  Firestore (NoSQL, realtime onSnapshot)     │
│  Authentication · Storage · Cloud Functions │
└───────────────────────────────────────────┘
```

**Công nghệ & vì sao:**
- **Zalo Mini App:** chạy ngay trong Zalo, không cần cài app → tiếp cận SV dễ (ai cũng có Zalo).
- **React + TypeScript:** TypeScript bắt lỗi kiểu lúc biên dịch → ít bug.
- **Jotai:** quản lý state toàn cục dạng "atom" nhẹ (vd `currentUserAtom`, `activeSessionAtom`).
- **Firebase Firestore:** CSDL **NoSQL** thời gian thực — client lắng nghe `onSnapshot`, dữ liệu đổi ở 1 máy là mọi máy thấy ngay (giống Messenger).

**Mô hình dữ liệu (các collection Firestore):** `users`, `classes`, `sessions`, `attendance`, `face_registrations`, `fraud_reports`, `absence_requests`, `pairing_tokens`.
→ Đọc kỹ từng interface trong `src/types/index.ts`. **Phải thuộc** quan hệ: 1 `class` có nhiều `session`; 1 `session` có nhiều bản ghi `attendance` (1 SV/buổi).

> **Câu hỏi tự kiểm tra:** Vì sao dùng `roster`/`rosterMssv` thay vì chỉ `studentIds`? (Gợi ý: `studentIds` chỉ chứa tài khoản Zalo ĐÃ đăng nhập; `roster` là danh sách chính thức GV import → đó mới là sĩ số thật. Đây là lý do trước đây lớp 5 SV hiện "1".)

---

## 3. SÁU cơ chế cốt lõi (hội đồng chắc chắn hỏi)

### 3.1. Mã QR động + HMAC-SHA256 (chống gian lận lõi)
- **File:** `src/utils/crypto.ts`, `src/utils/validation.ts`, `src/hooks/useQRGenerator.ts`.
- **Ý tưởng:** QR của GV **đổi mỗi 30 giây** và được **ký số** để không thể làm giả/dùng lại.
- **Thuật toán (`signPayload`):**
  ```
  message   = `${type}:${sessionId}:${userId}:${timestamp}:${nonce}`
  signature = HMAC_SHA256(message, hmacSecret)   // secret riêng mỗi phiên
  QR content = JSON { type, sessionId, userId, timestamp, nonce, signature }
  ```
- **Khi SV quét** (`classifyTeacherQR`): tính lại HMAC từ dữ liệu → so với `signature`. Khớp = thật. Lệch = giả/sai phiên → **chặn**. Nếu `Date.now() - timestamp > 90s` (`QR_EXPIRY_MS`) → QR cũ → cho qua nhưng **đánh dấu "cần xem xét"**.
- **HMAC là gì?** Hàm băm có khóa: chỉ ai có `secret` mới tạo được chữ ký đúng; đổi 1 ký tự dữ liệu là chữ ký đổi hoàn toàn. → Chống sửa/giả mạo.

> **Vấn đáp — "SV chụp màn hình QR gửi bạn ở nhà thì sao?"**
> "QR chỉ sống 90 giây và xoay mỗi 30s, nên ảnh chụp nhanh hết hạn. Hơn nữa hệ thống còn 3 lớp khác: khuôn mặt, xác minh ngang hàng (cần bạn cùng lớp có mặt thật), và GPS theo bán kính lớp. Một mình QR không đủ để 'present'."

> **Vấn đáp — "Vì sao 30s/90s mà không phải số khác?"**
> "30s đủ để QR luôn mới mà không làm SV quét hụt; 90s (= 3 chu kỳ) là dung sai cho mạng chậm/đồng hồ lệch, đồng thời đủ ngắn để ảnh chia sẻ lại vô dụng."

### 3.2. Nhận diện khuôn mặt (trên thiết bị)
- **File:** `src/services/face-ai.service.ts`, `src/services/face.service.ts`.
- **Cách chạy:** dùng **face-api.js** với 3 mô hình: TinyFaceDetector (phát hiện mặt), FaceLandmark68 (điểm mốc), FaceRecognitionNet → sinh **vector đặc trưng 128 chiều** (descriptor).
- **So khớp:** khoảng cách **Euclid** giữa 2 descriptor < **0.6** ⇒ cùng người. `confidence = 1 − distance`.
- **Lưu trữ:** chỉ lưu **vector 128 số** vào Firestore (`face_registrations`), **không lưu ảnh gốc**. Xử lý ngay trên điện thoại → **bảo vệ riêng tư**.

> **Vấn đáp — "Có gửi ảnh khuôn mặt lên server không?"**
> "Không. Mọi xử lý chạy trên thiết bị; chỉ lưu vector đặc trưng 128 chiều (không thể tái dựng lại ảnh mặt từ vector này). Em cũng có nút xoá dữ liệu khuôn mặt — tuân thủ quyền riêng tư."

> **Vấn đáp — "0.6 ở đâu ra?"** "Đây là ngưỡng khuyến nghị chuẩn của face-api.js cho khoảng cách Euclid giữa 2 vector — cân bằng giữa nhận nhầm và từ chối nhầm."

> **Điểm yếu phải biết:** nhận diện ảnh tĩnh có thể bị **chụp ảnh màn hình/ảnh in** lừa. Đồ án có `LivenessChallenge` (yêu cầu cười/quay đầu) để giảm rủi ro; production sẽ dùng eKYC server-side chống deepfake.

### 3.3. Xác minh ngang hàng — Peer-to-Peer (P2P)
- **File:** `src/services/attendance.service.ts` → `addBidirectionalPeerVerification`.
- **Ý tưởng:** SV A quét QR của SV B → **cả hai** cùng được ghi nhận là "peer" của nhau (2 chiều). Cần đủ **≥ 3 peer khác nhau** mới đạt "có mặt".
- **Vì sao chống gian lận:** muốn đủ peer, phải có **bạn cùng lớp thật, có mặt thật** ở đó để quét nhau → 1 người không thể tự "present".

> **Vấn đáp — "2 SV thông đồng quét cho nhau mỗi buổi?"**
> "Cần ≥3 peer khác nhau nên 2 người không đủ. Ngoài ra `fraud.service.ts` có luật `always_same_peers`: nếu 2 SV luôn xác minh cho nhau qua nhiều buổi (≥80%) → gắn cờ nghi vấn để GV xem lại."

### 3.4. Định vị GPS (geofencing)
- **File:** `src/utils/geo.ts`.
- **Thuật toán Haversine:** tính khoảng cách 2 toạ độ (lat/long) trên mặt cầu Trái Đất ra **mét**. `checkGeoFence` so với bán kính (mặc định **200m**).
- GV mở phiên → lưu vị trí lớp. SV quét → so vị trí. Ngoài vùng → chặn; thiếu GPS → đánh dấu "cần xem xét".

> **Vấn đáp — "Haversine là gì?"** "Công thức tính khoảng cách great-circle giữa 2 điểm theo vĩ độ/kinh độ, có tính độ cong Trái Đất — chính xác hơn trừ toạ độ thẳng."

### 3.5. Điểm tin cậy (Trust Score)
- **File:** `src/types/index.ts` → `computeTrustScore`, `effectiveTrustScore`.
- **Logic:**
  ```
  facePass = (không bắt buộc face) HOẶC face khớp/đã bỏ qua
  peerPass = (không bắt buộc peer) HOẶC peerCount >= 3
  facePass && peerPass → "present"
  facePass || peerPass → "review"     (cần GV xem xét)
  còn lại              → "absent"
  ```
- `effectiveTrustScore` còn ưu tiên **GV override** và hạ "present"→"review" khi `needsReview` (thiếu GPS / QR cũ).

> **Vấn đáp — "Vì sao 3 mức thay vì có mặt/vắng?"**
> "Mức 'cần xem xét' giúp GV không bỏ sót ca biên (vd đủ mặt nhưng thiếu peer, hay thiếu GPS) — hệ thống hỗ trợ quyết định, GV vẫn là người chốt."

### 3.6. Thời gian thực (Realtime)
- **Cơ chế:** Firestore `onSnapshot(query, callback)` — mở 1 kết nối, server **đẩy** thay đổi xuống ngay khi dữ liệu đổi.
- **Ở đâu:** `subscribeToSessionAttendance`, `subscribeStudentClasses`, màn Theo dõi của GV, cổng máy chiếu (`PresentPage`).
- **Hiệu ứng:** SV điểm danh → GV + máy chiếu thấy ngay, không cần refresh.

> **Vấn đáp — "onSnapshot khác getDocs thế nào?"** "`getDocs` đọc 1 lần; `onSnapshot` lắng nghe liên tục, có thay đổi là callback chạy lại → realtime."

---

## 4. Luồng end-to-end PHẢI thuộc: Sinh viên điểm danh

Trace qua các file (mở đọc theo thứ tự):
1. `pages/student/StudentAttendance.tsx` — màn 4 bước; gọi `useAttendance`.
2. **Bước 1 — Quét QR:** `InlineQRScanner` đọc QR → `parseScannedQR` → `classifyTeacherQR` (HMAC) → lấy GPS (`useGeolocation`) → `checkGeoFence` → `checkIn` (`hooks/useAttendance.ts`) → ghi `attendance` qua `attendance.service.ts`.
3. **Bước 2 — Khuôn mặt:** `FaceVerification` → `verifyFace` (`face.service.ts`) → `updateFaceVerification`.
4. **Bước 3 — Ngang hàng:** hiện QR của mình (`useQRGenerator`) + quét QR bạn (`addBidirectionalPeerVerification`) tới khi đủ 3.
5. **Bước 4 — Xong:** tính `trustScore`, hiện màn hoàn tất.

> **Tự kiểm tra:** Vẽ lại sơ đồ luồng này không nhìn code. Nếu vẽ được = bạn đã hiểu.

---

## 5. Bộ câu hỏi vấn đáp (luyện trả lời thành tiếng)

**Tổng quan**
- Đề tài giải quyết vấn đề gì? Điểm mới so với điểm danh truyền thống/điểm danh QR thường?
- Vì sao chọn Zalo Mini App mà không phải app native / web?

**Kỹ thuật**
- HMAC là gì? Vì sao chống được giả mạo QR?
- Vector đặc trưng khuôn mặt 128 chiều là gì? Lưu gì lên server?
- Xác minh ngang hàng hoạt động ra sao? Chống gian lận kiểu nào?
- Trust score tính thế nào? Vì sao 3 mức?
- Firestore (NoSQL) khác CSDL quan hệ (SQL) ở điểm nào? Khi nào NoSQL lợi?
- Realtime đồng bộ bằng gì?
- Jotai/atom là gì, khác Redux thế nào (nhẹ hơn, không boilerplate)?

**Bảo mật & vận hành (hay bị "soi" nhất)**
- Dữ liệu được bảo vệ thế nào? Firestore rules?
- Khoá API để ở đâu? Có an toàn không?
- Xử lý offline / mất mạng / mất GPS / camera lỗi thế nào?

**Mở rộng**
- Hệ thống chịu được bao nhiêu user? Mở rộng ra sao?
- Nếu có thêm thời gian, em phát triển gì tiếp?

---

## 6. Điểm yếu & cách "phòng thủ" (THÀNH THẬT = ghi điểm)

Hội đồng "mode gắt" sẽ tìm lỗ hổng. Đừng giấu — hãy chứng minh bạn **hiểu** nó:

| Điểm yếu (thật) | Cách trả lời |
|---|---|
| **Firestore rules mở** (client ghi thẳng) | "Vì dùng gói Firebase **Spark miễn phí** không deploy được Cloud Function gọi mạng ngoài. Em ĐÃ viết sẵn logic xác thực server-side (`functions/src/services/attendance.service.ts`: kiểm HMAC, chống replay bằng nonce, geofence) — chỉ cần nâng **Blaze** là bật. Đây là đánh đổi có chủ đích cho phạm vi ĐATN." |
| **HMAC secret nằm trong session doc** | "Vì chưa có Cloud Function, client SV cần secret để sinh QR ngang hàng. Production sẽ tách secret vào subcollection chỉ GV đọc + ký QR ở server." |
| **Khoá Groq ở client** | "Phù hợp gói miễn phí cho demo; production chuyển sang Cloud Function giữ khoá phía máy chủ." |
| **Face có thể bị ảnh tĩnh lừa** | "Đã có thử thách liveness (cười/quay đầu); production dùng eKYC server chống deepfake." |

> Câu thần chú: **"Đây là đánh đổi có chủ đích vì [lý do]; nếu lên production em sẽ [giải pháp]."**

---

## 7. Thuật ngữ phải nắm (đọc to định nghĩa của mình)

HMAC-SHA256 · nonce · replay attack · face descriptor (embedding) · Euclidean distance · geofencing/Haversine · NoSQL/document store · realtime listener (onSnapshot) · JWT/access token · HMAC secret · atomic state (Jotai) · code-splitting/lazy load · trust score.

---

## 8. Lịch ôn 3 ngày (gợi ý)
- **Ngày 1:** Mục 0–2 + đọc `types/index.ts`, `crypto.ts`, `validation.ts`, `geo.ts`. Vẽ kiến trúc + data model.
- **Ngày 2:** Mục 3 (6 cơ chế) — mở từng file, đọc code thật, trả lời câu hỏi.
- **Ngày 3:** Mục 4 (trace luồng) + Mục 5–6 (luyện nói Q&A + phòng thủ). Nhờ bạn đóng vai hội đồng hỏi.
