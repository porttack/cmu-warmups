---
layout: page
title: Warm-up workbooks
---

Printable warm-up pages for [CMU CS Academy's Exploring Programming](https://academy.cs.cmu.edu/).
One spreadsheet drives every page. Pick a warm-up, a unit, or a whole course, then
download a print-ready PDF or an editable Word file. Everything runs in your
browser — nothing is uploaded, and there is no account to make.

## The tools

**[Build &amp; download →](./workbook-site.html)**
Pick your scope, adjust writing-line height and text size, then download PDF or
DOCX. Start here.

**[Warm-up editor →](./workbook-editor.html)**
Edit vocabulary, Part 1, Part 2, and figures side by side with a live preview,
then export an updated `content.csv`.

**[Live preview →](./live-preview.html)**
Point it at a published Google Sheet and it re-renders on a timer while you
author. Useful on a second monitor.

## How the pages are built

Each warm-up is exactly two pages. Page one carries the name/date header, the
START HERE strip — a pace check, two "I can…" self-assessments, a reflection
prompt, and a rotating check-in question — and the vocabulary terms with writing
lines. Page two is Part 1, which everyone does, and Part 2, a stretch section for
students who finish early. A one-page cover opens each unit with its "I can…"
checklist.

Pages are designed to work on paper: no color dependence, no dates baked in, and
nothing that needs a screen to make sense.

## Bring your own content

The site ships with a sample `content.csv`, but it is meant to run on your
spreadsheet. In Google Sheets choose **File ▸ Share ▸ Publish to web ▸ Comma-separated
values (.csv)**, then either paste that URL into the Source box on the build page
or set `SHEET_CSV_URL` near the top of `workbook-site.html` in your own fork. You
can also load a CSV straight off your machine with **Upload…**.

Columns are `course, unit, warmup_no, page, section, seq, type, content, hint, figure`.
Figures are written as short specs — `circle 200,200,60,gray` or `star 200,200,80,5` —
on the CMU canvas convention, where the origin sits top-left and y counts down.

Full documentation, the Python build tools, and the source live in the
[GitHub repository](https://github.com/porttack/cmu-warmups).

---

<small>An independent project by a classroom teacher. Not affiliated with,
authored by, or endorsed by Carnegie Mellon University or CMU CS Academy.
Materials here are shared under CC BY-NC 4.0; the code is MIT licensed.</small>
