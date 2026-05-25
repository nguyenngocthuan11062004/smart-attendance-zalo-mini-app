# Chiến lược viết Đồ án tốt nghiệp — Nguyễn Ngọc Thuận 20225413

> **Cập nhật:** 22/05/2026 · **Bảo vệ dự kiến:** cuối T6/2026 · **Deadline nộp quyển:** ~14/06/2026

---

## 0. Ràng buộc đã chốt

| Mục | Giá trị | Ghi chú |
|---|---|---|
| Định hướng | **Ứng dụng** | Dùng template SoICT Overleaf Ứng dụng tiếng Việt |
| Ngôn ngữ | **Tiếng Việt** | KTMT không bắt buộc EN |
| In | **2 mặt** | Theo template SoICT mới |
| Turnitin | **< 20%** | Tự check trước khi nộp |
| Font | 13pt Times/Latin Modern | Theo template |
| Dãn dòng | 1.5 | Theo template |
| Lề | 3.5 / 2 / 2 / 1.5 cm | trái / phải / trên / dưới |
| Số trang nội dung | **50 trang** | Sweet spot SoICT Ứng dụng (45-60) |

**Còn chờ GVHD xác nhận:**
- Policy khai báo AI (mặc định: tự khai báo trong Lời cam đoan)
- Số bản nộp chính xác (mặc định: 3-4 bản bìa cứng + 1 USB)
- Tên đề tài chốt (mặc định: *"Xây dựng hệ thống điểm danh thông minh chống gian lận trên nền tảng Zalo Mini App"*)

---

## 1. Outline 5 chương — phân bổ trang

```
Mở đầu / Đặt vấn đề ............................. 3 tr
Chương 1 — Giới thiệu đề tài .................... 6 tr
Chương 2 — Khảo sát & Phân tích yêu cầu ......... 9 tr
Chương 3 — Công nghệ sử dụng .................... 8 tr
Chương 4 — Phân tích & Thiết kế hệ thống ........ 13 tr  ★ chương lõi
Chương 5 — Triển khai & Kiểm thử ................ 9 tr
Kết luận & Hướng phát triển ..................... 2 tr
────────────────────────────────────────────────────────
Tổng nội dung chính ............................. 50 tr
+ Phụ lục A (HDSD GV), B (Test cases), C (Cấu trúc thư mục) — không giới hạn
```

---

## 2. Timeline 4 tuần

| Tuần | Khoảng ngày | Mục tiêu | Sản phẩm |
|---|---|---|---|
| **Sprint 0 — Setup** | 22-23/05 | Skeleton + outline + email GVHD | Overleaf project + 5 file .tex chương + GitHub repo |
| **Sprint 1 — Front-half** | 24-30/05 | Draft Ch.1, 2, 3 | ~25 trang |
| **Sprint 2 — Back-half** | 31/05-06/06 | Draft Ch.4, 5 + screenshots | ~25 trang đủ 50tr |
| **Polish** | 07-10/06 | Review, Turnitin, hình, refs | Bản nháp gửi GVHD |
| **GVHD feedback** | 11-13/06 | Sửa theo nhận xét thầy | Bản chốt |
| **In + nộp** | 14-16/06 | In bìa cứng | Nộp Văn phòng SoICT |
| **Slide + demo** | 17-22/06 | Slide 18 trang + video 4 phút | Sẵn sàng bảo vệ |
| **Bảo vệ** | 25-30/06 | Đứng hội đồng | Điểm |

---

## 3. Mapping tài sản → từng chương

> Nguồn audit chi tiết: xem `docs/thesis/asset-audit.md` (placeholder, sẽ tạo nếu cần)

### Chương 1 — Giới thiệu đề tài (6 tr)
- §1.1 Bối cảnh ← báo cáo tuần `16-21-03` + `CLAUDE.md`
- §1.2 Vấn đề thực tiễn ← báo cáo `11-16-05` (bottleneck QR nhỏ) + `04-09-05`
- §1.3 Mục tiêu ← **VIẾT MỚI** (3 mục tiêu chính)
- §1.4 Phạm vi ← memory `project-constraints.md`
- §1.5 Đóng góp ← **VIẾT MỚI** (HMAC rotating QR + projector pairing + admin)
- §1.6 Bố cục quyển ← **VIẾT MỚI**

### Chương 2 — Khảo sát & Phân tích yêu cầu (9 tr)
- §2.1 Hệ thống tương tự ← **VIẾT MỚI** (UTrack, BLE Beacon, RFID, NFC, Face check-in)
- §2.2 Phân tích thị trường ← báo cáo `13-18-04`
- §2.3 Yêu cầu chức năng ← types + service list
- §2.4 Yêu cầu phi chức năng ← `SECURITY-REPORT.md`
- §2.5 Use case + Actor ← Notion page 3+5

### Chương 3 — Công nghệ & Lý thuyết (8 tr)
- §3.1 Zalo Mini App SDK ← `CLAUDE.md` + skill `zalo-mini-app`
- §3.2 React 18 + Jotai + Tailwind ← **VIẾT MỚI** (ngắn)
- §3.3 Firebase ecosystem ← Notion page 6
- §3.4 HMAC-SHA256 ← **VIẾT MỚI** (RFC 2104, security proof)
- §3.5 Face recognition ← **VIẾT MỚI** (CNN, FaceNet, threshold matching)
- §3.6 OAuth 2.0 (Microsoft) ← `microsoft-oauth.service.ts` + RFC 6749

### Chương 4 — Phân tích & Thiết kế (13 tr) — 90% sẵn
- §4.1 Kiến trúc tổng thể ← Notion page 1 (mermaid 3-tier)
- §4.2 Thiết kế CSDL Firestore ← `src/types/index.ts` + `firestore.rules` + Notion page 6
- §4.3 Thiết kế Auth flow ← Notion page 3
- §4.4 Thiết kế UI/UX ← `CLAUDE.md` Design System + báo cáo `11-16-05`
- §4.5 Thuật toán QR HMAC xoay ← `src/utils/crypto.ts` + báo cáo `18-23-05`
- §4.6 Flow điểm danh 4 bước ← Notion page 4 (đầy đủ)
- §4.7 Anti-fraud 5 lớp ← Notion page 4 + `functions/fraud.service.ts`
- §4.8 Cổng máy chiếu pairing ← memory `feature-projector-pairing.md` + báo cáo `11-16-05`

### Chương 5 — Triển khai & Kiểm thử (9 tr)
- §5.1 Triển khai Mini App ← code + screenshots (CẦN CHỤP)
- §5.2 Triển khai Admin ← báo cáo `23-28-03` + `admin/src/pages`
- §5.3 Triển khai Cloud Functions ← `functions/src/index.ts` (17 hàm)
- §5.4 Kiểm thử ← `test-scenarios.md` (29 TC)
- §5.5 Đánh giá bảo mật ← `SECURITY-REPORT.md` (7.6/10)
- §5.6 Đánh giá hiệu năng ← **VIẾT MỚI** (đo cold start, render, Firestore reads)
- §5.7 Quy trình phát hành Zalo ← báo cáo `18-23-05` (compliance + OA + ZNS)

---

## 4. Checklist Quality Gate trước khi nộp GVHD

```
Hình thức (3/10 điểm hội đồng):
[ ] Bìa cứng đúng mẫu (Trường ĐHBKHN > Trường CNTT&TT > logo > đề tài > GVHD/SV/lớp > Hà Nội T6/2026)
[ ] Mục lục có đủ chương + tiểu mục ≥ 3 cấp
[ ] Danh mục hình (mọi hình Hình X.Y có chú thích PHÍA DƯỚI)
[ ] Danh mục bảng (mọi bảng Bảng X.Y có chú thích PHÍA TRÊN)
[ ] Mọi hình/bảng được tham chiếu trong text ("Hình 3.4 minh hoạ...")
[ ] Tài liệu tham khảo: VN trước, EN sau, ABC theo TÊN VN / HỌ EN
[ ] Trang đánh số: i,ii,iii cho phần đầu, 1,2,3 từ Mở đầu
[ ] Font 13pt, dãn 1.5, lề 3.5/2/2/1.5cm
[ ] Lời cam đoan có chữ ký + AI declaration
[ ] Tóm tắt ≤ 1 trang, có keywords
[ ] Mỗi chương có đoạn "Kết chương" cuối cùng
[ ] Đề tài trên bìa khớp với Phiếu Giao Nhiệm Vụ

Nội dung (6/10 điểm hội đồng):
[ ] Mục tiêu rõ ràng, đo lường được
[ ] Khảo sát so sánh ≥ 3 hệ thống tương tự
[ ] Mỗi quyết định kỹ thuật có justification (tại sao chọn Zalo Mini App? Firebase?)
[ ] Sơ đồ kiến trúc đầy đủ (3-tier + sequence + ERD)
[ ] Thuật toán cốt lõi (HMAC rotating QR) trình bày bằng pseudocode + giải thích
[ ] Kết quả kiểm thử có số liệu (X test case, Y pass, Z fail + lý do)
[ ] Phần bảo mật có rubric chấm điểm rõ ràng
[ ] Hạn chế ghi rõ và trung thực
[ ] Hướng phát triển có 5+ điểm cụ thể

Sản phẩm:
[ ] Source code GitHub private share với GVHD
[ ] README hướng dẫn build + deploy
[ ] Demo account login (SV + GV + Admin)
[ ] Video demo MP4 1080p ≤ 5 phút upload YouTube unlisted
[ ] QR code Mini App + link admin (`https://inhust-admin.web.app`)
[ ] USB chứa: PDF quyển + source.zip + video.mp4
[ ] Turnitin self-check < 20% (lưu screenshot làm bằng chứng nếu cần)
```

---

## 5. Workflow tận dụng Claude Max

### 5.1 Pattern: 1 chương = 1 agent độc lập
Mỗi agent có context 1M riêng → tải toàn bộ tài liệu liên quan chương đó, không "ô nhiễm" main context.

### 5.2 Pipeline 4 vòng cho mỗi chương
```
Vòng 1: Draft Agent (Opus 4.7)
  → Input: outline + assets file paths
  → Output: LaTeX draft v1
  
Vòng 2: Academic Polish Agent
  → Sửa giọng văn academic (third-person), fix ngữ pháp, loại bỏ câu lửng
  → Output: LaTeX v2
  
Vòng 3: Fact-check Agent
  → Đối chiếu draft với code thực → flag claim sai
  → Output: list claims + suggested fix
  
Vòng 4: Citation Agent
  → Tìm refs IEEE cho mọi [CITE] placeholder
  → Output: bibliography.bib + draft cuối
```

### 5.3 Tools MCP sử dụng
- **Overleaf Git** — push/pull LaTeX
- **notebooklm-mcp** — query papers cho Ch.3 (HMAC, FaceNet)
- **exa/deep-research** — tìm IEEE refs
- **notion** — đồng bộ outline + tracking
- **github** — backup source code
- **playwright** — auto screenshot 30+ ảnh
- **latex-server** — validate LaTeX compile

---

## 6. Risk register

| Rủi ro | Xác suất | Tác động | Phòng ngừa |
|---|---|---|---|
| GVHD trả lời chậm 6 câu hỏi | Cao | Cao | Gửi mail trong 22/05, follow-up sau 48h |
| Turnitin > 20% do AI paraphrase | TB | Rất cao | Mỗi đoạn >5 dòng tự viết lại giọng cá nhân; check 2 lần |
| Demo app lỗi giữa bảo vệ | TB | Cao | Quay sẵn video full flow 1080p, bật offline khi presenting |
| Bản in không kịp | TB | Cao | In 14/06 sớm hơn deadline 2 ngày |
| AI flag bởi Turnitin AI detection | Thấp | Rất cao | Tái-viết bằng giọng SV; chia nhỏ câu; khai báo trong cam đoan |
| Overleaf sập trước hạn nộp | Thấp | TB | Backup .tex local + Google Drive mỗi tối |

---

## 7. Trạng thái tiến độ (cập nhật khi làm)

### Sprint 0 — Setup (22-23/05)
- [ ] Gửi email GVHD 6 câu hỏi
- [ ] Fork Overleaf template SoICT Ứng dụng tiếng Việt
- [ ] Tạo GitHub private repo `thesis-20225413`
- [ ] Connect Overleaf ↔ GitHub
- [x] Lưu chiến lược này thành `docs/CHIEN-LUOC-VIET-DATN.md`
- [ ] Tạo 5 file skeleton chương + outline
- [ ] Soạn Lời cam đoan + AI declaration

### Sprint 1 — Draft Ch.1-3 (24-30/05)
- [ ] Draft Ch.1 (agent)
- [ ] Draft Ch.2 (agent)
- [ ] Draft Ch.3 (agent)
- [ ] Polish cả 3 chương
- [ ] Mail GVHD review 3 chương

### Sprint 2 — Draft Ch.4-5 (31/05-06/06)
- [ ] Draft Ch.4 (agent)
- [ ] Draft Ch.5 (agent)
- [ ] Chụp 30+ screenshots
- [ ] Polish + fact-check

### Polish (07-10/06)
- [ ] Mở đầu + Kết luận + Tóm tắt
- [ ] Mục lục + danh mục hình/bảng
- [ ] Bibliography đầy đủ IEEE
- [ ] Turnitin check < 20%
- [ ] Gửi GVHD draft 1

### Feedback (11-13/06)
- [ ] Nhận feedback GVHD
- [ ] Sửa theo nhận xét
- [ ] Final review

### In + Nộp (14-16/06)
- [ ] In thử 1 bản
- [ ] In chính thức 3-4 bản bìa cứng
- [ ] Nộp Văn phòng SoICT
- [ ] Đóng USB

### Bảo vệ (17-30/06)
- [ ] Slide 18 trang
- [ ] Video demo 4 phút
- [ ] Tập thuyết trình 3 lần
- [ ] Bảo vệ
