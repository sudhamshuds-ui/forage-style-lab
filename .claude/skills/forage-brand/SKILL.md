---
name: forage-brand
description: Use right after the user approves a Forage ingredient (asks to merge it, or says it is done or approved), or when asked to run /forage-brand {id} or /forage-brand all. Turns the rounds of feedback on that ingredient into lasting style rules in the repo guide and the Figma guideline boards.
---

# Forage brand: learn the style from each ingredient

The user builds each ingredient with Claude by hand-holding: a first try, their notes on what is
right and wrong, a few rounds, an approved look. This skill turns those rounds into taste, so the
next ingredient starts closer and the same mistakes stop coming back. Design:
`docs/superpowers/specs/2026-11-09-forage-brand-skill-design.md`.

Run it on the ingredient's own branch, after the approval and before the merge, so the lessons
reach `main` with the ingredient. `/forage-brand all` runs it over every finished ingredient, oldest
first, on its own branch.

The user is a visual designer new to code: explain in plain words. No em dashes anywhere, in the
repo or in Figma. Sentence case.

## The four lenses (the user's own list)

1. **Colour**: colours, textures, gradients.
2. **Composition**: how pieces are arranged when there are several.
3. **Form**: the overall shape, believable but aesthetic, consistent with the other ingredients.
4. **Recurring errors**: the shadow and texture bugs that keep coming back.

## 1. Gather

For the ingredient `{id}` (see `src/ingredients/registry.ts`):

- Its commits, full messages: `git log --format="=== %h %ad %s%n%b" --date=short -- src/ingredients/forms/{id}.ts`,
  plus commits whose subject names it, and shared shader or layout commits made for it.
- Its paragraphs in `CLAUDE.md`, and its lessons record if one exists (`docs/ingredients/lessons/{id}.md`).
- This conversation: every note the user gave on it, in their words.
- Past sessions where reachable (`search_session_transcripts`, then `export_transcript`); skip
  where not (cloud sessions cannot reach local transcripts).
- The ingredient guide (`docs/ingredients/forage-ingredient/SKILL.md`) and its board 08 card in Figma.

## 2. Extract

Each correction becomes *first try / user said / ended on / why*. Quote the user only with words
they actually wrote; anything else is a `Claude's note`. Sort each into one lens.

## 3. Generalise

- Turn each into a rule another ingredient can use, with this ingredient as the example. Never a
  changelog of numbers.
- Before adding, look for a rule in the guide or on the boards that says the same. Strengthen or
  merge it and add this ingredient's tag instead of writing a second one.
- An error seen on two or more ingredients goes on the guide's pre-check list.
- A decision the user made (a feature switched off, a room kept, an approach rejected) is recorded
  as a decision, with the switch that brings it back. Never re-argue it.

## 4. Write the repo side (no need to ask)

- `docs/ingredients/lessons/{id}.md`, in the shape of `docs/ingredients/lessons/README.md`.
- `docs/ingredients/lessons/img/{id}.png`: the approved painting. In dev, `styleLab.show('{id}')`,
  idle spin off, Playful strokes off, the starting view, `styleLab.snapshot()`.
- The guide: lessons under the four lenses (tagged with ingredients), the pre-check list, and the
  families, kit and settings tables if they changed. Then rebuild
  `docs/ingredients/forage-ingredient.zip` from `docs/ingredients/forage-ingredient/` and remind
  the user to upload it to their claude.ai `forage-ingredient` skill (Claude cannot).
- `CLAUDE.md`: trim this ingredient's round-by-round history to a pointer of one or two lines
  (what it is, decisions still in force including any `WITH_` switch, and
  `See docs/ingredients/lessons/{id}.md`). Before cutting, check every fact landed in the record,
  the guide or the pointer. Project-wide rules (Rules, shadow rules, layouts, pipeline) stay.
- `npm test` (includes `src/docs.test.ts`: four lenses, no em dashes, the pre-check section) and
  `npm run build`, then commit on the ingredient's branch.

## 5. Propose the Figma side

File `537QrQ0QsVjcT4u3st7M20`, page `60:2`. Lessons are folded into the existing boards, never a
new board:

| Board | Node | What it gets |
|---|---|---|
| 02 Six rules ("Never" strip) | 61:2 | new never-again rules: the second row of Never items (pointer fields to the lessons record) |
| 04 Warm subject, cool room | 63:2 | a new whole-ingredient family as a row in Families (clone a row), a part-only family as a card in "Part-only families", colour lessons as cards in "Colour lessons" |
| 06 Composition and size | 64:2 | the layout cards' "Built:" lines, the ingredient table row, composition lessons as cards in "Composition lessons" |
| 07 Ingredient system | 67:2 | the archetype card's "Built:" line and recipe text, form lessons as cards in "Form lessons" |
| 08 The first 12 | 68:2 | the final painting beside the reference ("Pictures" row), spec text as built; an ingredient with no card (the hot sauce) gets one cloned from a built card |
| 09 How Claude Code builds a form | 69:2 | the "Pre-check" card (04) |

When a lessons grid is full (four cards a row), clone its last row and fill it. The boards are auto
layout: they grow taller on their own and push the boards below down.

Each lesson carries a small ingredient tag. Show the user a short list, board by board, including
any board that has to grow taller, and ask once.

If Figma cannot be reached (a cloud session), write the proposal to
`docs/ingredients/lessons/figma-pending.md` instead. Any run that can reach Figma shows and
applies everything pending first, then empties that file.

## 6. Apply in Figma (after the user's OK)

- Load the `figma-use` skill before any `use_figma` call; `create_session` first.
- Match each board's own text styles, colours and grid. A board may grow taller; move the boards
  below it down by the same amount. Never change widths or the look.
- Images for board 08: `upload_assets`, then fill a frame the size of the reference picture.
- Add or update "Last updated {date}: {ingredient}" on each touched board.
- `get_screenshot` each touched board: nothing overflows or overlaps, no em dashes.
- Report what changed, with links to the boards.
