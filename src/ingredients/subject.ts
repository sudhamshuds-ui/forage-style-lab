import { Box3, Color, Group, Mesh, Sphere, Vector3, type BufferAttribute, type ShaderMaterial } from 'three';
import type { Settings } from '../params';
import { setPalette, softenPalette, type Palette, type StylizedLook } from '../shading/stylizedMaterial';
import { Apple } from './apple/apple';
import { mixHex } from '../utils/colour';
import { CRUMB_SKIN, GLAZE_SKIN, KNUCKLE_SKIN, LABEL_SKIN, LEAF_SKIN, MELON_RIND_SKIN, setSkin } from '../shading/effects/skinTexture';
import { hotSauceLabelTexture } from '../shading/labelArt';
import { FAMILIES } from './families';
import { seedFromId, seededRandom } from './forms/kit/random';
import { LAYOUT_COUNT, arrangeCluster, footprintSpots, samplePoints, transformed } from './layout';
import { MAX_CONTACTS } from '../scene/background';
import { cmToUnits } from './scale';
import { PROPS } from './forms/kit/checks';
import { parsePart, type IngredientEntry } from './registry';

/**
 * The subject: whichever ingredient is on stage, ready to paint.
 *
 * Every subject sits the same way: real size, resting on the table at y = 0,
 * centred on its footprint. The stage then turns and frames it (framing.ts).
 * Two kinds exist today:
 *   - the procedural apple, which still reads the hidden Shape and Colour groups,
 *   - kit-built forms, painted with their colour family from the registry.
 */
export interface Subject {
  readonly entry: IngredientEntry;
  /** Real size, bottom centre at the origin. */
  readonly group: Group;
  /**
   * How far the stage turns the whole subject (degrees, measured from the camera).
   * A solo ingredient uses its registry `turn`; a cluster turns its hero instead, so
   * the triangle itself stays square to the camera.
   */
  readonly turn: number;
  /** Where each piece meets the table (local centre and radius), for its soft contact shadow. */
  readonly contacts: { centre: Vector3; radius: number }[];
  /** Centre and rough radius of the main body (local), used to place highlights and the room. */
  readonly centre: Vector3;
  radius: number;
  /** Rebuild if needed and set colours. Returns true if the form changed size or shape. */
  update(settings: Settings, shapeChanged: boolean): boolean;
  /** The main body's colours (tints the cast shadow and the window light). */
  colours(settings: Settings): Palette;
  dispose(): void;
}

export function createSubject(entry: IngredientEntry, look: StylizedLook): Subject {
  return entry.form === 'procedural-apple' ? new AppleSubject(entry, look) : new FormSubject(entry, look);
}

/**
 * Raw chicken leg meat, where the skin is pulled back (and showing through it): a rosy pink,
 * between the Pink and raw family's lit and base colours, deeper than the pale skin.
 */
const POULTRY_MEAT = mixHex(FAMILIES['pink-raw'].colours.lit, FAMILIES['pink-raw'].colours.base, 0.18);

/** An avocado's flesh: creamy yellow at the heart, bright green toward the skin. */
const AVOCADO_FLESH = { cream: '#f0d466', green: '#93c447' };

/** The bounding sphere reaches the far corners; the visible body sits a little further in. */
const RADIUS_FACTOR = 0.88;

class AppleSubject implements Subject {
  readonly group = new Group();
  readonly turn: number;
  readonly contacts: { centre: Vector3; radius: number }[] = [];
  readonly centre = new Vector3();
  radius = 1;
  private readonly apple: Apple;
  private readonly box = new Box3();

  constructor(
    readonly entry: IngredientEntry,
    look: StylizedLook,
  ) {
    this.turn = entry.turn;
    this.apple = new Apple(look);
    this.group.add(this.apple.group);
    setSkin(this.apple.bodyMaterial, entry.skin);
  }

  update(settings: Settings, shapeChanged: boolean): boolean {
    // The apple's own colours (hidden Colour group), softened to the shared key light.
    this.apple.applyColours({ ...settings.colour, ...softenPalette(settings.colour, settings.light.strength) });
    if (!shapeChanged) return false;
    this.apple.rebuild(settings.shape);
    // Sit the apple on the table at y = 0, centred on its footprint (it leans a little).
    // Its parts have no transforms of their own, so their shapes' boxes add up to the whole apple.
    this.box.makeEmpty();
    this.apple.group.traverse((object) => {
      if (object instanceof Mesh && object.visible) {
        object.geometry.computeBoundingBox();
        this.box.union(object.geometry.boundingBox!);
      }
    });
    this.apple.group.position.set(-(this.box.min.x + this.box.max.x) / 2, -this.box.min.y, -(this.box.min.z + this.box.max.z) / 2);
    this.centre.copy(this.apple.centre).add(this.apple.group.position);
    this.radius = this.apple.radius;
    this.contacts.splice(0, this.contacts.length, { centre: this.centre.clone(), radius: this.radius });
    return true;
  }

  colours(settings: Settings): Palette {
    return settings.colour;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (object.material as ShaderMaterial).dispose();
      }
    });
  }
}

class FormSubject implements Subject {
  readonly group = new Group();
  readonly turn: number;
  readonly contacts: { centre: Vector3; radius: number }[] = [];
  readonly centre = new Vector3();
  radius = 1;
  private readonly palette: Palette;
  /** Each piece's material and its family colours, before the light softens them. */
  private readonly painted: { material: ShaderMaterial; palette: Palette }[] = [];
  /** Pieces left out in Playful strokes (the registry's playfulHide). */
  private readonly playfulHidden: Mesh[] = [];

  constructor(
    readonly entry: IngredientEntry,
    look: StylizedLook,
  ) {
    if (typeof entry.form !== 'function') throw new Error(`${entry.spec.id} has no form builder`);
    const { spec } = entry;
    this.palette = FAMILIES[spec.family].colours;
    const partFamilies = new Map(spec.parts.map((part) => {
      const { role, family } = parsePart(part);
      return [role, family] as const;
    }));

    // One member for a solo ingredient, two or three for a cluster (strawberries, eggs).
    // The hero uses the ingredient's own seed; the others get their own, so each is a variant.
    const seed = seedFromId(spec.id);
    const members: Group[] = [];
    for (let m = 0; m < LAYOUT_COUNT[spec.layout]; m++) {
      const member = new Group();
      const pieces = entry.form({ state: 'whole', seed: (seed + m * 7919) >>> 0 });
      pieces.forEach((piece, index) => {
        const material = look.createMaterial({ doubleSided: piece.doubleSided });
        // A prop lying flat on the table (the butter's paper) sits right on the floor's plane, and
        // the two flickered in and out of each other (the floor's contact shadow speckled
        // through). Drawn a hair in front of the floor, like a decal, it always wins.
        // A skin lifted off its body (a cheese or melon rind) sits a hair above it, and on a
        // tight curve the two flickered in and out of each other in steps (a sawtooth edge on
        // the watermelon's rind, the user, 2026-11-06). It is always drawn in front, like a decal.
        if (piece.keepNormals) {
          material.polygonOffset = true;
          material.polygonOffsetFactor = -1;
          material.polygonOffsetUnits = -4;
        }
        if (PROPS.includes(piece.role)) {
          material.polygonOffset = true;
          material.polygonOffsetFactor = -2;
          material.polygonOffsetUnits = -8;
        }
        // A part can borrow another family (watermelon rind@green); the rest use the ingredient's own.
        const family = partFamilies.get(piece.role);
        const palette = family ? FAMILIES[family].colours : this.palette;
        // One main highlight per object (board 02): small parts keep theirs close to their own colour.
        // A form with two bodies (the watermelon's pair of wedges) repeats the hero's role: each
        // body gets the hero's highlight and skin.
        const hero = index === 0 || piece.role === pieces[0].role;
        const loud = (hero && !entry.matte) || !!entry.glossy?.includes(piece.role);
        const quiet = loud ? palette : { ...palette, highlight: mixHex(palette.highlight, palette.base, 0.65) };
        this.painted.push({ material, palette: quiet });
        if (hero) {
          setSkin(material, entry.skin);
          // Melon flesh fades into its rind: the pale band and the green come from the families.
          if (entry.skin.kind === 'melon') {
            (material.uniforms.uMelonPale.value as Color).set(FAMILIES['pale-green'].colours.lit);
            (material.uniforms.uMelonGreen.value as Color).set(FAMILIES.green.colours.base);
          }
          // A marbled steak: the marbling is painted in the fat's colour.
          if (entry.skin.kind === 'marbled') (material.uniforms.uMelonPale.value as Color).set(FAMILIES.fat.colours.lit);
          // An avocado: the cut face's creamy flesh and its bright green near the skin.
          if (entry.skin.kind === 'avocado') {
            (material.uniforms.uMelonPale.value as Color).set(AVOCADO_FLESH.cream);
            (material.uniforms.uMelonGreen.value as Color).set(AVOCADO_FLESH.green);
          }
          // Salmon: the fat lines in a creamy peach, the skin a deep silvery slate-blue.
          if (entry.skin.kind === 'salmon') {
            (material.uniforms.uMelonPale.value as Color).set('#ffe9d6');
            (material.uniforms.uMelonGreen.value as Color).set('#4f6488');
          }
          // A fried egg: its crisp rim browns from gold to a warm sienna (never black).
          if (entry.skin.kind === 'egg') {
            (material.uniforms.uMelonPale.value as Color).set('#f4b64e');
            (material.uniforms.uMelonGreen.value as Color).set('#a4522c');
          }
          // A red onion: its papery flakes, root patch and dry neck are painted in the papery tan.
          if (entry.skin.kind === 'onion') (material.uniforms.uMelonPale.value as Color).set(FAMILIES.papery.colours.base);
          // Raw chicken: the pink meat (showing through, and bare on the shank) and the yellow fat.
          if (entry.skin.kind === 'poultry') {
            (material.uniforms.uMelonPale.value as Color).set(POULTRY_MEAT);
            (material.uniforms.uMelonGreen.value as Color).set(FAMILIES.butter.colours.base);
          }
        }
        // A bone's knuckle (before the leaf rule: it has a map too): the cartilage cap and the
        // meat's pink blush where it leaves the meat.
        else if (piece.role === 'knuckle') {
          setSkin(material, KNUCKLE_SKIN);
          (material.uniforms.uMelonPale.value as Color).set(POULTRY_MEAT);
        }
        // A glazed bowl (before the leaf rule: it has a map too): pooled glaze, rings, an
        // orange-brown inside rim.
        else if (piece.role === 'bowl') {
          setSkin(material, GLAZE_SKIN);
          (material.uniforms.uMelonPale.value as Color).set('#d98a3c');
        }
        // Crumb (bread inside a slash) gets the crumb skin: holes, streaks, a toasted rim.
        else if (piece.role === 'crumb') setSkin(material, CRUMB_SKIN);
        // A melon's rind shell: stripes, mottling and specks (before the leaf rule: it has a map too).
        else if (piece.role === 'rind' && entry.skin.kind === 'melon') setSkin(material, MELON_RIND_SKIN);
        // A printed label (a piece named `label` with its own map): the artwork, in cream ink.
        else if (piece.role === 'label' && piece.geometry.getAttribute('uv')) {
          setSkin(material, LABEL_SKIN);
          material.uniforms.uLabelMap.value = hotSauceLabelTexture();
          (material.uniforms.uLabelInk.value as Color).set(FAMILIES.paper.colours.lit);
        }
        // Leaves and sepals (pieces with a leaf map) get the leaf skin: vein, base-to-tip, underside.
        else if (piece.geometry.getAttribute('uv')) setSkin(material, LEAF_SKIN);
        const mesh = new Mesh(piece.geometry, material);
        mesh.name = piece.role;
        if (entry.playfulHide?.includes(piece.role)) this.playfulHidden.push(mesh);
        mesh.castShadow = true;
        // Catch shadows too: sepals on their berry, berries on each other.
        mesh.receiveShadow = true;
        member.add(mesh);
      });
      members.push(member);
      this.group.add(member);
    }
    const heroTurn = (entry.turn * Math.PI) / 180;
    if (members.length > 1) {
      arrangeCluster(members, { random: seededRandom(seed ^ 0x9e3779b9), gap: cmToUnits(0.03), heroTurn, stemEnds: entry.stemEnds });
    }
    this.turn = members.length > 1 ? 0 : entry.turn;

    // Contact shadows follow each member's footprint on the table: a round piece gets one
    // spot, a long one (a baguette) a row of small spots along its length, so the contact
    // hugs it instead of one big circle poking out past its shadow. Up to MAX_CONTACTS in all.
    const spotsEach = Math.max(1, Math.floor(MAX_CONTACTS / members.length));
    for (const member of members) {
      member.updateMatrix();
      // An ingredient that rests on a few places only (a drumstick: its bulb and its knuckle, the
      // shank in the air): spots only under what touches the table, one group per place.
      if (entry.contactsFromFeet) {
        this.contacts.push(...feetSpots(member, MAX_CONTACTS));
        continue;
      }
      // A form with several bodies (the watermelon's two wedges) gets contact spots for each body
      // on its own, from only the part that rests on the table: measured as one shape, a spot
      // landed under the rind's arch, where nothing touches (the user, 2026-11-06).
      const bodies = member.children.filter((o): o is Mesh => o instanceof Mesh && o.name === member.children[0].name);
      if (bodies.length > 1) {
        const each = Math.max(1, Math.floor(spotsEach / bodies.length));
        for (const mesh of bodies) {
          const position = mesh.geometry.getAttribute('position') as BufferAttribute;
          const step = Math.max(1, Math.floor(position.count / 800));
          const points: Vector3[] = [];
          for (let i = 0; i < position.count; i += step) points.push(new Vector3().fromBufferAttribute(position, i));
          const all = transformed(points, member);
          const low = Math.min(...all.map((p) => p.y));
          const size = new Box3().setFromPoints(all).getSize(new Vector3());
          // Only what lies within a sliver of the table (a few percent of the body's size).
          const foot = all.filter((p) => p.y < low + Math.max(size.x, size.y, size.z) * 0.04);
          this.contacts.push(...footprintSpots(foot.length >= 10 ? foot : all, each));
        }
        continue;
      }
      let body = transformed(samplePoints(member, 'body', 600), member);
      // A tall piece (the watermelon's wedges, standing on their rind) only meets the table at its
      // foot: measured from the whole outline, a leaning wedge put a contact spot on the floor
      // under its top, where nothing touches. Keep its lowest quarter. Pieces wider than tall (an
      // apple, a cheese) are measured as before.
      const box = new Box3().setFromPoints(body);
      const height = box.max.y - box.min.y;
      if (height > Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.9) {
        const foot = body.filter((p) => p.y < box.min.y + height * 0.25);
        if (foot.length >= 20) body = foot;
      }
      this.contacts.push(...footprintSpots(body, spotsEach));
    }

    // Highlights and the room are placed round the whole subject (one body, or the cluster),
    // not round a prop it rests on (the butter's paper sheet).
    this.group.updateMatrixWorld(true);
    const around = new Box3();
    this.group.traverse((object) => {
      if (object instanceof Mesh && !PROPS.includes(object.name)) around.expandByObject(object);
    });
    const sphere = around.getBoundingSphere(new Sphere());
    this.centre.copy(sphere.center);
    this.radius = sphere.radius * RADIUS_FACTOR;
  }

  update(settings: Settings): boolean {
    for (const { material, palette } of this.painted) setPalette(material, softenPalette(palette, settings.light.strength));
    for (const mesh of this.playfulHidden) mesh.visible = !settings.brush.classic;
    return false;
  }

  colours(): Palette {
    return this.palette;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (object.material as ShaderMaterial).dispose();
      }
    });
  }
}

/**
 * Contact spots for an ingredient that rests on a few places only: every piece's points within a
 * sliver of the table, grouped by place (points close together on the table belong together),
 * each group with its own spots following its footprint. Nothing under the parts in the air.
 */
export function feetSpots(member: Group, most: number): { centre: Vector3; radius: number }[] {
  const all: Vector3[] = [];
  for (const object of member.children) {
    if (!(object instanceof Mesh) || PROPS.includes(object.name)) continue;
    const position = object.geometry.getAttribute('position') as BufferAttribute;
    const step = Math.max(1, Math.floor(position.count / 1500));
    const points: Vector3[] = [];
    for (let i = 0; i < position.count; i += step) points.push(new Vector3().fromBufferAttribute(position, i));
    all.push(...transformed(points, member));
  }
  const low = Math.min(...all.map((p) => p.y));
  const size = new Box3().setFromPoints(all).getSize(new Vector3());
  const foot = all.filter((p) => p.y < low + Math.max(size.x, size.y, size.z) * 0.03);
  // Group the foot points: each joins the first group with a point near it on the table.
  const near = Math.max(size.x, size.z) * 0.12;
  const groups: Vector3[][] = [];
  for (const p of foot) {
    const group = groups.find((g) => g.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < near));
    if (group) group.push(p);
    else groups.push([p]);
  }
  // The biggest places first; each gets at least one spot.
  groups.sort((a, b) => b.length - a.length);
  const kept = groups.slice(0, most);
  return kept.flatMap((g, i) => footprintSpots(g, i === 0 ? most - kept.length + 1 : 1));
}
