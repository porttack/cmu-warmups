# Changelog

Notable changes to the workbook generator, one entry per implementation
session (see the CS0 prep notes for full session scope and ground rules).
Newest first.

## 2026-07-22 — Session 7: page modes on the Build & download tool

- Added a **Page mode** control to `workbook-site.html`: **Always 2 pages**
  (the existing fixed header+vocab / Part 1+Part 2 split, still the
  default), **Even** (content-based pagination, rounded up to an even page
  count per warm-up and per unit/course cover — useful for duplex binders
  where every warm-up should start on a sheet front), and **Any number**
  (content-based, odd counts allowed, fewest pages).
- Content-based modes pack `docs/wblib.js`'s new `warmupBlocks()` output
  (an ordered list of atomic problem/section blocks, with no forced section
  breaks — only a whole warm-up is guaranteed to start a fresh page) into
  fixed-size page boxes by measuring real rendered height in a hidden DOM
  element, so the current writing-line height, text size, and figure width
  are automatically honored. `itemsHTML` is now a thin wrapper over the new
  `itemsBlocks`, so output for the existing renderers is unchanged.
- Even mode pads with a fill page: two blank grid figures
  (`L.fillGridsHTML()`) plus writing lines, with the line count measured to
  fill the remaining space at the current writing-line height.
- The `.docx` export (`docs/wbdocx.js`) mirrors the same modes: Always-2
  keeps its forced page break after vocabulary; Even/Any let Part 1/Part 2
  flow without a forced break. Even-mode padding in the `.docx` reuses the
  browser's measured odd/even page counts per warm-up, with a heuristic
  writing-line count for the fill page (Word repaginates on its own, so
  this is best-effort, not exact).
- Scope: the browser "Build & download" tool only. The offline
  `toolchain/generate.py` CLI, warm-up editor, and live-preview pages are
  unchanged.

## 2026-07-22 — Session 6: `match` item type

- Added `match`: a two-column matching exercise. `content` is one pair per
  line, left and right separated by `::`. Renders as two columns — left
  terms bold, right meanings in body font — with a blank gutter column
  between them and each row tall enough (the writing-line height token) to
  draw a line across. Never shuffled at render time: authors pre-scramble
  the right column themselves so the printed layout stays stable.
- Mirrored across all three renderers, sharing the pair-parsing logic
  (`matchPairs`) between `docs/wblib.js` and `docs/wbdocx.js`, and an
  independent Python mirror (`match_pairs`) in `toolchain/generate.py`. The
  Word builders lay it out as a borderless three-column table (term / gutter
  / meaning) so the gutter can't collapse to zero width.
- Added `match` to the warm-up editor's type list — a plain textarea holds
  the `::`-separated content, no dedicated grid UI.
- Added a `csN-demo` page (unit 1, `w25`) demonstrating a matching exercise.

## 2026-07-22 — Session 5: Figure text labels and side-by-side figures

- Extended figure specs with `text x,y,LABEL`: draws `LABEL` at canvas
  coordinates in a small bold sans face. `_` stands for spaces inside the
  label, since shapes are whitespace-tokenised. Mirrored across all three
  figure renderers (`figureSVG`, `drawFigure`, and `figrender.py`'s Pillow
  path).
- Added a `cols=N` figure hint: consecutive `figure` items that all carry
  the same `cols=N` render side by side instead of stacking — a flex row in
  HTML, a single borderless N-column table in both Word builders.
- `toolchain/generate.py`'s `hint_n`/`hint_w`/`hint_h` parsing assumed
  `;`-separated, space-free hint tokens; a combined hint like
  `w=230 cols=2` silently failed to parse. Switched to the same
  regex-search approach `wblib.js`/`wbdocx.js` already used, which reads
  correctly regardless of separator or spacing.
- Updated the warm-up editor's figure fields with tooltips documenting
  `cols=` and `text`, since both ride in the existing hint/figure free-text
  inputs rather than needing new UI.
- Added a `csN-demo` page (unit 1, `w24`) demonstrating a labelled dot and
  two grids side by side. Hand-appended to `content.csv` rather than
  regenerated from `toolchain/build_content.js`, since that script's
  `demoWarmups` list had already fallen behind `content.csv` (`w21`–`w23`
  were added directly to the CSV in prior sessions) — regenerating from it
  would have silently dropped those pages. Added a matching `DEMO(24, ...)`
  block to `build_content.js` anyway so the rows it would produce are
  documented and match what's committed, byte for byte.

## 2026-07-22 — Session 4: `table` item type

- Added `table`: a bordered trace/data table. `content` is rows separated by
  a newline, cells separated by `|`. The first row is a header (shaded with
  the design token used elsewhere for shading) unless `hint` contains
  `head=0`. Empty cells render blank and tall enough to write in; `hint` may
  also carry `h=NN` for cell height in px, defaulting to the writing-line
  height already used elsewhere. Cell text supports the same inline markdown
  as `p`/`label`/`vocab`/`note`.
- Mirrored across all three renderers, sharing the row/cell parsing logic
  (`tableRows`/`hintH`/`hintNoHead`) between `docs/wblib.js` and
  `docs/wbdocx.js` so the two never drift; `toolchain/generate.py` mirrors the
  same parsing independently in Python.
- Added `table` to the warm-up editor's type list — a plain textarea holds
  the pipe/newline content, no dedicated grid UI.
- Added a `csN-demo` page (unit 1, `w23`) demonstrating a trace table for
  `b.centerX` across four steps.

## 2026-07-22 — Session 3: `error` and `note` item types

- Added `error`: a monospace, shaded callout for Python error messages,
  automatically prefixed with a bold "Python says:" label. `content` is the
  raw message text, one or more lines.
- Added `note`: a bordered callout box in the normal body font, with
  inline markdown enabled (same `**bold**`, `*italic*`, `` `code` `` as `p`,
  `label`, and `vocab`). Distinct from `label`, which stays bold inline text
  with no box.
- Unrecognised types still fall through to the plain-prompt renderer.
  Retired the `csN-demo` row (unit 1, `w4`) that used `note` to demonstrate
  that fallback, since `note` is now a real type — it demonstrates the same
  thing with `mystery` instead.
- Mirrored across all three renderers and added both types to the
  warm-up editor's type list.
- Added a `csN-demo` page (unit 1, `w22`) demonstrating both types, including
  a multi-line `code` block. Documented in the README that multi-line
  `content` cells use a literal embedded newline inside the quoted CSV field,
  not a `\n` escape sequence.

## 2026-07-22 — Session 2: Markdown inline formatting

- `content` cells in `p`, `label`, and `vocab` rows now support inline
  `**bold**`, `*italic*`, and `` `code` `` — no headings, lists, or links.
  Text is escaped before markdown is applied, so raw `<`, `&`, and `"` stay
  safe.
- `code` rows are unaffected — markdown characters in real program text are
  never processed, so asterisks and backticks in code survive untouched.
- Mirrored across all three renderers: `docs/wblib.js` (HTML), `docs/wbdocx.js`
  (browser Word builder), and `toolchain/generate.py` (Python Word builder).
- Added a `csN-demo` page (unit 1, `w21`) demonstrating the new formatting.

## 2026-07-22 — Session 1: csN-demo showcase course

- Added the `csN-demo` course: one warm-up per feature, showing every row
  type, hint, and figure option the format supports. Doubles as living
  documentation for anyone forking the repo.
