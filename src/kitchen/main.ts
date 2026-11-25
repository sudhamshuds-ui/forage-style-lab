import { EASE, gsap, prefersReducedMotion } from '../motion';
import { loadPhysics } from '../dishes/kit/physics';
import '../style.css';
import '../ui/styleBar.css';
import './kitchen.css';
import { Group, Mesh, Raycaster, Vector2, Vector3, type IUniform, type ShaderMaterial } from 'three';
import { defaultSettings } from '../params';
import { applyPalette, findPalette } from '../palettes';
import { Stage } from '../scene/stage';
import { Background, MAX_CONTACTS, roomHorizonUv } from '../scene/background';
import { Ground } from '../scene/ground';
import { cameraAzimuth, contactHeight, frameSubject, outlinePoints } from '../scene/framing';
import { StylizedLook } from '../shading/stylizedMaterial';
import { EFFECT_STACK } from '../shading/effects';
import type { FrameContext } from '../shading/effect';
import { FAMILIES } from '../ingredients/families';
import { REGISTRY, findIngredient, type IngredientEntry } from '../ingredients/registry';
import { DISHES } from '../dishes/dishes';
import { REVEAL_STARTS, ShuffleTransition } from '../painting/transition';
import { createSubject, type Subject } from '../ingredients/subject';
import { PROPS } from '../ingredients/forms/kit/checks';
import { cmToUnits } from '../ingredients/scale';
import { Painter, type PaintFrame } from '../painting/painter';
import { OutlineTracer } from './outline';
import { mountTray } from './tray';
import { mountCookPanel } from './panel';
import { mountStyleBar } from '../ui/styleBar';
import { paintLike } from '../randomize';

/**
 * The kitchen: up to three ingredients on the table at once, ready to cook.
 *
 * It reuses the Style Lab's whole painting pipeline (stage, room, shader, painter); what is new
 * is that the stage holds several ingredients ("items") instead of one subject:
 *
 *   tray (tray.ts)      the row of ingredients under the card; drag one onto the card
 *   items (this file)   what is on the table: arranged, framed, hovered, selected, removed
 *   outline (outline.ts) the dashed line and overlay on the hovered or selected ingredient
 *   panel (panel.ts)    the cooking choices beside the card
 *
 * All the items sit in one layer (`framed`), like a pre-comp: each item keeps its real size
 * inside it, and the layer is scaled so the whole group fills the card with room to breathe.
 */

/** How many ingredients the table takes (the user, 2026-11-16: "max 3 ... to make things simpler"). */
export const MAX_ITEMS = 3;
/** The room an empty table sits in. */
const EMPTY_ROOM = 'linen';
/** The gap left between two ingredients on the table (cm). */
const GAP_CM = 1.4;

const settings = defaultSettings();
const card = document.getElementById('card') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
// Cooked dishes are plated with real physics: the engine loads once, before anything is built.
await loadPhysics();

const stage = new Stage(canvas, card);
const look = new StylizedLook(EFFECT_STACK);
const background = new Background();
const ground = new Ground();
const framed = new Group();
const painter = new Painter();
const tracer = new OutlineTracer();
// Cook and Back paint for longer than New ingredient does (the user, 2026-11-16: "the painting
// transition can be longer").
const COOK_SECONDS = 2.4;
const transition = new ShuffleTransition(COOK_SECONDS);
stage.scene.add(background.mesh, ground.mesh, framed);
stage.onResize = (width, height) => {
  painter.setSize(width, height);
  tracer.setSize(stage.size.width, stage.size.height);
  transition.setSize(width, height);
  relayout(false);
};

/** One ingredient on the table. */
interface Item {
  id: string;
  subject: Subject;
  /** Half its width and depth on the table once turned to face the camera (scene units). */
  half: { x: number; z: number };
  /** Its footprint on the table: outline points (x, z) around its own centre, scene units. */
  foot: Array<[number, number]>;
  /** How tall it stands (scene units): the tallest of three goes at the back. */
  height: number;
  /** Where it sits in the layer now, and where it is heading. */
  position: Vector3;
  target: Vector3;
  /** 0 to 1: how far it has popped in (it grows from nothing; shrinks again when removed). */
  pop: number;
  leaving: boolean;
  /** True until its first update (the apple builds its shape then). */
  fresh: boolean;
  /**
   * Its own copies of the values the shader normally shares between every ingredient: where
   * its highlight sits, whether it takes rim glints, how much shadow colour, its size.
   */
  own: { anchor: IUniform<Vector3>; rimGlints: IUniform<number>; shadowMix: IUniform<number>; size: IUniform<number> };
  worldCentre: Vector3;
}

const items: Item[] = [];
/** The layer's zoom: its scale now (tweened toward the scale that fits the group). */
const view = { scale: 1 };
let groundY = contactHeight(stage.framingCamera);

let hovered: Item | null = null;
let selected: Item | null = null;
/** True while a tray tile is being dragged (the outline hides, the spin pauses). */
let trayDragging = false;

const context: FrameContext = {
  lightDirection: new Vector3(),
  cameraPosition: new Vector3(),
  cameraRight: new Vector3(),
  objectCentre: new Vector3(),
  objectRadius: 1,
  groundY: -1,
  objectColours: FAMILIES['cream-crust'].colours,
  contacts: [],
};
const paintFrame: PaintFrame = {
  lightScreen: new Vector2(0, 1),
  objectUv: new Vector2(0.5, 0.5),
  objectRadius: 0.2,
  objectBase: context.objectColours.base,
  pieces: [],
  horizonUv: null,
};

/* ---------- Putting ingredients on the table ---------- */

const isProp = (mesh: Mesh) => PROPS.includes(mesh.name);
const staying = () => items.filter((item) => !item.leaving);

function makeItem(id: string): Item | null {
  const entry = findIngredient(id);
  return entry ? makeItemFrom(entry) : null;
}

/** Build anything described by an entry: a pantry ingredient, or a finished dish. */
function makeItemFrom(entry: IngredientEntry): Item {
  const id = entry.spec.id;
  const subject = createSubject(entry, look);
  subject.update(settings, true);
  // Each ingredient gets its own highlight spot and shadow settings (the shader shares one set
  // between all materials, which was fine while only one ingredient was ever on stage).
  const own: Item['own'] = {
    anchor: { value: new Vector3() },
    rimGlints: { value: 1 },
    shadowMix: { value: 1 },
    size: { value: 1 },
  };
  subject.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as ShaderMaterial;
    material.uniforms = {
      ...material.uniforms,
      uHighlightAnchor: own.anchor,
      uRimGlints: own.rimGlints,
      uShadowMix: own.shadowMix,
      uObjectSize: own.size,
    };
  });
  // Its footprint once turned the way it will sit (the registry's turn, measured from the camera).
  subject.group.rotation.y = (subject.turn * Math.PI) / 180;
  subject.group.position.set(0, 0, 0);
  subject.group.updateMatrixWorld(true);
  const points = outlinePoints(subject.group, 400, (mesh) => !isProp(mesh));
  let hx = 0.01;
  let hz = 0.01;
  let height = 0.01;
  for (const p of points) {
    hx = Math.max(hx, Math.abs(p.x));
    hz = Math.max(hz, Math.abs(p.z));
    height = Math.max(height, p.y);
  }
  return {
    id,
    subject,
    half: { x: hx, z: hz },
    foot: points.filter((_, i) => i % 3 === 0).map((p) => [p.x, p.z] as [number, number]),
    height,
    position: new Vector3(),
    target: new Vector3(),
    pop: 0,
    leaving: false,
    fresh: false,
    own,
    worldCentre: new Vector3(),
  };
}

/*
 * Ready-made ingredients. Building an ingredient and compiling its paint (shaders) for the
 * graphics chip takes a moment, and done at the drop it froze the whole page for seconds (the
 * user, 2026-11-16). So every ingredient showing in the tray is prepared ahead, in the
 * background, in idle moments: built, then compiled without blocking the screen. A drop then
 * only has to put it on the table. Like pre-rendering the next shots.
 */
const ready = new Map<string, Item>();
const queue: string[] = [];
let preparing = false;

function whenIdle(job: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(job, { timeout: 1200 });
  else window.setTimeout(job, 120);
}

function prepareNext(): void {
  if (preparing) return;
  const id = queue.shift();
  if (id === undefined) return;
  if (ready.has(id) || items.some((item) => item.id === id)) return prepareNext();
  preparing = true;
  whenIdle(() => {
    const item = makeItem(id);
    const done = () => {
      preparing = false;
      prepareNext();
    };
    if (!item) return done();
    // Compile for the hidden image the scene is really painted into (painter.underpainting).
    // Compiled for the screen instead, the paint was built a second time at the drop, which
    // was the pause that was still there (the user, 2026-11-16).
    const before = stage.renderer.getRenderTarget();
    stage.renderer.setRenderTarget(painter.underpainting);
    const compiling = stage.renderer.compileAsync(item.subject.group, stage.camera, stage.scene);
    stage.renderer.setRenderTarget(before);
    compiling
      .catch(() => undefined)
      .then(() => {
        // Still wanted? (The tray may have been shuffled meanwhile.)
        if (wanted.has(id) && !ready.has(id) && !items.some((entry) => entry.id === id)) ready.set(id, item);
        else item.subject.dispose();
        done();
      });
  });
}

/** The ingredients showing in the tray: keep exactly these ready. */
let wanted = new Set<string>();
function keepReady(ids: string[]): void {
  wanted = new Set(ids);
  for (const [id, item] of ready) {
    if (wanted.has(id)) continue;
    item.subject.dispose();
    ready.delete(id);
  }
  queue.splice(0, queue.length, ...ids);
  prepareNext();
}

/**
 * Where each ingredient sits (in the layer: +x to the right of the starting view, +z toward it).
 * One: the middle. Two: side by side, the second a little further back. Three: the tallest
 * behind, the other two in front of it, left and right, so nothing hides.
 */
function arrange(list: Item[]): void {
  // Room between neighbours: a couple of centimetres, more beside big things, so nothing looks
  // squeezed together and no shadow falls right across its neighbour (the user, 2026-11-16:
  // "some ingredient combinations feel really close").
  const gapFor = (a: Item, b: Item) => cmToUnits(GAP_CM) + 0.05 * Math.min(a.half.x + a.half.z, b.half.x + b.half.z);
  if (list.length === 1) list[0].target.set(0, 0, 0);
  if (list.length === 2) {
    const [a, b] = list;
    const total = 2 * a.half.x + 2 * b.half.x + gapFor(a, b);
    a.target.set(-total / 2 + a.half.x, 0, Math.min(a.half.z, b.half.z) * 0.2);
    b.target.set(total / 2 - b.half.x, 0, -Math.min(a.half.z, b.half.z) * 0.2);
  }
  if (list.length === 3) {
    // The tallest goes behind, the other two in front of it, side by side. Each one keeps its
    // whole footprint to itself: the back one starts where the front ones end.
    const back = [...list].sort((p, q) => q.height - p.height)[0];
    const [a, b] = list.filter((item) => item !== back);
    const total = 2 * a.half.x + 2 * b.half.x + gapFor(a, b);
    const frontDepth = Math.max(a.half.z, b.half.z);
    const gap = Math.max(gapFor(a, back), gapFor(b, back));
    a.target.set(-total / 2 + a.half.x, 0, 0);
    b.target.set(total / 2 - b.half.x, 0, 0);
    back.target.set(0, 0, -frontDepth - gap - back.half.z);
    // Centre the group front to back.
    const shift = (frontDepth + (back.target.z - back.half.z)) / 2;
    for (const item of list) item.target.z -= shift;
  }
  if (list.length > 1) tighten(list, gapFor, list.length === 3 ? [...list].sort((p, q) => q.height - p.height)[0] : null);
}

/** The closest two footprints come at their targets (scene units). */
function footGap(a: Item, b: Item): number {
  let best = Infinity;
  for (const [ax, az] of a.foot) {
    const x = ax + a.target.x - b.target.x;
    const z = az + a.target.z - b.target.z;
    for (const [bx, bz] of b.foot) best = Math.min(best, (x - bx) ** 2 + (z - bz) ** 2);
  }
  return Math.sqrt(best);
}

/**
 * Close up the spaces the boxes leave. Each one is placed by its box, but a long ingredient on a
 * diagonal (the romaine) fills only part of its box, so its neighbours sat far off (the user,
 * 2026-11-16: "spacing sometimes when bigger ingredient arrives is a lot"). Each slides toward
 * the others by at most what keeps the gap to its nearest neighbour, so nothing ever overlaps.
 */
function tighten(list: Item[], gapFor: (a: Item, b: Item) => number, back: Item | null): void {
  for (let round = 0; round < 10; round++) {
    let moved = 0;
    for (const item of list) {
      const others = list.filter((other) => other !== item);
      const cx = others.reduce((sum, o) => sum + o.target.x, 0) / others.length;
      const cz = others.reduce((sum, o) => sum + o.target.z, 0) / others.length;
      // Side by side ones slide only sideways and the one behind only forward, so the layout
      // keeps its shape and nothing slides in front of another.
      const dx = item === back ? 0 : cx - item.target.x;
      const dz = item === back ? cz - item.target.z : 0;
      const length = Math.hypot(dx, dz);
      if (length < 1e-4) continue;
      const room = Math.min(...others.map((o) => footGap(item, o) - gapFor(item, o)));
      const step = Math.min(room * 0.9, length);
      if (step <= 1e-4) continue;
      item.target.x += (dx / length) * step;
      item.target.z += (dz / length) * step;
      moved += step;
    }
    if (moved < 1e-3) break;
  }
  // Centre the group on its footprints again.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const item of list) {
    for (const [x, z] of item.foot) {
      minX = Math.min(minX, x + item.target.x);
      maxX = Math.max(maxX, x + item.target.x);
      minZ = Math.min(minZ, z + item.target.z);
      maxZ = Math.max(maxZ, z + item.target.z);
    }
  }
  for (const item of list) {
    item.target.x -= (minX + maxX) / 2;
    item.target.z -= (minZ + maxZ) / 2;
  }
}

/**
 * Work out where everything should sit and how far to zoom, then move there. Like a camera
 * operator re-framing after someone joins or leaves the shot: the group is re-centred and the
 * zoom leaves the same breathing room round it.
 */
function relayout(animate = true): void {
  const list = staying();
  arrange(list);
  groundY = contactHeight(stage.framingCamera);

  let scale = view.scale;
  if (list.length > 0) {
    // Measure the group as it will be: everything at its target, full size, nothing leaving.
    framed.position.set(0, 0, 0);
    framed.rotation.set(0, cameraAzimuth(stage.homeCamera), 0);
    framed.scale.setScalar(1);
    for (const item of items) {
      item.subject.group.visible = !item.leaving;
      item.subject.group.position.copy(item.target);
      item.subject.group.scale.setScalar(1);
    }
    framed.updateMatrixWorld(true);
    const subjects = list.flatMap((item) => outlinePoints(item.subject.group, 400, (mesh) => !isProp(mesh)));
    const props = list.flatMap((item) => outlinePoints(item.subject.group, 200, isProp));
    scale = frameSubject(subjects, stage.framingCamera, props).scale;
    for (const item of items) item.subject.group.visible = true;
  }

  const instant = !animate || prefersReducedMotion();
  const duration = instant ? 0 : 0.55;
  gsap.killTweensOf(view);
  gsap.to(view, { scale, duration, ease: EASE.out, onUpdate: () => stage.invalidate() });
  for (const item of list) {
    gsap.killTweensOf(item.position);
    gsap.to(item.position, { x: item.target.x, y: 0, z: item.target.z, duration, ease: EASE.out });
    if (item.pop < 1) {
      // It settles to full size with no bounce (the bounce was "a lot", the user, 2026-11-16).
      gsap.killTweensOf(item);
      gsap.to(item, { pop: 1, duration: instant ? 0 : 0.4, ease: EASE.out });
    }
  }
  stage.invalidate();
}

/** The room follows the first ingredient on the table; an empty table sits in a calm linen room. */
function applyRoom(): void {
  const first = staying()[0];
  const room = findPalette(first ? (first.subject.entry.room ?? FAMILIES[first.subject.entry.spec.family].rooms[0]) : EMPTY_ROOM);
  if (room) applyPalette(settings, room);
}

/**
 * A short dissolve when the picture changes all at once (another room): the painting as it was
 * is copied onto a layer over the card and fades away over the new one (the Style Lab's
 * look-change crossfade).
 */
const crossfadeLayer = document.createElement('canvas');
crossfadeLayer.className = 'card-crossfade';
crossfadeLayer.setAttribute('aria-hidden', 'true');
canvas.after(crossfadeLayer);
function crossfade(change: () => void, seconds = 0.3): void {
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame);
  const source = stage.renderer.domElement;
  crossfadeLayer.width = source.width;
  crossfadeLayer.height = source.height;
  crossfadeLayer.getContext('2d')?.drawImage(source, 0, 0);
  gsap.killTweensOf(crossfadeLayer);
  gsap.fromTo(crossfadeLayer, { opacity: 1 }, { opacity: 0, duration: seconds, ease: EASE.fade });
  change();
  stage.invalidate();
}

function onStage(id: string): boolean {
  return staying().some((item) => item.id === id);
}

/** Add an ingredient to the table. Returns false if it is already there or the table is full. */
function addIngredient(id: string, animate = true): boolean {
  if (mode !== 'table') return false;
  if (onStage(id) || staying().length >= MAX_ITEMS) return false;
  // The ready-made one if there is one (the usual case), else build it now.
  const item = ready.get(id) ?? makeItem(id);
  ready.delete(id);
  if (!item) return false;
  // It fades in over the picture as it was (the crossfade) while it eases up from nine tenths
  // of its size, and the others slide over to make room. Nothing pops out of nowhere.
  const change = () => {
    items.push(item);
    framed.add(item.subject.group);
    item.leaving = false;
    item.pop = animate ? 0.9 : 1;
    arrange(staying());
    item.position.copy(item.target);
    applyRoom();
    relayout(animate);
  };
  if (animate && !prefersReducedMotion()) crossfade(change, 0.28);
  else change();
  select(null);
  changed();
  return true;
}

/** Take an ingredient off the table: it shrinks away, then the others re-centre. */
function removeIngredient(id: string): void {
  if (mode !== 'table') return;
  const item = staying().find((entry) => entry.id === id);
  if (!item) return;
  item.leaving = true;
  if (selected === item) select(null);
  if (hovered === item) hovered = null;
  gsap.killTweensOf(item);
  gsap.killTweensOf(item.position);
  // It fades away (the crossfade) and the others re-centre. If its tile is still in the tray it
  // goes back to the ready-made ones, so dropping it again is instant.
  const change = () => {
    framed.remove(item.subject.group);
    items.splice(items.indexOf(item), 1);
    if (wanted.has(item.id)) ready.set(item.id, item);
    else item.subject.dispose();
    applyRoom();
    relayout();
  };
  if (prefersReducedMotion()) change();
  else crossfade(change, 0.24);
  changed();
}

/* ---------- Hover and selection ---------- */

const overlay = document.getElementById('outline') as unknown as SVGSVGElement;
const outlineFill = overlay.querySelector('.outline-fill') as SVGPathElement;
const outlineShade = overlay.querySelector('.outline-shade') as SVGPathElement;
const outlineDash = overlay.querySelector('.outline-dash') as SVGPathElement;
const removeButton = document.getElementById('remove-item') as HTMLButtonElement;

function select(item: Item | null): void {
  selected = item;
  removeButton.hidden = !item;
  if (item) removeButton.setAttribute('aria-label', `Remove ${item.subject.entry.spec.name.toLowerCase()}`);
  stage.invalidate();
}

/** Redraw the dashed outline for whichever ingredient is selected (or just hovered). */
function drawOutline(): void {
  const item = trayDragging || mode !== 'table' ? null : (selected ?? hovered);
  if (!item || item.leaving) {
    overlay.dataset.state = 'off';
    removeButton.hidden = true;
    return;
  }
  const others = staying()
    .filter((other) => other !== item)
    .map((other) => other.subject.group);
  // Props (the butter's paper) are not part of the ingredient's outline.
  const props: Mesh[] = [];
  framed.traverse((object) => {
    if (object instanceof Mesh && isProp(object)) props.push(object);
  });
  const traced = tracer.trace(stage.renderer, stage.scene, stage.camera, item.subject.group, others, [background.mesh, ground.mesh, ...props]);
  overlay.setAttribute('viewBox', `0 0 ${traced.width} ${traced.height}`);
  outlineFill.setAttribute('d', traced.path);
  outlineShade.setAttribute('d', traced.path);
  outlineDash.setAttribute('d', traced.path);
  overlay.dataset.state = item === selected ? 'selected' : 'hover';
  // The remove button sits by the top right of the selected ingredient, inside the card.
  if (item === selected && traced.box) {
    const x = Math.min(0.94, Math.max(0.06, (traced.box.maxX + 10) / traced.width));
    const y = Math.min(0.9, Math.max(0.06, (traced.box.minY + 6) / traced.height));
    removeButton.style.left = `${x * 100}%`;
    removeButton.style.top = `${y * 100}%`;
    removeButton.hidden = false;
  }
}

const raycaster = new Raycaster();
const pointer = new Vector2();
/** Which ingredient is under a point on the page (client coordinates), if any. */
function itemAt(clientX: number, clientY: number): Item | null {
  // A finished dish is one picture: nothing in it is picked.
  if (mode !== 'table') return null;
  const rect = canvas.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
  raycaster.setFromCamera(pointer, stage.camera);
  const list = staying();
  const hits = raycaster.intersectObjects(
    list.map((item) => item.subject.group),
    true,
  );
  for (const hit of hits) {
    if (hit.object instanceof Mesh && isProp(hit.object)) continue;
    const found = list.find((item) => {
      let node: typeof hit.object | null = hit.object;
      while (node) {
        if (node === item.subject.group) return true;
        node = node.parent;
      }
      return false;
    });
    if (found) return found;
  }
  return null;
}

let pressedAt: { x: number; y: number } | null = null;
canvas.addEventListener('pointermove', (event) => {
  // While a button is held the view is being turned: no hover changes mid-drag.
  if (event.buttons !== 0) return;
  const item = itemAt(event.clientX, event.clientY);
  if (item !== hovered) {
    hovered = item;
    canvas.style.cursor = item ? 'pointer' : '';
    stage.invalidate();
  }
});
canvas.addEventListener('pointerleave', () => {
  if (hovered) {
    hovered = null;
    canvas.style.cursor = '';
    stage.invalidate();
  }
});
canvas.addEventListener('pointerdown', (event) => (pressedAt = { x: event.clientX, y: event.clientY }));
canvas.addEventListener('pointerup', (event) => {
  // A click, not a drag of the view: select what is under it, or clear the selection.
  if (!pressedAt || Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 5) return;
  select(itemAt(event.clientX, event.clientY));
});
removeButton.addEventListener('click', () => {
  if (selected) removeIngredient(selected.id);
});
// A press anywhere outside the card lets go of the selection too (the user, 2026-11-16). A tile
// already on the table still selects its ingredient: its click comes after this.
document.addEventListener('pointerdown', (event) => {
  if (selected && !card.contains(event.target as Node)) select(null);
});
window.addEventListener('keydown', (event) => {
  if (!selected) return;
  if (event.key === 'Escape') select(null);
  if (event.key === 'Delete' || event.key === 'Backspace') removeIngredient(selected.id);
});

/* ---------- The controls: tray, Cook, brush, cooking panel ---------- */

const emptyHint = document.getElementById('empty-hint') as HTMLElement;

const tray = mountTray(document.getElementById('tray') as HTMLElement, {
  pantry: REGISTRY.filter((entry) => !entry.shelved).map((entry) => ({ id: entry.spec.id, name: entry.spec.name })),
  card,
  canAdd: (id) => !onStage(id) && staying().length < MAX_ITEMS,
  add: addIngredient,
  isUsed: onStage,
  onDragState: (dragging) => {
    trayDragging = dragging;
    stage.invalidate();
  },
  onUsedClick: (id) => select(staying().find((item) => item.id === id) ?? null),
  onDeal: keepReady,
});

const cookPanel = mountCookPanel(document.getElementById('cook-panel') as HTMLElement, {
  onCook: () => cook(),
});

/** Something on the table changed: update everything that depends on it. */
function changed(): void {
  const count = staying().length;
  // No ingredient, nothing to cook (the user, 2026-11-16).
  // Only the table decides it, never the mode: the panel is hidden and untouchable away from the
  // table, and a Cook that greyed out while hidden came back in two steps, a grey pill fading in,
  // then turning dark (the user, 2026-11-16). cook() itself only runs at the table.
  cookPanel.setCanCook(count > 0);
  emptyHint.dataset.show = String(count === 0);
  card.dataset.full = String(count >= MAX_ITEMS);
  tray.refresh();
}

/*
 * The brush on the card (the Style Lab's own control, ui/styleBar.tsx): it switches the painterly
 * look, and its arrow opens the painters. Cook lives in the side panel.
 */
mountStyleBar(document.getElementById('bar-root') as HTMLElement, {
  shuffle: () => undefined,
  onBusy: () => () => undefined,
  painterly: () => settings.brush.classic,
  painter: () => settings.brush.painter,
  setPainterly: (on) => crossfade(() => (settings.brush.classic = on), 0.22),
  setPainter: (id) =>
    crossfade(() => {
      Object.assign(settings.brush, paintLike(id));
      settings.brush.classic = true;
    }, 0.22),
  swapSeconds: 0,
  // The brush alone, at the card's top right; its painters open downward.
  brushOnly: true,
  menuSide: 'bottom',
});

/* ---------- Cooking: from the table to the dish, and back ---------- */

/**
 * Where we are: the table (ingredients, tray, panel), cooking (the transition to the dish is
 * playing), the dish (the result screen), returning (the transition back has begun) or
 * settling (the table is being painted back in). The page shows and hides its parts from this (`data-mode` on
 * the body, kitchen.css).
 */
type Mode = 'table' | 'cooking' | 'dish' | 'returning' | 'settling';
let mode: Mode = 'table';
/** The table's ingredients, set aside while the dish is on the card. */
let parked: Item[] = [];
/** The dish, built ahead in the background like the tray's ingredients. */
let dishItem: Item | null = null;

const pageTitle = document.getElementById('page-title') as HTMLElement;
const dishText = document.getElementById('dish-text') as HTMLElement;
const saveButton = document.getElementById('btn-save') as HTMLButtonElement;
const backButton = document.getElementById('btn-back') as HTMLButtonElement;

function setMode(next: Mode): void {
  mode = next;
  document.body.dataset.mode = next;
  changed();
}

/** The words that go with the picture: the page's title becomes the dish's name. */
function setWords(dish: (typeof DISHES)[number] | null): void {
  // The description (it fades and rises in CSS, a beat behind the title).
  if (dish) dishText.textContent = dish.description;
  document.body.dataset.words = dish ? 'dish' : 'forage';
  const text = dish ? dish.title : 'Forage';
  if (prefersReducedMotion()) {
    pageTitle.textContent = text;
    pageTitle.style.opacity = '';
    return;
  }
  // The title dissolves into the new one: the old words soften and lift away, the new ones
  // rise into place more slowly. (A plain swap made them "appear suddenly and disappear
  // suddenly", the user, 2026-11-16.) A new change takes over from wherever the last one was.
  gsap.killTweensOf(pageTitle);
  // Already faded away (Cook hides "Forage" at once): the new words only come in.
  const hidden = Number(gsap.getProperty(pageTitle, 'opacity')) < 0.05;
  gsap
    .timeline()
    .to(pageTitle, { opacity: 0, y: -4, filter: 'blur(4px)', duration: hidden ? 0 : 0.2, ease: EASE.out })
    .call(() => (pageTitle.textContent = text))
    .fromTo(pageTitle, { opacity: 0, y: 6, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: EASE.out, clearProps: 'transform,filter,opacity' });
}

/** The title leaves at once (Cook: "Forage" should go the moment it is clicked, the user, 2026-11-16). */
function hideTitle(): void {
  if (prefersReducedMotion()) return void (pageTitle.style.opacity = '0');
  gsap.killTweensOf(pageTitle);
  gsap.to(pageTitle, { opacity: 0, y: -4, filter: 'blur(4px)', duration: 0.18, ease: EASE.out });
}

/** Put a different set of things on the card at once (no animation of its own). */
function swapStage(next: Item[]): void {
  for (const item of items) framed.remove(item.subject.group);
  items.splice(0, items.length, ...next);
  for (const item of next) {
    framed.add(item.subject.group);
    item.pop = 1;
    item.leaving = false;
  }
  applyRoom();
  relayout(false);
  for (const item of next) item.position.copy(item.target);
}

/**
 * The painted transition, the same one New ingredient plays in the Style Lab (the user,
 * 2026-11-16): the picture is smudged away by brush strokes, then the next one is painted in.
 * Halfway (as the reveal begins) what is on the card is swapped; the slow turn never stops.
 */
function playSwap(next: Item[], atSwap: () => void, done: () => void, nearlyDone?: () => void): void {
  select(null);
  hovered = null;
  if (prefersReducedMotion()) {
    crossfade(() => swapStage(next), 0.3);
    atSwap();
    nearlyDone?.();
    done();
    return;
  }
  update();
  transition.begin(stage.renderer, painter.strokeCell(settings), settings.brush.type === 'round' ? 1 : 0, paintFrame.objectUv);
  let swapped = false;
  let told = false;
  const tell = () => {
    if (told) return;
    told = true;
    nearlyDone?.();
  };
  const swap = () => {
    swapped = true;
    swapStage(next);
    atSwap();
  };
  stage.takeOver((delta) => {
    if (!swapped && transition.progress >= REVEAL_STARTS) swap();
    if (transition.progress >= NEARLY_PAINTED) tell();
    update();
    painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, swapped ? transition.stillTo : transition.stillFrom);
    transition.setCentre(swapped ? 'to' : 'from', paintFrame.objectUv);
    if (transition.step(stage.renderer, delta)) {
      if (!swapped) swap();
      tell();
      stage.release();
      done();
    }
  });
}

/** How far through the painting the dish counts as nearly painted in (0 to 1). */
const NEARLY_PAINTED = 0.85;

/** Cook: the ingredients are painted away and the dish is painted in. */
function cook(): void {
  if (mode !== 'table' || staying().length === 0) return;
  // For now every combination makes the one dish that exists (see src/dishes/dishes.ts).
  const dish = DISHES[0];
  const item = dishItem ?? makeItemFrom(dish.entry);
  dishItem = item;
  parked = staying();
  hideTitle();
  setMode('cooking');
  // The name, the description and the buttons wait until the dish is almost painted in and
  // clearly visible (the user, 2026-11-16), not the moment the reveal starts.
  playSwap(
    [item],
    () => undefined,
    () => setMode('dish'),
    () => setWords(dish),
  );
}

/** Back to the table, with the same ingredients as before. */
function backToTable(): void {
  if (mode !== 'dish') return;
  // The dish's name leaves at once, with its description (the user, 2026-11-16).
  hideTitle();
  setMode('returning');
  // The card moves home at once (CSS, returning); "Forage", the tray, the brush and the panel come
  // in together once the table is nearly painted in, like the dish's words.
  playSwap(
    parked,
    () => undefined,
    () => {
      parked = [];
      setMode('table');
    },
    () => {
      setWords(null);
      setMode('settling');
    },
  );
}
backButton.addEventListener('click', backToTable);
// Saving a recipe card is the next step: the button is here to try the layout.
saveButton.addEventListener('click', () => undefined);

// Build the dish ahead, once the page has settled, and get the transition's own paint ready.
window.setTimeout(() => {
  transition.warmUp(stage.renderer);
  stage.invalidate();
  whenIdle(() => {
    if (dishItem) return;
    const item = makeItemFrom(DISHES[0].entry);
    const before = stage.renderer.getRenderTarget();
    stage.renderer.setRenderTarget(painter.underpainting);
    const compiling = stage.renderer.compileAsync(item.subject.group, stage.camera, stage.scene);
    stage.renderer.setRenderTarget(before);
    compiling.catch(() => undefined).then(() => {
      if (dishItem) item.subject.dispose();
      else dishItem = item;
    });
  });
}, 2500);

/* ---------- Each frame ---------- */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const projected = new Vector3();
const projectedTop = new Vector3();
const projectedLight = new Vector3();
const view3 = new Vector3();
const half3 = new Vector3();

function update(): void {
  // Place the layer and everything in it.
  framed.rotation.set(0, cameraAzimuth(stage.homeCamera), 0);
  framed.scale.setScalar(view.scale);
  framed.position.set(0, groundY, 0);
  for (const item of items) {
    item.subject.update(settings, item.fresh);
    item.fresh = false;
    item.subject.group.position.copy(item.position);
    item.subject.group.scale.setScalar(Math.max(item.pop, 0.001));
  }
  framed.updateMatrixWorld(true);
  ground.setHeight(groundY);

  // The group as a whole: its middle and size (for the room's light pool and the paint pass).
  const list = staying();
  context.groundY = groundY;
  if (list.length === 0) {
    context.objectCentre.set(0, groundY + 0.8, 0);
    context.objectRadius = 1;
    context.contacts = [];
    context.objectColours = FAMILIES['cream-crust'].colours;
  } else {
    context.objectCentre.set(0, 0, 0);
    for (const item of list) {
      item.worldCentre.copy(item.subject.centre).applyMatrix4(item.subject.group.matrixWorld);
      context.objectCentre.add(item.worldCentre);
    }
    context.objectCentre.divideScalar(list.length);
    context.objectRadius = 0;
    for (const item of list) {
      const reach = item.worldCentre.distanceTo(context.objectCentre) + item.subject.radius * view.scale * item.pop;
      context.objectRadius = Math.max(context.objectRadius, reach);
    }
    context.objectRadius = Math.max(context.objectRadius, 0.2);
    // Contact shadows: the floor takes four spots in all, shared out between the ingredients.
    const each = Math.max(1, Math.floor(MAX_CONTACTS / list.length));
    context.contacts = list.flatMap((item) =>
      [...item.subject.contacts]
        .sort((a, b) => b.radius - a.radius)
        .slice(0, each)
        .map(({ centre, radius }) => {
          const spot = centre.clone().applyMatrix4(item.subject.group.matrixWorld);
          return new Vector3(spot.x, spot.z, radius * view.scale * item.pop);
        }),
    );
    context.objectColours = list[0].subject.colours(settings);
  }

  context.lightDirection.copy(stage.updateLight(settings.light.direction));
  context.cameraPosition.copy(stage.camera.position);
  context.cameraRight.setFromMatrixColumn(stage.camera.matrixWorld, 0);
  context.rimGlints = true;
  context.shadowTint = 1;
  look.update(settings, context);

  // Each ingredient's own highlight spot and shadow settings (see makeItem).
  for (const item of items) {
    const radius = item.subject.radius * view.scale * Math.max(item.pop, 0.001);
    item.worldCentre.copy(item.subject.centre).applyMatrix4(item.subject.group.matrixWorld);
    view3.copy(context.cameraPosition).sub(item.worldCentre).normalize();
    half3.copy(context.lightDirection).add(view3).normalize();
    item.own.anchor.value.copy(item.worldCentre).addScaledVector(half3, radius);
    item.own.rimGlints.value = settings.highlight.rimGlints && item.subject.entry.rimGlints !== false ? 1 : 0;
    item.own.shadowMix.value = (settings.lighting.shadowColour / 100) * (item.subject.entry.shadowTint ?? 1);
    item.own.size.value = radius;
  }

  background.update(settings, context);
  ground.update(settings.scene, context.lightDirection, true);
  stage.keyLight.castShadow = settings.scene.castShadow;
  // The slow turn rests while you point at, pick or drag an ingredient, so the outline holds still.
  const busy = !!hovered || !!selected || trayDragging;
  stage.setIdleSpin(settings.scene.idleSpin && !reducedMotion.matches && !busy && list.length > 0, settings.scene.spinSpeed);

  // Where the group sits on the card and which way the light comes from, for the paint pass.
  const centre = context.objectCentre;
  const radius = context.objectRadius;
  projected.copy(centre).project(stage.camera);
  projectedLight.copy(centre).addScaledVector(context.lightDirection, radius).project(stage.camera);
  paintFrame.lightScreen.set((projectedLight.x - projected.x) * stage.camera.aspect, projectedLight.y - projected.y);
  if (paintFrame.lightScreen.lengthSq() < 1e-6) paintFrame.lightScreen.set(0, 1);
  paintFrame.lightScreen.normalize();
  projectedTop.copy(centre).addScaledVector(stage.camera.up, radius).project(stage.camera);
  paintFrame.objectUv.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
  paintFrame.objectRadius = Math.abs(projectedTop.y - projected.y) * 0.5;
  paintFrame.objectBase = context.objectColours.base;
  paintFrame.horizonUv = roomHorizonUv(stage.camera, centre, radius, context.groundY);
  paintFrame.pieces = context.contacts.map((spot) => {
    const floor = new Vector3(spot.x, context.groundY, spot.y).project(stage.camera);
    const above = new Vector3(spot.x, context.groundY, spot.y).addScaledVector(stage.camera.up, spot.z).project(stage.camera);
    return new Vector3(floor.x * 0.5 + 0.5, floor.y * 0.5 + 0.5, Math.abs(above.y - floor.y) * 0.5);
  });
}

function draw(): void {
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame);
  drawOutline();
}

applyRoom();
changed();
stage.start(update, draw);
// The table starts with one ingredient on it, its tile greyed out in the tray (the user, 2026-11-16).
addIngredient(tray.ids()[0], false);
// GSAP moves things between frames: keep painting while any tween is running.
gsap.ticker.add(() => {
  if (items.some((item) => gsap.isTweening(item) || gsap.isTweening(item.position)) || gsap.isTweening(view)) stage.invalidate();
});
reducedMotion.addEventListener('change', () => stage.invalidate());

// Handy while developing and for the render checks.
Object.assign(window, {
  kitchen: {
    settings,
    stage,
    add: addIngredient,
    remove: removeIngredient,
    select: (id: string | null) => select(staying().find((item) => item.id === id) ?? null),
    items: () => staying().map((item) => item.id),
    cook,
    back: backToTable,
    mode: () => mode,
    /** How many ready-made ingredients are waiting, and how many paint programs exist (for checks). */
    ready: () => [...ready.keys()],
    programs: () => stage.renderer.info.programs?.length ?? 0,
    snapshot: () => {
      update();
      draw();
      return stage.renderer.domElement.toDataURL('image/png');
    },
  },
});
