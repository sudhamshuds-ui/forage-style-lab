# Red onion

Sources: commits on branch `onion` (2026-11-11 and 12), the round 2 plan
(`docs/ingredients/r2-plan.md`), the user's watercolour reference and notes in a cloud session.

## Colour
- **A reference that shows the colour settles it fast** (onion).
  First try: a red-violet family that read candy-pink, then a dusty plum.
  User said: "some more ref for the form and colours. also the details for top and bottom and line textures" (a watercolour red onion).
  Ended on: a magenta-violet family (`onion`): lilac in the light, deep violet in shadow, never grey.
  Why: purple is hard to judge in the abstract; matching a painting the user likes lands in one step.
- **Line textures follow the form in smooth arcs** (onion).
  First try: fine pale veins with a wandering noise, which read as white scribbles and cracks.
  Ended on: a few darker violet lines from root to neck, each its own strength and broken in places, drifting only slowly, over broad soft lighter and deeper bands; they fade toward the poles so they never bunch into a star.
  Why: lines that wiggle read as cracks; lines that follow the form describe it.
- **Translucent skins glow** (onion, watermelon, chicken).
  User said: "also can we get some more translucency and sub surface with the skin".
  Ended on: the translucent flesh guideline on the skin: the darker tones soak up the glow colour and stay luminous, edges seen side on glow, light comes through from behind, the thinnest part (the neck) glows a little more.
  Why: a flat, opaque purple reads as plastic; a little glow reads as a living vegetable.
- **Dry parts and the body meet in one colour** (onion, chicken).
  Claude's note: the neck dries from violet through a warm rosy tan to the papery tip's own colour; the root end is tan. A part in another family meets its body where the body has already turned toward the part's colour.
- **No flat pale highlight on a satin skin** (onion, strawberry, apple).
  Claude's note: the full sheen put pale blobs on the bulb in the first try; a quiet sheen (`matte`) suits a satin skin.

## Composition
- **Show the variations side by side and let the user pick** (onion).
  User said: "i think keep it upright and one variation with 2 onions(1up 1 side) and 1 variation with 1 full 1 cut", then "can u make the variations as a seperate artifact...like we did for ui so i can toggle and view them", then "go with upright".
  Ended on: upright. The pair (one standing, one on its side, just touching) and the whole and cut (the first cut face) stay in the form (`buildOnionArrangement`) for later.
  Why: arrangements are taste; a page that toggles them (`prototypes/variants.html`) answers it in one look.
- **Nothing levitates: what reaches below the table is pressed flat** (onion).
  User said: "fix this its levitating" (the onion stood on its root tuft).
  Ended on: the body rests on the table; any root or small part that would reach below it is squashed flat along the table and splays out a little, as real roots do under the weight.
  Why: a body held up by thin parts reads as floating, however close it is.

## Form
- **Build to the reference's pose and proportions** (onion).
  First try: a squat bulb whose neck was a cylinder stuck on top, then a teardrop.
  Ended on: a round, lopsided globe whose full shoulders pull up into a short neck, a dry papery tip of a few twisted ribbons curling over, a root tuft, standing on its root end.
  Why: the shoulders sweeping into the neck is what says onion; a neck stuck on a ball says pomegranate.
- **A cut half: the profile rounds off into a flat face over a small bevel** (onion).
  Claude's note: the first cut face in Forage. A lathe whose profile holds its width almost to the cut, then rounds off over a few millimetres into a flat face; the face's map (how far in from the rim) tells the shader where the rings go: pale flesh, bold violet layer edges, uneven, never a target.
- **Tipped forms remember where they were upright** (onion).
  Claude's note: a piece can carry `ownPos` (each point in its upright frame), so marks that run round an axis still follow it when the form is tipped over or lies on its side.

## Recurring errors
- **Smooth extras need a floor** (onion, chicken).
  Claude's note: none this time; the neck's round end is capped inside the profile.
- **Two bodies placed by their real shapes** (onion pair, strawberry).
  Claude's note: the pair is slid together until any point of one would be inside the other's real profile, never by sample distance.
- **Thin parts at table height** (onion, broccoli, butter).
  Claude's note: the root tuft, squashed under the bulb, is checked from low down for flicker and floating.
