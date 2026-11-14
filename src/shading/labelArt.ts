import { CanvasTexture, LinearFilter, NoColorSpace, RepeatWrapping } from 'three';

/**
 * Label artwork, drawn in code: a two-tone stencil (white = ink, black = the label's
 * ground), like a screen print. The shader (skin kind `label`) paints the ink in cream
 * and the ground in the label's own colour family, and shades both with the light, so
 * the print sits on the bottle instead of looking pasted on.
 *
 * The strip wraps all the way round the bottle: u runs once round (0.5 is the front,
 * facing the starting view), v runs up. The lettering sits on the front and a thin line
 * runs round the top and bottom edges. The sides and back are plain (the user,
 * 2026-11-05: zig-zag borders, triangles, dots, small repeated flames and a composition of
 * big cropped flames and a chili were all tried and removed).
 *
 * Our own design, in the spirit of the user's hot sauce reference (2026-11-05): bold,
 * hand-lettered words, a flame and a chili. Never a copy of a real brand.
 */

const WIDTH = 2048;
const HEIGHT = 512;

/** A small seeded random, so the hand-drawn wobble is the same on every load. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A flame: a teardrop with a flicked tip, centred at (x, y), `h` tall. */
function flame(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean = 0.15): void {
  const w = h * 0.55;
  ctx.beginPath();
  ctx.moveTo(x + lean * h, y - h * 0.5);
  ctx.bezierCurveTo(x + w * 0.9, y - h * 0.1, x + w * 0.75, y + h * 0.45, x, y + h * 0.5);
  ctx.bezierCurveTo(x - w * 0.75, y + h * 0.45, x - w * 0.8, y - h * 0.05, x - w * 0.15, y - h * 0.22);
  ctx.bezierCurveTo(x - w * 0.1, y - h * 0.02, x + w * 0.05, y - h * 0.05, x + lean * h, y - h * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** A chili pepper lying on its side, curving down to a point, with a little stem. */
function chili(ctx: CanvasRenderingContext2D, x: number, y: number, length: number): void {
  const t = length * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + length * 0.35, y - t * 0.9, x + length * 0.8, y - t * 0.2, x + length, y + t * 1.1);
  ctx.bezierCurveTo(x + length * 0.7, y + t * 0.6, x + length * 0.35, y + t * 1.1, x, y + t);
  ctx.closePath();
  ctx.fill();
  // The stem: a short curl at the wide end.
  ctx.lineWidth = t * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + t * 0.1, y + t * 0.4);
  ctx.quadraticCurveTo(x - t * 0.7, y + t * 0.1, x - t * 0.8, y - t * 0.6);
  ctx.stroke();
}

/** One word, hand-lettered: each letter a little rotated and lifted, so it feels drawn. */
function letter(ctx: CanvasRenderingContext2D, word: string, cx: number, baseline: number, size: number, random: () => number): void {
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Impact, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const widths = [...word].map((ch) => ctx.measureText(ch).width * 0.92);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  [...word].forEach((ch, i) => {
    ctx.save();
    ctx.translate(x + widths[i] / 2, baseline + (random() - 0.5) * size * 0.12);
    ctx.rotate((random() - 0.5) * 0.16);
    ctx.scale(1 + (random() - 0.5) * 0.08, 1 + (random() - 0.5) * 0.1);
    ctx.textAlign = 'center';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    x += widths[i];
  });
}

/** A border: one thin line all the way round. */
function border(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(WIDTH, y);
  ctx.stroke();
}

/** Draw the hot sauce label's stencil. */
export function drawHotSauceLabel(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const random = seeded(7);

  // The ground (no ink).
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';

  // Borders top and bottom (canvas y runs down; the strip's top is y = 0).
  border(ctx, 26);
  border(ctx, HEIGHT - 26);


  // The front: two words, hand-lettered, with a flame and a chili.
  const cx = WIDTH / 2;
  letter(ctx, 'HOT', cx - 40, 240, 190, random);
  flame(ctx, cx + 210, 165, 150, 0.2);
  letter(ctx, 'SAUCE', cx, 362, 124, random);
  // The chili sits at the bottom left of SAUCE, under its first letters, with breathing
  // room so it never touches them (the user, 2026-11-05).
  chili(ctx, cx - 215, 418, 150);
  return canvas;
}

let cached: CanvasTexture | null = null;

/** The hot sauce label as a texture (made once, then shared). Null where there is no page (tests). */
export function hotSauceLabelTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!cached) {
    cached = new CanvasTexture(drawHotSauceLabel());
    cached.colorSpace = NoColorSpace; // a stencil, not a colour picture
    cached.wrapS = RepeatWrapping;
    cached.minFilter = LinearFilter;
    cached.anisotropy = 4;
  }
  return cached;
}

/**
 * The milk carton's print (round 2, 2026-11-14): our own design, in the spirit of the user's
 * reference (a white carton with a bold green word and cow spots), never its brand. The strip
 * runs once round the four faces (each a quarter of the width: front, right side, back, left
 * side) and up the whole carton (the body is the lower four fifths, the gable above it).
 * White = ink (painted green by the `carton` skin), black = the white paper.
 */
function spot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, random: () => number): void {
  const points = 7;
  const radii = Array.from({ length: points }, () => size * (0.5 + random() * 0.75));
  const turn = random() * Math.PI * 2;
  const at = (i: number) => {
    const a = turn + (i / points) * Math.PI * 2;
    const r = radii[((i % points) + points) % points];
    // (The strip is stretched upward on the carton: wider here, so the spots come out round.)
    return [x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 0.92] as const;
  };
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const [ax, ay] = at(i);
    const [bx, by] = at(i + 1);
    if (i === 0) ctx.moveTo((ax + bx) / 2, (ay + by) / 2);
    else {
      const [px, py] = at(i);
      ctx.quadraticCurveTo(px, py, (ax + bx) / 2, (ay + by) / 2);
    }
  }
  ctx.closePath();
  ctx.fill();
}

export function drawMilkLabel(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const W = 2048;
  const H = 1024;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const random = seeded(23);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  const face = W / 4;
  // The body ends at about four fifths of the height (canvas y runs down: the body is the lower part).
  const bodyTop = H * 0.215;
  const bodyH = H - bodyTop;

  // The front: the word, hand-lettered, running up the face; a milk drop above it; a small line below.
  ctx.save();
  ctx.translate(face * 0.5 + 18, bodyTop + bodyH * 0.53);
  ctx.rotate(-Math.PI / 2);
  letter(ctx, 'MILK', 0, 0, 205, random);
  ctx.restore();
  // The drop.
  const dx = face * 0.5;
  const dy = bodyTop + 78;
  ctx.beginPath();
  ctx.moveTo(dx, dy - 52);
  ctx.bezierCurveTo(dx + 12, dy - 20, dx + 40, dy + 2, dx + 40, dy + 26);
  ctx.bezierCurveTo(dx + 40, dy + 52, dx + 20, dy + 66, dx, dy + 66);
  ctx.bezierCurveTo(dx - 20, dy + 66, dx - 40, dy + 52, dx - 40, dy + 26);
  ctx.bezierCurveTo(dx - 40, dy + 2, dx - 12, dy - 20, dx, dy - 52);
  ctx.fill();
  ctx.font = '700 34px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRESH  ·  1 LITRE', face * 0.5, H - 60);

  // The two sides and the back: cow spots, soft-edged like a loose print, each its own shape.
  ctx.filter = 'blur(5px)';
  const spots: [number, number, number][] = [
    [1.32, 0.3, 62], [1.66, 0.42, 84], [1.4, 0.56, 96], [1.72, 0.7, 60], [1.3, 0.8, 70], [1.6, 0.9, 46],
    [2.3, 0.34, 80], [2.68, 0.5, 64], [2.36, 0.68, 58], [2.66, 0.84, 90],
    [3.34, 0.36, 70], [3.7, 0.3, 44], [3.6, 0.55, 98], [3.3, 0.72, 62], [3.68, 0.86, 72],
  ];
  for (const [fx, fy, size] of spots) spot(ctx, face * fx, bodyTop + bodyH * fy, size, random);
  ctx.filter = 'none';
  return canvas;
}

let cachedMilk: CanvasTexture | null = null;

/** The milk carton's print as a texture (made once). Null where there is no page (tests). */
export function milkLabelTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!cachedMilk) {
    cachedMilk = new CanvasTexture(drawMilkLabel());
    cachedMilk.colorSpace = NoColorSpace;
    cachedMilk.wrapS = RepeatWrapping;
    cachedMilk.minFilter = LinearFilter;
    cachedMilk.anisotropy = 4;
  }
  return cachedMilk;
}
