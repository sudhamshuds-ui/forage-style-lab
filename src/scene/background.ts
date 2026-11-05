import { BackSide, type Camera, Color, LatheGeometry, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { Settings } from '../params';
import type { FrameContext } from '../shading/effect';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';
import { backdropLayout } from './backdropLayout';

/** The most pieces that get their own soft contact shadow (a cluster of 3, or a dish of 4 later). */
export const MAX_CONTACTS = 4;

/**
 * The room around the apple: one seamless surface, like a photo studio sweep.
 *
 * The floor is floorPos around the apple, then curves gently up into a wall, so
 * there is never a hard line where table meets wall. Because it is a real
 * object in the 3D scene, it turns with the apple as you orbit.
 *
 * It is painted, not lit:
 *  - colours mixed across the surface: the table colour near the apple
 *    drifting into the wall colour further away and higher up, with big
 *    soft patches of the room's ambient colour, like the references
 *  - calm brush slabs, laid out on the surface itself (Paint > Brushiness)
 *  - one soft, organic patch of light around the apple, stretched along the
 *    light's direction (no window panes), with a faint pastel rainbow at its
 *    edge (Light > Glow)
 *  - a soft, deep contact shadow right under the apple
 *
 * The Backdrop slider picks the arrangement (backdropLayout.ts).
 * Alpha 0 labels everything here as "backdrop" for the glaze pass.
 */

/** Flat floor radius, then the curve up into the wall, then the wall height. */
const FLOOR_RADIUS = 8;
const CURVE_RADIUS = 6;
const WALL_HEIGHT = 20;
/** How far the sweep reaches from the apple. The camera must stay inside it (see stage.ts). */
export const ROOM_RADIUS = FLOOR_RADIUS + CURVE_RADIUS;

function sweepGeometry(): LatheGeometry {
  // The profile of the sweep, from the centre outwards, spun around the up axis.
  const profile: Vector2[] = [];
  for (let i = 0; i <= 16; i++) profile.push(new Vector2((FLOOR_RADIUS * i) / 16, 0));
  for (let i = 1; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    profile.push(new Vector2(FLOOR_RADIUS + CURVE_RADIUS * Math.sin(a), CURVE_RADIUS * (1 - Math.cos(a))));
  }
  profile.push(new Vector2(ROOM_RADIUS, CURVE_RADIUS + WALL_HEIGHT));
  return new LatheGeometry(profile, 128);
}

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTable;
uniform vec3 uWall;
uniform vec3 uAmbient;
uniform vec3 uLight;
uniform vec3 uContact;
uniform float uFloorY;
uniform float uContrast;
uniform float uVariation;
uniform float uBrushiness;
uniform float uSlabShift;
uniform float uSlabCell;
uniform vec3 uLightDir;
uniform vec2 uApple;
uniform float uAppleRadius;
// One soft contact shadow per piece on the table: x, z and radius.
uniform vec3 uContacts[${MAX_CONTACTS}];
uniform int uContactCount;
uniform float uPatchOffset;
uniform float uPatchLength;
uniform float uPatchWidth;
uniform float uPatchTurn;
uniform float uPrism;
varying vec3 vWorld;

${colourGLSL}
${noiseGLSL}

vec4 roomHash(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// Calm slabs: a few big, barely-there brush passes, each a slightly different mix.
vec3 slabs(vec3 lab, vec2 p) {
  vec2 grid = p / uSlabCell + uSlabShift * 0.137;
  vec2 base = floor(grid);
  // Edge softness in grid units, worked out before any branching (derivatives need that).
  float aa = max(fwidth(grid.x) + fwidth(grid.y), 0.02);
  float coverage = 0.2 + 0.6 * uBrushiness;
  float bestKey = -1.0;
  float bestA = 0.0;
  vec2 bestShift = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 place = roomHash(id + 17.3);
      if (place.x > coverage) continue;
      vec4 rnd = roomHash(id * 1.37 + 5.1);
      vec2 centre = id + 0.2 + 0.6 * place.yz;
      float angle = 0.2 + (rnd.w - 0.5) * 0.5;
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 rel = grid - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      vec2 halfSize = vec2(0.95, 0.4) * (0.85 + 0.3 * rnd.xy);
      vec2 d = abs(local) - halfSize;
      float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      float a = 1.0 - smoothstep(-0.08 - aa, 0.08 + aa, dist);
      if (a > 0.003 && place.w > bestKey) {
        bestKey = place.w;
        bestA = a;
        bestShift = vec2((rnd.y - 0.5) * 0.04, (rnd.z - 0.5) * 0.12);
      }
    }
  }
  float strength = mix(0.5, 1.0, uBrushiness);
  vec3 shifted = lab;
  shifted.x += bestShift.x * strength;
  float turn = bestShift.y * strength;
  shifted.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * shifted.yz;
  return mix(lab, shifted, bestA);
}

void main() {
  vec2 floorPos = vWorld.xz;
  float height = vWorld.y - uFloorY;
  // A 2D sheet to paint on: floor position, plus height so the curve and wall get their own space.
  vec2 p = floorPos + normalize(floorPos + 1e-4) * height;
  float seed = uSlabShift * 0.31;

  // 1. Mixed colours: table near the apple drifting into the wall colour further out and up,
  //    along a wobbling, very soft boundary, with big soft patches of the ambient colour.
  float reach = (length(floorPos - uApple) / uAppleRadius) * 0.12 + height * 0.08;
  float warp = (fbm3(vec3(p * 0.08, seed)) - 0.5) * 1.2;
  float toWall = smoothstep(0.35, 1.25, reach + warp);
  vec3 lab = mix(linearToOklab(uTable), linearToOklab(uWall), toWall);
  float ambientPatch = smoothstep(0.5, 0.75, fbm3(vec3(p * 0.06, seed + 3.7)));
  lab = mix(lab, linearToOklab(uAmbient), ambientPatch * 0.45);
  lab.x += (toWall - 0.5) * 0.05 * uContrast;

  // Gentle drifts of lightness and hue.
  float light = fbm3(vec3(p * 0.12, seed + 1.0)) - 0.5;
  float turn = (fbm3(vec3(p * 0.09, seed + 7.3)) - 0.5) * 0.5 * uVariation;
  lab.x += light * 0.05 * uVariation;
  lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;

  // 2. One soft patch of light around the apple, stretched along the light's
  //    direction, with an organic, wobbling edge. Only when the light is above the floor.
  vec2 toLight = uLightDir.xz;
  float above = smoothstep(0.05, 0.3, uLightDir.y);
  if (length(toLight) > 0.05 && above > 0.0) {
    vec2 along = normalize(toLight);
    float c = cos(uPatchTurn);
    float s = sin(uPatchTurn);
    along = vec2(c * along.x - s * along.y, s * along.x + c * along.y);
    vec2 across = vec2(-along.y, along.x);
    // Reaches out toward the light from just behind the apple, so the apple sits in the pool.
    vec2 centre = uApple + along * uPatchOffset * uAppleRadius;
    vec2 rel = floorPos - centre;
    vec2 q = vec2(dot(rel, along) / uPatchLength, dot(rel, across) / uPatchWidth) / uAppleRadius;
    // A rounded, slightly squarish pool (between an oval and a rectangle) with a loose edge.
    float edgeWobble = (fbm3(vec3(floorPos * 0.45, seed + 4.0)) - 0.5) * 0.45;
    vec2 aq = abs(q);
    float shape = pow(pow(aq.x, 3.0) + pow(aq.y, 3.0), 1.0 / 3.0) + edgeWobble;
    float pool = (1.0 - smoothstep(0.85, 1.0, shape)) * above;
    vec3 lit = mix(lab, linearToOklab(uLight), 0.5);
    lit.x += 0.05;
    lab = mix(lab, lit, pool * 0.85);

    // A faint pastel rainbow along the edge of the light, like light split by
    // glass (the streaks beside the dish in the lemon painting). Light > Glow.
    float fringe = smoothstep(0.8, 0.9, shape) * (1.0 - smoothstep(0.95, 1.08, shape)) * above;
    fringe *= smoothstep(0.35, 0.6, fbm3(vec3(floorPos * 0.6, seed + 12.0)));
    float hue = (shape - 0.8) * 22.0 + dot(floorPos, vec2(0.3, 0.2));
    vec3 rainbow = vec3(lab.x + 0.02, 0.07 * cos(hue), 0.07 * sin(hue));
    lab = mix(lab, rainbow, fringe * 0.6 * uPrism);
  }

  lab = slabs(lab, p);

  // 3. A soft, deep contact shadow right under each piece, in the shadow's own hue.
  // Only a tight core under the piece's footprint, never wider: seen from above, a
  // wider patch pokes out past the real cast shadow as a second, separate blob. The
  // glaze pass paints the rest of the contact, inside the cast shadow (glazeShader.ts).
  // A cluster gets one per member.
  vec2 lightFlat = length(uLightDir.xz) > 0.05 ? normalize(uLightDir.xz) : vec2(0.0);
  float contact = 0.0;
  for (int i = 0; i < ${MAX_CONTACTS}; i++) {
    if (i >= uContactCount) break;
    vec2 fromPiece = floorPos - uContacts[i].xy;
    float d = length(fromPiece) / uContacts[i].z;
    float awayFromLight = smoothstep(-0.2, 0.5, dot(fromPiece / max(length(fromPiece), 1e-4), -lightFlat));
    float contactReach = mix(0.25, 0.45, awayFromLight);
    contact = max(contact, 1.0 - smoothstep(contactReach - 0.08, contactReach, d));
  }
  contact *= 1.0 - smoothstep(0.0, 0.2, height);
  vec3 contactLab = linearToOklab(uContact);
  contactLab.x -= 0.08;
  lab = mix(lab, contactLab, contact * 0.55);

  gl_FragColor = vec4(max(oklabToLinear(lab), 0.0), 0.0);
  #include <colorspace_fragment>
}
`;

/**
 * Where the room's table colour turns into the wall colour, as a height on the card (0 = bottom,
 * 1 = top). There is no hard line in the room (the sweep is one smooth surface), so this follows
 * the same rule the shader above uses to mix table into wall (`reach`, halfway through `toWall`),
 * walking out along the floor and up the curve straight behind the ingredient, and projects that
 * spot onto the card. The playful strokes use it to lay their strokes level along the horizon.
 * Returns null when the boundary is off the card (looking straight down, say).
 */
export function roomHorizonUv(
  camera: Camera,
  objectCentre: Vector3,
  objectRadius: number,
  groundY: number,
): number | null {
  // Straight away from the camera, across the floor, past the ingredient.
  const away = new Vector2(objectCentre.x - camera.position.x, objectCentre.z - camera.position.z);
  if (away.lengthSq() < 1e-8) return null;
  away.normalize();
  // Halfway through toWall = smoothstep(0.35, 1.25, reach).
  const middle = 0.8;
  const spot = new Vector3();
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    // Walk the sweep's profile: the flat floor, then the quarter curve up into the wall.
    const t = (i / steps) * (FLOOR_RADIUS + (CURVE_RADIUS * Math.PI) / 2);
    let out = t;
    let height = 0;
    if (t > FLOOR_RADIUS) {
      const a = (t - FLOOR_RADIUS) / CURVE_RADIUS;
      out = FLOOR_RADIUS + CURVE_RADIUS * Math.sin(a);
      height = CURVE_RADIUS * (1 - Math.cos(a));
    }
    spot.set(away.x * out, groundY + height, away.y * out);
    const fromObject = Math.hypot(spot.x - objectCentre.x, spot.z - objectCentre.z);
    const reach = (fromObject / objectRadius) * 0.12 + height * 0.08;
    // Only count spots beyond the ingredient (the sweep is centred on it, give or take).
    if (reach >= middle && (spot.x - objectCentre.x) * away.x + (spot.z - objectCentre.z) * away.y > 0) {
      spot.project(camera);
      if (spot.z > 1 || spot.y < -1 || spot.y > 1) return null;
      return spot.y * 0.5 + 0.5;
    }
  }
  return null;
}

export class Background {
  readonly mesh: Mesh<LatheGeometry, ShaderMaterial>;

  constructor() {
    this.mesh = new Mesh(
      sweepGeometry(),
      new ShaderMaterial({
        uniforms: {
          uTable: { value: new Color() },
          uWall: { value: new Color() },
          uAmbient: { value: new Color() },
          uLight: { value: new Color() },
          uContact: { value: new Color() },
          uFloorY: { value: 0 },
          uContrast: { value: 0.5 },
          uVariation: { value: 0.45 },
          uBrushiness: { value: 0.35 },
          uSlabShift: { value: 0 },
          uSlabCell: { value: 2 },
          uLightDir: { value: new Vector3(0, 1, 0) },
          uApple: { value: new Vector2() },
          uAppleRadius: { value: 1 },
          uContacts: { value: Array.from({ length: MAX_CONTACTS }, () => new Vector3(0, 0, 1)) },
          uContactCount: { value: 0 },
          uPatchOffset: { value: 0.6 },
          uPatchLength: { value: 3.5 },
          uPatchWidth: { value: 2 },
          uPatchTurn: { value: 0 },
          uPrism: { value: 0.5 },
        },
        vertexShader,
        fragmentShader,
        // We look at the inside of the sweep.
        side: BackSide,
      }),
    );
  }

  update(settings: Settings, context: FrameContext): void {
    const { scene } = settings;
    const layout = backdropLayout(scene.backdrop);
    const r = context.objectRadius;
    const u = this.mesh.material.uniforms;

    this.mesh.position.y = context.groundY;
    u.uTable.value.set(scene.backgroundBottom);
    u.uWall.value.set(scene.backgroundTop);
    u.uAmbient.value.set(settings.light.ambient);
    // The light patch borrows the ingredient's pale, warm highlight colour.
    u.uLight.value.set(context.objectColours.highlight);
    u.uContact.value.set(scene.shadowColour);
    u.uFloorY.value = context.groundY;
    u.uContrast.value = layout.contrast;
    u.uVariation.value = scene.variation / 100;
    u.uBrushiness.value = settings.paint.brushiness / 100;
    u.uSlabShift.value = layout.slabShift;
    // Big slabs, sized to the apple: about two apple-widths long.
    u.uSlabCell.value = r * 2.2;
    u.uLightDir.value.copy(context.lightDirection);
    u.uApple.value.set(context.objectCentre.x, context.objectCentre.z);
    u.uAppleRadius.value = r;
    const contacts = context.contacts.slice(0, MAX_CONTACTS);
    contacts.forEach((c, i) => (u.uContacts.value as Vector3[])[i].copy(c));
    u.uContactCount.value = contacts.length;
    u.uPatchOffset.value = layout.patchOffset;
    u.uPatchLength.value = layout.patchLength;
    u.uPatchWidth.value = layout.patchWidth;
    u.uPatchTurn.value = layout.patchTurn;
    u.uPrism.value = settings.lighting.glow / 100;
  }
}
