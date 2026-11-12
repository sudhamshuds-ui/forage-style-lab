# Avocado

Sources: commits on branch `avocado` (2026-11-12, four rounds), the user's reference painting (two
halves in oil, flesh yellow to lime, violet shadows, an orange-brown pit), the user's sketch of the
composition, and notes in a cloud session.

## Colour
- **Cut flesh is several bands, each wandering like wet paint** (avocado, watermelon).
  First try: creamy yellow fading to green near the skin. User said: "the colours look very flat right now, more colour depth".
  Ended on: a warm yellow heart, a lighter lime band, a bright green ring, a deeper green just under the skin and a thin dark skin line, the bands wandering softly; a deeper ochre in the hollow round the pit; broad blooms of lighter and deeper paint; the lit side lifted only a little, so the light never bleaches the yellow toward white.
  Why: a real cut face is never one gradient; the reference painting has four or five colours in it.
- **Shadows on green go cool, toward indigo, never black-green** (avocado).
  Claude's note: after the reference, the avocado's shadow is a deep indigo and the flesh's shadow side turns toward it; the pit's shadow side is a deep plum, not a grey brown.
- **A skin has depth: ripening blotches, never one flat green** (avocado, chicken).
  Claude's note: broad, darker patches leaning toward the shadow colour, kept gentle (they are not what makes a glaze shape look like a dent).
- **A polished part keeps its highlight on a matte ingredient** (avocado).
  User said: "seed needs highlight".
  Ended on: the body stays matte; the pit keeps a full highlight (registry `glossy: ['pit']`).

## Composition
- **Whole and cut: the whole one stands behind, the half leans in front, its face to the camera** (avocado).
  First try: the whole one lying on its side behind, the half in front.
  User said: "composition can be something close to this" (a sketch: the whole one upright behind on the left, the half in front on the right, overlapping it, its narrow end to the right).
  Ended on: the sketch, the half's face tipped toward the camera and leaning back against the whole one, slid in until they just touch; contact shadows only where each one touches the table (`contactsFromFeet`).
  Why: the upright whole one gives height; the half shows the cut, the most telling side.
- **A cut half has no stem** (avocado).
  User said: "remove the stem for cut part".

## Form
- **A rounded fruit's outline bulges all the way round: no pointy ends, no flat sides** (avocado).
  First try: an ellipse narrowing to the top. User said: "the avocados are very pointy".
  Second try: a boxier curve (blunt ends). User said: "more rounder body, less pointy top", then "its flat on the sides...needs to be more bulgier, circular".
  Ended on: almost a plain ellipse (exponent 2.2), the top only a little narrower than the bottom.
  Why: a boxier curve blunts the ends but straightens the long sides into a bar of soap. Plot a few outlines side by side before choosing.
- **First shapes: a pear, never two balls** (avocado).
  Claude's note: two blended balls read as a peanut; one smooth profile narrowing toward the top reads as an avocado.
- **A cut half is a lathe whose cross-section is a rounded half disc, pulled onto the shape with the cut rounded all the way round** (avocado).
  First try: a distance field cut by a plane, its rounded edge one mesh cell wide. User said: "need to fix these glitches" (a sawtooth along the rim).
  Second try: a lathe of a rounded half disc: smooth along the sides, but the blunt ends met the face in a corner. User said: "glitch here" (a line at the wide end).
  Ended on: the lathe, then every point pulled onto the avocado with its cut rounded all the way round (`roundedIntersection`, then `relaxOnSurface`); the face map fades by the final normals, so ends and sides fade alike.
  Why: a clean lathe mesh has smooth normals; the pull rounds the corners the section cannot reach.
- **A pit is a smooth cap, never a meshed field** (avocado).
  Claude's note: the distance-field pit had a stair-stepped outline where it met the face; an egg-shaped cap built as rings (closed underneath, inside the flesh) is smooth.

## Recurring errors
- **Sawtooth edges on meshed cuts** (avocado; cheese bevels).
  Claude's note: a bevel only one cell wide steps; prefer a lathe or sweep when the shape allows it, and look at every edge zoomed in, ends included.
- **Inside-out triangles** (avocado).
  Claude's note: a hand-built mesh wound the wrong way showed the inside of the far skin (the face looked like skin). The form test for outward faces catches it; check a render too.
- **A contact patch reaching past the cast shadow** (avocado; strawberry).
  Claude's note: a half tipped toward the camera rests on a strip of skin at its front; measured as one body, the patch reached out and Playful strokes painted it as a grey block. Settled a little flatter, contacts from the feet.
