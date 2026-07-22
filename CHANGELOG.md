# Changelog

Notable changes to the workbook generator, one entry per implementation
session (see the CS0 prep notes for full session scope and ground rules).
Newest first.

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
