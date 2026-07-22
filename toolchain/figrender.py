"""figrender.py — render a figure spec string to a high-res PNG.

Geometry mirrors wblib.js parseFigure/drawFigure exactly so the Word, HTML,
and browser-canvas outputs match. Spec grammar (shapes separated by ';'):

    grid                      blank coordinate grid (drawn behind every figure)
    circle cx,cy,r[,gray]     gray = 0(black)..255(white) or a name
    rect   left,top,w,h[,gray]
    oval   cx,cy,w,h[,gray]
    star   cx,cy,r,points[,gray]
    line   x1,y1,x2,y2
    dot    x,y
    canvas=NNN   grid=off     options, anywhere in the spec
"""
import math
from PIL import Image, ImageDraw, ImageFont

GRAYNAME = {
    "black": 0, "dimgray": 105, "gray": 128, "grey": 128, "darkgray": 169,
    "silver": 192, "lightgray": 211, "lightgrey": 211, "gainsboro": 220, "white": 255,
}


def _gray(tok):
    if tok is None or tok == "":
        return None
    tok = str(tok).strip().lower()
    if tok in GRAYNAME:
        tok = GRAYNAME[tok]
    try:
        v = max(0, min(255, int(float(tok))))
    except (TypeError, ValueError):
        return None
    return (v, v, v)


def parse_figure(spec):
    out = {"canvas": 400, "grid": True, "shapes": []}
    if not spec:
        return out
    for raw in str(spec).split(";"):
        part = raw.strip()
        if not part:
            continue
        low = part.lower()
        if low.startswith("canvas"):
            try:
                out["canvas"] = int(part.split("=")[1])
            except Exception:
                pass
            continue
        if low.replace(" ", "").startswith("grid=off"):
            out["grid"] = False
            continue
        toks = part.split(None, 1)
        kw = toks[0].lower()
        args = [a.strip() for a in (toks[1].split(",") if len(toks) > 1 else []) if a.strip() != ""]
        def f(i):
            return float(args[i])
        if kw == "grid":
            continue
        if kw == "circle":
            out["shapes"].append({"t": "circle", "cx": f(0), "cy": f(1), "r": f(2),
                                  "fill": _gray(args[3]) if len(args) > 3 else None})
        elif kw == "rect":
            out["shapes"].append({"t": "rect", "x": f(0), "y": f(1), "w": f(2), "h": f(3),
                                  "fill": _gray(args[4]) if len(args) > 4 else None})
        elif kw == "oval":
            out["shapes"].append({"t": "oval", "cx": f(0), "cy": f(1), "w": f(2), "h": f(3),
                                  "fill": _gray(args[4]) if len(args) > 4 else None})
        elif kw == "star":
            out["shapes"].append({"t": "star", "cx": f(0), "cy": f(1), "r": f(2),
                                  "pts": int(f(3)) if len(args) > 3 else 5,
                                  "fill": _gray(args[4]) if len(args) > 4 else None})
        elif kw == "line":
            out["shapes"].append({"t": "line", "x1": f(0), "y1": f(1), "x2": f(2), "y2": f(3)})
        elif kw == "dot":
            out["shapes"].append({"t": "dot", "x": f(0), "y": f(1)})
    return out


def _star_points(cx, cy, r, pts):
    inner = r * 0.42
    p = []
    for k in range(pts * 2):
        rr = r if k % 2 == 0 else inner
        ang = -math.pi / 2 + k * math.pi / pts
        p.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    return p


def _font(size):
    for name in ("DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def render(spec, px=1500):
    """Return a PIL Image of the spec at `px` square (high-res)."""
    f = parse_figure(spec)
    C = f["canvas"]
    k = px / C
    img = Image.new("RGB", (px, px), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, px - 1, px - 1], outline=(51, 51, 51), width=max(1, int(1.5 * k)))
    step = 50
    if f["grid"]:
        g = step
        while g < C:
            d.line([(g * k, 0), (g * k, px)], fill=(226, 226, 226), width=max(1, int(k)))
            d.line([(0, g * k), (px, g * k)], fill=(226, 226, 226), width=max(1, int(k)))
            g += step
        fnt = _font(int(10 * k))
        t = 100
        while t < C:
            d.text(((t + 2) * k, 2 * k), str(t), fill=(153, 153, 153), font=fnt)
            d.text((2 * k, (t + 2) * k), str(t), fill=(153, 153, 153), font=fnt)
            t += 100
    ink = (17, 17, 17)
    lw = max(1, int(2 * k))
    for sh in f["shapes"]:
        fill = sh.get("fill")
        if sh["t"] == "circle":
            x, y, r = sh["cx"] * k, sh["cy"] * k, sh["r"] * k
            d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=ink, width=lw)
        elif sh["t"] == "rect":
            d.rectangle([sh["x"] * k, sh["y"] * k, (sh["x"] + sh["w"]) * k, (sh["y"] + sh["h"]) * k],
                        fill=fill, outline=ink, width=lw)
        elif sh["t"] == "oval":
            cx, cy, w, h = sh["cx"] * k, sh["cy"] * k, sh["w"] * k / 2, sh["h"] * k / 2
            d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=fill, outline=ink, width=lw)
        elif sh["t"] == "star":
            pts = [(x * k, y * k) for (x, y) in _star_points(sh["cx"], sh["cy"], sh["r"], sh["pts"])]
            d.polygon(pts, fill=fill, outline=ink)
            d.line(pts + [pts[0]], fill=ink, width=lw)
        elif sh["t"] == "line":
            d.line([(sh["x1"] * k, sh["y1"] * k), (sh["x2"] * k, sh["y2"] * k)], fill=ink, width=max(1, int(2.5 * k)))
        elif sh["t"] == "dot":
            r = 5 * k
            d.ellipse([sh["x"] * k - r, sh["y"] * k - r, sh["x"] * k + r, sh["y"] * k + r], fill=ink)
    return img


def render_to(spec, path, px=1500):
    render(spec, px).save(path, "PNG")
    return path


if __name__ == "__main__":
    import sys
    render_to(sys.argv[1] if len(sys.argv) > 1 else "grid",
              sys.argv[2] if len(sys.argv) > 2 else "fig.png",
              int(sys.argv[3]) if len(sys.argv) > 3 else 1500)
    print("wrote", sys.argv[2] if len(sys.argv) > 2 else "fig.png")
