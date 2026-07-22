/* build_content.js — single place to author warm-ups; emits content.csv
 * through the same model the whole pipeline uses (rowsFromWarmup + toCSV).
 * CS1 is CMU CS Academy's graphics course. Unit 1 = drawing on the
 * coordinate plane (figure-heavy). Unit 2 = color, variables, expressions.
 */
const fs = require("fs");
const L = require("./wblib.js");

const p = (t, n) => ({ type: "p", content: t, hint: "n=" + (n == null ? 2 : n) });
const code = (t) => ({ type: "code", content: t });
const label = (t) => ({ type: "label", content: t });
const fig = (spec, w) => ({ type: "figure", figure: spec, hint: "w=" + (w || 230) });
const voc = (t) => ({ type: "vocab", content: t, hint: "n=2" });
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

let rows = [];
warmups.forEach((w) => { rows = rows.concat(L.rowsFromWarmup(w)); });
fs.writeFileSync("content.csv", L.toCSV(rows, L.COLS));

// round-trip proof
const back = L.parseCSV(fs.readFileSync("content.csv", "utf8"));
let same = back.length === rows.length;
for (let i = 0; same && i < rows.length; i++)
  for (const c of L.COLS) if ((rows[i][c] || "") !== (back[i][c] || "")) { same = false; break; }
console.log("content.csv rows:", rows.length, "| warm-ups:", warmups.length,
  "| round-trip identical:", same,
  "| U1 figures:", L.figureSpecs(rows.filter(r => r.unit == "1")).length,
  "| U2 figures:", L.figureSpecs(rows.filter(r => r.unit == "2")).length);
