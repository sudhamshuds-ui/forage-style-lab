import { SphereGeometry, Vector3 } from 'three';
import { mushroomUpright } from '../../ingredients/forms/mushroom';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, plate, posed } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { PASTA_BOWL, ware } from '../kit/ware';

/**
 * Soft egg in butter-roasted mushrooms (eggs + mushrooms + butter; a starter).
 * After the generated reference (Figma node 214:6) and the user's notes (node 238:38,
 * 2026-11-18: "plating more circular. place egg in center, mushrooms around it ... sauce as a
 * pool circle under it and then drizzled over. then the garnish on top of everything").
 *
 * In a wide cream bowl: a round pool of brown butter; a soft fried egg in the middle, round with
 * a soft edge (no browned lace), its yolk domed; mushrooms in a ring round it, halved and whole,
 * leaning on each other and on the egg's edge, seared golden; butter drizzled over them; herbs
 * scattered over everything last.
 */
export const buildEggMushroom: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0xe95);
  const bowl = ware(PASTA_BOWL);
  const table = new Table(bowl.floor);
  const parts: FormPiece[] = [];

  // The brown butter: a round pool filling the bowl's well.
  const butter = pool({ outline: wobble(7.6, [[3, 0.025, random() * 6], [5, 0.02, random() * 6]]), at: [0, 0], depth: 0.35, edge: 0.3, floor: bowl.floor, rings: 40, segments: 120 });
  table.add([{ role: 'butter', geometry: butter }]);

  // The egg: a round, soft-edged white set on the butter, the yolk domed in its middle.
  const white = pool({
    outline: wobble(4.2, [[2, 0.05, random() * 6], [3, 0.04, random() * 6], [5, 0.02, random() * 6]]),
    at: [0.2, 0.1],
    depth: 0.55,
    edge: 0.55,
    floor: (x, z) => table.height(x, z) - 0.05,
    bumps: (x, z, rn) => 0.12 * Math.sin(x * 1.3 + 1) * Math.sin(z * 1.1 + 2) * (1 - rn),
    rings: 30,
    segments: 96,
  });
  table.add([{ role: 'white', geometry: white }]);
  const yolk = new SphereGeometry(1.5, 40, 24);
  yolk.scale(1, 0.62, 1);
  yolk.translate(0.45, table.height(0.45, -0.1) + 0.45, -0.1);
  parts.push({ role: 'white', geometry: white }, { role: 'yolk', geometry: yolk });
  table.add([{ role: 'yolk', geometry: yolk }]);

  // Mushrooms in a ring round the egg: two of every three halved through the stem (its pale inside
  // up), the others whole, tipped onto their side; each settles where it lands, leaning on its
  // neighbours and the egg's edge.
  const count = 12;
  for (let k = 0; k < count; k++) {
    const around = (k / count) * Math.PI * 2 + signed(random) * 0.12;
    const reach = 5.9 + signed(random) * 0.35;
    const { geometry } = mushroomUpright(0.6 + random() * 0.16, k, random);
    let m: FormPiece[] = [{ role: 'mushroom', geometry }];
    if (k % 3 !== 2) {
      m = cutPieces(m, knife(new Vector3(0, 0, 0), new Vector3(0, 0, 1)), 'mushroomCut', 'radial');
      m = posed(m, { tip: -Math.PI / 2 });
    } else {
      m = posed(m, { tip: -1.25 });
    }
    // Stems pointing in toward the egg, caps out.
    m = posed(m, { turn: -around - Math.PI / 2 + signed(random) * 0.4 });
    const placed = posed(m, { at: [Math.cos(around) * reach, 6, Math.sin(around) * reach] });
    // A half barely rocks (left free, it rolled onto its side and hid its face); a whole one
    // settles onto whatever it leans on.
    parts.push(...table.rest(placed, { tilt: k % 3 !== 2 ? 0.12 : 0.45, sink: 0.15 }));
  }

  // Herbs last, over everything: small parsley leaves on whatever is highest where they fall.
  for (let k = 0; k < 14; k++) {
    const a = random() * Math.PI * 2;
    const r = 1.5 + random() * 6.0;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const leaf = leafPiece({
      base: new Vector3(x, table.height(x, z) + 0.04, z),
      turn: random() * Math.PI * 2,
      length: 1.1 + random() * 0.4,
      width: 0.65 + random() * 0.2,
      lift: (d) => 0.06 * d,
      fold: 0.25,
      twist: signed(random) * 0.3,
      rows: 8,
    });
    parts.push({ role: 'herb', geometry: leaf, doubleSided: true });
  }

  parts.push({ role: 'butter', geometry: butter });
  parts.push({ role: 'bowl', geometry: bowl.geometry });
  return plate(parts);
};
