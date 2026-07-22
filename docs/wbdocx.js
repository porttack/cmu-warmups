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
    accent: "1F3A5F", shade: "EEEEEE", line: "99AABB", rule: "111111",
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
    return new T({ text: text, bold: !!o.bold, italics: !!o.italics, color: o.color, size: o.size || THEME.base,
      font: o.mono ? "Consolas" : "Calibri", break: o.break });
  }

  /* Inline markdown -> run specs: **bold**, *italic*, `code`. Mirrors mdInline()
   * in wblib.js, but produces TextRuns instead of escaped HTML. */
  function mdRuns(s, base) {
    base = base || {};
    var out = [], re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g, last = 0, m;
    s = String(s == null ? "" : s);
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(run(s.slice(last, m.index), base));
      var tok = m[0];
      if (tok.slice(0, 2) === "**") out.push(run(tok.slice(2, -2), Object.assign({}, base, { bold: true })));
      else if (tok[0] === "*")      out.push(run(tok.slice(1, -1), Object.assign({}, base, { italics: true })));
      else                          out.push(run(tok.slice(1, -1), Object.assign({}, base, { mono: true })));
      last = re.lastIndex;
    }
    if (last < s.length) out.push(run(s.slice(last), base));
    if (!out.length) out.push(run(s, base));
    return out;
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
    if (o.tabs) spec.tabStops = o.tabs;
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
    var spec = { children: children, verticalAlign: o.vAlign || VA.TOP };
    if (o.wpct) spec.width = { size: o.wpct, type: WT.PERCENTAGE };
    if (o.shade) spec.shading = { fill: o.shade };
    return new Cell(spec);
  }
  function fullTable(rows) {
    return new Tbl({ width: { size: 100, type: WT.PERCENTAGE }, rows: rows });
  }
  function borderlessTable(rows) {
    var none = { style: BS.NONE, size: 0, color: "FFFFFF" };
    return new Tbl({ width: { size: 100, type: WT.PERCENTAGE }, rows: rows,
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } });
  }

  function hintN(hint, d) { var m = /n\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : d; }
  function hintW(hint, d) { var m = /w\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : d; }
  function hintH(hint, d) { var m = /h\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : d; }
  function hintCols(hint) { var m = /cols\s*=\s*(\d+)/.exec(hint || ""); return m ? +m[1] : null; }

  /* --------- page pieces (mirror generate.py) --------- */
  function headerBlock(w) {
    // Label bottom-aligned with writing room above it (space before, not after).
    function hc(txt, pct) {
      return cell([para([run(txt, { size: THEME.small })], { before: 300 })], { wpct: pct, vAlign: VA.BOTTOM });
    }
    var t = fullTable([
      new Row({ children: [hc("Name", 52), hc("Date", 28), hc("Period", 20)] }),
      new Row({ children: [hc("Partner", 52), hc("Points ___ / ___", 28), hc("Marked by:  ☐ me   ☐ partner", 20)] })
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
      var kids;
      if (x.kind === "pace" || x.kind === "ican") {
        // label left, circle-one options flushed right via a right tab stop
        var opts = (x.kind === "pace") ? x.opts.join("    ") : "got it    shaky    not yet";
        kids = [para([run(x.text, { size: THEME.strip }),
                      new T({ children: [new D.Tab()], size: THEME.strip }),
                      run(opts, { size: THEME.strip })],
                     { tabs: [{ type: D.TabStopType.RIGHT, position: 9360 }] })];
      } else {
        kids = [para([run(x.text, { size: THEME.strip })], { after: (x.kind === "reflect" || x.kind === "sel") ? 20 : 0 })];
        if (x.kind === "reflect" || x.kind === "sel")
          kids.push(para([run(" ")], { lineTwips: THEME.lineTwips, bottom: true, bottomColor: THEME.line, bottomSz: 6 }));
      }
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
  function errorBox(text) {
    var lines = String(text == null ? "" : text).split("\n");
    var kids = [run("Python says: ", { bold: true, mono: true, size: 22 })];
    lines.forEach(function (ln, i) { kids.push(run(ln, { mono: true, size: 22, break: i ? 1 : 0 })); });
    return para(kids, { before: 80, after: 80, shade: THEME.shade, allBorder: THEME.codeBorder });
  }
  function noteBox(text) {
    return para(mdRuns(text, { size: THEME.base }), { before: 80, after: 80, allBorder: THEME.rule });
  }
  function tableBlock(it) {
    var trows = L.tableRows(it.content);
    var noHead = L.hintNoHead(it.hint);
    var rowH = hintH(it.hint, null);
    var rowTwips = rowH ? Math.round(rowH * 15) : THEME.lineTwips;
    var rows = trows.map(function (cells, ri) {
      var isHead = !noHead && ri === 0;
      var tds = cells.map(function (c) {
        return cell([para(mdRuns(c, { size: THEME.base, bold: isHead }))],
          isHead ? { shade: THEME.shade } : {});
      });
      var opts = { children: tds };
      if (!isHead) opts.height = { value: rowTwips, rule: D.HeightRule.ATLEAST };
      return new Row(opts);
    });
    return fullTable(rows);
  }
  function matchBlock(it) {
    var mpairs = L.matchPairs(it.content);
    var rows = mpairs.map(function (p) {
      var tds = [
        cell([para(mdRuns(p[0], { bold: true, size: THEME.base }))], { wpct: 38 }),
        cell([para([])], { wpct: 20 }),
        cell([para(mdRuns(p[1], { size: THEME.base }))], { wpct: 42 })
      ];
      return new Row({ children: tds, height: { value: THEME.lineTwips, rule: D.HeightRule.ATLEAST } });
    });
    return borderlessTable(rows);
  }
  function figurePara(spec, wpx, figMap) {
    var bytes = figBytes(figMap && figMap[spec]);
    if (!bytes) return para([run("[figure: " + spec + "]", { color: "888888", size: THEME.small })]);
    return para([new IMG({ data: bytes, type: "png", transformation: { width: wpx, height: wpx } })],
      { before: 80, after: 80 });
  }

  /* Consecutive figure items sharing the same cols=N hint sit side by side in
   * a single borderless N-column table instead of stacking. */
  function figureRowsTable(items, cols, figMap) {
    var pct = Math.floor(100 / cols), rows = [];
    for (var i = 0; i < items.length; i += cols) {
      var chunk = items.slice(i, i + cols), tds = [];
      for (var c = 0; c < cols; c++) {
        var it = chunk[c];
        tds.push(cell(it ? [figurePara(it.figure || "grid", hintW(it.hint, 230), figMap)] : [para([])], { wpct: pct }));
      }
      rows.push(new Row({ children: tds }));
    }
    return borderlessTable(rows);
  }

  function itemParas(it, figMap) {
    var t = it.type;
    if (t === "figure") return [figurePara(it.figure || "grid", hintW(it.hint, 230), figMap)];
    if (t === "code") return [codeBox(it.content)];
    if (t === "error") return [errorBox(it.content)];
    if (t === "note") return [noteBox(it.content)];
    if (t === "table") return [tableBlock(it)];
    if (t === "match") return [matchBlock(it)];
    if (t === "label") return [para(mdRuns(it.content, { bold: true, size: THEME.base }), { before: 120, after: 40 })];
    if (t === "lines") return writingLines(hintN(it.hint, 3));
    if (t === "vocab") return [para(mdRuns(it.content, { bold: true, size: THEME.base }), { before: 80, after: 40 })]
      .concat(writingLines(hintN(it.hint, 2)));
    var n = hintN(it.hint, 2);
    return [para(mdRuns(it.content, { size: THEME.base }), { before: 80, after: 40 })].concat(n > 0 ? writingLines(n) : []);
  }

  /* Render a list of items, grouping consecutive figures that share the same
   * cols=N hint into one side-by-side table instead of stacking them. */
  function sectionParas(items, figMap) {
    var out = [], i = 0;
    while (i < items.length) {
      var it = items[i], c = it.type === "figure" ? hintCols(it.hint) : null;
      if (c && c >= 2) {
        var run = [it], j = i + 1;
        while (j < items.length && items[j].type === "figure" && hintCols(items[j].hint) === c) { run.push(items[j]); j++; }
        out.push(figureRowsTable(run, c, figMap));
        i = j;
      } else {
        itemParas(it, figMap).forEach(function (p) { out.push(p); });
        i++;
      }
    }
    return out;
  }

  /* A blank-grids-then-writing-lines fill page, used to pad an odd page
   * count to even (Even page mode). Word can't be measured ahead of time
   * like the browser preview, so the writing-line count is a heuristic
   * estimate of how many lines fit below the grids at the current
   * writing-line height \u2014 best-effort, not exact. */
  function fillPageParas(figMap) {
    var out = [para([new PB()])];
    out.push(figureRowsTable([{ figure: "grid", hint: "w=260" }, { figure: "grid", hint: "w=260" }], 2, figMap));
    var gridTwips = Math.round(Math.min(6.5, 260 / 96) * 1440) + 160;
    var pageContentTwips = 11 * 1440 - 2 * 792; // matches buildDoc's page.margin.top/bottom
    var n = Math.max(4, Math.floor(Math.max(0, pageContentTwips - gridTwips) / THEME.lineTwips));
    return out.concat(writingLines(n));
  }

  function warmupParas(w, figMap, opts) {
    opts = opts || {};
    var pageMode = opts.pageMode || "2";
    var out = [];
    headerBlock(w).forEach(function (x) { out.push(x); });
    stripBlock(w).forEach(function (x) { out.push(x); });
    var vocab = w.vocab || [];
    if (vocab.length) {                                 // no vocab rows -> no heading, no gap
      out.push(sectionLabel("Vocabulary \u2014 write each in your own words"));
      sectionParas(vocab, figMap).forEach(function (p) { out.push(p); });
    }
    if (pageMode === "2") out.push(para([new PB()]));    // -> page 2 (fixed split)
    // "even"/"any": no forced break here \u2014 Part 1/Part 2 flow continuously,
    // may straddle a page on their own; only individual items stay atomic.
    out.push(sectionLabel("Part 1 \u2014 core work"));
    sectionParas(w.part1, figMap).forEach(function (p) { out.push(p); });
    out.push(part2Bar());
    sectionParas(w.part2, figMap).forEach(function (p) { out.push(p); });
    if (opts.pad) fillPageParas(figMap).forEach(function (p) { out.push(p); });
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

  function unitParas(rows, course, unit, figMap, cfg) {
    cfg = cfg || {};
    var pages = L.warmPages(rows, course, unit);
    var ws = pages.map(function (p) { return L.warmupFromRows(L.pageRows(rows, course, unit, p)); });
    var out = coverParas(course, unit, ws);
    if (cfg.pageMode === "even") fillPageParas(figMap).forEach(function (p) { out.push(p); }); // cover is always 1 page
    ws.forEach(function (w) {
      out.push(para([new PB()]));
      var key = course + "|" + unit + "|" + w.page;
      var pad = cfg.pageMode === "even" && !!(cfg.padPages && cfg.padPages[key]);
      warmupParas(w, figMap, { pageMode: cfg.pageMode, pad: pad }).forEach(function (p) { out.push(p); });
    });
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
    var pageMode = cfg.pageMode || "2", padPages = cfg.padPages || {};
    if (scope === "warmup") {
      var w = L.warmupFromRows(L.pageRows(rows, cfg.course, cfg.unit, cfg.page));
      var key = cfg.course + "|" + cfg.unit + "|" + w.page;
      body = warmupParas(w, figMap, { pageMode: pageMode, pad: pageMode === "even" && !!padPages[key] });
    } else if (scope === "course") {
      body = []; var first = true;
      L.units(rows, cfg.course).forEach(function (u) {
        if (!first) body.push(para([new PB()])); first = false;
        unitParas(rows, cfg.course, u, figMap, { pageMode: pageMode, padPages: padPages }).forEach(function (p) { body.push(p); });
      });
    } else {
      body = unitParas(rows, cfg.course, cfg.unit, figMap, { pageMode: pageMode, padPages: padPages });
    }
    return new D.Document({
      styles: { default: { document: { run: { font: "Calibri", size: THEME.base } } } },
      sections: [{
        properties: { page: { margin: { top: 792, bottom: 792, left: 1008, right: 1008 } } },
        children: body
      }]
    });
  }

  var API = { buildDoc: buildDoc, figKeysForScope: figKeysForScope, THEME: THEME, mdRuns: mdRuns };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.WBDOCX = API;
})();
