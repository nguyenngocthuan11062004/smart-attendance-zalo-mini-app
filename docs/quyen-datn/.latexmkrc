# Cấu hình latexmk cho quyển ĐATN
# Template dùng pdflatex + biblatex(backend=bibtex)
$pdf_mode   = 1;     # Biên dịch bằng pdflatex
$bibtex_use = 2;     # Luôn chạy bibtex cho biblatex
$pdflatex   = 'pdflatex -synctex=1 -interaction=nonstopmode -file-line-error %O %S';
# Dọn các file phụ khi chạy `latexmk -c`
$clean_ext  = 'aux bbl blg run.xml bcf out toc lof lot synctex.gz fls fdb_latexmk';
