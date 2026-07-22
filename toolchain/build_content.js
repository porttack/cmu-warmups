/* build_content.js — single place to author warm-ups; emits content.csv
 * through the same model the whole pipeline uses (rowsFromWarmup + toCSV).
 * CS1 is CMU CS Academy's graphics course. Unit 1 = drawing on the
 * coordinate plane (figure-heavy). Unit 2 = color, variables, expressions.
 * csN-demo is a showcase course — see the block below the CS1 warm-ups.
 */
const fs = require("fs");
const L = require("./wblib.js");

const p = (t, n) => ({ type: "p", content: t, hint: "n=" + (n == null ? 2 : n) });
const code = (t) => ({ type: "code", content: t });
const label = (t) => ({ type: "label", content: t });
const fig = (spec, w) => ({ type: "figure", figure: spec, hint: "w=" + (w || 230) });
const voc = (t) => ({ type: "vocab", content: t, hint: "n=2" });
const vocN = (t, n) => ({ type: "vocab", content: t, hint: "n=" + n });
const ln = (n) => ({ type: "lines", hint: "n=" + n });
const W = (unit, no, topic, ican, vocab, part1, part2) =>
  ({ course: "cs1", unit: unit, no: no, page: "w" + no, topic, ican, vocab, part1, part2 });

const warmups = [
  /* ============================ UNIT 1 ============================ */
  W(1, 1, "The CMU coordinate plane",
    ["I can find a point's (x, y) on the CMU canvas.", "I can explain why y increases going down."],
    [voc("coordinate plane"), voc("origin"), voc("x-coordinate"), voc("y-coordinate")],
    [ p("The origin (0, 0) is the TOP-LEFT corner of the CMU canvas. On the grid, mark the point (200, 100) with a dot and label it.", 0),
      fig("grid", 230),
      p("Write the (x, y) coordinates of the dot drawn below.", 1),
      fig("grid; dot 300,250", 230),
      p("In CMU graphics y counts DOWN. Which point is LOWER on the screen: (100, 50) or (100, 350)? Explain in one sentence.", 2) ],
    [ p("Name the corner each point lands in: (0, 400), (400, 0), (400, 400).", 3) ]),

  W(1, 2, "Circle and Rect",
    ["I can write Circle(cx, cy, r) for a circle I see.", "I can write Rect(left, top, w, h) for a rectangle."],
    [voc("Circle"), voc("Rect"), voc("radius"), voc("argument")],
    [ label("Two circles are drawn below."),
      fig("circle 300,120,60,210; circle 250,180,50,150", 235),
      code("Circle(centerX, centerY, radius)"),
      p("Write the CMU code for the SMALLER circle using the pattern above.", 2),
      p("A Rect starts at its TOP-LEFT corner: Rect(left, top, width, height). Write the code for a box 150 wide and 80 tall whose top-left is (60, 260).", 2) ],
    [ p("Change the big circle's radius to 90. Does it grow toward the center or toward the edge? Explain.", 3) ]),

  W(1, 3, "Ovals, lines, and stars",
    ["I can name the shape functions Oval, Line, and Star.", "I can read the arguments a Star needs."],
    [voc("Oval"), voc("Line"), voc("Star"), voc("points (of a star)")],
    [ fig("star 200,200,80,5", 210),
      p("This star was made with Star(200, 200, 80, 5). What does the last number, 5, control?", 2),
      p("Write a Line from the top-left corner (0, 0) to the point (250, 300).", 2) ],
    [ p("An Oval uses a width and a height instead of one radius: Oval(cx, cy, width, height). Write an Oval centered at (200, 200) that is 160 wide and 90 tall.", 3) ]),

  W(1, 4, "Colors: fill and border",
    ["I can set a shape's fill color.", "I can add a border and set its width."],
    [voc("fill"), voc("border"), voc("borderWidth"), voc("color name")],
    [ fig("rect 120,120,160,120,silver", 210),
      p("The gray box below is filled gray. Write the Rect code that fills it gray AND adds a black border 4 pixels wide.", 3),
      code("Rect(120, 120, 160, 120, fill='gray', border='black', borderWidth=4)"),
      p("Name two different ways you could make this box look lighter.", 2) ],
    [ p("Colors can be named ('crimson') or built with rgb(r, g, b). Write an rgb() color you think would look orange.", 2) ]),

  W(1, 5, "Opacity and layering",
    ["I can predict which shape is drawn on top.", "I can use opacity to see through a shape."],
    [voc("layering (draw order)"), voc("on top"), voc("opacity"), voc("overlap")],
    [ label("Two boxes overlap. The one listed LAST in the code is drawn on top."),
      fig("rect 90,110,150,150,silver; rect 180,180,150,150,gray", 230),
      p("Which box is on top — the lighter one or the darker one? How can you tell?", 2),
      p("You want the LIGHT box on top instead. What do you change about the order of your two Rect lines?", 2) ],
    [ p("opacity runs from 0 (invisible) to 100 (solid). What opacity would make a shape a faint 'ghost' you can still see through?", 2) ]),

  W(1, 6, "Labels and text",
    ["I can put text on the canvas with Label.", "I can position and size a Label."],
    [voc("Label"), voc("value (the text)"), voc("size (font)"), voc("align")],
    [ code("Label('Score: 0', 200, 40, size=20, fill='black')"),
      p("In the Label above, which part is the text shown on screen? Which two numbers place it on the canvas?", 2),
      p("Write a Label that shows your name, centered near the top of the canvas.", 2) ],
    [ p("A Label is centered on its (x, y) by default. If your Label runs off the right edge, what could you change about its x?", 2) ]),

  W(1, 7, "Rotating shapes",
    ["I can rotate a shape with rotateAngle.", "I can describe a rotation in degrees."],
    [voc("rotateAngle"), voc("degrees"), voc("clockwise"), voc("centerX / centerY")],
    [ fig("star 200,200,80,5", 200),
      p("rotateAngle turns a shape a number of degrees, clockwise. Add rotateAngle so the star below turns 36 degrees.", 2),
      code("Star(200, 200, 80, 5, rotateAngle=36)"),
      p("A full turn is 360 degrees. What rotateAngle brings a shape back to exactly where it started?", 1) ],
    [ p("Rectangles rotate around their center too. In words, predict what Rect(150, 150, 200, 40, rotateAngle=90) would look like.", 3) ]),

  W(1, 8, "Putting it together: a scene",
    ["I can read a multi-shape drawing and list its shapes.", "I can plan a small scene before I code it."],
    [voc("composition"), voc("comment (#)"), voc("canvas"), voc("plan")],
    [ p("Read the scene below. List every shape you see, in the order you would draw them (back to front).", 3),
      fig("circle 200,120,50,gainsboro; rect 80,200,240,120,silver; star 200,150,25,5", 235),
      p("A comment starts with #. Write a one-line comment that explains the star in this scene.", 1) ],
    [ label("Plan your own scene."),
      p("Sketch a simple scene — a house, a face, a robot — on the grid. Label at least three shapes with their function names (Circle, Rect, …).", 0),
      fig("grid", 235) ]),

  /* ============================ UNIT 2 ============================ */
  W(2, 11, "Color by number",
    ["I can build a color with rgb(r, g, b).", "I can use opacity as a number from 0 to 100."],
    [voc("rgb"), voc("gradient"), voc("opacity (0–100)"), voc("channel (r, g, b)")],
    [ code("fill = rgb(255, 140, 0)"),
      p("Each rgb channel goes 0–255. What color is rgb(0, 0, 0)? What about rgb(255, 255, 255)?", 2),
      p("A gradient blends two colors across a shape. Name two colors you would blend for a sunset.", 1) ],
    [ p("Write an rgb() color for your favorite color, then explain what your three numbers do.", 3) ]),

  W(2, 12, "Variables",
    ["I can create a variable and give it a value.", "I can explain what the = sign does."],
    [voc("variable"), voc("assignment (=)"), voc("value"), voc("name (identifier)")],
    [ code("score = 0\nname = 'Robo'"),
      p("In score = 0, which side is the NAME and which side is the VALUE? What does the = actually do?", 2),
      p("Create a variable called lives and set it to 3.", 1) ],
    [ p("After lives = 3, you run lives = lives - 1. What is lives now, and why?", 2) ]),

  W(2, 13, "Data types",
    ["I can tell an integer from a float from a string.", "I can recognize a Boolean value."],
    [voc("integer (int)"), voc("float"), voc("string"), voc("Boolean")],
    [ p("Label each value with its type — int, float, string, or Boolean:   7   ·   3.5   ·   'hello'   ·   True", 3),
      p("Why do we put quotes around a string but not around a number?", 2) ],
    [ p("The value '7' and the value 7 look alike. How are they different to the computer?", 2) ]),

  W(2, 14, "Expressions and operators",
    ["I can evaluate an arithmetic expression.", "I can use the operators + - * / // %."],
    [voc("expression"), voc("operator"), voc("// (integer divide)"), voc("% (remainder)")],
    [ code("total = 3 * 4 + 2"),
      p("Evaluate each expression:   3 * 4 + 2   ·   10 // 3   ·   10 % 3", 3),
      p("Which happens first in 3 * 4 + 2 — the * or the + ? Why?", 2) ],
    [ p("Use % (remainder) to decide whether 17 is even or odd. What expression tells you, and what does it give?", 2) ]),

  W(2, 15, "Variables that draw",
    ["I can use a variable to position a shape.", "I can change one variable to move several shapes."],
    [voc("parameter"), voc("reuse"), voc("update"), voc("expression in a call")],
    [ code("x = 100\nCircle(x, 200, 30)\nCircle(x + 120, 200, 30)"),
      p("Both circles use x. On the grid, plot them for x = 100. Then plot where they move if x becomes 180.", 0),
      fig("grid", 235),
      p("Why is using a variable for x better than typing the number twice?", 2) ],
    [ p("Add a third circle that is always 120 to the right of the second one. Write its center x using the variable x.", 2) ]),

  W(2, 16, "Naming and debugging",
    ["I can choose clear variable names.", "I can find a simple bug in an expression."],
    [voc("identifier"), voc("readability"), voc("debugging"), voc("comment (#)")],
    [ p("Which name is clearer for a player's score — s or score? Why does it matter once the program gets long?", 2),
      code("livs = 3\nlives = livs - 1"),
      p("This code has a typo bug. Find it and write the corrected two lines.", 2) ],
    [ p("Add a comment (#) that explains what lives = lives - 1 does in a game.", 2) ]),

  /* ===================== TEST BENCH (cs0 / unit 9) =====================
   * Scratch page exercising renderer features, not classroom content.
   * Delete this entry and re-run to drop it from content.csv.          */
  { course: "cs0", unit: 9, no: 99, page: "w99", topic: "Test bench",
    ican: ["I can render every item type", "I can spot a regression"],
    reflect: "Battleship was",
    checkin: "Check-in — battery: my mental battery is at about ____ % because",
    vocab: [],                                   // zero-vocab page: no heading, no gap
    part1: [ p("This page has no vocabulary rows at all.", 2) ],
    part2: [ p("Stretch prompt.", 2) ] }
];

/* ================== csN-demo — the feature showcase ==================
 * A self-documenting course: each page's own text explains the rows that
 * produced it, so a teacher can print one workbook and see every section,
 * type, hint and figure option on paper. Not classroom content.
 *
 * The four pages are arranged so the optional bits are visible by their
 * absence as well as their presence: w2 omits checkin (row E falls back to
 * the built-in list), w3 omits reflect (row D falls back to the generic
 * sentence), and w4 has no vocab rows and a third ican line.
 *
 * Delete this block and the concat below, then re-run, to drop the course.
 */
const DEMO = (no, topic, o) => Object.assign(
  { course: "csN-demo", unit: 1, no: no, page: "w" + no, topic: topic,
    ican: [], reflect: "", checkin: "", vocab: [], part1: [], part2: [] }, o);

const SHAPES = "grid; circle 80,80,55; rect 180,30,180,100; oval 90,240,130,80; " +
               "star 290,250,60,5; line 20,380,380,340; dot 200,170";
const GRAYS = "rect 30,60,80,80,0; rect 130,60,80,80,105; " +
              "rect 230,60,80,80,silver; rect 30,180,80,80,lightgray; " +
              "rect 130,180,80,80,gainsboro; rect 230,180,80,80,white; " +
              "rect 130,300,80,60";
const NOGRID = "canvas=300; grid=off; circle 150,150,100,silver";

const demoWarmups = [
  DEMO(1, "Page anatomy and the meta rows", {
    ican: ["I can name the four sections a row can belong to.",
           "I can tell which meta row produced each part of page 1."],
    reflect: "Row D is authored — this page carries a meta row with type = reflect.",
    checkin: "Row E is authored too. Check-in: which part of page 1 would you change first?",
    vocab: [ vocN("section — meta, vocab, part1 or part2", 2),
             vocN("type — what a row renders as", 2),
             vocN("hint — per-row options, such as n=2 or w=230", 2) ],
    part1: [
      label("The meta section builds page 1"),
      code("type = topic     ->  the blue title bar\n" +
           "type = ican      ->  strip rows B and C\n" +
           "type = reflect   ->  strip row D\n" +
           "type = checkin   ->  strip row E"),
      p("Look at page 1 and match each strip row to the meta row that made it. Row A is always the same pace check.", 0),
      p("Only the first two ican rows reach the strip. Every one of them reaches the unit cover — warm-up 4 has three, on purpose.", 0) ],
    part2: [
      label("The other three sections"),
      p("vocab fills the rest of page 1. part1 and part2 fill page 2, split by the grey PART 2 bar. A warm-up is always exactly two pages, however much you put in it.", 0),
      p("reflect and checkin are both optional. Warm-up 2 leaves checkin out and warm-up 3 leaves reflect out — compare their strips with this one.", 0),
      p("Which meta row would you edit to change this page's title?", 1) ] }),

  DEMO(2, "Item types, and how much room to leave", {
    ican: ["I can pick a type for each piece of content.",
           "I can set writing space with n=."],
    reflect: "Warm-up 1 covered the meta rows. This page is about part1 and part2.",
    // no checkin: row E falls back to the built-in list
    vocab: [ vocN("p — prompt text, then writing lines", 1),
             vocN("label — a small bold heading, no lines", 1),
             vocN("code — a monospace box that keeps its line breaks", 2),
             vocN("lines — writing lines with nothing above them", 3) ],
    part1: [
      label("type = p — the default"),
      code("type    = p\ncontent = Write one thing you notice.\nhint    = n=2"),
      p("Write one thing you notice.", 2),
      label("n = 0 — a prompt with no writing lines"),
      p("Setup text, instructions, or a caption for a figure below it. This row uses n=0, which is why nothing follows it.", 0) ],
    part2: [
      label("type = lines — room to write with no prompt above it"),
      ln(3),
      label("type = code — every line break is kept"),
      code("x = 100\nCircle(x, 200, 30)"),
      p("The four vocab terms on page 1 use n=1, n=1, n=2 and n=3 — the hint works there too. This page has no checkin row, so strip row E fell back to the built-in list.", 0) ] }),

  DEMO(3, "Figures: the shapes", {
    ican: ["I can read a figure spec and picture what it draws.",
           "I can set a figure's printed width with w=."],
    // no reflect: row D falls back to the generic look-back sentence
    checkin: "Check-in — how much of your class time is students drawing on paper?",
    vocab: [ vocN("figure spec — the drawing instructions in the figure column", 2),
             vocN("canvas — the coordinate square, 400 wide unless you say otherwise", 2) ],
    part1: [
      label("Six shapes, one spec"),
      code("circle cx,cy,r\n" +
           "rect   left,top,width,height\n" +
           "oval   cx,cy,width,height\n" +
           "star   cx,cy,r,points\n" +
           "line   x1,y1,x2,y2\n" +
           "dot    x,y"),
      fig(SHAPES, 235),
      p("Shapes are separated by semicolons and drawn in the order written. Match each shape above to its line in the table.", 0) ],
    part2: [
      label("Blank graph paper — the spec used most"),
      code("type   = figure\nfigure = grid\nhint   = w=150"),
      fig("grid", 150),
      p("This page has no reflect row, so strip row D shows the generic look-back sentence instead.", 0) ] }),

  DEMO(4, "Figure options, and a page with no vocabulary", {
    ican: ["I can fill a shape with a gray.",
           "I can resize the canvas and turn the grid off.",
           "I can see that this third I-can line reached the cover but not the strip."],
    reflect: "Warm-up 3 drew on the default grid. This page changes the grid itself.",
    checkin: "Check-in — the first option from these four pages you would use in a warm-up of your own:",
    vocab: [],                       // no vocab rows: no heading on page 1, no gap
    part1: [
      label("Gray fills — a number from 0 to 255, or a CSS gray name"),
      code("rect  30,60,80,80,0;           rect 130,60,80,80,105;\n" +
           "rect 230,60,80,80,silver;      rect  30,180,80,80,lightgray;\n" +
           "rect 130,180,80,80,gainsboro;  rect 230,180,80,80,white;\n" +
           "rect 130,300,80,60"),
      fig(GRAYS, 200),
      p("The last rectangle names no gray at all, so it is drawn as an outline. Lines and dots are always black.", 0) ],
    part2: [
      label("canvas = and grid = off"),
      code("figure = " + NOGRID),
      fig(NOGRID, 140),
      { type: "note", content: "This row's type is note, which no renderer knows. An unrecognised type falls back to a plain prompt, so a typo in the type column never breaks a page.", hint: "n=1" },
      p("Page 1 of this warm-up has no vocab rows, so no vocabulary heading was printed on it at all.", 0) ] })
];

let rows = [];
warmups.concat(demoWarmups).forEach((w) => { rows = rows.concat(L.rowsFromWarmup(w)); });
fs.writeFileSync("content.csv", L.toCSV(rows, L.COLS));

// round-trip proof
const back = L.parseCSV(fs.readFileSync("content.csv", "utf8"));
let same = back.length === rows.length;
for (let i = 0; same && i < rows.length; i++)
  for (const c of L.COLS) if ((rows[i][c] || "") !== (back[i][c] || "")) { same = false; break; }
console.log("content.csv rows:", rows.length,
  "| warm-ups:", warmups.length + demoWarmups.length,
  "| round-trip identical:", same,
  "| U1 figures:", L.figureSpecs(rows.filter(r => r.unit == "1")).length,
  "| U2 figures:", L.figureSpecs(rows.filter(r => r.unit == "2")).length);
