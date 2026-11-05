/**
 * The surface pass: a hidden "where am I" image of the ingredient.
 *
 * Like a position pass (AOV) in compositing: instead of colour, every pixel
 * of the ingredient stores where it sits in the 3D room (image 1) and which
 * way the surface faces there (image 2). Empty pixels stay at 0.
 *
 * The playful strokes read these images to pin each stroke to a spot on the
 * fruit itself instead of the screen, so when the view turns, the strokes turn
 * with the fruit (like real paint on a real object) instead of spinning on
 * their own centres.
 *
 * Written in GLSL 3 so one render can fill both images at once.
 */
export const surfaceVertexShader = /* glsl */ `
out vec3 vWorld;
out vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  // The proper normal matrix, so stretched pieces still face the right way.
  vNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const surfaceFragmentShader = /* glsl */ `
in vec3 vWorld;
in vec3 vNormal;

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outNormal;

void main() {
  vec3 n = normalize(vNormal);
  // Thin, two-sided parts (leaves) face the camera from either side.
  if (!gl_FrontFacing) n = -n;
  outPosition = vec4(vWorld, 1.0);
  outNormal = vec4(n, 1.0);
}
`;
