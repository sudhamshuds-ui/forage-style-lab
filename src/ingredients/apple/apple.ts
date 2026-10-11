import { BufferGeometry, Group, Mesh, ShaderMaterial, Vector3 } from 'three';
import type { Settings } from '../../params';
import { setPalette, type StylizedLook } from '../../shading/stylizedMaterial';
import { mixHex } from '../../utils/colour';
import { AppleBody, toAppleShape } from './appleBody';
import { buildStemGeometry } from './stem';
import { buildLeafGeometry } from './leaf';

/**
 * The whole apple: body + stem + optional leaf, grouped together.
 *
 * `rebuild` reshapes everything from the Shape sliders.
 * `applyColours` sets each part's palette from the Colour pickers.
 */
export class Apple {
  readonly group = new Group();
  /** Lowest point of the apple, so the floor (and its shadow) can sit right under it. */
  bottomY = -1;
  /** Centre and rough radius of the body, used to place the highlight shape. */
  readonly centre = new Vector3();
  radius = 1;

  private readonly body = new AppleBody();
  private readonly bodyMesh: Mesh;
  private readonly stemMesh: Mesh;
  private readonly leafMesh: Mesh;
  private readonly materials: { body: ShaderMaterial; stem: ShaderMaterial; leaf: ShaderMaterial };
  private readonly anchor = new Vector3();

  constructor(look: StylizedLook) {
    this.materials = {
      body: look.createMaterial(),
      stem: look.createMaterial(),
      leaf: look.createMaterial({ doubleSided: true }),
    };
    this.bodyMesh = new Mesh(this.body.geometry, this.materials.body);
    this.stemMesh = new Mesh(new BufferGeometry(), this.materials.stem);
    this.leafMesh = new Mesh(new BufferGeometry(), this.materials.leaf);
    for (const mesh of [this.bodyMesh, this.stemMesh, this.leafMesh]) {
      mesh.castShadow = true;
      this.group.add(mesh);
    }
  }

  rebuild(settings: Settings['shape']): void {
    const shape = toAppleShape(settings);
    this.body.update(shape);
    this.body.topCentre(shape, this.anchor);

    replaceGeometry(this.stemMesh, buildStemGeometry(this.anchor, shape));
    this.leafMesh.visible = settings.leaf;
    if (settings.leaf) replaceGeometry(this.leafMesh, buildLeafGeometry(this.anchor, shape));

    this.bottomY = this.body.geometry.boundingBox?.min.y ?? -1;
    const sphere = this.body.geometry.boundingSphere;
    if (sphere) {
      this.centre.copy(sphere.center);
      // The bounding sphere reaches the corners; the planes sit a little further in.
      this.radius = sphere.radius * 0.88;
    }
  }

  applyColours(colour: Settings['colour']): void {
    setPalette(this.materials.body, {
      base: colour.base,
      lit: colour.lit,
      shadow: colour.shadow,
      highlight: colour.highlight,
    });
    // The stem and leaf borrow the apple's shadow and highlight colours, so the
    // whole object shares one light, like a painter using one shadow mix.
    setPalette(this.materials.stem, {
      base: colour.stem,
      lit: mixHex(colour.stem, colour.highlight, 0.3),
      shadow: mixHex(colour.stem, colour.shadow, 0.6),
      highlight: mixHex(colour.stem, colour.highlight, 0.55),
    });
    setPalette(this.materials.leaf, {
      base: colour.leaf,
      lit: mixHex(colour.leaf, colour.highlight, 0.3),
      shadow: mixHex(colour.leaf, colour.shadow, 0.55),
      highlight: mixHex(colour.leaf, colour.highlight, 0.5),
    });
  }
}

function replaceGeometry(mesh: Mesh, geometry: BufferGeometry): void {
  mesh.geometry.dispose();
  mesh.geometry = geometry;
}
