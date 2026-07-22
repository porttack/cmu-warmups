# CMU Warm-ups

Printable warm-up workbooks for [CMU CS Academy's Exploring Programming](https://academy.cs.cmu.edu/).
One spreadsheet drives every page. The browser builds print-ready PDFs and
editable Word files with no server, no account, and no build step.

**Live site:** <https://cmu-warmups.porttack.com>

> An independent project by a classroom teacher. Not affiliated with, authored
> by, or endorsed by Carnegie Mellon University or CMU CS Academy.

## Repo layout

```
docs/        the published Jekyll site (GitHub Pages serves this folder)
toolchain/   local build tools (Python + Node)
samples/     example built .docx / .pdf output
```

The site in `docs/` uses the `minima` theme. The three tool pages
(`workbook-site.html`, `workbook-editor.html`, `live-preview.html`) deliberately
have **no YAML front matter**, so Jekyll copies them through untouched and the
theme layout is not wrapped around them — they are full-bleed apps with their own
print stylesheets. Only `index.md` is themed. Don't add front matter to the tool
pages unless you want minima's header landing in the middle of a printed workbook.

## The tools

- **Build & download** — pick a warm-up, a unit, or the whole course; adjust
  writing-line height, text size, accent color, figure width, and page mode;
  download PDF (via the browser's print dialog) or a real `.docx`.
  - **Page mode** — how many pages each warm-up prints as: **Always 2
    pages** (the fixed header+vocab / Part 1+Part 2 split, the long-standing
    default), **Even** (content-based — pages flow to fit the actual
    content, then a blank grids-and-writing-lines page is added if needed so
    every warm-up and the unit/course cover ends on an even page count, for
    duplex binders where each warm-up should start on a fresh sheet), or
    **Any number** (content-based, no rounding — the fewest pages the
    content needs, odd counts allowed). Even/Any measure real rendered
    height in the browser, so they honor the current writing-line height,
    text size, and figure width; only whole problems are kept from
    splitting across a page break, not whole sections. The `.docx` export
    mirrors the same mode, though Word repaginates on its own so Even-mode
    padding there is best-effort.
- **Warm-up editor** — edit vocabulary, Part 1 / Part 2, and figures with a live
  preview, then export an updated `content.csv`.
- **Live preview** — poll a published Google Sheet and re-render on a timer.

## Content model

`content.csv` columns:

`course, unit, warmup_no, page, section, seq, type, content, hint, figure`

- **course / unit** — `cs0` and `cs1` can share one sheet; output files are named
  per course and unit (`CS1-Unit2-Workbook.docx`).
- **warmup_no** — the number printed in the title bar. Decade convention: Unit 1
  uses 1–8, Unit 2 uses 11–16, so pages can be inserted later without renumbering.
- **page** — the row-group key for one warm-up (`w1`, `w2`, …).
- **section** — `meta` (topic and "I can…" skills), `vocab`, `part1`, `part2`.
- **type** — `topic`, `ican`, `vocab`, `p` (prompt plus writing lines), `code`,
  `figure`, `label`, `lines`, `note` (bordered callout box), `error` (a Python
  error message, shown shaded and monospace with an automatic "Python says:"
  label), `table` (a bordered trace/data table), `match` (a two-column
  matching exercise). An unrecognised `type` value falls back to a plain
  prompt rather than throwing.
- **hint** — `n=N` writing lines for a prompt or vocab term; `w=NNN` display width
  for a figure; `h=NN` cell height in px for a table; `head=0` on a table to
  treat every row as data (no header row); `cols=N` on a figure to sit it
  side by side with the next N-1 figures that also carry `cols=N`. `match`
  rows ignore `hint`.
- **figure** — a figure spec; blank on non-figure rows.

### Type recipes

Common `type`/`hint` combinations, since the two columns interact:

- **Prompt with writing lines** — `type=p`, `hint=n=2` (or any N). The
  default: text, then N ruled lines.
- **Plain text, no writing lines, no box** — `type=p`, `hint=n=0`. Same
  markdown-enabled text as any prompt, just nothing to write on.
- **Bold inline label** — `type=label`. No box, no lines — just bold,
  markdown-enabled text.
- **Bordered callout** — `type=note`. A box around markdown-enabled text,
  for a rule, a tip, or a "remember this."
- **Python error message** — `type=error`. Shaded, monospace, automatically
  prefixed with "Python says:". `content` is the raw message text (see
  Multi-line content below for messages spanning more than one line).
- **Program listing** — `type=code`. Shaded, monospace; markdown is never
  processed, so asterisks and backticks in real code survive untouched.
- **Just writing lines, no text above them** — `type=lines`, `hint=n=N`.
- **Trace/data table** — `type=table`. `content` is rows separated by a
  newline, cells separated by `|`. The first row is a header (shaded) unless
  `hint` contains `head=0`. Empty cells render blank and tall enough to write
  in; `hint` may also carry `h=NN` for cell height in px (default: the
  writing-line height). Cells support the same inline markdown as `p`.
- **Matching exercise** — `type=match`. `content` is one pair per line, left
  and right separated by `::` — see Multi-line content below for the
  multi-line `content` cell this needs. Renders as two columns with room to
  draw a line between them. Never shuffled at render time: pre-scramble the
  right-hand values yourself so the printed layout (and any answer key) stays
  stable across renders. Both sides support the same inline markdown as `p`.
- **Vocabulary term** — `type=vocab`, meaningful only in the `vocab`
  section: bold term, then `hint=n=N` writing lines (default 2).
- **Anything else** — an unrecognised `type` renders exactly like `p`
  (markdown-enabled text plus `hint`-controlled writing lines), so a typo in
  this column degrades gracefully instead of breaking the page.

### Meta rows (`section=meta`)

A warm-up's `meta` rows carry page furniture rather than printed prompts:

- `type=topic` — the warm-up's title, shown in the blue title bar.
- `type=ican` — an "I can…" skill. The first two become START HERE strip
  rows B and C; every `ican` row across the unit is also collected onto the
  unit cover page.
- `type=reflect` — optional; fills strip row D. Omit it and a generic
  look-back prompt is used instead.
- `type=checkin` — optional; fills strip row E. Omit it and a rotating
  check-in question is used instead.

### Inline markdown

The `content` column supports a small inline set — no headings, lists, or
links:

```
**bold**    ->  bold
*italic*    ->  italic
`code`      ->  inline monospace
```

Supported in `p`, `label`, `vocab`, `note`, `table`, and `match` rows. `code`
and `error` rows
are literal text — markdown characters there are never processed, so
asterisks and backticks in real code or error output survive untouched. All
three renderers (HTML, the JS Word builder, the Python Word builder) implement
the same three forms, so a page looks the same whether it's printed,
previewed, or exported.

### Multi-line content

A `content` cell that needs more than one line — a multi-line `code` block or
`error` message — uses a real, literal line break embedded inside the quoted
CSV field, the same way spreadsheet software writes a cell with Alt+Enter/
Option+Return. It is **not** the two-character escape sequence `\n`: the CSV
parser (shared by all three renderers) only turns an embedded newline inside
quotes into a line break, so a literal `\n` would print as the two characters
`\` and `n` instead of breaking the line.

Each warm-up renders as exactly **two pages**. Page 1 is the header, the START
HERE strip (A pace check, B/C "I can…" self-checks, D reflection, E rotating
check-in) and vocabulary. Page 2 is Part 1 and the Part 2 stretch band. A one-page
unit cover precedes each unit.

### Figure specs

Shapes are separated by `;`. The same parser feeds all three renderers — SVG for
preview, Pillow for Python Word builds, canvas for browser Word builds — so
printed output matches the screen.

```
grid                       blank grid only
circle cx,cy,r[,gray]      gray = 0 (black) .. 255 (white), or a name: silver, gray, …
rect   left,top,w,h[,gray]
oval   cx,cy,w,h[,gray]
star   cx,cy,r,points[,gray]
line   x1,y1,x2,y2
dot    x,y
text   x,y,LABEL           small bold sans face; use _ for spaces in LABEL
canvas=NNN    grid=off     options, anywhere in the spec
```

Coordinates follow the CMU canvas: origin top-left, y counts **down**, 400 units
default.

A figure's `hint` can also carry `cols=N`: consecutive `figure` rows that all
carry the same `cols=N` sit side by side instead of stacking — a flex row in
the HTML/preview, a single borderless N-column table in both Word builders. A
figure with no `cols` hint (or a run of only one) renders full width as
before.

## Using your own spreadsheet

In Google Sheets: **File ▸ Share ▸ Publish to web ▸ (this sheet) ▸ Comma-separated
values (.csv)**. Then either paste the URL into the Source box on the build page,
or set it permanently near the top of `docs/workbook-site.html`:

```js
var SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv";
```

If it is blank or unreachable, the site falls back to the `content.csv` committed
in `docs/`. **Upload…** loads a local CSV without touching the repo.

Keep answer keys out of this repo. Anything in `docs/` is publicly readable by
anyone who finds the site.

## Building locally

```bash
pip install python-docx pillow
cd toolchain
python generate.py                        # every unit + full course → out/
python generate.py --unit 1
python preview.py --scope unit --unit 1   # self-contained offline HTML
node build_content.js                     # regenerate content.csv from the authoring script
```

### Previewing the site locally

The pages fetch `content.csv`, which browsers block on `file://`. Serve over HTTP:

```bash
cd docs && python3 -m http.server 8000    # http://localhost:8000/  (index.md won't render — Jekyll builds that on GitHub)
```

For the full themed site including `index.md`:

```bash
cd docs && bundle install && bundle exec jekyll serve
```

## Deployment

GitHub Pages, **Settings ▸ Pages ▸ Deploy from a branch**, branch `main`, folder
`/docs`. `docs/CNAME` pins the custom domain. In Cloudflare the DNS record is a
`CNAME` for `cmu-warmups` → `porttack.github.io` with the proxy **off (grey
cloud)**, which is required for GitHub to issue the certificate.

## Verification

Page counts confirmed across every render path (Node + LibreOffice):

| output                | Unit 1 | Unit 2 | one warm-up |
|-----------------------|:------:|:------:|:-----------:|
| `generate.py` (docx)  | 17     | 13     | —           |
| `wbdocx.js` (docx)    | 17     | 13     | 2           |
| browser chain (canvas)| 17     | 13     | 2           |
| HTML preview          | 17     | 13     | 2           |

`content.csv` round-trips byte-identical through the model, and figures render
identically across the SVG, Pillow, and canvas paths.

## Licensing

Code is MIT (see `LICENSE`). Workbook content and student-facing materials are
CC BY-NC 4.0 (see `LICENSE-CONTENT.md`).
