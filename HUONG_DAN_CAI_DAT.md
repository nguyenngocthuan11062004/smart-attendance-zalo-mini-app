# Hướng dẫn cài đặt — Zimo Check-in

> **Đề tài:** Xây dựng hệ thống điểm danh thông minh trên nền tảng Zalo Mini App
> **Học phần:** IT4997 — Đồ án tốt nghiệp cử nhân · **GVHD:** Lê Bá Vui
> **Sinh viên:** Nguyễn Ngọc Thuận — 20225413

---

## 1. Nội dung gói sản phẩm

| Thư mục / file | Mô tả |
|---|---|
| `src/` | **Mã nguồn Mini App** (Zalo Mini App – React + TypeScript) |
| `admin/src/` | **Mã nguồn Trang quản trị** (web React + Ant Design) |
| `admin/dist/` | **Chương trình** — bản build sẵn của Trang quản trị (chạy được ngay) |
| `functions/src/` | Mã nguồn Cloud Functions (Firebase) |
| `firebase.json`, `firestore.rules`, … | Cấu hình Firebase |
| `*.env.example` | File môi trường mẫu (điền key thật trước khi chạy) |
| `HUONG_DAN_CAI_DAT.md` | File này |

> ⚠️ Vì lý do bảo mật, gói **không kèm** `node_modules/`, các file `.env` chứa khóa thật, và bản build Mini App (`www/`). Hãy cài đặt theo hướng dẫn bên dưới.

---

## 2. Yêu cầu môi trường

- **Node.js ≥ 18** và **npm ≥ 9** — https://nodejs.org
- **Zalo Mini App CLI** (để chạy Mini App): `npm install -g zmp-cli`
- **Tài khoản Zalo Developer** + Mini App đã đăng ký — https://mini.zalo.me (để chạy/triển khai Mini App thật)
- **Một dự án Firebase** (gói Spark miễn phí là đủ) — https://console.firebase.google.com
- (Tùy chọn) Khóa **Groq API** miễn phí cho tính năng AI Chat — https://console.groq.com

---

## 3. Cấu hình Firebase (làm 1 lần)

1. Tạo project tại Firebase Console.
2. Bật **Firestore Database**, **Authentication** (Email/Password) và **Storage**.
3. Vào **Project Settings → General → Your apps → Web app**, copy đoạn `firebaseConfig`.
4. Triển khai luật bảo mật (tùy chọn): `firebase deploy --only firestore:rules`.

Các giá trị `apiKey`, `authDomain`, `projectId`, … sẽ điền vào các file `.env` ở bước sau.

---

## 4. Cài đặt & chạy **Mini App** (thư mục gốc)

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file môi trường từ mẫu rồi điền giá trị thật
cp .env.example .env
#   - Điền 6 biến VITE_FIREBASE_* (từ firebaseConfig)
#   - Điền VITE_GROQ_API_KEY nếu dùng AI Chat (lấy ở console.groq.com)

# 3. Chạy dev (mở trong Zalo Developer Tools)
zmp start

# 4. Triển khai lên Zalo (cần tài khoản Zalo Mini App)
zmp deploy
```

> Lệnh kiểm tra kiểu dữ liệu (không tạo bản build): `npx tsc --noEmit`

---

## 5. Cài đặt & chạy **Trang quản trị** (thư mục `admin/`)

### Cách A — Dùng bản build sẵn (nhanh nhất, không cần build lại)
```bash
npx serve admin/dist
# rồi mở địa chỉ hiện ra (vd http://localhost:3000) trên trình duyệt
```
> Bản `admin/dist` đã được build sẵn để chấm thử ngay. Để đăng nhập cần một tài khoản admin (xem mục 7).

### Cách B — Chạy từ mã nguồn (để phát triển)
```bash
cd admin
npm install
cp .env.example .env      # điền 6 biến VITE_FIREBASE_*
npm run dev               # chạy dev tại http://localhost:5173
# hoặc build:  npx vite build   (kết quả vào admin/dist)
```

---

## 6. Cloud Functions (tùy chọn — cần gói Blaze)

Hệ thống hoạt động đầy đủ ở chế độ **client-side** trên gói Spark miễn phí; phần Cloud Functions chỉ cần khi muốn xác thực phía máy chủ.

```bash
cd functions
npm install
cp .env.example .env       # điền GROQ_API_KEY / ZALO_APP_SECRET_KEY … nếu dùng
npm run build
firebase deploy --only functions   # yêu cầu nâng cấp gói Blaze
```

---

## 7. Tài khoản demo

**Sinh viên (vào nhanh, bỏ qua xác minh email):**
- Ở màn đăng nhập, chọn **Sinh viên** → nhập **MSSV: `20225413`** → Tiếp tục.
  (MSSV này được cấu hình bỏ qua bước xác minh email — xem `VITE_BYPASS_MSSV`.)

**Quản trị viên (Trang quản trị web):**
- Tạo 1 tài khoản trong **Firebase Authentication** (Email/Password).
- Tạo 1 document trong Firestore collection `users` với id = UID tài khoản đó, đặt trường `role: "admin"`.
- Đăng nhập Trang quản trị bằng email/mật khẩu vừa tạo.

**Giảng viên:** đăng ký trong Mini App (chọn “Tôi là giảng viên”) rồi được **Quản trị viên duyệt** trong Trang quản trị (mục “Duyệt giảng viên”).

---

## 8. Ghi chú quan trọng

- **Bảo mật khóa:** các file `.env` thật **không** được kèm trong gói. Hãy tự tạo từ `*.env.example`. Khóa Firebase Web API là định danh công khai theo thiết kế (bảo mật thực thi bằng Firestore Rules + Firebase Auth); riêng **khóa Groq** là khóa riêng, không công khai.
- **Chế độ Mock (offline):** mở `/dev` trong Mini App (môi trường DEV) để bật dữ liệu giả, thử mọi màn hình không cần Firebase.
- **AI Chat:** chạy trực tiếp từ client bằng `VITE_GROQ_API_KEY` (phù hợp gói Spark). Nếu chưa cấu hình khóa, ứng dụng hiển thị thông báo hướng dẫn thay vì lỗi.

---

## 9. Công nghệ sử dụng

React 18 · TypeScript 5 · Zalo Mini App (ZMP SDK/UI) · Jotai · Tailwind CSS · Vite ·
Firebase (Firestore, Cloud Functions, Storage, Auth) · Ant Design (admin) ·
crypto-js (HMAC-SHA256) · qrcode/jsqr · @vladmandic/face-api · Groq (Llama 3.3 70B).
