# Batches 0 and 1: second review

The user's second look, 2026-11-15, from their Figma board "batch 0-1 R2 feedback" (file
537QrQ0QsVjcT4u3st7M20, node 195:157). "some minor changes do these".

| Ingredient | The user's words |
|---|---|
| Tomato, potato, peach | "Tomato, potato, peach perfect. done" (locked) |
| Salmon | "salmon too thick...go back to this thickness u had before. the width size is good. and go back to the prev skin...is too thick now" |
| Rice | "i like the grains, but its too much noise...either blend them a bit into the main form." |
| Milk | "milk texture is crooked" |
| Fried egg | "remove fried egg, lets not keep this now" |
| Eggs | "Egg carton form is wrong see refs" (three photos of a real half-dozen pulp carton: a flat rim, round cups showing from outside, two tall flat-topped posts down the middle, the lid standing open behind) |
| Lime | "lime cuts still missing this details. see ref" (the painted wedge: a thick white pith, a dark green peel edge, juicy pulp with its sacs and a segment line) |
| Garlic | "garlic looks squashed now, go back to prev form. just make the top part thinner- the cylindrical form" |
| Mushrooms | "mushrooms are fine, maybe increase number, and random rotation" |
| Pear | "make this edge a bit smoother for pear...the middle deform." |

## What it teaches

- **Change only what was asked.** The salmon's size note was about its length; making it taller and
  restyling its skin at the same time had to be undone. The garlic's note was about its neck; the
  bulb changed too and had to go back. One note, one change.
- **Detail yes, noise no** (rice): real forms are welcome, but they sit in the mass and share its
  light; hundreds of raised pieces each catching their own light read as static.
- **A real object's form comes from a photo of the real object** (the carton): a painting of it
  was not enough to get the moulded shape right.

## Third look (2026-11-15)

"egg carton corners are a bit wrong, refer refs, also they are coming out. Lime this isnt the
texture, see refs again. pear can have more bulgier bottom? All rest are approved and done"

- **Approved and locked**: cabbage, salmon, rice, milk, tomato, potato, peach, garlic, mushrooms.
- Eggs: the tray's wall was one flat strip from rim to foot, so its corners were flat facets and the
  eggs poked out through them. Now a curved wall of several rings (`wall` in `kit/tray.ts`), rounder
  corners, slightly slimmer eggs.
- Lime: teardrop sacs and bold branching lines read as a leaf's veins. Now one calm mass of pulp
  with only fine faint streaks, a thick soft pith, a pale core, a dark peel line.
- Pear: fuller below the waist only (`fuller` in `forms/pear.ts`); the waist and neck are unchanged.
- Waiting for the user's look at these three. Then `/forage-brand` for all twelve and the merge.

## Fourth look (2026-11-15)

"why are u curving the egg carton like that in the corner, also the height. please 1:1 the form of
the carton with ref. its fine i dont think u can do it for lime, just go back to this version.
peach as well. go back to this exact version" (the third picture is the pear, so the pear was
restored; the peach was already approved and is unchanged).

- **Lime: restored exactly** to the wedge flesh of commit 5d1c87b (the pale, soft fan with light
  inside), which the user chose over two tries at more detail. Locked. Lesson: after two failed
  tries at the same thing, stop and offer the earlier version instead of a third guess.
- **Pear: restored exactly** to commit 5d1c87b (the waisted outline, fillet 1.9). The smoother waist
  and the fuller bottom are both undone. Locked.
- **Egg carton**: rebuilt as the real object is made: a thin flat rim plate (a plain rounded
  rectangle, lower than before so the eggs stand more than half out), six separate round cups
  under it (`spinProfile`), two flat-topped posts, the lid standing open. The invented outer wall
  (and the corner it bent in) is gone. `footY` in `kit/tray.ts` makes the thin plate.

## Fifth look (2026-11-15)

"its missing this bulge. rest all are approved, fix this, then merge to main" (the pear, with the
waist circled on their screenshot of the first render).

- **Pear**: the restore to commit 5d1c87b was the wrong version (a smoothed waist). The very first
  outline is back: a belly, a neck and a small bulge where they meet (`Math.max(belly, neck, fill)`
  in `forms/pear.ts`). Locked. Lesson: check a restore side by side with the user's screenshot.
- **All twelve approved**: cabbage, salmon, rice, milk, tomato, eggs, potato, lime, garlic,
  mushrooms, pear, peach. `/forage-brand` run and merged to `main` the same day.
