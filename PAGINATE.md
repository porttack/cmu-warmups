# Page modes — how they work, and what to check when they don't

This describes the **Page mode** control on the Build & download tool
(`docs/workbook-site.html`): **Always 2 pages**, **Even**, and **Any
number**. It's a maintainer/debugging reference, not user-facing — point
teachers at the README instead.

## The three modes, in one paragraph each

- **Always 2 pages** — the original, unchanged layout. `L.warmupHTML()` in
  `docs/wblib.js` always emits exactly two `<section class="page">`
  elements: page 1 is header + START HERE strip + vocabulary, page 2 is
  Part 1 + Part 2. No measurement happens. If content is unusually long it
  silently overflows past 11in in print, same as it always has.
- **Even** and **Any number** — content-based. Nothing is fixed ahead of
  time; instead the actual rendered height of the content is measured in
  the browser and packed into as many (Any) or an even number of (Even)
  fixed-size pages as it takes.

## How content-based pagination works

### 1. Blocks, not pages (`docs/wblib.js`)

`L.warmupBlocks(w)` turns a warm-up into an **ordered list of atomic
blocks** — `{ html, keepWithNext }`:

1. Header + START HERE strip (one block, always the first thing on a page).
2. If there's vocabulary: a "Vocabulary" section-label block
   (`keepWithNext: true`), then one block per vocab item.
3. A "Part 1" section-label block (`keepWithNext: true`), then one block
   per Part 1 item.
4. A "PART 2" bar block (`keepWithNext: true`), then one block per Part 2
   item.

There are **no forced section breaks** in this list — vocab, Part 1, and
Part 2 can straddle a page boundary. Only a single block (one prompt + its
writing lines, one figure/`figcols` group, one table, one match list, …) is
atomic and guaranteed to never be split across two pages. `keepWithNext` is
a soft hint, not a hard rule — see "Orphaned section labels" below.

`itemsBlocks()` is the block-returning version of the older `itemsHTML()`;
`itemsHTML()` is now just `itemsBlocks(items).join("")`, so every other
caller (the editor, live-preview, Always-2 mode) is byte-for-byte
unchanged.

### 2. Packing blocks into pages (`docs/workbook-site.html`)

`packBlocks(blocks)` is the actual packer. For each page, it:

1. Creates one hidden, off-screen `<section class="page">` with an inline
   `height:11in; overflow:hidden` override (the *only* place a `.page`
   element is ever height-clipped — real rendered pages stay
   `min-height:11in` so they can never silently eat content).
2. Appends blocks one at a time (`page.innerHTML = accumulated + nextBlock.html`)
   and checks `page.scrollHeight > page.clientHeight`. `scrollHeight`
   reports the *true* content height even under `overflow:hidden`, which is
   what makes this reliable across browsers — this is the standard "does my
   content overflow this box" trick.
3. Stops adding blocks to the current page the moment one doesn't fit, and
   starts a fresh page with that block.
4. If the last block placed on a page has `keepWithNext: true` (a section
   label with nothing following it on the same page), pulls it back onto
   the next page too, so a "Part 1" heading never sits alone at the bottom
   of a sheet.

Because this reuses the *live* `--line-h` / `--fs` / `--fig-max` CSS custom
properties already set by `applyOpts()`, changing the writing-line height,
text size, or figure width slider and re-rendering automatically repacks
pages to match — there's no separate height model to keep in sync.

**Even mode** additionally: if a warm-up's natural page count is odd,
`fillPageHTML()` appends one more page — two blank grid figures
(`L.fillGridsHTML()`) side by side, then as many writing lines as fit below
them (grown one at a time and measured the same way, so the line count
always honors the current writing-line height). The unit/course cover is
always exactly one page, so in Even mode it unconditionally gets one fill
page appended after it.

### 3. Mirroring it into `.docx` (`docs/wbdocx.js`)

Word has its own layout engine — nothing in the browser can predict where
*it* will break pages. So the `.docx` export mirrors the modes
**structurally** instead of by measurement:

- **Always 2**: unchanged — a hard page break (`new PB()`) between
  vocabulary and Part 1.
- **Any / Even**: that hard break is removed. Vocab → Part 1 → Part 2 flow
  continuously and Word paginates on its own.
- **Even**: `docs/workbook-site.html`'s DOCX handler calls
  `computeOddWarmups(sel, mode)`, which re-runs the *same* browser
  `packBlocks()` measurement used for the preview, and passes the resulting
  `{ "course|unit|page": true, ... }` map into `WBDOCX.buildDoc()` as
  `cfg.padPages`. Any warm-up flagged there gets a `fillPageParas()` fill
  page appended in the docx too. This is **best-effort** — it pads based on
  what the *browser* measured, not what Word will actually do, so it can
  drift on edge-case content.
- The docx fill page's writing-line count is a **heuristic**, not a
  measurement: `fillPageParas()` in `docs/wbdocx.js` estimates the leftover
  vertical space (`page height − margins − grid image height`) and divides
  by `THEME.lineTwips`. See "Docx fill page has the wrong number of lines"
  below to tune it.

## Where things live

| Concern | File | Key names |
|---|---|---|
| Block list for one warm-up | `docs/wblib.js` | `warmupBlocks`, `itemsBlocks`, `fillGridsHTML` |
| Browser measurement + packing | `docs/workbook-site.html` | `packBlocks`, `measurePageEl`, `overflows`, `fillPageHTML` |
| Per-warm-up / per-scope page assembly | `docs/workbook-site.html` | `warmupPagesHTML`, `renderPaged`, `computeOddWarmups` |
| Page-mode UI + wiring | `docs/workbook-site.html` | `#pagemode` select, `render()` |
| Docx structural mirroring | `docs/wbdocx.js` | `warmupParas`, `unitParas`, `buildDoc`, `fillPageParas` |
| Shared page CSS (screen + print) | `docs/wblib.js` | `styleCSS()` — `.page`, `@page` |

`toolchain/generate.py` (the offline CLI) and the warm-up editor /
live-preview pages are **out of scope** — they don't have page modes and
aren't expected to.

## Troubleshooting

### Pages look wrong at first render but fix themselves on re-render
Most likely a **web-font race**: `packBlocks()`/`fillPageHTML()` measure
`scrollHeight` as soon as the DOM updates, but if the page's font hasn't
finished loading yet, glyph metrics (and therefore wrap points and line
counts) can shift after the fact, invalidating an already-computed page
break. This body font here is a system stack (`'Segoe UI', Arial,
sans-serif` — no `@font-face`), so it shouldn't currently apply, but if a
webfont is ever added to `styleCSS()`, guard the first measurement with
`document.fonts.ready.then(render)`.

### A page is clearly overflowing past 11in when printed
This means a **single block** was taller than a full page's content area,
which `packBlocks()` deliberately allows (it never splits a block, and
always places at least one block per page even if that block alone
overflows) — and because real rendered `.page` elements use `min-height`,
not the clipped `height:11in overflow:hidden` used only during
measurement, an oversized block is visible rather than silently deleted.
Likely culprits: a `type=table` item with many rows, a long `code`/`error`
block, or a large `match` list. Fixes:
- Split the item into two smaller items (e.g. two shorter tables/prompts)
  in `content.csv` so each is independently a single block.
- Shrink it — lower a table's `h=NN` hint, shorten written content, reduce
  `hint=n=N` writing lines.
- If it happens often, consider raising `keepWithNext` to a real
  atomic-group concept for tables/labels rather than section labels only
  (would need a change to `warmupBlocks()`).

### Even mode isn't actually landing on even page counts
Check the two places page count is decided independently and make sure
they agree:
- Preview: `warmupPagesHTML(w, "even")` (pads based on `packBlocks(...).length`).
- Cover: `renderPaged()`'s `if (mode === "even") out += ... fillPageHTML() ...`
  block — this is *unconditional* per unit (the cover is always 1 page), so
  if a cover somehow isn't 1 page anymore (e.g. `unitCoverHTML()` grows —
  more `ican` skills than fit, a very long unit name), the "always pad by
  exactly one" assumption breaks. If `unitCoverHTML()` ever needs to grow
  past one page, this needs to become a measured pad (same trick as
  `fillPageHTML()`) instead of an unconditional one.

### The `.docx` page count doesn't match the PDF/preview page count
Expected in Any/Even mode — see "Mirroring it into `.docx`" above. This is
inherent (Word's layout engine ≠ the browser's), not a bug to chase to
zero. If it's drifting a *lot* (multiple pages off, not just a fill-page
edge case), suspect:
- The writing-line height sent to the docx builder
  (`options.lineHeightPt = +$("#lineh").value * 0.75`, the px→pt
  conversion) doesn't match what was measured in the browser at `--line-h`
  in px — double check that conversion if line-height behavior is ever
  changed.
- Figure width: the docx renderer scales figures via `hintW(...)/96` inches
  in `wbdocx.js`, the browser via the `--fig-max` CSS var in `wblib.js` —
  confirm both read the same slider value the same way.

### Docx fill page has the wrong number of lines
Tune the heuristic constants in `fillPageParas()` in `docs/wbdocx.js`:
`gridTwips` (estimated grid-image height + spacing), `pageContentTwips`
(must match `buildDoc()`'s actual page margins — currently 792 twips /
0.55in top+bottom), and the `Math.max(4, ...)` floor. If you want this to
stop being a heuristic, the real fix is to make the browser measure its own
`fillPageHTML()` line count and pass that count through explicitly (similar
to how `computeOddWarmups` passes counts today) instead of having
`wbdocx.js` re-derive it independently.

### Pagination is slow on Course scope with many units/warm-ups
Each block-fit check does `page.innerHTML = candidate` then reads
`scrollHeight`, which forces a synchronous browser layout — that's
deliberate (it's what makes the measurement trustworthy) but it does mean
cost scales with total block count across every warm-up in scope. For a
large course this can be a few hundred forced layouts. If this becomes a
real problem:
- Cheapest fix: don't repack on every slider `oninput` — debounce
  `render()` (e.g. 150ms) so dragging a slider doesn't repack on every tick.
- Bigger fix: cache each warm-up's packed pages keyed by
  `(pageMode, lineH, fs, figmax)` and only re-pack the ones whose key
  changed.

### A section label ("Vocabulary", "Part 1", "PART 2") is still stranded alone at the bottom of a page
`keepWithNext` in `packBlocks()` only pulls the label back if the page
already has more than one block on it (`placed.length > 1`) — this is
intentional, to avoid an infinite loop when a label plus the very next item
*still* don't fit together on one page (rare, but possible with a large
first item). If this shows up in practice, the deeper fix is testing
"label + first following block" as a combined candidate up front, rather
than testing them separately and un-placing after the fact.

### Print output doesn't match the on-screen preview page count
Both should agree by construction (Any/Even modes bypass the browser's
default flow-based pagination entirely, emitting one `<section class="page">`
per already-decided page with `page-break-after: always`). If they diverge,
check the printer/browser's paper-size setting — `@page{size:letter;margin:0}`
in `styleCSS()` requests Letter, but some browsers/OS print dialogs let
users override paper size, and a non-Letter page will reflow every `.page`
box's assumed 11in height wrong. Confirm Letter is actually selected in the
print dialog before assuming it's a pagination bug.
