# Process log

Every round of exploration, kept for a case study later (the user, 2026-11-11): what was
tried, what the user said, what was picked. Prototype pages stay in the repo and their
previews stay published, even after a winner is chosen. Nothing here is cleaned up.

Each entry: the date, the question, the variants (with stills in `img/`), the preview
link, and the user's words where they decided something. The ingredients have their own
records in `docs/ingredients/lessons/`.

## The Style Lab UI

### Round 1 (2026-11-10): three directions
The ask: the viewport as the hero; only a Painterly toggle, Shuffle ingredient, the
ingredient's name, and a way to move through painting styles. The user's sketch: a card
with a label below, and a card with a pill and a round button on it.
Page: `prototypes/ui.html` (plain TypeScript), preview "Forage UI variants".

| Variant | Idea | Still |
|---|---|---|
| Dock | One frosted pill on the card, style chips above it | `img/2026-11-10-ui-round1-dock.jpg` |
| Placard | A museum label below the card, stepping through styles | `img/2026-11-10-ui-round1-placard.jpg` |
| Dial | One rail from no strokes to the boldest painter | `img/2026-11-10-ui-round1-dial.jpg` |

User said: "i like the dock style. but UI can still be improved", and asked for React.

### Round 2 (2026-11-10): three docks, in React
Libraries (from the curated list): base-ui, motion, clsx. Polish after the
`emil-design-eng` skill. Page: `prototypes/dock.html`, preview "Forage dock variants".

| Variant | Idea | Still |
|---|---|---|
| Morph | The dock grows a row of style chips when Painterly is on | `img/2026-11-10-ui-round2-morph.jpg` |
| Popover | A tiny dock; a brush button opens the styles with a line each | `img/2026-11-10-ui-round2-popover.jpg` |
| Stepper | One slim line; arrows step through the styles | `img/2026-11-10-ui-round2-stepper.jpg` |

Then built in Figma for the user to edit (file 537QrQ0QsVjcT4u3st7M20, page "Style Lab UI",
node 115:2): the three screens, the docks as components, colour variables. In progress.

## The Shuffle transition

### Before (2026-11-05): the dry brush
The user's idea: snapshot the ingredient, smudge it with brush strokes, then reveal the
next one through them, with a shader transition and a painterly falloff. Reference for the
falloff: `img/2026-11-05-transition-reference-burn.png` (a picture the user sent; not ours).
Built and approved as the dry brush (the history is in CLAUDE.md, Shuffle ingredient).

### Round 1 (2026-11-11): five styles
Page: `prototypes/transition.html`, preview "Forage shuffle transitions"
(https://claude.ai/artifact/6wUDJ3pRuMPaGyK3TYve4Z). Still: `img/2026-11-11-transition-round1-styles.jpg`
(each style frame by frame, apple to lemon).

| Style | Idea |
|---|---|
| Current | The approved dry brush, for comparison |
| Sweep | Wide strokes in rows, top to bottom, back and forth |
| Dabs | Short round dabs, scattered (taken off the picker by the user) |
| Swirl | Strokes stir round the ingredient |
| Feather burn | The reference: no strokes, a hairy, grainy front smears the old card, then burns through |

The burn took three tries: the whole card blurred at once (no edge to see), then the front
crossed in half a second, then a steady front over the last 1.3 seconds.

### Round 2 (2026-11-11): brush burn
User said: "remove dabs option, try burn with brush strokes but rather than having it from
centre do it from corner to corner". Brush burn: the front runs from a random corner to the
opposite one, its edge made of brush tongues and bristle streaks.
Still: `img/2026-11-11-transition-round2-brush-burn.jpg`.

### Round 3 (2026-11-11): paint in
User said: "rather than revealing the object 2 painting underneath it....can we have it
paint in new strokes....that is..paint in the object 2 rather than mask revealing it".
Paint in: the dry brush, but each reveal stroke carries paint picked up from the next
picture along its length, big blurry strokes first, then smaller, sharper ones, then a
soft wash and the live picture. The smudge also lays down a little more of the old
card's own colour. Still: `img/2026-11-11-transition-round3-paint-in.jpg`.

### Round 4 (2026-11-11): more strokes, less wash
User said: "give the strokes more time and shorten the wash". The four layers of paint
strokes now start close together (a fourth layer of fine strokes fills the gaps), and the
wash is a short last touch at the very end. Still (frames 1.1 to 2.35 s):
`img/2026-11-11-transition-round4-paint-in-longer-strokes.jpg`.
