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

### Round 3 (2026-11-11): the user's directions, and the brush slider
The user's Figma frames (node 124:352, six screens): "keep viewport not rounded, no shadow",
"lets not show name of ingredient and painters", and "the brush icon is toggle for painterly
mode...not sure how we can make an interaction to bring a slider in to get it from normal to
very painterly" (frame 6 sketches the brush button stretched into a tall pill). Also from the
frames: "Forage pantry" above the card, a "New ingredient" pill, the drag hint below.
Page: `prototypes/brush.html` (React), preview "Forage brush slider"
(https://claude.ai/artifact/M7cV6qxhk8m34P4p5P8JC1). Motion from `emil-design-eng`, filtered
with `find-animation-opportunities`. The slider drives one "how painterly" amount
(`src/prototypes/brush/amount.ts`): 0 off, 50 today's default strokes, 100 very bold.

| Variant | Idea | Still |
|---|---|---|
| Grow | The brush button stretches down into a tall pill with a slider (the user's frame 6) | `img/2026-11-11-ui-round3-grow.jpg` |
| Scrub | No slider at rest: tap to switch, drag up or down on the button; a ring shows how much | `img/2026-11-11-ui-round3-scrub.jpg` |
| Bar | The brush beside "New ingredient"; switching on slides a short slider out of it | `img/2026-11-11-ui-round3-bar.jpg` |

### Round 4 (2026-11-11): Bar, the brush as a switch
User said: "i like bar layout, lets remove the slider stuff. the bottom padding can be
increased", and asked how to use Geist Serif and Söhne. The brush is now a plain on and off
switch beside "New ingredient" (on: today's default strokes), 36 px up from the card's bottom
edge. The title is in Geist Serif Heart, the cut picked in Figma: it is free (Vercel's Geist
family, SIL Open Font License), so it is hosted with the page
(`src/prototypes/fonts/`). Söhne is a paid font (Klim Type Foundry; the file used the trial
"Test Söhne"): it needs a web licence before it can be used, so the hint stays in Geist.
Round 3's slider variants stay on the picker. Still: `img/2026-11-11-ui-round4-bar.jpg`.

### Round 5 (2026-11-11): the style menu, and the camera further back
The user's mock-up: the brush as a split button with a list of styles above it. User said:
"can we do this, but name them style 1 or just painters name". Built both (picker: "Names",
"Numbers"): the brush half switches the painterly look, the arrow half opens the list (base-ui
Menu, grown from the arrow), and picking a style switches the look on. No descriptions.
Still: `img/2026-11-11-ui-round5-style-menu.jpg` (caught mid fade-in).
Also: "for camera, i want this to be the default zoom" (a screenshot zoomed out). The view now
starts at 10.2 units instead of 8.6, while each ingredient is still sized from 8.6, so it keeps
its size in the room and the room shows round it. Still: `img/2026-11-11-camera-further-back.jpg`.

### Decision (2026-11-11): Names, and the real page
User said: "names, go ahead and make it the real page". The Style Lab's main page now has this
design (`index.html`, `src/ui/styleBar.tsx`); the old panel is hidden behind `#panel`.
Still: `img/2026-11-11-real-page.jpg`.
Then: "can we decrease the total size by 15%...i want more negative space". The card is 15%
smaller (on phones it still takes the full width). Still: `img/2026-11-11-real-page-smaller.jpg`.
Then: "make forage pantry the dark ink. can we make the glass like apple? /apple-design on
overall". The title is in the dark ink with slightly tighter tracking; the controls became an
Apple-style material (stronger blur and colour lift, a bright top edge, a hairline, a shadow
sized to the surface; the menu thicker, materialising from the arrow with scale and blur;
solid with reduced transparency, outlined with more contrast). Stills:
`img/2026-11-11-apple-glass-page.jpg`, `img/2026-11-11-apple-glass-menu.jpg`.
Then: "i think the whole brush pill should become black when clicked, instead of just the
icon". While the painterly look is on, the whole brush pill turns a dark tinted glass (brush
and arrow white), easing in over 200 ms. Still: `img/2026-11-11-brush-pill-on.jpg`.
Merged to `main` (2026-11-11). Then: "can we make it so, the paint icon circle expands into a
pill when selected, hence showing the arrow?". Off: a round brush button, no arrow. On: it
turns dark and stretches into the pill (260 ms, strong ease-out), the arrow fading in just
after; the hidden arrow cannot be reached by keyboard. Still (off, then on):
`img/2026-11-11-brush-circle-to-pill.jpg`. Merged to `main`.
Then: "this is missing?" (the drag hint). It faded out after the first drag, a touch added
from find-animation-opportunities, so it looked missing: it now always stays, worded as in
the user's Figma (no full stop).

### Loading states for New ingredient (2026-11-11)
User said: "for the new ingredient button, when the transition is happening its greyed out
currently. i want a cool loading state/animation for it. create variations for me /animate".
Page: `prototypes/loading.html`, preview "Forage loading states". Five looks, all CSS
animations timed from the swap's length: Brush fill (ink sweeps across like one stroke),
Outline (an ink line once round the edge), Shimmer (a light passing along the label),
Scribble (a squiggle drawn in the pill), Painting (the label becomes "Painting" with dots).
Still (each at 25, 60 and 90% of the swap): `img/2026-11-11-loading-states.jpg`.
Round 2. User said: "i want brush fill variation, and the painting variation but just with the
3 dots animating. 1. for brush filled...start it the moment u click, the edge can be like a
brush stroke? once it fully becomes black...have a shader transition back to the glass as
well 2. for the 3 dots version, i want the new ingredient animating out and 3 dots animating
in and vice versa after the transition is done". Brush fill: the ink starts on the click
(a loading phase set before the swap reports busy), its leading edge a dry brush (thirty
feathered bristles and specks, one sliding mask), and when the swap ends it dissolves back
into glass through streaky noise (an SVG noise filter whose threshold sweeps over 480 ms).
The first bristle edge read as a barcode: thinner, feathered bristles fixed it. Dots: the
label slides up and out as three dots rise in and bob, and back again after. Also from the
user: "the hover for brush icon and new ingredient are different, keep them consistent...glass
brightens up?": both now brighten the glass. Still: `img/2026-11-11-loading-round2.jpg`.
Round 3. User said: "lets work on the first fill version, it was almost perfect. 1. the easing
is perfect dont change it 2. instead of a hard fill edge, make it a faded gradient near the
edge and add some noise, similar to the noise u added to watermelon 3. after its fully black
fade it gently 4. start the animation at the click". Fill (round 3): round 1's sweep with its
exact easing, starting on the click; the edge a gradient broken by grain and short streaks
(a noise filter baked into the sliding mask); a gentle 450 ms fade once black. Still (0, 30,
50, 70, 100% and mid-fade): `img/2026-11-11-loading-round3-soft-fill.jpg`.
Decision. User said: "its fine for the fill (round1) can u ease out the fade away from black
back to normal and then merge it to main". The round 1 fill is the real button's loading
state, now starting on the click, fading back to glass with a gentle 600 ms ease-out.

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
User said: "no revert paint in to prev version". Reverted to round 3 (three layers, the
longer wash); round 4 is kept here and in history (commit 1e14783).

### Decision (2026-11-11): Paint in
User said: "make paint in the default and merge to main, also in the shuffle artifact,
remove current and keep paint in". Paint in (round 3) is now the Shuffle transition in the
app; Current is off the prototype page (its look is still in history and in round 1's still).
