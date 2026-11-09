# /forage-brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project skill that turns each approved ingredient's rounds of feedback into lasting style rules (repo guide + Figma boards), run once over the ten finished ingredients.

**Architecture:** The skill is a written procedure (`.claude/skills/forage-brand/SKILL.md`), not code. Its outputs are Markdown records and guide sections in the repo, checked by a Vitest docs test, and in-place edits to the Figma guideline boards made through the Figma MCP after one user OK.

**Tech Stack:** Markdown, Vitest (existing), Figma MCP (`use_figma`, `upload_assets`, `get_screenshot`), the Style Lab dev server (`styleLab.snapshot()`).

**Spec:** `docs/superpowers/specs/2026-11-09-forage-brand-skill-design.md`

## Global Constraints

- No em dashes anywhere written (repo docs, Figma text); sentence case.
- Four lenses, in this order and with these headings: `## Colour`, `## Composition`, `## Form`, `## Recurring errors`.
- Each lesson: *first try / user said / ended on / why*; quote the user only with words they actually said; one or two sentences per field.
- A lesson is a rule usable on another ingredient, with this ingredient as its example (never a changelog of numbers).
- Figma: edit boards 02, 04, 06, 07, 08, 09 in place; no new boards or pages; a board may grow taller (boards below shift down), widths and look unchanged; each touched board gets "Last updated {date}: {ingredient}".
- Figma writes only after one user OK per run; load the `figma-use` skill before any `use_figma` call. File `537QrQ0QsVjcT4u3st7M20`, page node `60:2`.
- Without Figma access: write `docs/ingredients/lessons/figma-pending.md` instead; the next run with Figma applies it first.
- Trim `CLAUDE.md` ingredient histories to pointers only after their facts are in a record, the guide or the pointer. Keep switched-off switches (`WITH_LABEL`, `WITH_SCRAPE`, `WITH_SHELL`) in the pointer.
- Work on branch `forage-brand`; merge to `main` only when the user says so.

## Review Focus

1. A lesson the user never actually said, written as a quote: records must mark Claude's reasoning separately (the docs test checks every record has the four lens headings; quotes are checked by hand in Task 3's review step).
2. A `CLAUDE.md` trim that drops a decision still in force (a switched-off feature, a chosen room, a rejected approach): Task 6 greps that every `WITH_` switch and every "rejected" / "switched off" fact survives somewhere.
3. Two lessons that say the same thing in different words across ingredients (bloat): Task 5 merges them; the guide's lessons are counted before and after.
4. A Figma edit that overflows a board's frame or overlaps the next board: Task 7 screenshots every touched board after editing.
5. An em dash slipping into generated copy: the docs test checks every record, the guide and the skill file.

---

### Task 1: The skill, its trigger and the docs test

**Files:**
- Create: `.claude/skills/forage-brand/SKILL.md`
- Create: `docs/ingredients/lessons/README.md` (the record template and what each field means)
- Create: `src/docs.test.ts`
- Modify: `CLAUDE.md` (Rules: one line "After the user approves an ingredient, run `/forage-brand {id}` before merging"; Code map: the lessons folder)
- Modify: `docs/ingredients/forage-ingredient/SKILL.md` (Workflow step 8 points at `/forage-brand`)

**Interfaces:**
- Produces: the record shape every later task writes: `docs/ingredients/lessons/{id}.md` with a first line `# {Name}`, a `Sources:` line, then the four lens headings, each holding lessons as `- **{rule}** ({id}). First try: … User said: "…" / (Claude's note: …). Ended on: … Why: …`.
- Produces: the run steps (gather, extract, generalise, write repo side, propose Figma, apply Figma) as the skill's numbered sections, with the board map table copied from the spec.

- [ ] **Step 1: Write the failing test** `src/docs.test.ts`:
  - `every lessons record has the four lens headings in order` (for each `docs/ingredients/lessons/*.md` except `README.md` and `figma-pending.md`).
  - `no em dashes in the lessons, the guide or the skill` (`—` absent from those files and `.claude/skills/forage-brand/SKILL.md`).
  - `the guide has a pre-check section` (`docs/ingredients/forage-ingredient/SKILL.md` contains `## Pre-check before showing an ingredient`).
- [ ] **Step 2: Run** `npx vitest run src/docs.test.ts`. Expected: FAIL (no skill, no pre-check section).
- [ ] **Step 3: Write the skill file and the README template**; frontmatter `name: forage-brand`, description naming the trigger ("after the user approves an ingredient, or when asked to run /forage-brand").
- [ ] **Step 4: Add an empty `## Pre-check before showing an ingredient` heading to the guide** (filled in Task 5) and the CLAUDE.md lines.
- [ ] **Step 5: Run** `npx vitest run src/docs.test.ts`. Expected: PASS (no records yet, so the per-record test passes vacuously).
- [ ] **Step 6: Commit** `Forage brand skill: the procedure, the record template and a docs check`.

### Task 2: Prove the Figma route

**Files:** none in the repo (a check only).

- [ ] **Step 1: Load the `figma-use` skill**, then `create_session` for file `537QrQ0QsVjcT4u3st7M20`.
- [ ] **Step 2: Read boards 02, 04, 06, 07, 08, 09** with `get_metadata` on each board node (`61:2`, `63:2`, `64:2`, `67:2`, `68:2`, `69:2`) and note each board's text styles, grid, and the free space at its bottom. Record this in the scratchpad, not the repo.
- [ ] **Step 3: Confirm image placement**: `upload_assets` one test PNG to the file and confirm it can fill a rectangle with `use_figma` on a temporary frame outside page `60:2`, then delete that frame. Expected: the image shows in `get_screenshot`. If not, board 08 gets text edits only and the user places images (spec fallback).

### Task 3: Lessons records for the ten ingredients

**Files:**
- Create: `docs/ingredients/lessons/{apple,lemon,orange,strawberry,broccoli,bread,sauce,cheese,butter,watermelon}.md` (ids as in `src/ingredients/registry.ts`)

**Interfaces:**
- Consumes: the record shape from Task 1.
- Produces: the lessons Task 5 generalises and Task 7 places on the boards.

Sources, per ingredient: full commit messages (`git log --format=%B -- src/ingredients/forms/{id}.ts` plus commits naming it), its `CLAUDE.md` paragraphs, the guide's existing lessons; for lemon to bread also the local session transcript `local_a661dde3-055d-4550-a28f-99f3a2a7a5d1` (`export_transcript`), searched for the user's own feedback; for the apple the painterly-era commits (October) and the memory file `feedback-painterly-taste.md`; for the strawberry also this session (overlap and highlight fixes, 2026-11-09).

- [ ] **Step 1: Write the five early records** (apple, lemon, orange, strawberry, broccoli), oldest first.
- [ ] **Step 2: Write the five later records** (bread, sauce, cheese, butter, watermelon).
- [ ] **Step 3: Review pass**: every `User said:` quote is found verbatim in a source; anything else is a `Claude's note`. Fix any that are not.
- [ ] **Step 4: Run** `npx vitest run src/docs.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `Lessons records for the ten finished ingredients`.

### Task 4: Final paintings

**Files:**
- Create: `docs/ingredients/lessons/img/{id}.png` (ten files)

- [ ] **Step 1: Start the dev server** (`preview_start` `style-lab`), and for each id: `styleLab.show(id)`, idle spin off, Playful strokes off, the starting view, `styleLab.snapshot()`; save the PNG (decode the data URL in the page and download, or return it and write it with a script).
- [ ] **Step 2: Check** each image opens and shows the right ingredient (look at a contact sheet of all ten).
- [ ] **Step 3: Commit** `Final paintings of the ten ingredients for board 08`.

### Task 5: The guide: lessons by lens and the pre-check list

**Files:**
- Modify: `docs/ingredients/forage-ingredient/SKILL.md` ("Lessons learned" regrouped under the four lenses, each tagged `(id)`; "Pre-check before showing an ingredient" filled)
- Modify: `docs/ingredients/forage-ingredient.zip` (rebuilt from the guide folder)

- [ ] **Step 1: Count** the guide's current lessons (22 at the start) and list the general rules from Task 3's records.
- [ ] **Step 2: Merge**: one lesson per rule; where a record and an existing lesson say the same thing, keep one, tagged with every ingredient that taught it.
- [ ] **Step 3: Write the pre-check list** from every recurring error seen on two or more ingredients, each as one thing to look at or run, marking with `(could be automated)` the ones a test could measure. It must include: bodies never sink into each other (check on every vertex, not sample distance); lifted skins and props never flicker; contact spots stay inside the cast shadow; no rim glint lines on narrow or pale layers; shadows never grey, lime or pink-stained; no sawtooth edges on meshed bevels; highlights never one flat pale patch.
- [ ] **Step 4: Rebuild the zip** (`Compress-Archive` of `docs/ingredients/forage-ingredient/` over the old zip) and note in the guide's workflow that the user re-uploads it to claude.ai.
- [ ] **Step 5: Run** `npx vitest run src/docs.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `Ingredient guide: lessons by lens, pre-check list`.

### Task 6: Trim CLAUDE.md to pointers

**Files:**
- Modify: `CLAUDE.md` ("Done so far" ingredient paragraphs, the dated feedback paragraphs under it, "Where we left off", "Horizon follow-up")

- [ ] **Step 1: Before trimming**, list every fact in each paragraph to be trimmed and tick where it now lives (record, guide, or pointer). Anything unticked goes into the pointer.
- [ ] **Step 2: Replace** each ingredient's history with a pointer of one or two lines: what it is, decisions still in force, `See docs/ingredients/lessons/{id}.md`.
- [ ] **Step 3: Check** `grep -c "WITH_" CLAUDE.md` is at least the count of distinct `WITH_` switches in `src/ingredients/forms/`, and the Rules, shadow rules, layouts and pipeline sections are byte-identical to before (`git diff` shows no change there).
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `CLAUDE.md: ingredient histories trimmed to pointers`.

### Task 7: Figma boards

**Files:** none in the repo (Figma only), unless Figma is unreachable: then Create `docs/ingredients/lessons/figma-pending.md`.

- [ ] **Step 1: Write the proposal**: board by board, what is added or changed (04: the 14 off-board families and colour lessons; 06: layouts as built and composition lessons; 07: kit recipes as built and form lessons; 08: final painting beside each reference, spec text corrected, egg marked skipped; 09: the pre-check list; 02: new "Never" rules), and which boards grow taller.
- [ ] **Step 2: Ask the user for the one OK** (AskUserQuestion or the wrap-up question), showing the proposal.
- [ ] **Step 3: Apply** with `use_figma`, one board at a time, matching each board's existing text styles and grid; add "Last updated 2026-11-{dd}: backfill of ten ingredients" to each touched board.
- [ ] **Step 4: Check** with `get_screenshot` on each touched board: nothing overflows or overlaps, no em dashes.
- [ ] **Step 5: Report** the board links to the user.

### Task 8: Finish

- [ ] **Step 1: Run** `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 2: Push** `forage-brand` and ask the user whether to merge to `main`.
