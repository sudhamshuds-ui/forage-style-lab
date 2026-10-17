/**
 * Colour helpers.
 *
 * We mix colours in OKLab / OKLCh instead of plain RGB. OKLab is a colour space
 * built to match how eyes see: mixing red into purple goes through rich
 * wine tones instead of a muddy grey, which is exactly what painters do.
 *
 *  - OKLab: L = lightness, a = green..red, b = blue..yellow
 *  - OKLCh: the same thing as L (lightness), C (chroma, how saturated),
 *           h (hue angle in degrees)
 *
 * The GLSL versions of these formulas live in shading/chunks/colour.glsl.ts.
 */

type Triple = [number, number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function hexToRgb(hex: string): Triple {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: Triple): string {
  const to = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function linearToOklab([r, g, b]: Triple): Triple {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: Triple): Triple {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function hexToOklab(hex: string): Triple {
  return linearToOklab(hexToRgb(hex).map(srgbToLinear) as Triple);
}

function oklabToHex(lab: Triple): string {
  return rgbToHex(oklabToLinear(lab).map((c) => linearToSrgb(clamp01(c))) as Triple);
}

const inGamut = (lin: Triple) => lin.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** Mix two hex colours in OKLab. t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToOklab(a);
  const B = hexToOklab(b);
  return oklabToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/**
 * Build a hex colour from lightness (0..1), chroma (about 0..0.3) and hue (degrees).
 * If the colour is too saturated for a screen to show, chroma is lowered until it fits.
 */
export function oklchToHex(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const lab = (chroma: number): Triple => [l, chroma * Math.cos(h), chroma * Math.sin(h)];
  if (inGamut(oklabToLinear(lab(c)))) return oklabToHex(lab(c));
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(lab(mid)))) lo = mid;
    else hi = mid;
  }
  return oklabToHex(lab(lo));
}

/**
 * Read a hex colour as OKLCh: lightness (0..1), chroma (how saturated, about
 * 0..0.3) and hue (degrees, 0..360). Handy for checking palette rules like
 * "the wall is muted" or "the shadow is cool".
 */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const [l, a, b] = hexToOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: (h + 360) % 360 };
}

/** Walk from hue `a` toward hue `b` (degrees) the short way round. */
export function lerpHue(a: number, b: number, t: number): number {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}
