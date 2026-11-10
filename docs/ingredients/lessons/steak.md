# Steak

Sources: commits dfcf61d..9461b5c, CLAUDE.md notes (2026-11-10), the user's two tomahawk
references and their notes in a cloud session on 2026-11-10.

## Colour
- **No crisp lines where colours meet inside an ingredient** (steak).
  First try: the fat rim as its own lifted piece, then fat seams with a sharp edge.
  User said: "the fat layer is just too harsh", then "just maybe work on this hard edge of the fat" and "yes, no crisp lines...very niche scenarios we use crisp lines...thats a good rule".
  Ended on: the fat rim, seams and pockets painted by the shader, each fading into the meat over a soft band with a little of the meat's pink in the fat's edge.
  Why: a crisp edge inside a soft painting reads as a cut-out sticker. Crisp edges are kept for a few deliberate places only: the lit outline, the cast shadow, printed art.
- **"Too realistic" is fixed by softening, not by redrawing as a diagram** (steak).
  First try: fibre lines, thin veins, specks and ragged seams.
  User said: "it looks too realistic, can we stick to our stylized style", then, of a shapes-first redraw (an eye, a cap seam, flat sections), "no, revert back to previous version".
  Ended on: the organic seams and pockets kept, with soft edges and a light chalky texture.
  Why: the organic shapes were right; the crisp edges were what read as a photo.
- **Shared painted textures carry across ingredients** (steak, watermelon).
  User said: "give it similar treatement as the watermelon as well, where we introduced some rough textures".
  Ended on: the watermelon's chalky dry-brush scratches broken by a paper grain, kept light on the meat.
  Why: the same hand painted every card.
- **Raw meat is a deeper beef red, from the references** (steak).
  Claude's note: board 08 says Pink and raw; the user's references are deeper, so a new `beef` family, with part-only `fat` (pinker than ivory, apart from a cream table) and `bone` (ivory to warm tan, never grey).
- **Marbling is a few shapes, not a lace** (steak).
  Claude's note: a dense lace of veins read as a busy pattern, small sections as a giraffe net. A few big sections with wandering seams that swell into pockets where they meet read as meat.

## Composition
- **Every piece rests the way it really would** (steak).
  Claude's note: the steak lies flat and its long bone dips so the knob rests on the table, as a real tomahawk does.

## Form
- **Choose the cut people picture, from the user's references** (steak).
  First try: a plain slab, then a jagged slab.
  User said: "its very rounded, can u make it similar to the ref, a bit jagged", then "this doesnt look aesthetic, maybe we try a different cut".
  Ended on: a tomahawk, after two references the user chose: a thick ribeye eye, a meaty neck, a long rib bone.
  Why: a shapeless slab reads as a bean or a stone; a famous cut with a bone reads as steak at a glance.
- **Where two parts join, one grows out of the other** (steak).
  First try: the bone poking out of a flat edge.
  User said: "the spot where bone meets meat can be more similar to ref", then "shorten the meat wrap so more bone shows".
  Ended on: the meat wraps up round the bone in a short sleeve that thins along it, leaving a long stretch of bare bone.
  Why: a joint with no transition reads as two objects pushed together.
- **Ends are shaped, never flat-cut** (steak).
  First try: a straight, flat-ended stick of bone.
  User said: "the bone shape can be similar to ref as well".
  Ended on: a gentle curve, slimmer in the middle, swelling into a rounded, flared knob.
- **A layer sits only where the real thing has it** (steak).
  User said: "i think the fat just wraps wierd".
  Ended on: on the side walls the fat shows only along the back edge (the fat cap); the top keeps a soft rim round the eye. Wrapped all round, it made a pink stripe along the front.
- **A flat ingredient tilts its top toward the low camera** (steak).
  Claude's note: from the card's low view a flat steak read as a thin disc; it is thicker at the back than the front, so the cut face shows.

## Recurring errors
- **A flat-bottomed body sits flush on the table** (steak, butter).
  Claude's note: a rounded bottom edge curled up off the table and the floor's contact shade showed through as a dashed line round it; only the top edge is rounded now.
- **Rim glints draw lines along soft edges** (steak, sauce, watermelon).
  Claude's note: a blocky white streak along the top's edge; `rimGlints: false`.
- **Heavy work inside a distance field stalls Shuffle** (steak).
  Claude's note: asking a curve for points inside the field took about a second to build the steak; sampling the bone's path once brought it to 0.23 s. Keep any build under about 0.3 s (the broccoli's).
- Claude's note: `patch` is a reserved word in GLSL; a variable named so broke the shader.
