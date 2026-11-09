# Strawberry

Sources: session "3D ingredient forms" (2026-11-04), commits ab23e6a..763e37b, 9395555, c37a601,
this session (2026-11-09: 2047d94, 542f82f).

## Colour
- **Berries are cooler and more magenta than the apple's red** (strawberry).
  First try: the apple's red family.
  User said: "the colour is same as apple, i think it should be leanign towards majenta?"
  Ended on: the `crimson` family.
  Why: two reds side by side must still tell the fruits apart.
- **A bumpy skin breaks its shine into a faint sheen and small glints** (strawberry).
  First try: the soft sheen lit a whole broad face at once, one flat pale shape.
  User said: "it looks like glossy candy flat".
  Ended on: a faint sheen that thins out from its core, skips in the seed dimples, small glints on the dimple rims, tinted toward the berry's own red. Only on dimpled skins: trying it on every ingredient made the apple's highlight vanish and the orange's scratchy.
  Why: real dimpled skin scatters its shine; one smooth patch reads as plastic.
- **Leaves need tone and texture, not one flat green** (strawberry).
  User said: "leaves look very 1 dimensional in texture and colour."
  Ended on: the leaf skin (stalk-to-tip shading, veins, paler underside).
  Why: flat leaves read as paper cut-outs next to a textured fruit.
- **Seeds must read at card size** (strawberry).
  User said: "make the dots on strawberry more prominent".
  Ended on: pale-gold seeds in soft dimples, lit on one side.
  Why: the seeds are the strawberry's signature; too faint and it reads as a red blob.

## Composition
- **A cluster is an odd triangle, balanced from every side, never a row or a pinwheel** (strawberry).
  First try: a cluster that only worked from the front, then a symmetric pinwheel.
  User said: "dont do compositions like this. no balance in other angles", then "this composition is worse", then "thsi composition can do".
  Ended on: the hero in front, two behind and to the sides, stem ends facing out, bodies just touching.
  Why: the view orbits, so the group must hold up from every angle; symmetry looks arranged.
- **Group shadows follow rules** (strawberry).
  User said: "i think this shadow is wrong, we need better rules for shadows when multiple objectys?"
  Ended on: the five shadow rules in `CLAUDE.md` (one shared shape, measured from the nearest piece, a contact oval per piece, a crevice, real cast shadows between pieces).
  Why: shadows decide whether pieces look like they share one table.

## Form
- **Never a perfect cone; lobed and uneven** (strawberry).
  User said: "its a perfect cone shape which gives it away".
  Ended on: a heart-shaped, lobed body with a tip bent off centre, and more bump.
  Why: geometric perfection is what gives a 3D model away.
- **Ragged, curling sepals** (strawberry).
  User said: "leaves look very fake".
  Ended on: a ragged ruff of sepals, some curling, casting shadows on the berry.
  Why: real sepals are irregular; even ones look plastic.
- **Real size, framed by the card** (strawberry).
  User said: "it also looks very big, because the camera is zoomed in (showing its similar to apple size)".
  Ended on: every ingredient at real size in cm, the card framing scales the subject.
  Why: size relationships between ingredients have to be believable.

## Recurring errors
- **Bodies never sink into each other: check which side of the surface a point is on** (strawberry).
  First try: the cluster checked that sample points stayed apart, and the berries sank up to 1.1 cm into each other.
  User said: "these are intersecting".
  Ended on: the touching check knows each surface's outward direction; a test checks every vertex.
  Why: once two surfaces cross, no two sample points need to be near each other.
- **Parts cast shadows on their own body** (strawberry).
  User said: "shadow of leaves on the berry>?"
  Ended on: ingredient materials read the key light's shadow map; a cast shadow drops one tone band, coloured.
  Why: without it, small parts float above the body.
