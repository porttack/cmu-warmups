# Changelog

Notable changes to the workbook generator, one entry per implementation
session (see the CS0 prep notes for full session scope and ground rules).
Newest first.

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
