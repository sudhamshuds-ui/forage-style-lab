# Red grapes

Sources: commits on branch `grapes` (2026-11-12, three rounds), the user's reference (Figma node
148:27, red globe grapes on a golden stem) and notes in a cloud session.

## Colour
- **Warm highlights, cool shadows, always** (grapes, every ingredient from now on).
  User said: "we should always try to do warm highlights and cool shadows".
  Ended on: a house rule. Light and its glow lean warm (coral, gold, cream); shadows lean cool
  (violet, plum, indigo, blue-green), never grey and never the same hue as the light.
  Why: the temperature shift is what makes a soft-lit painting feel lit, not just shaded.
- **Purple in the shadows of a red fruit** (grapes).
  User said: "add some purple in shadows".
  Ended on: the shadow side of each berry, and where berries shade each other, leans toward a rich violet, deepest furthest from the light.
- **Translucent fruit glows where it turns into shadow, not across its whole shadow side** (grapes, melon, onion).
  First try: a warm glow over the whole shadow side. User said: "these bands look odd, all of them have it like a pattern".
  Second: the glow at the thin outline only. User said: "can we add a bit more subsurface".
  Ended on: one soft warm band where each berry turns from light to shadow, brighter thin edges, more light coming through from behind.
  Why: a glow over the whole underside lifted it back to the lit colour, so every berry read light, dark, light; repeated over 25 berries, that is a stripe pattern.
- **Many small pieces: each its own colour, from one family** (grapes).
  Claude's note: each berry takes its own mix from coral to deep wine-violet (most deep, some rosy), with mottled washes, so the bunch never looks copy-pasted.
- **Many small round pieces get one smooth turn from light to shadow** (grapes).
  Claude's note: the shared tone steps, fine on one large form, repeat on every small berry as a pattern; the grape skin replaces them with a smooth falloff and keeps neighbours' cast shadows.
- **Highlights on many small pieces are broken, never one dot each** (grapes, strawberry).
  First try: the shared sheen put the same pale round dot on every berry (polka dots); painting a glint on top did not remove it.
  Ended on: the skin tells the shared sheen it is a broken surface (`highlightBumpy`, like the strawberry's): it thins out, skips where the bloom is thick, and breaks into a few glints; some berries barely shine.

## Composition
- **A bunch lies the way a real one settles** (grapes).
  First try: the settle pass spread the berries into one flat layer.
  Ended on: a soft mound, the stalks holding the berries close to the stem, a light pull down; the cut end of the stem curls up off the table, like the reference.
  Why: a bunch on a table slumps but keeps its shape; a flat mat reads as loose berries.

## Form
- **Settle many pieces with a drop-and-nudge pass, using each piece's true outline** (grapes).
  Claude's note: gravity, the table, each berry within reach of its stalk, berries pushed apart along the line between them by how far each oval reaches in that direction (its support distance), so they touch but never sink in; the stem is a row of balls they keep clear of. Reusable for the blueberry pile.
- **Stems are slim** (grapes).
  User said: "stem might be very thick".
  Ended on: about 40% thinner (main stem 2.4 mm, stalks 1 mm, caps 3 mm across).
- **Many pieces merged into one piece** (grapes).
  Claude's note: the berries are one mesh, each with its own map value (its colour mix); the "faces point outward" check now measures each separate body from its own centre.

## Recurring errors
- **A glow or tint tied to the tone steps draws a hard line** (grapes; the pepper's stepped groove).
  Claude's note: drive glows from a smooth light falloff, never from the tone bands.
- **A stale render after an edit** (process).
  Claude's note: the dev server reloads on every edit and a render can catch the old page, or the server can have stopped; make render scripts retry, and compare before and after side by side before believing "no change".
