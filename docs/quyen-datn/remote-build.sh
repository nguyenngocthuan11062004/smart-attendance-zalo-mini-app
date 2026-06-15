#!/usr/bin/env bash
# =============================================================
#  Biên dịch quyển ĐATN trên PC Linux từ xa qua SSH.
#  Luồng: Mac (soạn) --rsync--> Linux (latexmk) --rsync--> Mac (PDF) --> mở
#
#  Cách dùng:
#     ./remote-build.sh
#
#  Lần đầu: copy .remote-build.conf.example  ->  .remote-build.conf
#           rồi điền REMOTE (user@host) của PC Linux.
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$SCRIPT_DIR/.remote-build.conf"

# --- Giá trị mặc định (ghi đè được trong .remote-build.conf) ---
REMOTE=""                                  # vd: thuan@192.168.1.50
REMOTE_DIR="~/datn-build/quyen-datn"       # thư mục build trên Linux (tự tạo)
MAIN="main"                                # tên file chính (không .tex)
# ---------------------------------------------------------------
[ -f "$CONF" ] && source "$CONF"

if [ -z "$REMOTE" ]; then
  echo "❌ Chưa cấu hình REMOTE."
  echo "   Tạo file: $CONF  (copy từ .remote-build.conf.example) và điền user@host."
  exit 1
fi

echo "▶ 1/4  Đẩy mã nguồn lên  $REMOTE:$REMOTE_DIR ..."
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
rsync -az --delete \
  --exclude '.git' --exclude '.vscode' --exclude '.remote-build.conf' \
  --exclude '*.pdf' \
  --exclude '*.aux' --exclude '*.bbl' --exclude '*.bcf' --exclude '*.blg' \
  --exclude '*.fdb_latexmk' --exclude '*.fls' --exclude '*.log' \
  --exclude '*.out' --exclude '*.toc' --exclude '*.lof' --exclude '*.lot' \
  --exclude '*.run.xml' --exclude '*.synctex.gz' \
  "$SCRIPT_DIR/" "$REMOTE:$REMOTE_DIR/"

echo "▶ 2/4  Biên dịch trên Linux (latexmk: pdflatex -> bibtex -> pdflatex x2) ..."
ssh "$REMOTE" "cd $REMOTE_DIR && latexmk -pdf -interaction=nonstopmode -halt-on-error $MAIN.tex"

echo "▶ 3/4  Kéo PDF về Mac ..."
rsync -az "$REMOTE:$REMOTE_DIR/$MAIN.pdf" "$SCRIPT_DIR/$MAIN.pdf"

echo "▶ 4/4  Mở PDF ..."
open "$SCRIPT_DIR/$MAIN.pdf"
echo "✅ Xong: $SCRIPT_DIR/$MAIN.pdf"
