# Blueberries

Sources: commits on branch `blueberries` (2026-11-12, four rounds), the user's reference (Figma
node 148:12, blueberries in a punnet; the punnet is a later tool, so a loose pile) and notes in a
cloud session.

## Colour
- **A cool subject opens in a warm room** (blueberries).
  Claude's note: every room so far was cool, because every subject was warm; a blue subject needs the opposite. The first warm room, Apricot (a muted apricot wall, a cream table, a rose-mauve cast shadow, the cool side of the warm wall), is marked `warm` and the room tests check it against a blue subject.
- **Warm highlights, cool shadows on a cool subject** (blueberries).
  Claude's note: cream highlights, violet-indigo shadows; the subject itself is cool, so its shadows lean further toward violet rather than grey.
- **Blue, not purple** (blueberries).
  First try: a periwinkle-violet family and a violet push in the shadows read as purple.
  Ended on: a dusty cobalt family, each berry leaning a little violet or navy, a paler blue bloom.
- **The bloom is a dusty powder in loose patches, rubbed off in places** (blueberries, grapes).
  Claude's note: pale periwinkle patches over a deeper blue that shows (glossier) where the bloom is rubbed off; never a flat grey film.
- **Small dark marks stay mid-dark** (blueberries, watermelon).
  Claude's note: the crown's hollow is a soft plum, not near black; near black turned into a hard block in Playful strokes.

## Composition
- **A loose pile: a mound with a couple of strays close by** (blueberries).
  User said: "the gap between the cluster and the 2 berries is a lot, reduce it".
  Ended on: the strays a short roll from the pile (one just touching), not a separate group.
- **Every piece held in balance** (blueberries).
  User said: "looks a bit off balance here, need a berry underneath it on right".
  Ended on: a balance check (the touches from below must surround a berry's centre, seen from above); a shaky berry gets a new berry tucked in under its open side (up to four), and only then rolls toward its open side and settles lower. Rolling alone flattened the pile into one layer. A test checks every berry is held, for six seeds.
  Why: the settle pass only stops overlaps; it does not know about balance.

## Form
- **The crown is the signature: a five-pointed star standing up from the berry** (blueberries).
  First tries: tiny marks, then a navel with dark spokes, then a flat star that read as a dent. User said: "the crown there can be a bit extrusion".
  Ended on: a short raised collar, highest at its five broad sepal tips, around a soft plum hollow; built into the berry's mesh (rings by angle from the crown, close together near it), no shine on it.
  Why: the crown makes a blueberry read at card size; it must break the outline.
- **Build a round piece by angle from its feature** (blueberries).
  Claude's note: a lathe along the axis puts too few rings near a pole for a detailed crown; rings by angle, closer near the crown, keep it clean within the budget.
- **The drop-and-nudge settle is a kit tool** (blueberries, grapes).
  Claude's note: `kit/settle.ts`, shared; the grapes came out identical after the move (a geometry fingerprint before and after).

## Recurring errors
- **A pile that settles but is not balanced** (blueberries).
  Claude's note: check balance as well as overlap; the test in `blueberries.test.ts` is the model for any pile.
- **A detail mesh over budget** (blueberries; broccoli, baguette).
  Claude's note: put the rings where the detail is, not everywhere.
