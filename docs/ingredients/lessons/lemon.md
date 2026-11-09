# Lemon

Sources: session "3D ingredient forms" (2026-11-04), commits 9a3b6d4..6920f5b.

## Colour
- **Soft light for every ingredient, never blasted** (lemon).
  First try: the apple's strong light on the lemon.
  User said: "does this blasted lighting look good for every ingredient, isnt the lighting very strong?" and chose option D (soft light).
  Ended on: Light strength 55 pulls lit and shadow colours toward the base (OKLab), so no lit side bleaches toward white.
  Why: pale and yellow ingredients wash out first under strong light.
- **Texture marks darken toward the ingredient's own shade, never grey or black** (lemon).
  First try: dark specks that read olive on the yellow peel.
  User said: "for the lemon, i think use shades of yellow instead of black for texture?"
  Ended on: `shadeOwn`, which leans a speck toward the ingredient's deep shade (golden specks on a lemon).
  Why: grey on a warm colour reads as dirt.

## Composition
Nothing new (a solo hero; whole and cut comes later).

## Form
- **Pointed at both ends, never a ball** (lemon).
  Claude's note: the spec asks for pointed tips; built from the lathe with tips at both ends, so its silhouette alone says lemon.
  Why: the silhouette test (solid black) must still name the ingredient.

## Recurring errors
- **Every ingredient gets its own skin texture** (lemon, orange).
  User said: "is it possible to give a bit texture, right now all have same texture..."
  Ended on: a per-ingredient `skin` in the registry (pebbled lemon, orange pores, apple streaks).
  Why: one shared grain makes every ingredient look like the same material.
