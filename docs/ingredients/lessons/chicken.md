# Chicken

Sources: commit 91ffad9 (round 1, approved as is), board 08's card, the user's brief and
approval in a cloud session on 2026-11-11.

The drumstick was approved on its first round. Its brief is now the bar for every ingredient
(the guide's "The bar"): the user asked "Please lets try to get it right this time. avoid making
the same mistakes. follow the guidelines and the get the form, colours, textures, shadows right
without glitching, artifacts, evident hard edges or not blended regions. make sure it has ample
amount of detail as well, and is consistent in style with the rest of the ingredients", then
said "drumstick is perfect".

## Colour
- **A raw ingredient keeps its own family when the board's is too deep** (chicken).
  Claude's note: board 08 says Pink and raw, a deep salmon; raw chicken skin is far paler. A new
  `poultry` family (a creamy peach-pink, rose and plum in shadow) keeps it apart from the fat
  (pinker, cooler) and the butter (yellow), as `beef` did for the steak.
- **A skin shows what is under it** (chicken).
  Claude's note: raw skin is a little see-through: soft patches of yellow fat and pink meat show
  through, the darker tones soak up the warm glow (the translucent flesh guideline, gently), and
  faint rosy blotches sit where small vessels are. One flat pink would read as plastic.
- **A signature texture comes in loose patches, never an even pattern** (chicken).
  Claude's note: the goosebump follicles sit in loose tracts, each a tiny lit dome with a small
  pore, each a little different in strength, and fade where the surface turns away (near the
  outline they bunched into a dotted line). Their dimples break the moist sheen into small glints
  (a bumpy skin breaks its shine, as on the strawberry).
- **Where one layer gives way to another, paint it from a map as one wide, wandering band**
  (chicken, steak, watermelon).
  Claude's note: the skin pulls back unevenly to show rosy meat and pale tendons on the shank,
  fading over a band that wanders; the meat thins to pale tendon where it meets the ivory bone,
  and the bone takes a pink blush there, so the two meet in similar colours instead of a crisp
  ring. The knuckle's cartilage cap is pearly, a touch cooler, never grey.
- **The same light chalky texture carries across** (chicken, steak, watermelon).
  Claude's note: kept light on the skin, so the drumstick is painted by the same hand.

## Composition
- **A long ingredient rests on the places that would really touch** (chicken, steak).
  Claude's note: the axis tips until the soft bulb settles a little flat on the table and the
  knuckle rests on it, the shank in the air between. Contact shadows go only under those two
  places (`contactsFromFeet`), never in a row along the whole length.
- **On a diagonal, the telling end toward the camera** (chicken, baguette).
  Claude's note: the bulb at the back left toward the key light, the bone and knuckle reaching
  toward the camera on the right.

## Form
- **Build the form from what makes it itself, then keep every part gentle** (chicken).
  Claude's note: a lopsided bulb, fattest a quarter of the way in, a muscle seam spiralling softly
  along it and a fainter one underneath, a soft three-cornered section (never a round tube), a
  concave taper into a slim shank with soft tendon ridges, a few loose skin folds before the
  skin's edge, and a knuckle of two rounded knobs with a dip between. Each one is a small change
  in the radius, so the whole stays smooth and calm.
- **Where bone meets meat, the meat thins round it** (chicken, steak).
  Claude's note: the meat's radius runs out inside the bone, so the bone grows out of the meat.
- **Smooth extras need a floor** (chicken).
  Claude's note: a smooth maximum of two radii adds a little where both are near zero, and a skin
  thickness added past the bulb's end carried on as a thread: both drew a tiny spike at the tip.
  Keep "no shape here" well below zero, and scale added layers by the radius under them.

## Recurring errors
- **A dashed bluish line round a pale ingredient's outline** (chicken, butter).
  Claude's note: outline pixels are half ingredient, half table, so their label landed between
  table and object and the glaze painted them as cast shadow. Fixed for every ingredient
  (`glazeShader.ts`, `shadowMaskAt`): an outline pixel takes the label of the table beside it.
- **A pale sliver where a rounded body meets the table** (chicken).
  Claude's note: the light's normal bias let light leak onto the floor right at the contact.
  The floor casts nothing, so it now has no normal bias and reads its depth a hair further back
  (`ground.ts`, `FLOOR_BIAS`); more than a hair made the butter paper's scribbles worse. A smaller
  flat patch on the bulb (`SINK`) closed the last of it.
- **A slow build** (chicken, steak).
  Claude's note: a distance field with many shapes in it is slow at every grid point. Quick
  answers far from the surface and a radius looked up from a table brought the build to 0.25 s.
