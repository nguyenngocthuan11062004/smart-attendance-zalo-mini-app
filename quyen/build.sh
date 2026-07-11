#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ "$1" = "clean" ] && { latexmk -C; exit 0; }
latexmk -pdf -interaction=nonstopmode -file-line-error main.tex
OUT="SOICT_DATN_IT4997_Zimo_Check-in_$(date +%d-%m).pdf"
cp -f main.pdf "$OUT" 2>/dev/null || true
echo "==> main.pdf ($(pdfinfo main.pdf 2>/dev/null | awk '/Pages/{print $2}') trang) → $OUT"
