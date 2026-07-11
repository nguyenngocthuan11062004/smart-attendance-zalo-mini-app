#!/usr/bin/env bash
# Kiểm tra chất lượng LaTeX: chktex (lint) + báo overfull box (tràn lề).
# Dùng: ./lint.sh
cd "$(dirname "$0")"

# Bỏ qua các cảnh báo nhiễu/không hợp tiếng Việt:
#  1 dấu cách sau lệnh · 8 độ dài gạch · 11 dấu cách quanh ... · 13 spacing câu
# 17 ngoặc · 18 dấu nháy mở · 24 dấu cách sau \label (vô hại) · 44 ý kiến phong cách bảng (booktabs/kẻ dọc — luận văn VN dùng bảng kẻ ô) · 46 \, trước đơn vị
SUPPRESS="-n1 -n8 -n11 -n12 -n13 -n17 -n18 -n24 -n44 -n46"

echo "=========== CHKTEX (lint) ==========="
total=0
for f in main.tex Bia.tex Bia_lot.tex Chuong/*.tex; do
  out=$(chktex -q $SUPPRESS "$f" 2>/dev/null)
  if [ -n "$out" ]; then
    echo "----- $f -----"; echo "$out"
    total=$((total + $(echo "$out" | grep -c "Warning\|Error")))
  fi
done
[ "$total" = "0" ] && echo "  Sạch — không cảnh báo đáng kể."

echo ""
echo "=========== OVERFULL BOX (tràn lề) ==========="
if [ -f main.log ]; then
  n=$(grep -c "Overfull \\\\hbox" main.log)
  echo "  Số dòng tràn lề phải: $n"
  grep "Overfull \\\\hbox" main.log | head -10
else
  echo "  Chưa có main.log — chạy ./build.sh trước."
fi

echo ""
echo "=========== THAM CHIẾU HỎNG (??) ==========="
if [ -f main.pdf ]; then
  n=$(pdftotext main.pdf - 2>/dev/null | grep -c "??")
  echo "  Số '??' trong PDF: $n"
fi

echo ""
echo "=========== TRÍCH DẪN/THAM CHIẾU CHƯA RESOLVE ==========="
if [ -f main.log ]; then
  cu=$(grep -c "Citation.*undefined" main.log)
  ru=$(grep -c "Reference.*undefined" main.log)
  echo "  Citation undefined (thiếu trong .bib): $cu"
  echo "  Reference undefined (\\ref/\\label sai): $ru"
fi
if [ -f main.blg ]; then
  miss=$(grep -c "didn't find a database entry" main.blg)
  echo "  Bib thiếu entry (bibtex): $miss"
  grep "didn't find a database entry" main.blg | head -5
fi
