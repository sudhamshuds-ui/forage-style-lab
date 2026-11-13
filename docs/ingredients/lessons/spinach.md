# Spinach

Sources: commits on branch `spinach` (2026-11-12 to 2026-11-13, fifteen rounds), the user's
references (a watercolour bunch lying on its side, a tied bouquet, then two watercolour heaps of
baby spinach), their drawn outlines on screenshots, and notes in a cloud session. The first leafy
ingredient.

## Colour
- **Every leaf its own, in the skin as well as the shape** (spinach).
  User said: "all the leaves Look the same, same shape, same size, same cut, same folds same wrinkles".
  Ended on: each leaf carries its own number (`ownPos.x`); the skin gives it its own green (a little
  more yellow or blue, lighter or deeper), its own vein spacing and sweep, and its own savoy
  wrinkles, as well as its own outline, size and fold.
  Why: a pile of identical leaves reads as one leaf stamped many times.
- **Warm highlights, cool shadows on a green** (spinach).
  Claude's note: lime washes on the lit tops, a warm yellow-green glow where light comes through a
  thin leaf, the shaded side leaning cool blue-green; never olive or black-green.

## Composition
- **Leaves fall under their own weight; nothing bends upward** (spinach).
  First try: leaves fanned out of a bundle like a flower, the top ones standing in the air.
  User said: "in reality no leaves an bend upward like that", "u dont have to show it bending upwatd like that".
  Ended on: every blade leaves its stem level and sags down onto whatever is below it.
- **Leaves settle onto each other, folding over and round** (spinach).
  First try: each leaf pushed a gap away from the others, so none ever touched.
  User said: "it looks like they dont want to fold on top of eachother or around eachother".
  Ended on: laid lowest first, each leaf rests on the table and the leaves already there like cloth (`settleStemmedLeaf` on a `Drape` height map), only kept from passing through.
- **Spread out, never stacked into slats** (spinach).
  User said: "they are too stacked on top of each other, spread them out a bit".
  Ended on: leaves pointing their own ways and landing at their own places, so a few overlap at a time.
- **A heap: low, round, the height kept** (spinach).
  User said: "do u think we cdan do a pile of leaves like this, rather than a bunch with long stems all bunched together"; later, of a fuller heap: "revert to the prev verson, the pile looked better then"; and "add some leaves around the pile to make it look rounder, the height is perfect".
  Ended on: 22 leaves dropped over an oval, outer ones first, the middle ones on top; then a ring of nine leaves flat round the foot, laid first, so the outline reads round without the heap growing taller.
  Why: a heap that is too tall or too full turns into a spire or a cushion; roundness comes from the foot, not from piling higher.
- **Balanced from above** (spinach).
  User said: "looks heavy on the right side with top shot".
  Ended on: (in the bunch) the leaf on each side weighed and one more added on the lighter side. Look at every arrangement from above.

## Form
- **A tied bunch was tried and set aside for a pile** (spinach, a decision).
  Rounds 1 to 12 built tied bunches: flat leaves fanned on the table (rejected: alike, edge on), a bunch of stemmed leaves (rejected: bending oddly, stems detached, crossings), the whole bunch as one surface (rejected: "more suited for romaine and cabbage, not for leafy greens"), then a bunch shaped after the user's drawn outlines. The user chose the pile instead. The bunch is kept as `buildSpinachBunch`; the one-surface kit as `kit/leafMass.ts` for romaine and napa cabbage.
- **Stem and leaf are one shape** (spinach).
  User said: "dont treate stem and leaf as a seperate object".
  Ended on: the kit's `stemmedLeaf`: a round stem flattening and widening into the blade, its ridge running on as the midrib.
- **Folds come in kinds, each leaf its own** (spinach).
  User said: "the side leaves dont have to be facing up always as well, can be folded an facing other directions".
  Ended on: most leaves cupped, some folded along the midrib, an edge rolled on a few, a soft crease across on some; faces turned sideways or over (`roll` turns the blade's face round its midrib while it still sags straight down); four outlines (spade, spoon, long and narrow, arrow) and a wide size range.
- **A stem runs straight into its leaf** (spinach).
  User said: "bend wierdly top at the start".
  Ended on: no extra bend point before the blade; when a blade has to move, it moves as one piece and its stem eases out to meet it.
  Why: pushing a blade ring by ring kinked it and put a zigzag in the stem ("stem and leaf detached").

## Recurring errors
- **A clearing push that bends what it moves** (spinach).
  Claude's note: moving a sheet point by point to clear its neighbours folds it into walls and zigzags. Move it whole, or let it settle like cloth over a height map.
- **Levitating** (spinach; onion).
  User said: "its levitating a bit".
  Claude's note: the bundle's stems hovered above the table at the cut ends; anything that should rest on the table is held to it.
- **Bare parts that should belong to something** (spinach).
  User said: "the bottom stems her dont have leaves".
  Claude's note: a stem with no leaf, or a part that ends in the air, reads as a mistake. Every stem gets its leaf, or stays hidden.
- **An arch with a gap under it, seen only from one side** (spinach).
  User said: "viewing it form left shows the gap clearly due to the bend".
  Claude's note: check every side; leaves on one side can hide a fault the other side shows.
