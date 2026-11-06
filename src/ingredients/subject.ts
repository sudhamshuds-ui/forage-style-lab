import { Box3, Color, Group, Mesh, Sphere, Vector3, type ShaderMaterial } from 'three';
import type { Settings } from '../params';
import { setPalette, softenPalette, type Palette, type StylizedLook } from '../shading/stylizedMaterial';
import { Apple } from './apple/apple';
import { mixHex } from '../utils/colour';
import { CRUMB_SKIN, LABEL_SKIN, LEAF_SKIN, MELON_RIND_SKIN, setSkin } from '../shading/effects/skinTexture';
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
        const loud = hero && !entry.matte;
        const quiet = loud ? palette : { ...palette, highlight: mixHex(palette.highlight, palette.base, 0.65) };
        this.painted.push({ material, palette: quiet });
        if (hero) {
          setSkin(material, entry.skin);
          // Melon flesh fades into its rind: the pale band and the green come from the families.
          if (entry.skin.kind === 'melon') {
            (material.uniforms.uMelonPale.value as Color).set(FAMILIES['pale-green'].colours.lit);
            (material.uniforms.uMelonGreen.value as Color).set(FAMILIES.green.colours.base);
          }
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
