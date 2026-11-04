import {
  AmbientLight,
  Color,
  DirectionalLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { Settings } from '../params';
import type { Stage } from '../scene/stage';
import type { StylizedLook } from '../shading/stylizedMaterial';
import { FAMILIES } from '../ingredients/families';
import { cmToUnits } from '../ingredients/scale';
import { formReport, type TRIANGLE_BUDGET } from '../ingredients/forms/kit/checks';
import type { FormPiece } from '../ingredients/forms/kit/piece';
import { findIngredient } from '../ingredients/registry';
import { LAYOUT_COUNT } from '../ingredients/layout';
import { createSubject, type Subject } from '../ingredients/subject';

/**
 * Dev-only checks from board 09 ("Look before you save"), in the browser
 * console:
 *   styleLab.report()      size in cm against size_cm, contact, triangles
 *   styleLab.silhouette()  the ingredient as a solid black shape (image URL)
 *   styleLab.lineUp()      the ingredient next to the apple at real size (image URL)
 *   styleLab.checks()      all of the above on one sheet over the page (click to close)
 */
export function devChecks(
  stage: Stage,
  look: StylizedLook,
  settings: Settings,
  getSubject: () => Subject,
  snapshot: () => string,
) {
  /** The subject's meshes as real-size pieces (works for the apple too). */
  const piecesOf = (subject: Subject): FormPiece[] => {
    subject.group.updateMatrixWorld(true);
    const toSubject = new Matrix4().copy(subject.group.matrixWorld).invert();
    const pieces: FormPiece[] = [];
    subject.group.traverse((object) => {
      if (object instanceof Mesh && object.visible) {
        const relative = new Matrix4().multiplyMatrices(toSubject, object.matrixWorld);
        pieces.push({ role: object.name || 'part', geometry: object.geometry.clone().applyMatrix4(relative) });
      }
    });
    return pieces;
  };

  const report = () => {
    const subject = getSubject();
    const { spec } = subject.entry;
    // A cluster: report one member (the hero) against the budget, which is per piece of food.
    const members = LAYOUT_COUNT[spec.layout];
    const pieces = piecesOf(subject);
    const hero = pieces.slice(0, pieces.length / members);
    const note = members > 1 ? `\ncluster     ${members} members (numbers above are the hero's)` : '';
    const text = `${spec.name}\n${formReport(hero, spec as { size_cm: [number, number, number]; archetype: keyof typeof TRIANGLE_BUDGET })}${note}`;
    console.log(text);
    return text;
  };

  /** Hide everything but the subject, paint it black on white, and keep the image. */
  const silhouette = () => {
    const subject = getSubject();
    const black = new MeshBasicMaterial({ color: 0x000000 });
    const swapped = new Map<Mesh, Material | Material[]>();
    const hidden: Object3D[] = [];
    subject.group.traverse((object) => {
      if (object instanceof Mesh) {
        swapped.set(object, object.material);
        object.material = black;
      }
    });
    for (const child of stage.scene.children) {
      if (child.visible && !isAncestor(child, subject.group)) {
        child.visible = false;
        hidden.push(child);
      }
    }
    const url = renderOnce(stage, stage.scene, stage.camera, 0xffffff);
    swapped.forEach((material, mesh) => (mesh.material = material));
    for (const child of hidden) child.visible = true;
    black.dispose();
    return url;
  };

  /** The ingredient on stage next to the apple, both at real size, plainly shaded. */
  const lineUp = (ids: string[] = ['apple', getSubject().entry.spec.id]) => {
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.4));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(-3, 5, 4);
    scene.add(sun);
    const floor = new Mesh(new PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xece8e1 }));
    scene.add(floor);

    const unique = [...new Set(ids)];
    const subjects = unique.map((id) => {
      const entry = findIngredient(id);
      if (!entry) throw new Error(`No ingredient "${id}"`);
      const subject = createSubject(entry, look);
      subject.update(settings, true);
      const colour = new Color(FAMILIES[entry.spec.family].colours.base);
      subject.group.traverse((object) => {
        if (object instanceof Mesh) object.material = new MeshLambertMaterial({ color: colour });
      });
      return subject;
    });

    // Stand them in a row, 2 cm apart, turned as on stage.
    let x = 0;
    const gap = cmToUnits(2);
    for (const subject of subjects) {
      subject.group.rotation.y = (subject.turn * Math.PI) / 180;
      subject.group.updateMatrixWorld(true);
      const width = subject.radius * 2.3;
      subject.group.position.x = x + width / 2;
      x += width + gap;
      scene.add(subject.group);
    }
    const middle = (x - gap) / 2;
    for (const subject of subjects) subject.group.position.x -= middle;

    // Back off far enough that the whole row fits across the (narrow) card.
    const camera = new PerspectiveCamera(28, stage.camera.aspect, 0.1, 200);
    const span = Math.max(x, cmToUnits(12)) * 1.15;
    const distance = span / 2 / (Math.tan((14 * Math.PI) / 180) * camera.aspect);
    camera.position.set(0, distance * 0.35, distance);
    camera.lookAt(new Vector3(0, cmToUnits(3), 0));
    const url = renderOnce(stage, scene, camera, 0xf4f1ec);
    for (const subject of subjects) subject.dispose();
    floor.geometry.dispose();
    stage.invalidate();
    return url;
  };

  /** The painted card, the silhouette and the line-up side by side, with the numbers underneath. */
  const checks = () => {
    document.getElementById('dev-checks')?.remove();
    const images = [snapshot(), silhouette(), lineUp()];
    const sheet = document.createElement('div');
    sheet.id = 'dev-checks';
    sheet.title = 'Click to close';
    sheet.style.cssText =
      'position:fixed;inset:0;z-index:99;background:#f4f1ec;display:flex;flex-direction:column;gap:10px;padding:14px;cursor:pointer;font:12px/1.4 ui-monospace,monospace';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;flex:1;min-height:0';
    for (const src of images) {
      const img = new Image();
      img.src = src;
      img.style.cssText = 'height:100%;min-width:0;object-fit:contain;border-radius:8px;background:#fff';
      row.append(img);
    }
    const text = document.createElement('pre');
    text.style.cssText = 'margin:0;white-space:pre-wrap';
    text.textContent = report();
    sheet.append(row, text);
    sheet.addEventListener('click', () => sheet.remove());
    document.body.append(sheet);
  };

  return { report, silhouette, lineUp, checks };
}

function isAncestor(candidate: Object3D, object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (o === candidate) return true;
  return false;
}

/** Render straight to the canvas (no painting) and grab the picture. */
function renderOnce(stage: Stage, scene: Scene, camera: PerspectiveCamera, clear: number): string {
  const renderer = stage.renderer;
  const previous = new Color();
  renderer.getClearColor(previous);
  const previousAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(null);
  renderer.setClearColor(clear, 1);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setClearColor(previous, previousAlpha);
  stage.invalidate();
  return url;
}
