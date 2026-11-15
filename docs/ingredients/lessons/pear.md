# Pear

Sources: commits on `r3-batch-1` (2026-11-15), the user's references (Figma node 184:349) and their
screenshots of earlier renders, `docs/ingredients/batch-1-feedback.md` and
`batch-0-1-round-2-feedback.md`. Approved and locked on the fifth look.

## Colour
- **Yellow turns warm in shadow** (pear, butter).
  Claude's note: golden yellow going greener at the neck, a blush and russet freckles, an orange to brown-rose shadow (`pear` family and skin).

## Composition
- **One solo pear, upright** (pear).
  Claude's note: the outline is the subject; nothing else on stage.

## Form
- **The user sees the working renders: never swap a form quietly** (pear).
  First try: a waisted outline, then a smoother one shown in the batch. User said: "This form for pear was better, u had it before changing it. idk why u changed it, looks so bad in the current form."
  Why: they had already picked the earlier one in passing. When a form changes between renders, say so and show both.
- **"Go back" means the exact earlier version** (pear, a decision).
  Later notes ("make this edge a bit smoother", "pear can have more bulgier bottom?") were tried and both undone. User said: "go back to this exact version", then "its missing this bulge".
  Ended on: the very first outline: a belly, a neck, and a small bulge at the waist where they meet (`Math.max(belly, neck, fill)` in `forms/pear.ts`). Locked: do not smooth the waist or reshape it.
  Why: the small bulge is what the user liked; smoothing it away made a different pear.

## Recurring errors
- **Restoring the wrong earlier version** (pear).
  Claude's note: two restores went to the wrong commit. Compare the restored render with the user's screenshot side by side before showing it.
