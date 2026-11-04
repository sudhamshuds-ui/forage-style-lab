import { Box3, Group, Mesh, Sphere, Vector3, type ShaderMaterial } from 'three';
import type { Settings } from '../params';
import { setPalette, softenPalette, type Palette, type StylizedLook } from '../shading/stylizedMaterial';
import { Apple } from './apple/apple';
import { mixHex } from '../utils/colour';
import { setSkin } from '../shading/effects/skinTexture';
import { FAMILIES } from './families';
import { seedFromId } from './forms/kit/random';
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
  readonly centre = new Vector3();
  radius = 1;
  private readonly apple: Apple;
  private readonly box = new Box3();

  constructor(
    readonly entry: IngredientEntry,
    look: StylizedLook,
  ) {
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

    const pieces = entry.form({ state: 'whole', seed: seedFromId(spec.id) });
    pieces.forEach((piece, index) => {
      const material = look.createMaterial({ doubleSided: piece.doubleSided });
      // A part can borrow another family (watermelon rind@green); the rest use the ingredient's own.
      const family = partFamilies.get(piece.role);
      const palette = family ? FAMILIES[family].colours : this.palette;
      // One main highlight per object (board 02): small parts keep theirs close to their own colour.
      const quiet = index === 0 ? palette : { ...palette, highlight: mixHex(palette.highlight, palette.base, 0.65) };
      this.painted.push({ material, palette: quiet });
      if (index === 0) setSkin(material, entry.skin);
      const mesh = new Mesh(piece.geometry, material);
      mesh.name = piece.role;
      mesh.castShadow = true;
      this.group.add(mesh);
    });

    // The first piece is the main body: highlights and the room are placed round it.
    const sphere = pieces[0].geometry.boundingSphere ?? new Sphere();
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
