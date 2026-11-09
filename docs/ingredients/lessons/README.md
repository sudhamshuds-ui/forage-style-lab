# Ingredient lessons

One file per finished ingredient (`{id}.md`, the id from `src/ingredients/registry.ts`), written by
`/forage-brand` after the user approves the ingredient. Each file records what Claude got wrong
first and how the user corrected it, so the next ingredient starts closer.

The general rules from these files are lifted into the ingredient guide
(`docs/ingredients/forage-ingredient/SKILL.md`) and folded into the Figma guideline boards.
`img/{id}.png` is the approved painting, from the starting view in the default style.

## Shape of a record

```markdown
# Strawberry

Sources: commits 826d6dd..542f82f, CLAUDE.md (layouts), session 2026-11-09.

## Colour
- **A bumpy skin breaks its shine into a faint sheen and small glints** (strawberry).
  First try: the soft sheen lit a whole broad face at once, one flat pale shape.
  User said: "it looks like glossy candy flat".
  Ended on: a faint sheen thinning out from its core, skipping in the seed dimples, small glints
  on the dimple rims, tinted toward the berry's own red.
  Why: real dimpled skin scatters its shine; one smooth patch reads as plastic.

## Composition
...

## Form
...

## Recurring errors
...
```

## Rules for writing a lesson

- The four headings come in this order: Colour (colours, textures, gradients), Composition (how
  several pieces are arranged), Form (believable, aesthetic, consistent with the other
  ingredients), Recurring errors (shadow and texture bugs fixed again and again).
- The bold line is a **rule another ingredient can use**, with this ingredient as its example.
  Never a changelog ("sag 1.2 to 0.6"); say the lesson ("start deformations at about half").
- `User said:` only with words the user actually wrote, in quotes. Otherwise write
  `Claude's note:` and say it in Claude's words.
- One or two sentences per field. Leave a heading with "Nothing new." when there is no lesson.
- Decisions the user made (a feature switched off, a room kept) are recorded as decisions, with
  the switch that brings them back.
- No em dashes; sentence case.
