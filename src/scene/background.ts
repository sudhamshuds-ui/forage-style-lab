import { BackSide, Color, LatheGeometry, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { Settings } from '../params';
import type { FrameContext } from '../shading/effect';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';
import { backdropLayout } from './backdropLayout';

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

  // 3. A soft, deep contact shadow right under the apple, in the shadow's own hue.
  // Tucked right under the apple, and only on the side away from the light, so
  // the lit side stays clean (the crisp cast shadow does the rest).
  vec2 fromApple = floorPos - uApple;
  float d = length(fromApple) / uAppleRadius;
  vec2 lightFlat = length(uLightDir.xz) > 0.05 ? normalize(uLightDir.xz) : vec2(0.0);
  float awayFromLight = smoothstep(-0.2, 0.5, dot(fromApple / max(length(fromApple), 1e-4), -lightFlat));
  float contactReach = mix(0.45, 1.0, awayFromLight);
  float contact = (1.0 - smoothstep(contactReach - 0.08, contactReach, d)) * (1.0 - smoothstep(0.0, 0.2, height));
  vec3 contactLab = linearToOklab(uContact);
  contactLab.x -= 0.08;
  lab = mix(lab, contactLab, contact * 0.55);

  gl_FragColor = vec4(max(oklabToLinear(lab), 0.0), 0.0);
  #include <colorspace_fragment>
}
`;

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
    // The light patch borrows the pale, warm highlight colour of the combo.
    u.uLight.value.set(settings.colour.highlight);
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
    u.uPatchOffset.value = layout.patchOffset;
    u.uPatchLength.value = layout.patchLength;
    u.uPatchWidth.value = layout.patchWidth;
    u.uPatchTurn.value = layout.patchTurn;
    u.uPrism.value = settings.lighting.glow / 100;
  }
}
