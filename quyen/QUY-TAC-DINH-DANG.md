# Bộ quy tắc định dạng quyển ĐATN (theo template SoICT Ứng dụng)

> Mục tiêu: giữ "hình thức" đúng chuẩn (3/10 điểm hội đồng). Mọi quy tắc dưới đây
> đã được mã hoá sẵn trong `main.tex` — **đừng đặt lại định dạng trong từng chương**,
> chỉ cần viết nội dung đúng cách là tự đúng form.

---

## 1. Trang & lề (ĐÃ thiết lập trong `main.tex` — KHÔNG sửa trong chương)

| Mục | Giá trị | Khai báo |
|---|---|---|
| Khổ giấy | A4 | `documentclass[a4paper,...]` |
| In | 2 mặt | `twoside` |
| Lề trái | **3,5 cm** | `geometry left=3.5cm` |
| Lề phải | **2,5 cm** | `geometry right=2.5cm` |
| Lề trên | **2 cm** | `geometry top=2cm` |
| Lề dưới | **2 cm** | `geometry bottom=2cm` |

⚠️ Nếu GVHD yêu cầu lề khác (vd 3.5/2/2/2 hoặc mirror cho gáy), **chỉ sửa dòng**:
`\usepackage[top=..,bottom=..,left=..,right=..]{geometry}` trong `main.tex`. Không dùng
`\newgeometry`, `\hspace`, `\vspace` âm để "ăn gian" lề trong nội dung.

---

## 2. Chữ & dãn dòng (ĐÃ thiết lập — KHÔNG đặt lại)

| Mục | Giá trị |
|---|---|
| Font | Times New Roman (`\usepackage{times}`) |
| Cỡ chữ thân bài | **13pt** (`\changefontsizes{13pt}`) |
| Dãn dòng | **1.5** (`\onehalfspacing`) |
| Thụt đầu dòng | 15pt (tự động mọi đoạn) |
| Cách đoạn | 6pt |

**Quy tắc viết:**
- KHÔNG tự chỉnh cỡ chữ trong thân bài (`\large`, `\small`, `\tiny`…). Chỉ dùng cho
  trường hợp đặc biệt (caption đã tự nhỏ sẵn).
- KHÔNG tự xuống dòng bằng `\\` giữa đoạn văn. Để LaTeX tự ngắt dòng; cách đoạn bằng
  **một dòng trống**.
- KHÔNG tự thụt đầu dòng bằng `\hspace`. Đã có sẵn 15pt.

---

## 3. Đánh số trang

| Phần | Kiểu số | Ghi chú |
|---|---|---|
| Bìa, bìa lót, lời cảm ơn, tóm tắt, abstract | **không số** | đã set |
| Mục lục, danh mục hình/bảng, từ viết tắt | **La Mã** (i, ii, iii…) | đã set |
| Từ Chương 1 đến hết | **Ả Rập** (1, 2, 3…) | đã set |

Số trang đặt ở chân trang, lề phải (đã cấu hình `fancyhdr`). Không can thiệp thủ công.

---

## 4. Đánh số & tiêu đề chương–mục (dùng đúng lệnh, KHÔNG tự bôi đậm)

| Cấp | Lệnh | Hiển thị |
|---|---|---|
| Chương | (đã viết trong `main.tex`: `\chapter{...}`) | `CHƯƠNG 1. TÊN` (căn giữa, đậm) |
| Mục cấp 1 | `\section{Tên mục}` | `1.1 Tên mục` (đậm) |
| Mục cấp 2 | `\subsection{Tên}` | `1.1.1 Tên` (đậm, thụt) |
| Mục cấp 3 | `\subsubsection{Tên}` | `a, Tên` (đậm, thụt sâu) |

**Quy tắc:**
- Viết `\section{Bối cảnh}` — KHÔNG viết `\section{\textbf{1.1 Bối cảnh}}`. Số mục và
  in đậm là TỰ ĐỘNG. Tự thêm sẽ sai (số đúp, đậm đúp).
- Mỗi `\section`/`\subsection` nên có `\label{sec:ten-ngan}` để tham chiếu chéo.
- Mỗi chương kết thúc bằng đoạn "Kết chương" (1 đoạn 3–4 dòng) — yêu cầu của SoICT.

---

## 5. Hình vẽ (CHÚ THÍCH ĐẶT PHÍA DƯỚI)

```latex
\begin{figure}[H]            % [H] = đặt đúng vị trí (gói float)
  \centering
  \includegraphics[width=0.8\textwidth]{ten_file}   % ảnh để trong figures/
  \caption{Mô tả hình}       % caption LUÔN nằm DƯỚI \includegraphics
  \label{fig:ten-ngan}
\end{figure}
```
- Hình đánh số theo chương: **Hình 1.1, Hình 1.2…** (đã set `\counterwithin{figure}{chapter}`).
- **Bắt buộc tham chiếu trong văn bản**: viết "… như Hình~\ref{fig:ten-ngan} minh hoạ".
- File ảnh đặt trong thư mục `figures/`. Ưu tiên PNG/PDF nét.
- Mọi hình phải xuất hiện trong **Danh mục hình vẽ** (tự động).

## 6. Bảng biểu (CHÚ THÍCH ĐẶT PHÍA TRÊN)

```latex
\begin{table}[H]
  \centering
  \caption{Mô tả bảng}       % caption LUÔN nằm TRÊN \begin{tabular}
  \label{tab:ten-ngan}
  \begin{tabular}{|l|c|r|}
    \hline
    Cột A & Cột B & Cột C \\ \hline
    ...   & ...   & ...   \\ \hline
  \end{tabular}
\end{table}
```
- Bảng đánh số theo chương: **Bảng 1.1, Bảng 2.3…**
- **Bắt buộc tham chiếu**: "… thể hiện trong Bảng~\ref{tab:ten-ngan}".
- Bảng quá rộng → dùng `\begin{landscape}...\end{landscape}` (gói `pdflscape`).

> Mẹo nhớ: **hình – caption dưới; bảng – caption trên.**

---

## 7. Thuật toán & mã nguồn

- Thuật toán: dùng `algorithm2e`:
  ```latex
  \begin{algorithm}[H]
    \caption{Tạo mã QR HMAC xoay}
    ... \KwIn{...} \KwOut{...} ...
  \end{algorithm}
  ```
- Mã nguồn: dùng `lstlisting` (style đã set sẵn trong `lstlisting.tex`):
  ```latex
  \begin{lstlisting}[language=TypeScript, caption={Hàm tạo QR}]
  ...code...
  \end{lstlisting}
  ```
- KHÔNG dán nguyên file code dài — chỉ trích đoạn cốt lõi 10–20 dòng.

---

## 8. Trích dẫn & Tài liệu tham khảo (chuẩn IEEE)

- Thêm tài liệu vào `Danh_sach_tai_lieu_tham_khao.bib`.
- Trích dẫn trong bài: `\cite{key}` → hiển thị `[1]`, `[2]`…
- Sắp xếp theo quy định SoICT: **tài liệu tiếng Việt trước, tiếng Anh sau**.
- Mọi tài liệu trong `.bib` phải được `\cite` ít nhất 1 lần (nếu không sẽ không hiện).

---

## 9. Từ viết tắt

- Khai báo trong `Tu_viet_tat.tex`: `\newacronym{key}{VIẾT TẮT}{Diễn giải đầy đủ}`.
- Lần đầu dùng trong bài nên viết đầy đủ kèm viết tắt; các lần sau dùng viết tắt.
- Danh mục tự sinh (đã bật `\makenoidxglossaries` + `\printnoidxglossaries`).

---

## 10. Checklist hình thức trước khi nộp

- [ ] Lề đúng: trái 3.5 / phải 2.5 / trên 2 / dưới 2 cm (hoặc theo GVHD)
- [ ] Font Times 13pt, dãn dòng 1.5
- [ ] Đánh số trang: đầu quyển La Mã, nội dung Ả Rập, bìa không số
- [ ] Mọi hình có caption DƯỚI, đánh số `X.Y`, được tham chiếu trong text
- [ ] Mọi bảng có caption TRÊN, đánh số `X.Y`, được tham chiếu trong text
- [ ] Mục lục đủ ≥ 3 cấp; có Danh mục hình, bảng, từ viết tắt
- [ ] Mỗi chương có đoạn "Kết chương"
- [ ] Tài liệu tham khảo IEEE, VN trước EN sau
- [ ] Lời cảm ơn / Tóm tắt (kèm từ khoá) / Abstract đầy đủ
- [ ] Biên dịch sạch: 0 overfull hbox, 0 lỗi, 0 tham chiếu `??`
- [ ] Số trang nội dung 45–60 (sweet spot ~50)

> Kiểm tra nhanh lỗi lề/biên dịch: chạy `./build.sh` rồi xem cuối `main.log`
> có dòng `Overfull \hbox` (chữ tràn lề) hay `LaTeX Warning: ... undefined` không.
