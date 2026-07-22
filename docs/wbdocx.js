/* wbdocx.js — build a Word .docx from rows, client-side, using the vendored
 * `docx` IIFE (browser) or `require('docx')` (Node test). Mirrors generate.py's
 * two-pages-per-warm-up layout. Figures come pre-rasterized in `figMap`
 * (spec -> PNG bytes at ~1500px) so Word scales them down crisply.
 *
 *   buildDoc(rows, { course, unit, page, scope, figMap, options }) -> docx.Document
 *   figKeysForScope(rows, sel) -> [spec, ...]   // which figures to rasterize
 *
 * Browser: docx.Packer.toBlob(doc). Node: docx.Packer.toBuffer(doc).
 */
(function () {
  "use strict";
  var D = (typeof window !== "undefined" && window.docx) ? window.docx
        : (typeof globalThis !== "undefined" && globalThis.docx) ? globalThis.docx
        : (typeof require !== "undefined") ? require("docx") : null;
  var L = (typeof window !== "undefined" && window.L) ? window.L
        : (typeof require !== "undefined") ? require("./wblib.js")
        : (typeof globalThis !== "undefined" ? globalThis.L : null);

  var THEME = {
    accent: "1F3A5F", shade: "EEEEEE", line: "99AABB",
    codeBg: "F5F5F5", codeBorder: "888888", cover: "1F3A5F",
    base: 24, small: 18, strip: 20, title: 26,  // half-points
    lineTwips: 440                               // 22pt writing-line height
  };

  function b64ToBytes(b64) {
    if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64");
    var bin = atob(b64), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function figBytes(entry) {
    if (!entry) return null;
    if (entry.bytes) return entry.bytes;
    if (entry.data instanceof Uint8Array) return entry.data;
    if (typeof entry.data === "string") return b64ToBytes(entry.data.replace(/^data:[^,]+,/, ""));
    if (entry instanceof Uint8Array) return entry;
    if (typeof entry === "string") return b64ToBytes(entry.replace(/^data:[^,]+,/, ""));
    return null;
  }

  var P = D.Paragraph, T = D.TextRun, Tbl = D.Table, Row = D.TableRow, Cell = D.TableCell,
      WT = D.WidthType, BS = D.BorderStyle, AL = D.AlignmentType, IMG = D.ImageRun,
      PB = D.PageBreak, ST = D.ShadingType, VA = D.VerticalAlign, LR = D.LineRuleType;

  function run(text, o) {
    o = o || {};
    return new T({ text: text, bold: !!o.bold, color: o.color, size: o.size || THEME.base,
      font: o.mono ? "Consolas" : "Calibri", break: o.break });
  }
  function para(children, o) {
    o = o || {};
    var spec = { children: children || [], spacing: { before: o.before || 0, after: o.after == null ? 0 : o.after } };
    if (o.lineTwips) { spec.spacing.line = o.lineTwips; spec.spacing.lineRule = LR.EXACT; }
    if (o.shade) spec.shading = { type: ST.CLEAR, fill: o.shade };
    if (o.bottom) spec.border = { bottom: { style: BS.SINGLE, size: o.bottomSz || 6, color: o.bottomColor || "000000", space: 1 } };
    if (o.allBorder) { var b = { style: BS.SINGLE, size: 4, color: o.allBorder, space: 2 };
      spec.border = { top: b, bottom: b, left: b, right: b }; }
    if (o.pageBreakBefore) spec.pageBreakBefore = true;
    if (o.align) spec.alignment = o.align;
    if (o.bullet) spec.bullet = { level: 0 };
    return new P(spec);
  }
  function writingLines(n, opt) {
    var out = [], tw = (opt && opt.lineTwips) || THEME.lineTwips;
    for (var i = 0; i < (parseInt(n, 10) || 0); i++)
      out.push(para([run(" ")], { lineTwips: tw, bottom: true, bottomColor: THEME.line, bottomSz: 6 }));
    return out;
  }
  function cell(children, o) {
    o = o || {};
    var spec = { children: children, verticalAlign: VA.TOP };
    if (o.wpct) spec.width = { size: o.wpct, type: WT.PERCENTAGE };
    if (o.shade) spec.shading = { fill: o.shade };
    return new Cell(spec);
  }
  function fullTable(rows) {
    return new Tbl({ width: { size: 100, type: WT.PERCENTAGE }, rows: rows });
  }

  function hintN(hint, d) { var m = /n\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : d; }
  function hintW(hint, d) { var m = /w\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : d; }

  /* --------- page pieces (mirror generate.py) --------- */
  function headerBlock(w) {
    function hc(txt, pct) { return cell([para([run(txt, { size: THEME.small })], { after: 200 })], { wpct: pct }); }
    var t = fullTable([
      new Row({ children: [hc("Name", 52), hc("Date", 28), hc("Period", 20)] }),
      new Row({ children: [hc("Partner", 52), hc("Points ___ / ___", 28), hc("Marked by", 20)] })
    ]);
    var title = para(
      [run("Warm-up " + w.no + " ", { bold: true, color: "FFFFFF", size: THEME.title }),
       run(" \u2014  " + w.topic, { color: "FFFFFF", size: THEME.title })],
      { before: 40, after: 120, shade: THEME.accent });
    return [t, title];
  }

  function stripBlock(w) {
    var its = L.stripItems(w), rows = its.map(function (x) {
      var letterCell = cell([para([run(x.L, { bold: true, size: THEME.strip })], { align: AL.CENTER })],
        { wpct: 5, shade: THEME.shade });
      var kids, right;
      if (x.kind === "pace")
        right = x.text + "   " + x.opts.map(function (o) { return "( ) " + o; }).join("    ");
      else if (x.kind === "ican")
        right = "\u2610 got it   \u2610 shaky   \u2610 not yet    " + x.text;
      else right = x.text;
      kids = [para([run(right, { size: THEME.strip })], { after: (x.kind === "reflect" || x.kind === "sel") ? 20 : 0 })];
      if (x.kind === "reflect" || x.kind === "sel")
        kids.push(para([run(" ")], { lineTwips: THEME.lineTwips, bottom: true, bottomColor: THEME.line, bottomSz: 6 }));
      return new Row({ children: [letterCell, cell(kids, { wpct: 95 })] });
    });
    return [para([run("START HERE", { bold: true, size: THEME.strip })], { before: 160, after: 40 }), fullTable(rows)];
  }

  function sectionLabel(text) {
    return para([run(text, { bold: true, size: THEME.base })],
      { before: 200, after: 60, bottom: true, bottomColor: THEME.accent, bottomSz: 12 });
  }
  function part2Bar() {
    return para([run("PART 2 ", { bold: true, size: THEME.base }),
                 run("\u2014 keep going if you finish early.", { color: "444444", size: THEME.base })],
      { before: 200, after: 80, shade: THEME.shade });
  }
  function codeBox(text) {
    var lines = String(text).split("\n"), kids = [];
    lines.forEach(function (ln, i) { kids.push(run(ln, { mono: true, size: 22, break: i ? 1 : 0 })); });
    return para(kids, { before: 80, after: 80, shade: THEME.codeBg, allBorder: THEME.codeBorder });
  }
  function figurePara(spec, wpx, figMap) {
    var bytes = figBytes(figMap && figMap[spec]);
    if (!bytes) return para([run("[figure: " + spec + "]", { color: "888888", size: THEME.small })]);
    return para([new IMG({ data: bytes, type: "png", transformation: { width: wpx, height: wpx } })],
      { before: 80, after: 80 });
  }

  function itemParas(it, figMap) {
    var t = it.type;
    if (t === "figure") return [figurePara(it.figure || "grid", hintW(it.hint, 230), figMap)];
    if (t === "code") return [codeBox(it.content)];
    if (t === "label") return [para([run(it.content, { bold: true, size: THEME.base })], { before: 120, after: 40 })];
    if (t === "lines") return writingLines(hintN(it.hint, 3));
    if (t === "vocab") return [para([run(it.content, { bold: true, size: THEME.base })], { before: 80, after: 40 })]
      .concat(writingLines(hintN(it.hint, 2)));
    var n = hintN(it.hint, 2);
    return [para([run(it.content, { size: THEME.base })], { before: 80, after: 40 })].concat(n > 0 ? writingLines(n) : []);
  }

  function warmupParas(w, figMap) {
    var out = [];
    headerBlock(w).forEach(function (x) { out.push(x); });
    stripBlock(w).forEach(function (x) { out.push(x); });
    out.push(sectionLabel("Vocabulary \u2014 write each in your own words"));
    w.vocab.forEach(function (it) { itemParas(it, figMap).forEach(function (p) { out.push(p); }); });
    out.push(para([new PB()]));                         // -> page 2
    out.push(sectionLabel("Part 1 \u2014 core work"));
    w.part1.forEach(function (it) { itemParas(it, figMap).forEach(function (p) { out.push(p); }); });
    out.push(part2Bar());
    w.part2.forEach(function (it) { itemParas(it, figMap).forEach(function (p) { out.push(p); }); });
    return out;
  }

  function coverParas(course, unit, ws) {
    var out = [
      para([run(course.toUpperCase(), { bold: true, color: THEME.cover, size: 24 })], { after: 40 }),
      para([run("Unit " + unit, { bold: true, size: 68 })], { after: 40 }),
      para([run(ws.length + " warm-ups  \u00b7  " +
        ws.reduce(function (a, w) { return a + w.vocab.length; }, 0) + " vocabulary terms",
        { color: "555555", size: 24 })], { after: 240 }),
      para([run("By the end of this unit, I can\u2026", { bold: true, size: THEME.base })], { before: 120, after: 40 })
    ];
    var seen = {};
    ws.forEach(function (w) {
      (w.ican || []).forEach(function (s) { if (s && !seen[s]) { seen[s] = 1;
        out.push(para([run("\u2610 " + s, { size: 22 })], { bullet: true, after: 20 })); } });
    });
    out.push(para([run("How to use these pages", { bold: true, size: THEME.base })], { before: 240, after: 40 }));
    out.push(para([run("Each warm-up is two pages. Page 1 is the header, the START HERE strip (A\u2013E), and " +
      "Vocabulary. Page 2 is Part 1 (everyone) and Part 2 (keep going if you finish early). " +
      "Mark your own or a partner\u2019s work \u2014 it does not count against you.", { size: 22 })], { after: 40 }));
    return out;
  }

  function unitParas(rows, course, unit, figMap) {
    var pages = L.warmPages(rows, course, unit);
    var ws = pages.map(function (p) { return L.warmupFromRows(L.pageRows(rows, course, unit, p)); });
    var out = coverParas(course, unit, ws);
    ws.forEach(function (w) { out.push(para([new PB()])); warmupParas(w, figMap).forEach(function (p) { out.push(p); }); });
    return out;
  }

  function figKeysForScope(rows, sel) {
    sel = sel || {};
    var subset;
    if (sel.scope === "warmup") subset = L.pageRows(rows, sel.course, sel.unit, sel.page);
    else if (sel.scope === "course") subset = rows.filter(function (r) { return (r.course || "cs1") === sel.course; });
    else subset = rows.filter(function (r) { return (r.course || "cs1") === sel.course && String(r.unit) === String(sel.unit); });
    return L.figureSpecs(subset);
  }

  function buildDoc(rows, cfg) {
    cfg = cfg || {}; var figMap = cfg.figMap || {};
    if (cfg.options && cfg.options.lineHeightPt) THEME.lineTwips = Math.round(cfg.options.lineHeightPt * 20);
    var scope = cfg.scope || "unit", body;
    if (scope === "warmup") {
      body = warmupParas(L.warmupFromRows(L.pageRows(rows, cfg.course, cfg.unit, cfg.page)), figMap);
    } else if (scope === "course") {
      body = []; var first = true;
      L.units(rows, cfg.course).forEach(function (u) {
        if (!first) body.push(para([new PB()])); first = false;
        unitParas(rows, cfg.course, u, figMap).forEach(function (p) { body.push(p); });
      });
    } else {
      body = unitParas(rows, cfg.course, cfg.unit, figMap);
    }
    return new D.Document({
      styles: { default: { document: { run: { font: "Calibri", size: THEME.base } } } },
      sections: [{
        properties: { page: { margin: { top: 792, bottom: 792, left: 1008, right: 1008 } } },
        children: body
      }]
    });
  }

  var API = { buildDoc: buildDoc, figKeysForScope: figKeysForScope, THEME: THEME };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.WBDOCX = API;
})();
