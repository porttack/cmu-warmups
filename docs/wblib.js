/* wblib.js — shared, DOM-free core for the CS0/CS1 workbook pipeline.
 * Used by: preview.py (inlined), workbook-editor.html, live-preview.html,
 * workbook-site.html, and wbdocx.js. Also require()-able in Node for tests.
 *
 * Responsibilities: CSV parse/serialize, warm-up <-> rows model, figure-spec
 * parsing, figure -> SVG, and full workbook -> HTML (warm-up / unit / course).
 * No DOM, no fetch — callers supply the CSV text.
 */
(function () {
  "use strict";

  var COLS = ["course", "unit", "warmup_no", "page", "section", "seq",
              "type", "content", "hint", "figure"];

  /* ------------------------------------------------------------------ *
   * CSV (RFC-4180-ish): quoted fields, embedded commas/newlines/quotes  *
   * ------------------------------------------------------------------ */
  function parseCSV(text) {
    text = String(text == null ? "" : text).replace(/^\uFEFF/, "");
    var rows = [], field = "", row = [], i = 0, n = text.length, q = false, c;
    function endField() { row.push(field); field = ""; }
    function endRow() { endField(); rows.push(row); row = []; }
    while (i < n) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { endField(); i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { endRow(); i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) endRow();
    if (!rows.length) return [];
    var header = rows.shift().map(function (h) { return h.trim(); });
    return rows
      .filter(function (r) { return r.some(function (x) { return x !== ""; }); })
      .map(function (r) {
        var o = {};
        header.forEach(function (h, j) { o[h] = r[j] == null ? "" : r[j]; });
        COLS.forEach(function (k) { if (!(k in o)) o[k] = ""; });
        return o;
      });
  }

  function csvCell(v) {
    v = v == null ? "" : String(v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCSV(rows, cols) {
    cols = cols || COLS;
    var out = [cols.join(",")];
    rows.forEach(function (r) {
      out.push(cols.map(function (c) { return csvCell(r[c]); }).join(","));
    });
    return out.join("\r\n") + "\r\n";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ------------------------------------------------------------------ *
   * Row selection helpers                                               *
   * ------------------------------------------------------------------ */
  function courses(rows) {
    return uniq(rows.map(function (r) { return r.course || "cs1"; }));
  }
  function units(rows, course) {
    return uniq(rows.filter(function (r) { return (r.course || "cs1") === course; })
      .map(function (r) { return r.unit; })).sort(function (a, b) { return (+a) - (+b); });
  }
  function warmPages(rows, course, unit) {
    var seen = {}, order = [];
    rows.forEach(function (r) {
      if ((r.course || "cs1") === course && String(r.unit) === String(unit) && /^w/.test(r.page)) {
        if (!seen[r.page]) { seen[r.page] = 1; order.push(r.page); }
      }
    });
    return order;
  }
  function pageRows(rows, course, unit, page) {
    return rows.filter(function (r) {
      return (r.course || "cs1") === course && String(r.unit) === String(unit) && r.page === page;
    });
  }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }
  function bySeq(a, b) { return (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0); }

  /* ------------------------------------------------------------------ *
   * Model: rows <-> warm-up object                                      *
   *   sections: meta(topic/ican) | vocab | part1 | part2                *
   * ------------------------------------------------------------------ */
  function warmupFromRows(rows) {
    var meta = rows[0] || {};
    var w = {
      course: meta.course || "cs1", unit: meta.unit || "1",
      no: meta.warmup_no || "", page: meta.page || "w1",
      topic: "", ican: [], vocab: [], part1: [], part2: []
    };
    rows.slice().forEach(function (r) {
      var sec = r.section, it = { type: r.type, content: r.content, hint: r.hint, figure: r.figure, seq: r.seq };
      if (sec === "meta") {
        if (r.type === "topic") w.topic = r.content;
        else if (r.type === "ican") w.ican.push(r.content);
      } else if (sec === "vocab") w.vocab.push(it);
      else if (sec === "part1") w.part1.push(it);
      else if (sec === "part2") w.part2.push(it);
    });
    [w.vocab, w.part1, w.part2].forEach(function (a) { a.sort(bySeq); });
    return w;
  }

  function rowsFromWarmup(w) {
    var rows = [], seq = 0;
    function base() {
      return { course: w.course, unit: String(w.unit), warmup_no: String(w.no), page: w.page };
    }
    function push(section, type, content, hint, figure) {
      var r = base();
      r.section = section; r.seq = String(seq++); r.type = type;
      r.content = content == null ? "" : content;
      r.hint = hint == null ? "" : hint;
      r.figure = figure == null ? "" : figure;
      rows.push(r);
    }
    push("meta", "topic", w.topic);
    (w.ican || []).forEach(function (t) { push("meta", "ican", t); });
    (w.vocab || []).forEach(function (it) { push("vocab", it.type || "vocab", it.content, it.hint, it.figure); });
    (w.part1 || []).forEach(function (it) { push("part1", it.type || "p", it.content, it.hint, it.figure); });
    (w.part2 || []).forEach(function (it) { push("part2", it.type || "p", it.content, it.hint, it.figure); });
    return rows;
  }

  function blankWarmup(course, unit, no) {
    return {
      course: course || "cs1", unit: unit || 1, no: no || 1, page: "w" + (no || 1),
      topic: "New warm-up",
      ican: ["I can … (skill 1)", "I can … (skill 2)"],
      vocab: [{ type: "vocab", content: "term — write it in your own words", hint: "n=2" }],
      part1: [{ type: "p", content: "First prompt.", hint: "n=3" }],
      part2: [{ type: "p", content: "Stretch: keep going if you finish early.", hint: "n=3" }]
    };
  }

  /* ------------------------------------------------------------------ *
   * START HERE strip (A–E). A/D fixed, B/C from ican, E rotates by no.  *
   * ------------------------------------------------------------------ */
  var SEL = [
    "One word for how today is going so far:",
    "Something you are looking forward to this week:",
    "A person you could ask for help if you get stuck:",
    "One thing that is going well outside of this class:",
    "If you finish early today, what will you try next?",
    "A goal — small is fine — for this class period:"
  ];
  function stripItems(w) {
    var no = parseInt(w.no, 10) || 0;
    var ican = w.ican && w.ican.length ? w.ican : ["I can start today's warm-up.", "I can ask for help when stuck."];
    return [
      { L: "A", kind: "pace", text: "Pace check — circle one:", opts: ["feeling good", "a bit distracted", "stuck — I could use help"] },
      { L: "B", kind: "ican", text: ican[0] || "" },
      { L: "C", kind: "ican", text: ican[1] || "" },
      { L: "D", kind: "reflect", text: "Looking back at last class — one thing that clicked, and one thing still fuzzy:" },
      { L: "E", kind: "sel", text: SEL[no % SEL.length] }
    ];
  }

  /* ------------------------------------------------------------------ *
   * Figure spec parser (shared by SVG + canvas + PIL)                   *
   *   grid | circle cx,cy,r[,g] | rect l,t,w,h[,g] | oval cx,cy,w,h[,g] *
   *   star cx,cy,r,points[,g] | line x1,y1,x2,y2 | dot x,y              *
   *   options anywhere: canvas=NNN  grid=off                            *
   * ------------------------------------------------------------------ */
  var GRAYNAME = {
    black: 0, dimgray: 105, gray: 128, grey: 128, darkgray: 169, silver: 192,
    lightgray: 211, lightgrey: 211, gainsboro: 220, white: 255
  };
  function grayToColor(tok) {
    if (tok == null || tok === "") return null; // null => no fill
    tok = String(tok).trim().toLowerCase();
    if (tok in GRAYNAME) tok = GRAYNAME[tok];
    var v = parseInt(tok, 10);
    if (isNaN(v)) return null;
    v = Math.max(0, Math.min(255, v));
    var h = ("0" + v.toString(16)).slice(-2);
    return "#" + h + h + h;
  }
  function nums(a) { return a.map(function (x) { return parseFloat(x); }); }

  function parseFigure(spec) {
    var out = { canvas: 400, grid: true, shapes: [] };
    if (!spec) return out;
    String(spec).split(";").forEach(function (raw) {
      var part = raw.trim(); if (!part) return;
      var mC = part.match(/canvas\s*=\s*(\d+)/i); if (mC) { out.canvas = +mC[1]; return; }
      if (/grid\s*=\s*off/i.test(part)) { out.grid = false; return; }
      var toks = part.split(/\s+/);
      var kw = toks.shift().toLowerCase();
      var args = toks.join(" ").split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s !== ""; });
      if (kw === "grid") { return; }
      if (kw === "circle") { var a = nums(args); out.shapes.push({ t: "circle", cx: a[0], cy: a[1], r: a[2], fill: grayToColor(args[3]) }); }
      else if (kw === "rect") { var b = nums(args); out.shapes.push({ t: "rect", x: b[0], y: b[1], w: b[2], h: b[3], fill: grayToColor(args[4]) }); }
      else if (kw === "oval") { var o = nums(args); out.shapes.push({ t: "oval", cx: o[0], cy: o[1], w: o[2], h: o[3], fill: grayToColor(args[4]) }); }
      else if (kw === "star") { var s = nums(args); out.shapes.push({ t: "star", cx: s[0], cy: s[1], r: s[2], pts: s[3] || 5, fill: grayToColor(args[4]) }); }
      else if (kw === "line") { var l = nums(args); out.shapes.push({ t: "line", x1: l[0], y1: l[1], x2: l[2], y2: l[3] }); }
      else if (kw === "dot") { var d = nums(args); out.shapes.push({ t: "dot", x: d[0], y: d[1] }); }
    });
    return out;
  }

  function starPoints(cx, cy, r, pts) {
    pts = pts || 5; var inner = r * 0.42, p = [];
    for (var k = 0; k < pts * 2; k++) {
      var rr = (k % 2 === 0) ? r : inner;
      var ang = -Math.PI / 2 + k * Math.PI / pts;
      p.push([cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]);
    }
    return p;
  }

  function figureSVG(spec) {
    var f = parseFigure(spec), C = f.canvas, step = 50;
    var s = '<svg viewBox="0 0 ' + C + ' ' + C + '" xmlns="http://www.w3.org/2000/svg" width="100%" preserveAspectRatio="xMidYMid meet">';
    s += '<rect x="0" y="0" width="' + C + '" height="' + C + '" fill="#ffffff" stroke="#333" stroke-width="1.5"/>';
    if (f.grid) {
      for (var g = step; g < C; g += step) {
        s += '<line x1="' + g + '" y1="0" x2="' + g + '" y2="' + C + '" stroke="#e2e2e2" stroke-width="1"/>';
        s += '<line x1="0" y1="' + g + '" x2="' + C + '" y2="' + g + '" stroke="#e2e2e2" stroke-width="1"/>';
      }
      // light ticks at every 100 on the top/left edges
      for (var t = 100; t < C; t += 100) {
        s += '<text x="' + (t + 2) + '" y="12" font-size="10" fill="#999" font-family="sans-serif">' + t + '</text>';
        s += '<text x="2" y="' + (t + 12) + '" font-size="10" fill="#999" font-family="sans-serif">' + t + '</text>';
      }
    }
    f.shapes.forEach(function (sh) {
      var fill = sh.fill || "none", st = 'stroke="#111" stroke-width="2"';
      if (sh.t === "circle") s += '<circle cx="' + sh.cx + '" cy="' + sh.cy + '" r="' + sh.r + '" fill="' + fill + '" ' + st + '/>';
      else if (sh.t === "rect") s += '<rect x="' + sh.x + '" y="' + sh.y + '" width="' + sh.w + '" height="' + sh.h + '" fill="' + fill + '" ' + st + '/>';
      else if (sh.t === "oval") s += '<ellipse cx="' + sh.cx + '" cy="' + sh.cy + '" rx="' + (sh.w / 2) + '" ry="' + (sh.h / 2) + '" fill="' + fill + '" ' + st + '/>';
      else if (sh.t === "star") { var pp = starPoints(sh.cx, sh.cy, sh.r, sh.pts).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); s += '<polygon points="' + pp + '" fill="' + fill + '" ' + st + '/>'; }
      else if (sh.t === "line") s += '<line x1="' + sh.x1 + '" y1="' + sh.y1 + '" x2="' + sh.x2 + '" y2="' + sh.y2 + '" stroke="#111" stroke-width="2.5"/>';
      else if (sh.t === "dot") s += '<circle cx="' + sh.x + '" cy="' + sh.y + '" r="5" fill="#111"/>';
    });
    return s + "</svg>";
  }

  // Draw the same figure onto a 2D canvas context scaled to `px` (browser + node-canvas)
  function drawFigure(ctx, spec, px) {
    var f = parseFigure(spec), C = f.canvas, k = px / C, step = 50;
    ctx.save();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, px, px);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#333"; ctx.strokeRect(0.75, 0.75, px - 1.5, px - 1.5);
    if (f.grid) {
      ctx.lineWidth = 1; ctx.strokeStyle = "#e2e2e2";
      for (var g = step; g < C; g += step) {
        ctx.beginPath(); ctx.moveTo(g * k, 0); ctx.lineTo(g * k, px); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g * k); ctx.lineTo(px, g * k); ctx.stroke();
      }
      ctx.fillStyle = "#999"; ctx.font = (10 * k) + "px sans-serif";
      for (var t = 100; t < C; t += 100) { ctx.fillText(String(t), (t + 2) * k, 12 * k); ctx.fillText(String(t), 2 * k, (t + 12) * k); }
    }
    f.shapes.forEach(function (sh) {
      ctx.lineWidth = 2 * k; ctx.strokeStyle = "#111";
      function fillstroke() { if (sh.fill) { ctx.fillStyle = sh.fill; ctx.fill(); } ctx.stroke(); }
      if (sh.t === "circle") { ctx.beginPath(); ctx.arc(sh.cx * k, sh.cy * k, sh.r * k, 0, 2 * Math.PI); fillstroke(); }
      else if (sh.t === "rect") { ctx.beginPath(); ctx.rect(sh.x * k, sh.y * k, sh.w * k, sh.h * k); fillstroke(); }
      else if (sh.t === "oval") { ctx.beginPath(); ctx.ellipse(sh.cx * k, sh.cy * k, (sh.w / 2) * k, (sh.h / 2) * k, 0, 0, 2 * Math.PI); fillstroke(); }
      else if (sh.t === "star") { var pp = starPoints(sh.cx, sh.cy, sh.r, sh.pts); ctx.beginPath(); pp.forEach(function (p, i) { var x = p[0] * k, y = p[1] * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); fillstroke(); }
      else if (sh.t === "line") { ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.moveTo(sh.x1 * k, sh.y1 * k); ctx.lineTo(sh.x2 * k, sh.y2 * k); ctx.stroke(); }
      else if (sh.t === "dot") { ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(sh.x * k, sh.y * k, 5 * k, 0, 2 * Math.PI); ctx.fill(); }
    });
    ctx.restore();
  }

  /* collect every distinct figure spec used, for pre-rasterization */
  function figureSpecs(rows) {
    var seen = {}, list = [];
    rows.forEach(function (r) { if (r.figure && !seen[r.figure]) { seen[r.figure] = 1; list.push(r.figure); } });
    return list;
  }

  /* ------------------------------------------------------------------ *
   * HTML rendering (paged). opts.lineH = writing-line height in px.     *
   * ------------------------------------------------------------------ */
  function lines(n, cls) {
    n = parseInt(n, 10) || 1; var s = '<div class="wl ' + (cls || "") + '">';
    for (var i = 0; i < n; i++) s += '<div class="wline"></div>';
    return s + "</div>";
  }
  function hintN(hint, dflt) { var m = /n\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : dflt; }
  function hintW(hint, dflt) { var m = /w\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : dflt; }

  function itemHTML(it) {
    var t = it.type;
    if (t === "figure") {
      var w = hintW(it.hint, 230);
      return '<div class="fig" style="max-width:' + w + 'px">' + figureSVG(it.figure || "grid") + '</div>';
    }
    if (t === "code") return '<pre class="code">' + esc(it.content) + "</pre>";
    if (t === "label") return '<div class="ilabel">' + esc(it.content) + "</div>";
    if (t === "lines") return lines(hintN(it.hint, 3));
    if (t === "vocab") {
      return '<div class="vocab"><span class="term">' + esc(it.content) + "</span>" + lines(hintN(it.hint, 2)) + "</div>";
    }
    // p (prompt) — text then writing lines (default 2)
    var n = hintN(it.hint, 2);
    return '<div class="prompt"><div class="ptext">' + esc(it.content) + "</div>" + (n > 0 ? lines(n) : "") + "</div>";
  }

  function headerHTML(w) {
    return '<table class="hdr"><tr>' +
      '<td class="hc" style="width:52%">Name</td><td class="hc" style="width:28%">Date</td><td class="hc">Period</td></tr>' +
      '<tr><td class="hc">Partner</td><td class="hc">Points ___ / ___</td><td class="hc">Marked&nbsp;by</td></tr></table>' +
      '<div class="titlebar"><span class="wno">Warm-up ' + esc(w.no) + '</span>&nbsp;&mdash;&nbsp;' + esc(w.topic) + '</div>';
  }
  function stripHTML(w) {
    var its = stripItems(w), rows = its.map(function (x) {
      var right;
      if (x.kind === "pace") right = x.text + ' &nbsp; ' + x.opts.map(function (o) { return "( ) " + o; }).join(" &nbsp; ");
      else if (x.kind === "ican") right = "☐ got it &nbsp; ☐ shaky &nbsp; ☐ not yet &nbsp;&nbsp; " + esc(x.text);
      else right = esc(x.text) + '<div class="wline"></div>';
      return '<tr><td class="sL">' + x.L + "</td><td>" + right + "</td></tr>";
    }).join("");
    return '<div class="striphead">START HERE</div><table class="strip">' + rows + "</table>";
  }

  function warmupHTML(w, opts) {
    opts = opts || {};
    var p1 = headerHTML(w) + stripHTML(w) +
      '<div class="seclabel">Vocabulary — write each in your own words</div>' +
      w.vocab.map(itemHTML).join("");
    var p2 = '<div class="seclabel">Part 1 — core work</div>' + w.part1.map(itemHTML).join("") +
      '<div class="part2bar">PART 2 <em>— keep going if you finish early.</em></div>' +
      w.part2.map(itemHTML).join("");
    return '<section class="page" data-page="' + esc(w.page) + '">' + p1 + '</section>' +
           '<section class="page">' + p2 + "</section>";
  }

  function unitCoverHTML(course, unit, ws) {
    var skills = [];
    ws.forEach(function (w) { (w.ican || []).forEach(function (s) { skills.push(s); }); });
    var vocabCount = ws.reduce(function (a, w) { return a + w.vocab.length; }, 0);
    return '<section class="page cover"><div class="covertag">' + esc(course.toUpperCase()) + '</div>' +
      '<h1>Unit ' + esc(unit) + '</h1>' +
      '<div class="coversub">' + ws.length + ' warm-ups &middot; ' + vocabCount + ' vocabulary terms</div>' +
      '<div class="coverbox"><div class="cbh">By the end of this unit, I can…</div><ul>' +
      uniq(skills).map(function (s) { return "<li>☐ " + esc(s) + "</li>"; }).join("") +
      '</ul></div>' +
      '<div class="coverbox"><div class="cbh">How to use these pages</div>' +
      '<p>Each warm-up is two pages. Page 1 is the header, the <b>START HERE</b> strip (A–E), and Vocabulary. ' +
      'Page 2 is <b>Part 1</b> (everyone) and <b>Part 2</b> (keep going if you finish early). ' +
      'Mark your own or a partner’s work — it does not count against you.</p></div></section>';
  }

  function unitHTML(rows, course, unit, opts) {
    var pages = warmPages(rows, course, unit);
    var ws = pages.map(function (p) { return warmupFromRows(pageRows(rows, course, unit, p)); });
    return unitCoverHTML(course, unit, ws) + ws.map(function (w) { return warmupHTML(w, opts); }).join("");
  }

  function scopeHTML(rows, sel, opts) {
    sel = sel || {}; var scope = sel.scope || "unit";
    if (scope === "warmup") {
      var w = warmupFromRows(pageRows(rows, sel.course, sel.unit, sel.page));
      return warmupHTML(w, opts);
    }
    if (scope === "course") {
      return units(rows, sel.course).map(function (u) { return unitHTML(rows, sel.course, u, opts); }).join("");
    }
    return unitHTML(rows, sel.course, sel.unit, opts);
  }

  /* small nav model for editor/site pickers */
  function warmupCardsHTML(rows, course, unit) {
    return warmPages(rows, course, unit).map(function (p) {
      var w = warmupFromRows(pageRows(rows, course, unit, p));
      return '<button class="wcard" data-page="' + esc(p) + '"><b>Warm-up ' + esc(w.no) + "</b><span>" + esc(w.topic) + "</span></button>";
    }).join("");
  }

  /* print/preview CSS shared by every HTML surface. opts.lineH etc. */
  function styleCSS() {
    return [
"*{box-sizing:border-box}",
":root{--line-h:30px;--fs:13pt;--ink:#111;--rule:#111;--shade:#eee;--accent:#1f3a5f;--fig-max:230px}",
"body{margin:0;background:#f4f4f6;font-family:'Segoe UI',Arial,sans-serif;color:var(--ink)}",
".page{background:#fff;width:8.5in;min-height:11in;margin:16px auto;padding:0.6in 0.7in;box-shadow:0 1px 6px rgba(0,0,0,.15);page-break-after:always;font-size:var(--fs)}",
".hdr{width:100%;border-collapse:collapse;margin-bottom:6px}",
".hdr td{border:1px solid var(--rule);padding:6px 6px 16px;font-size:10pt;vertical-align:top}",
".titlebar{background:var(--accent);color:#fff;padding:7px 10px;font-weight:600;border-radius:2px}",
".wno{font-weight:800}",
".striphead{font-weight:800;letter-spacing:.06em;margin:12px 0 3px;font-size:10pt}",
".strip{width:100%;border-collapse:collapse}",
".strip td{border:1px solid var(--rule);padding:6px 8px;font-size:10.5pt;vertical-align:top}",
".strip .sL{width:20px;text-align:center;font-weight:800;background:var(--shade)}",
".seclabel{font-weight:700;margin:14px 0 4px;border-bottom:2px solid var(--accent);padding-bottom:2px}",
".part2bar{background:var(--shade);border-left:4px solid var(--accent);padding:5px 8px;font-weight:700;margin:14px 0 6px}",
".part2bar em{font-weight:400;color:#444}",
".prompt{margin:8px 0}.ptext{margin-bottom:4px}",
".vocab{margin:6px 0}.vocab .term{font-weight:700}",
".ilabel{font-weight:700;margin:8px 0 2px}",
".wl{margin:3px 0}",
".wline{border-bottom:1px solid #9aa;height:var(--line-h)}",
".code{background:#f5f5f5;border:1px solid #ccc;border-left:4px solid #888;padding:8px 10px;font-family:Consolas,monospace;font-size:11pt;white-space:pre-wrap;border-radius:2px}",
".fig{max-width:var(--fig-max);margin:8px 0}.fig svg{display:block;width:100%;height:auto}",
".cover h1{font-size:34pt;margin:.2in 0 0}.covertag{color:var(--accent);font-weight:800;letter-spacing:.12em}",
".coversub{color:#555;margin-bottom:.25in}",
".coverbox{border:1px solid var(--rule);padding:10px 14px;margin:12px 0}.cbh{font-weight:800;margin-bottom:4px}",
".coverbox ul{margin:4px 0;padding-left:18px}.coverbox li{margin:3px 0}",
".wcard{display:block;width:100%;text-align:left;border:1px solid #ccd;background:#fff;padding:8px 10px;margin:4px 0;border-radius:4px;cursor:pointer}",
".wcard b{display:block}.wcard span{color:#666;font-size:12px}",
"@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}.noprint{display:none!important}}"
    ].join("\n");
  }

  var API = {
    COLS: COLS, parseCSV: parseCSV, toCSV: toCSV, esc: esc,
    courses: courses, units: units, warmPages: warmPages, pageRows: pageRows,
    warmupFromRows: warmupFromRows, rowsFromWarmup: rowsFromWarmup, blankWarmup: blankWarmup,
    stripItems: stripItems, parseFigure: parseFigure, starPoints: starPoints,
    figureSVG: figureSVG, drawFigure: drawFigure, figureSpecs: figureSpecs,
    warmupHTML: warmupHTML, unitHTML: unitHTML, scopeHTML: scopeHTML,
    warmupCardsHTML: warmupCardsHTML, unitCoverHTML: unitCoverHTML, styleCSS: styleCSS,
    hintN: hintN, hintW: hintW
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.L = API;
  if (typeof globalThis !== "undefined" && !globalThis.L) globalThis.L = API;
})();
