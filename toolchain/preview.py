"""preview.py — write a single self-contained HTML preview of a scope.

The output file inlines wblib.js and the CSV, so it opens offline in any
browser (no server, no fetch) and renders with the same engine the site uses.

    python preview.py                         # whole course
    python preview.py --scope unit --unit 1
    python preview.py --scope warmup --unit 1 --page w2 --out out/w2.html
"""
import argparse
import json
import os


def build(csv_path, wblib_path, sel, out_path):
    with open(csv_path, encoding="utf-8-sig") as f:
        csv_text = f.read()
    with open(wblib_path, encoding="utf-8") as f:
        wblib = f.read()
    html = (
        "<!doctype html><html lang=en><head><meta charset=utf-8>"
        "<meta name=viewport content='width=device-width, initial-scale=1'>"
        "<title>Workbook preview</title><style id=wbcss></style>"
        "<style>@media print{.pgcap{display:none}}"
        ".pgcap{max-width:8.5in;margin:-8px auto 0;color:#889;font-size:11px;text-align:right}</style>"
        "</head><body>"
        "<script>" + wblib + "</script>"
        "<script id=csv type='text/plain'>" + csv_text.replace("</", "<\\/") + "</script>"
        "<div id=preview></div>"
        "<script>"
        "document.getElementById('wbcss').textContent=L.styleCSS();"
        "var rows=L.parseCSV(document.getElementById('csv').textContent);"
        "var sel=" + json.dumps(sel) + ";"
        "document.getElementById('preview').innerHTML=L.scopeHTML(rows,sel,{});"
        "</script></body></html>"
    )
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="content.csv")
    ap.add_argument("--wblib", default="wblib.js")
    ap.add_argument("--scope", default="course", choices=["warmup", "unit", "course"])
    ap.add_argument("--course", default="cs1")
    ap.add_argument("--unit", default="1")
    ap.add_argument("--page", default="w1")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    sel = {"scope": a.scope, "course": a.course, "unit": a.unit, "page": a.page}
    out = a.out or ("out/%s-%s-preview.html" % (
        a.course.upper(),
        {"course": "Full", "unit": "Unit" + a.unit, "warmup": a.page}[a.scope]))
    print("wrote", build(a.csv, a.wblib, sel, out))


if __name__ == "__main__":
    main()
