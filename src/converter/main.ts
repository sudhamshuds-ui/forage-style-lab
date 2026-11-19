import {
  ACESFilmicToneMapping,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './converter.css';
import paintingUrl from '../../references/dishes/salmon-peach.png';
import { buildSalmonPeach, SALMON_PLAN } from '../dishes/forms/salmonPeach';
import { ware } from '../dishes/kit/ware';
import type { PlanShape, Size } from '../dishes/kit/plan';
import { seedFromId } from '../ingredients/forms/kit/random';
import { UNITS_PER_CM } from '../ingredients/scale';
import { cameraPose, worldToPixel } from './camera';
import { describeCamera, rimOf, solveTrace, WARES, type DishTrace, type Footprint, type Solved, type TracedPiece } from './trace';
import { SALMON_PEACH_TRACE } from './traces/salmonPeach';

/**
 * The dish converter, round 1 (docs/dishes/converter.md): the painting on the left with its
 * plate rim and outlines (drag the points), the dish in 3D on the right.
 *
 * Steps shown in this round:
 *   1. the camera matched from the rim (the dashed oval is the matched rim drawn back on the painting),
 *   2. the outlines laid on the plate as footprints, raised to each piece's height (the blockout),
 * plus the hand-built salmon dish in the same 3D view, so "Match view" with the onion skin shows
 * where the hand-built version and the painting differ.
 */

const DRAFT = SALMON_PEACH_TRACE;
const STORE = `converter:${DRAFT.dish}`;
const SVG = 'http://www.w3.org/2000/svg';

const COLOURS: Record<Size, string> = { big: '#e07a3c', medium: '#e0a33c', small: '#6bb04a', ground: '#8fb6d8' };

// ---------------------------------------------------------------------------------------------
// State: the trace being edited (saved in this browser as you go).

function loadTrace(): DishTrace {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return { ...structuredClone(DRAFT), ...JSON.parse(saved) };
  } catch {
    // No storage (private window): start from the draft.
  }
  return structuredClone(DRAFT);
}

function saveTrace() {
  try {
    localStorage.setItem(STORE, JSON.stringify(trace));
  } catch {
    // Not saved; the page still works.
  }
}

let trace = loadTrace();
let solved: Solved = solveTrace(trace);
let mode: 'camera' | 'outlines' = 'camera';
let selected = -1;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
$('dish-name').textContent = SALMON_PLAN.title;

// ---------------------------------------------------------------------------------------------
// The painting and its overlay.

const paintingImg = $<HTMLImageElement>('painting-img');
paintingImg.src = paintingUrl;
const onion = $<HTMLImageElement>('onion');
onion.src = paintingUrl;
const overlay = document.getElementById('overlay') as unknown as SVGSVGElement;
overlay.setAttribute('viewBox', `0 0 ${trace.picture.width} ${trace.picture.height}`);

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

const pointsAttr = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

function drawOverlay() {
  overlay.dataset.mode = mode;
  overlay.replaceChildren();
  // The outlines.
  trace.pieces.forEach((piece, i) => {
    const poly = el('polygon', { class: `outline${i === selected ? ' selected' : ''}`, points: pointsAttr(piece.outline) });
    poly.style.color = COLOURS[piece.size];
    poly.addEventListener('pointerdown', (e) => {
      if (mode !== 'outlines') return;
      e.stopPropagation();
      select(i);
    });
    poly.addEventListener('dblclick', (e) => {
      if (mode !== 'outlines' || i !== selected) return;
      insertPoint(piece.outline, toPicture(e));
      changed();
    });
    overlay.append(poly);
  });
  // The matched rim, drawn back onto the painting.
  const rim = rimOf(WARES[trace.ware]);
  const fitted: [number, number][] = [];
  for (let k = 0; k < 180; k++) {
    const a = (k / 180) * Math.PI * 2;
    const p = worldToPixel(solved.fit, trace.picture, new Vector3(Math.cos(a) * rim.radius, rim.height, Math.sin(a) * rim.radius));
    if (p) fitted.push(p);
  }
  overlay.append(el('polygon', { class: 'rim-fit', points: pointsAttr(fitted) }));
  // Handles.
  const r = (trace.picture.width / overlay.getBoundingClientRect().width || 1) * 5;
  if (mode === 'camera') {
    trace.rim.forEach((p, k) => overlay.append(handle(p, r, 'rim', () => trace.rim, k)));
  } else if (selected >= 0) {
    const outline = trace.pieces[selected].outline;
    outline.forEach((p, k) => overlay.append(handle(p, r, '', () => outline, k)));
  }
}

function toPicture(e: MouseEvent | PointerEvent): [number, number] {
  const box = overlay.getBoundingClientRect();
  return [((e.clientX - box.left) / box.width) * trace.picture.width, ((e.clientY - box.top) / box.height) * trace.picture.height];
}

/** A draggable point. Alt-click (Option-click) removes it. */
function handle(p: [number, number], r: number, kind: string, list: () => [number, number][], index: number): SVGCircleElement {
  const dot = el('circle', { class: `handle ${kind}`, cx: p[0], cy: p[1], r });
  dot.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const points = list();
    if (e.altKey && points.length > (kind === 'rim' ? 5 : 3)) {
      points.splice(index, 1);
      changed();
      return;
    }
    try {
      dot.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture on a quick tap; dragging still works while over the dot.
    }
    const move = (ev: PointerEvent) => {
      const [x, y] = toPicture(ev);
      points[index] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(y));
      scheduleSolve();
    };
    const up = () => {
      dot.removeEventListener('pointermove', move);
      dot.removeEventListener('pointerup', up);
      dot.removeEventListener('pointercancel', up);
      changed();
    };
    dot.addEventListener('pointermove', move);
    dot.addEventListener('pointerup', up);
    dot.addEventListener('pointercancel', up);
  });
  return dot;
}

/** A new point on the nearest edge of an outline (double-click). */
function insertPoint(points: [number, number][], [x, y]: [number, number]) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < bestD) [best, bestD] = [i, d];
  }
  points.splice(best + 1, 0, [Math.round(x), Math.round(y)]);
}

overlay.addEventListener('pointerdown', (e) => {
  // In Camera mode, a click on the painting adds a rim point there.
  if (mode === 'camera' && e.target === overlay) {
    trace.rim.push(toPicture(e).map((v) => Math.round(v)) as [number, number]);
    changed();
  } else if (mode === 'outlines' && e.target === overlay) {
    select(-1);
  }
});

// ---------------------------------------------------------------------------------------------
// The 3D view: the plate, the blockout, the hand-built dish, all in centimetres.

const canvas = $<HTMLCanvasElement>('canvas');
const view = $('view');
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

const scene = new Scene();
scene.background = new Color('#ece6ef');
const camera = new PerspectiveCamera(trace.fov, trace.picture.width / trace.picture.height, 1, 2000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = false;

scene.add(new HemisphereLight('#fff6ec', '#b8aecb', 1.4));
const sun = new DirectionalLight('#fff1df', 2.2);
// Upper left, a little in front (the Style Lab's key light).
sun.position.set(-40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
sun.shadow.camera.right = sun.shadow.camera.top = 30;
sun.shadow.bias = -0.0005;
scene.add(sun);

const table = new Mesh(new CircleGeometry(200, 96).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#e7e0ea', roughness: 0.95 }));
table.receiveShadow = true;
scene.add(table);

const plateMesh = new Mesh(ware(WARES[trace.ware]).geometry, new MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.6 }));
plateMesh.castShadow = plateMesh.receiveShadow = true;
scene.add(plateMesh);

const blockout = new Group();
scene.add(blockout);
const built = new Group();
scene.add(built);

/** Each footprint raised to its piece's height: a block per piece, see-through. */
function drawBlockout() {
  for (const child of [...blockout.children]) {
    blockout.remove(child);
    (child as Mesh).geometry.dispose();
  }
  for (const f of solved.footprints) {
    const shape = new Shape(f.points.map(([x, z]) => new Vector2(x, -z)));
    const geometry = new ExtrudeGeometry(shape, { depth: f.piece.height, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, f.base, 0);
    const colour = COLOURS[f.piece.size];
    const block = new Mesh(geometry, new MeshStandardMaterial({ color: colour, transparent: true, opacity: 0.55, roughness: 0.8, side: DoubleSide, depthWrite: false }));
    block.renderOrder = 2;
    const edges = new LineSegments(new EdgesGeometry(geometry, 30), new LineBasicMaterial({ color: colour }));
    blockout.add(block, edges);
  }
  invalidate();
}

/** The hand-built salmon dish (src/dishes/forms/salmonPeach.ts), each part in a plain colour. */
const ROLE_COLOURS: [RegExp, string][] = [
  [/plate/, '#f4f0e8'],
  [/foam/, '#d9e8bc'],
  [/salmon/, '#f0a27a'],
  [/peach/, '#e8893a'],
  [/limeFlesh/, '#c6e07a'],
  [/lime/, '#79b53a'],
  [/herb/, '#4f8a3a'],
];

function buildHandBuilt() {
  const pieces = buildSalmonPeach({ state: 'whole', seed: seedFromId('dish-salmon-peach') });
  for (const piece of pieces) {
    if (/plate/.test(piece.role)) continue;
    const geometry = (piece.geometry as BufferGeometry).clone();
    geometry.scale(1 / UNITS_PER_CM, 1 / UNITS_PER_CM, 1 / UNITS_PER_CM);
    const colour = ROLE_COLOURS.find(([re]) => re.test(piece.role))?.[1] ?? '#cccccc';
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: colour, roughness: 0.7, ...(piece.doubleSided ? { side: DoubleSide } : {}) }));
    mesh.castShadow = mesh.receiveShadow = true;
    built.add(mesh);
  }
  invalidate();
}

// The camera: "Match view" puts it exactly where the painter stood; dragging takes over from there.
let matched = true;

function matchView() {
  const { position, quaternion } = cameraPose(solved.fit);
  camera.fov = solved.fit.fov;
  camera.position.copy(position);
  camera.quaternion.copy(quaternion);
  camera.updateProjectionMatrix();
  // Turn round the point the camera looks at on the plate.
  const ahead = new Vector3(0, 0, -1).applyQuaternion(quaternion);
  const t = (0.75 - position.y) / ahead.y;
  controls.target.copy(position.clone().addScaledVector(ahead, t > 0 ? t : solved.fit.dist));
  matched = true;
  onion.hidden = false;
  invalidate();
}

controls.addEventListener('start', () => {
  if (matched) {
    matched = false;
    onion.hidden = true;
  }
});
controls.addEventListener('change', () => invalidate());

let pending = false;
function invalidate() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    if (!matched) controls.update();
    renderer.render(scene, camera);
  });
}

function resize() {
  const { width, height } = view.getBoundingClientRect();
  renderer.setSize(width, height, false);
  invalidate();
}
new ResizeObserver(() => {
  resize();
  drawOverlay();
}).observe(view);

// ---------------------------------------------------------------------------------------------
// The side panel.

const lens = $<HTMLInputElement>('lens');
lens.value = String(trace.fov);
$('lens-value').textContent = `${trace.fov}°`;
lens.addEventListener('input', () => {
  trace.fov = Number(lens.value);
  $('lens-value').textContent = `${trace.fov}°`;
  scheduleSolve();
});
lens.addEventListener('change', () => changed());

const onionAmount = $<HTMLInputElement>('onion-amount');
const setOnion = () => {
  onion.style.opacity = String(Number(onionAmount.value) / 100);
  $('onion-value').textContent = `${onionAmount.value}%`;
};
onionAmount.addEventListener('input', setOnion);
setOnion();

$('match').addEventListener('click', matchView);

function toggle(id: string, group: Group) {
  const button = $(id);
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    group.visible = on;
    invalidate();
  });
}
toggle('show-blockout', blockout);
toggle('show-built', built);

for (const tab of document.querySelectorAll<HTMLButtonElement>('.cv-tabs button')) {
  tab.addEventListener('click', () => setMode(tab.dataset.mode as typeof mode));
}

function setMode(next: typeof mode) {
  mode = next;
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.cv-tabs button')) tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
  $('hint').textContent =
    mode === 'camera'
      ? 'Drag the purple points onto the plate’s outer edge. Click to add a point, Option-click one to remove it. The dashed oval is the matched rim.'
      : 'Pick an outline, then drag its points. Double-click an edge to add a point, Option-click a point to remove it.';
  drawOverlay();
}

function describe(piece: TracedPiece) {
  return `${piece.size} · ${piece.height.toFixed(1)} cm`;
}

function drawPieces() {
  const list = $('pieces');
  list.replaceChildren();
  trace.pieces.forEach((piece, i) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-current', String(i === selected));
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = COLOURS[piece.size];
    const name = document.createElement('span');
    name.textContent = piece.label;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = describe(piece);
    button.append(dot, name, meta);
    button.addEventListener('click', () => {
      setMode('outlines');
      select(i);
    });
    li.append(button);
    list.append(li);
  });
  const edit = $('piece-edit');
  edit.hidden = selected < 0;
  if (selected >= 0) {
    const piece = trace.pieces[selected];
    $<HTMLInputElement>('piece-height').value = String(piece.height);
    $('piece-height-value').textContent = `${piece.height.toFixed(1)} cm`;
    $<HTMLSelectElement>('piece-size').value = piece.size;
  }
}

function select(i: number) {
  selected = i;
  drawPieces();
  drawOverlay();
}

$<HTMLInputElement>('piece-height').addEventListener('input', (e) => {
  if (selected < 0) return;
  trace.pieces[selected].height = Number((e.target as HTMLInputElement).value);
  $('piece-height-value').textContent = `${trace.pieces[selected].height.toFixed(1)} cm`;
  scheduleSolve();
});
$<HTMLInputElement>('piece-height').addEventListener('change', () => changed());
$<HTMLSelectElement>('piece-size').addEventListener('change', (e) => {
  if (selected < 0) return;
  trace.pieces[selected].size = (e.target as HTMLSelectElement).value as Size;
  changed();
});
$('remove-piece').addEventListener('click', () => {
  if (selected < 0) return;
  trace.pieces.splice(selected, 1);
  selected = -1;
  changed();
});
$('add-piece').addEventListener('click', () => {
  const label = prompt('What is it? (for example: lime, peach, herb)')?.trim();
  if (!label) return;
  const [cx, cy] = [trace.picture.width / 2, trace.picture.height / 2];
  trace.pieces.push({ label, ingredient: label, size: 'small', height: 1, outline: [[cx - 20, cy - 15], [cx + 20, cy - 15], [cx + 20, cy + 15], [cx - 20, cy + 15]] });
  setMode('outlines');
  selected = trace.pieces.length - 1;
  changed();
});

$('copy').addEventListener('click', async () => {
  const text = JSON.stringify(trace);
  const button = $('copy');
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    prompt('Copy the trace:', text);
  }
  setTimeout(() => (button.textContent = 'Copy trace'), 1400);
});
$('reset').addEventListener('click', () => {
  if (!confirm('Go back to the drafted trace? Your edits on this page are lost.')) return;
  trace = structuredClone(DRAFT);
  selected = -1;
  lens.value = String(trace.fov);
  $('lens-value').textContent = `${trace.fov}°`;
  changed();
});

function drawFacts() {
  const { height, angle, distance } = describeCamera(solved.fit);
  const quality = solved.rimError < 2 ? 'good' : solved.rimError < 5 ? '' : 'poor';
  $('camera-facts').innerHTML = `
    <dt>Looking down</dt><dd>${angle.toFixed(1)}°</dd>
    <dt>Distance</dt><dd>${distance.toFixed(0)} cm from the plate’s middle</dd>
    <dt>Height</dt><dd>${height.toFixed(0)} cm above the table</dd>
    <dt>Rim fit</dt><dd class="${quality}">${solved.rimError.toFixed(1)} px off on average</dd>`;
}

// ---------------------------------------------------------------------------------------------
// The plan from above: measured footprints against the hand-built plan.

function drawPlan() {
  const shape = WARES[trace.ware];
  const half = shape.radius + 1;
  const s = (v: number) => v.toFixed(2);
  const parts: string[] = [];
  parts.push(`<circle r="${shape.radius}" fill="#f4f0e8" stroke="#ddd6cc" stroke-width="0.1"/>`);
  parts.push(`<circle r="${shape.well}" fill="none" stroke="#d6cfc4" stroke-width="0.08" stroke-dasharray="0.4 0.4"/>`);
  for (const f of solved.footprints) {
    parts.push(`<polygon points="${f.points.map(([x, z]) => `${s(x)},${s(z)}`).join(' ')}" fill="${COLOURS[f.piece.size]}" fill-opacity="0.55" stroke="${COLOURS[f.piece.size]}" stroke-width="0.1"/>`);
  }
  for (const p of SALMON_PLAN.shapes) parts.push(planShape(p));
  parts.push(`<text x="${-half + 0.4}" y="${half - 0.5}" font-size="1" fill="#77727c">toward the camera ↓</text>`);
  $('plan').innerHTML = `<svg viewBox="${-half} ${-half} ${half * 2} ${half * 2}" role="img" aria-label="The dish from straight above">${parts.join('')}</svg>`;

  // The numbers: each traced piece next to the hand-built shape nearest to it with the same label.
  const rows = solved.footprints.map((f) => {
    const twin = nearestPlanShape(f);
    const measured = `${f.length.toFixed(1)} × ${f.width.toFixed(1)} at ${f.centre[0].toFixed(1)}, ${f.centre[1].toFixed(1)}`;
    const hand = twin ? `${twin.size} at ${twin.at[0].toFixed(1)}, ${twin.at[1].toFixed(1)}` : '·';
    return `<tr><td>${f.piece.label}</td><td>${measured}</td><td>${hand}</td></tr>`;
  });
  $('plan-table').innerHTML = `<thead><tr><th>Piece</th><th>Painting (cm)</th><th>Hand-built (cm)</th></tr></thead><tbody>${rows.join('')}</tbody>`;
}

function planShape(p: PlanShape): string {
  const t = `translate(${p.at[0].toFixed(2)} ${p.at[1].toFixed(2)}) rotate(${(p.angle ?? 0).toFixed(1)})`;
  const style = `fill="none" stroke="#2b2730" stroke-width="0.12" stroke-dasharray="0.5 0.35"`;
  if (p.kind === 'circle') return `<circle transform="${t}" r="${p.r}" ${style}/>`;
  if (p.kind === 'rect') return `<rect transform="${t}" x="${-p.w / 2}" y="${-p.h / 2}" width="${p.w}" height="${p.h}" rx="${p.round ?? 0.4}" ${style}/>`;
  return `<path transform="${t}" d="M ${-p.r} 0 A ${p.r} ${p.r} 0 0 0 ${p.r} 0 Z" ${style}/>`;
}

function nearestPlanShape(f: Footprint): { size: string; at: [number, number] } | null {
  let best: PlanShape | null = null, bestD = Infinity;
  for (const p of SALMON_PLAN.shapes) {
    if (p.label !== f.piece.label) continue;
    const d = Math.hypot(p.at[0] - f.centre[0], p.at[1] - f.centre[1]);
    if (d < bestD) [best, bestD] = [p, d];
  }
  if (!best) return null;
  const size = best.kind === 'rect' ? `${best.h.toFixed(1)} × ${best.w.toFixed(1)}` : best.kind === 'circle' ? `⌀ ${(best.r * 2).toFixed(1)}` : `half ⌀ ${(best.r * 2).toFixed(1)}`;
  return { size, at: best.at };
}

// ---------------------------------------------------------------------------------------------
// Solving: live while dragging (once a frame), saved when a drag ends.

let solveQueued = false;
function scheduleSolve() {
  if (solveQueued) return;
  solveQueued = true;
  requestAnimationFrame(() => {
    solveQueued = false;
    refresh();
  });
}

function refresh() {
  solved = solveTrace(trace);
  drawFacts();
  drawBlockout();
  drawPlan();
  drawPieces();
  if (matched) matchView();
  // Redraw the dashed rim without rebuilding the handle being dragged.
  const fit = overlay.querySelector('.rim-fit');
  if (fit) {
    const rim = rimOf(WARES[trace.ware]);
    const pts: [number, number][] = [];
    for (let k = 0; k < 180; k++) {
      const a = (k / 180) * Math.PI * 2;
      const p = worldToPixel(solved.fit, trace.picture, new Vector3(Math.cos(a) * rim.radius, rim.height, Math.sin(a) * rim.radius));
      if (p) pts.push(p);
    }
    fit.setAttribute('points', pointsAttr(pts));
  }
  for (const [i, poly] of [...overlay.querySelectorAll('.outline')].entries()) {
    if (trace.pieces[i]) poly.setAttribute('points', pointsAttr(trace.pieces[i].outline));
  }
}

function changed() {
  saveTrace();
  refresh();
  drawOverlay();
}

// Start.
setMode('camera');
refresh();
resize();
matchView();
// The hand-built dish takes a moment to build (its peach wedges are meshed from distances).
setTimeout(buildHandBuilt, 60);
