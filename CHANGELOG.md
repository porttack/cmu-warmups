# Changelog

Notable changes to the workbook generator, one entry per implementation
session (see the CS0 prep notes for full session scope and ground rules).
Newest first.

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
