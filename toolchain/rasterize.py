"""rasterize.py — read figure specs (one per line on stdin), print JSON
{spec: base64png} at 1500px. Used only by the Node test to build a figMap;
in the browser the site rasterizes the same specs with canvas + wblib.drawFigure.
"""
import sys, io, json, base64
import figrender

specs = [ln.rstrip("\n") for ln in sys.stdin if ln.strip() != ""]
out = {}
for s in specs:
    buf = io.BytesIO()
    figrender.render(s, px=1500).save(buf, "PNG")
    out[s] = base64.b64encode(buf.getvalue()).decode("ascii")
sys.stdout.write(json.dumps(out))
