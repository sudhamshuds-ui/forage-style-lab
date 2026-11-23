// Writes the traced plans with each piece's role, for the colour sampler (scripts/sample-ref-colours.py).
import { writeFileSync } from 'node:fs';
import { TRACES } from '../src/dishes/compose/traces';
import { elementLooks } from '../src/dishes/compose/elements';
import { readPart } from '../src/dishes/compose/layout';

const out: Record<string, unknown> = {};
for (const [id, t] of Object.entries(TRACES)) {
  out[id] = {
    edge: t.edge,
    base: t.base ?? null,
    items: t.layers.flatMap((layer, li) => layer.map(([part, , u, v, cm, , n = 1, spread = 0]) => ({ role: elementLooks(readPart(part), false)[0].role, u, v, cm, n, spread, layer: li }))),
  };
}
writeFileSync(process.argv[2], JSON.stringify(out));
