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
