import { CanvasTexture, LinearFilter, NoColorSpace, RepeatWrapping } from 'three';

/**
 * Label artwork, drawn in code: a two-tone stencil (white = ink, black = the label's
 * ground), like a screen print. The shader (skin kind `label`) paints the ink in cream
 * and the ground in the label's own colour family, and shades both with the light, so
 * the print sits on the bottle instead of looking pasted on.
 *
 * The strip wraps all the way round the bottle: u runs once round (0.5 is the front,
 * facing the starting view), v runs up. The lettering sits on the front; doodled
 * borders (zig-zags, triangles, dots) and small flames run all the way round.
 *
 * Our own design, in the spirit of the user's hot sauce reference (2026-11-05): bold,
 * hand-lettered words, a flame, a chili and tribal-style borders. Never a copy of a real
 * brand.
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

/** A border band: a line, a zig-zag and a row of small triangles, repeating all the way round. */
function border(ctx: CanvasRenderingContext2D, y: number, flip: number): void {
  const step = 64; // divides the width, so the band meets itself seamlessly at the back
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(WIDTH, y);
  ctx.stroke();
  ctx.beginPath();
  for (let x = 0; x <= WIDTH; x += step / 2) ctx.lineTo(x, y + flip * (x % step === 0 ? 14 : 34));
  ctx.stroke();
  for (let x = step / 2; x < WIDTH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x - 9, y + flip * 50);
    ctx.lineTo(x + 9, y + flip * 50);
    ctx.lineTo(x, y + flip * 64);
    ctx.closePath();
    ctx.fill();
  }
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
  border(ctx, 26, 1);
  border(ctx, HEIGHT - 26, -1);

  // Small flames and dots all the way round the back and sides.
  for (let x = 32; x < WIDTH; x += 128) {
    const front = Math.abs(x / WIDTH - 0.5) < 0.2;
    if (front) continue;
    flame(ctx, x, HEIGHT / 2 - 40, 70, random() * 0.2 - 0.1);
    ctx.beginPath();
    ctx.arc(x + 64, HEIGHT / 2 + 60, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // The front: two words, hand-lettered, with a flame and a chili.
  const cx = WIDTH / 2;
  letter(ctx, 'HOT', cx - 40, 260, 190, random);
  flame(ctx, cx + 210, 185, 150, 0.2);
  letter(ctx, 'SAUCE', cx, 392, 128, random);
  chili(ctx, cx - 200, 405, 150);

  // Side panels framing the front: a column of stacked triangles each side.
  for (const side of [-1, 1]) {
    const x = cx + side * 345;
    for (let y = 120; y < HEIGHT - 110; y += 44) {
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x, y + 24);
      ctx.closePath();
      ctx.fill();
    }
  }
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
