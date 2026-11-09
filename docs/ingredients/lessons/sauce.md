# Hot sauce

Sources: commits 0d13cc2..a694361, CLAUDE.md notes (2026-11-05). Built in a cloud session; the user's
feedback is recorded in those notes, not in their own words.

## Colour
- **Lettering is never black; labels are shaded like the ground they sit on** (sauce).
  Claude's note: the printed label's ink is cream (`paper`) on a `chili` ground, shaded with the light; the switched-off layered label used deep plum `ink` marks (abstract, never real letters, never reading as a face).
  Why: pure black ink punches a hole in a soft painting.

## Composition
- **Turn the best side toward the light** (sauce).
  Claude's note: turned -25 so the label faces the light.

## Form
- **Elongate until it reads as the thing** (sauce).
  Claude's note: the user asked twice for a longer bottle (12 to 13.2 to 15 cm); a squat bottle read as a jar.
  Why: proportion is identity for vessels.
- **Shape the silhouette like the reference before adding detail** (sauce).
  Claude's note: the user's first round: the body flares toward its base (about 11% narrower at the shoulders, a soft triangle), the cap is narrower at the bottom by the collar, and the shoulder runs into the neck with a softer fillet. The label keeps its size as the bottle grows, centred a little higher.
- **Crisp edges where the real thing is crisp, with a small bevel** (sauce).
  Claude's note: the user asked for sharper edges; square shoulders and crisp base, cap and collar, each with a small bevel.
  Why: soft is the default, but glass and caps have edges; a bevel catches a line of light.
- **Our own design, in the spirit of a reference; keep it simple** (sauce).
  Claude's note: the label is our own two-tone stencil (hand-lettered HOT SAUCE, a flame, a small chili), never a copy of a real brand. The user removed zig-zag borders, dots, triangles and repeated icons, and chose plain sides and back.
  Why: one clear front reads at card size; ornament turns into noise.
- **Decision: the layered label is switched off** (sauce). `WITH_LABEL` in `forms/sauce.ts` brings it back.

## Recurring errors
- **Rim glints draw hard white bars on narrow tubes** (sauce, watermelon).
  Claude's note: the neck facing the light caught a glint as a hard white bar, which the user saw as a glitch. `rimGlints: false` on the entry.
  Why: a glint is a line; on a thin tube it becomes a stripe.
- **A wrapped sheet's two ends must meet exactly** (sauce).
  Claude's note: a hair-thin gap at the back of the label showed as a dark line.
