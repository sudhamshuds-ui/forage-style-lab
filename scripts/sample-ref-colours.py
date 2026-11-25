"""Sample each traced dish's colours from its reference (docs/dishes/refs/{id}.jpg).

For every role, the median colour of the picture where its pieces sit (a small disc above each
piece's traced foot); the base's colour in its disc away from the pieces; the plate's near its rim;
the wall along the top of the picture and the table in its bottom corners. Writes
src/dishes/compose/refColours.ts. Usage: python3 scripts/sample-ref-colours.py traces.json
"""
import json, sys
from PIL import Image

traces = json.load(open(sys.argv[1]))
WARE_R = 13.5

def median(px):
    if not px: return None
    rs = sorted(p[0] for p in px); gs = sorted(p[1] for p in px); bs = sorted(p[2] for p in px)
    m = len(px) // 2
    return '#%02x%02x%02x' % (rs[m], gs[m], bs[m])

out = {}
for id, t in traces.items():
    im = Image.open(f'docs/dishes/refs/{id}.jpg').convert('RGB')
    W, H = im.size
    l, r, top, bot = t['edge']
    pxPerCm = (r - l) / 2 / WARE_R
    def disc(u, v, rad, skip=None):
        pts = []
        for y in range(int(v - rad), int(v + rad) + 1):
            for x in range(int(u - rad), int(u + rad) + 1):
                if 0 <= x < W and 0 <= y < H and (x - u) ** 2 + (y - v) ** 2 <= rad * rad and not (skip and skip(x, y)):
                    pts.append(im.getpixel((x, y)))
        return pts
    roles = {}
    for it in t['items']:
        rad = max(2, it['cm'] * pxPerCm * 0.25)
        spread = it['spread'] * pxPerCm
        # Only where nothing plated later lies over it (a rosti under its salmon).
        above = [o for o in t['items'] if o['layer'] > it['layer']]
        def covered(x, y):
            return any((x - o['u']) ** 2 + (y - o['v']) ** 2 < (o['cm'] * pxPerCm * 0.5 + o['spread'] * pxPerCm) ** 2 for o in above)
        # Its footprint (an oval in the picture), less what lies over it and less bare plate.
        a = it['cm'] * pxPerCm * 0.4 + spread * 0.5
        bb = a * (bot - top) / (r - l)
        def skip(x, y):
            if (x - it['u']) ** 2 / (a * a) + (y - (it['v'] - bb * 0.3)) ** 2 / (bb * bb) > 1: return True
            p = im.getpixel((x, y))
            if min(p) > 205 and max(p) - min(p) < 28: return True
            return covered(x, y) if above else False
        pts = disc(it['u'], it['v'] - bb * 0.3, a, skip)
        if len(pts) < 12: pts = disc(it['u'], it['v'] - rad * 0.6, rad + spread * 0.5)
        roles.setdefault(it['role'], []).extend(pts)
    entry = {'roles': {k: median(v) for k, v in roles.items()}}
    def onFood(x, y):
        return any((x - it['u']) ** 2 + (y - it['v']) ** 2 < (it['cm'] * pxPerCm * 0.6 + it['spread'] * pxPerCm) ** 2 for it in t['items'])
    if t['base']:
        _, bu, bv, bcm = t['base']
        def notBase(x, y):
            p = im.getpixel((x, y))
            return onFood(x, y) or (min(p) > 200 and max(p) - min(p) < 30)
        pts = disc(bu, bv, bcm * pxPerCm * 0.8, notBase)
        # A thin sauce shows little: keep its family's own colour unless enough of it is seen.
        if len(pts) > 40: entry['base'] = median(pts)
    cu, cv = (l + r) / 2, (top + bot) / 2
    entry['plate'] = median(disc(cu - (r - l) * 0.42, cv, 4) + disc(cu + (r - l) * 0.42, cv, 4))
    entry['wall'] = median([im.getpixel((x, y)) for y in range(4, 30) for x in range(4, W - 4, 3)])
    entry['table'] = median([im.getpixel((x, y)) for y in range(H - 30, H - 4) for x in list(range(4, 50)) + list(range(W - 50, W - 4))])
    out[id] = entry

body = json.dumps(out, indent=1)
open('src/dishes/compose/refColours.ts', 'w').write(
    '// Written by scripts/sample-ref-colours.py from the references: do not edit by hand.\n'
    '// Each traced dish: the colour of every role, its base, its plate, and its room (wall, table).\n'
    'export const REF_COLOURS: Record<string, { roles: Record<string, string>; base?: string; plate?: string; wall: string; table: string }> = '
    + body + ';\n')
print(len(out))
