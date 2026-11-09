# `/forage-brand`: learning the Forage style from each ingredient

Date: 2026-11-09. Status: design, waiting for the user's approval of this document.

## Intent and why

The user (a motion and visual designer, new to code) builds each Forage ingredient with Claude
by hand-holding: Claude makes a first try, the user says what is right and wrong, and a few rounds
later the ingredient looks right. The user wants those rounds to turn into lasting taste, so that
Claude gets the next ingredient closer on the first try and stops repeating the same mistakes.

Today the lessons are scattered: commit messages (rich for the sauce, cheese, butter and
watermelon, one-liners for the earlier ones), a very long `CLAUDE.md`, a "Lessons learned" list in
the ingredient guide sorted by technique, and a past session's transcript. The Figma guidelines
(file `537QrQ0QsVjcT4u3st7M20`, page node `60:2`, boards 00 to 10) have not been updated since
building started, so parts of them are out of date (board 08 still describes the watermelon's
"separate green shell", which was switched off, and lists the egg, which was skipped).

`/forage-brand` is a skill Claude runs after every approved ingredient. It reads everything that
happened while building that ingredient, extracts what Claude got wrong and how the user corrected
it, and folds the lessons into the guidelines: the ingredient guide in the repo and the Figma boards.
It is then run once over all ten ingredients finished so far.

## What the user wants Claude to understand (the four lenses)

Every lesson is sorted into one of these, in the user's words:

1. **Colour**: colours, textures, gradients.
2. **Composition**: how pieces are arranged when there are several.
3. **Form**: the overall shape, believable but also aesthetic, and consistent with the other
   ingredients' style.
4. **Recurring errors**: the bugs that keep happening with shadows and textures, fixed again for
   almost every ingredient.

## Goals

- A per-ingredient lessons record: for each lesson, *first try*, *what the user said* (quoted when
  the words exist), *what we ended on*, and *why it works*. Sorted by the four lenses.
- General rules lifted out of those records into the ingredient guide
  (`docs/ingredients/forage-ingredient/SKILL.md`), tagged with the ingredient that taught them.
- A **pre-check list** of the recurring errors in the ingredient guide, which Claude runs before
  showing the user any new ingredient (lens 4), so the user stops catching the same bugs.
- The Figma boards kept current, with lessons **folded into the existing boards** (the user's
  choice), edited in place, never a new lessons board.
- It runs **automatically after every ingredient the user approves** (the user's choice), with no
  need to type the command. It can also be run by hand: `/forage-brand <ingredient id>`, or
  `/forage-brand all`.
- A one-time backfill over the ten finished ingredients: apple, lemon, orange, strawberry, broccoli,
  baguette (bread), hot sauce, cheese, butter, watermelon.

## Non-goals

- It does not change any ingredient, shader or form code. It records and guides; fixes are their
  own work.
- It does not redesign the Figma boards' look. New content follows each board's existing layout,
  type and colours.
- No new Figma boards or pages.

## Anti-goals (failure even if it technically works)

- **A changelog instead of taste.** "Changed sag from 1.2 to 0.6" is a log. The lesson is "start
  deformations at about half what first seems needed; the user can always ask for more". Every
  lesson must be a rule Claude can apply to a *different* ingredient, with the ingredient as its
  example.
- **Bloat.** A guide nobody can read is worse than none. Merge a new lesson into an existing one
  when they say the same thing; keep each lesson to one or two sentences.
- **Putting words in the user's mouth.** Quote only what the user actually said. Claude's own
  reasoning is marked as such.
- **Rewriting the user's decisions.** Choices the user made (rooms 70 to 180 degrees from the
  ingredient, the label switched off, the scrape switched off) are recorded as decisions, not
  re-argued.
- **Silent Figma edits that surprise the user.** See the Figma step below.

## Constraints

- Project rules in `CLAUDE.md` apply: no em dashes in any copy (repo docs and Figma text included),
  sentence case, explain simply.
- Figma edits go through the Figma MCP; the `figma-use` skill must be loaded before any write
  (`use_figma`). Reading uses `get_metadata`, `get_design_context`, `get_screenshot`.
- The ingredient guide also lives on claude.ai as the user's `forage-ingredient` skill. Claude
  cannot upload it there. After the guide changes, the skill refreshes
  `docs/ingredients/forage-ingredient.zip` and reminds the user to re-upload it.
- Past sessions: only the local "3D ingredient forms" session
  (`local_a661dde3-055d-4550-a28f-99f3a2a7a5d1`, lemon to baguette) is searchable from here. The
  sauce, cheese, butter and watermelon were built in cloud sessions; their record is the commit
  messages and `CLAUDE.md`, which hold the user's feedback round by round.

## How it works (decided)

### Where things live

- The skill: `.claude/skills/forage-brand/SKILL.md` (a project skill, committed).
- Lessons records: `docs/ingredients/lessons/{id}.md`, one per ingredient, in the four lenses.
- Final paintings: `docs/ingredients/lessons/img/{id}.png`, the approved look from the card camera
  (`styleLab.snapshot()` in the default style), used on board 08.
- The ingredient guide gains: a "Pre-check before showing an ingredient" section (lens 4), and its
  "Lessons learned" regrouped under the four lenses, each tagged with its ingredient.
- `CLAUDE.md` gains one rule: after the user approves an ingredient, run `/forage-brand {id}`.

### When it runs

"Approved" means the user says the ingredient is good to go: they ask to merge it to `main`, or
say it is done or approved. Right after that, before moving to the next ingredient, Claude runs the
skill. The trigger is the `CLAUDE.md` rule plus the skill's description.

### Steps of one run

1. **Gather** for that ingredient: its commits (`git log` on its form file, registry entry and any
   shader work named after it, full messages), its notes in `CLAUDE.md`, the current conversation,
   any searchable past transcript, the ingredient guide, and its board 08 card in Figma.
2. **Extract** each correction as *first try / user said / ended on / why*. Sort into the four lenses.
3. **Generalise**: turn each into a rule that applies beyond this ingredient. Check the guide and
   the boards for an existing rule that says the same; strengthen or merge it instead of adding.
   Errors seen on two or more ingredients go on the pre-check list.
4. **Write the repo side**: the lessons record, the guide (lessons, pre-check list, families, kit,
   settings), the final painting, the refreshed zip. Commit on the current branch.
5. **Propose the Figma side** to the user as a short list, board by board.
6. **Edit Figma** after the user's one OK, then report what changed with links to the boards.

### Board map (where each kind of lesson goes)

| Board | What it gets |
|---|---|
| 02 Six rules (its "Never" strip) | new never-again rules |
| 04 Warm subject, cool room | the colour families added since (14 of them), colour lessons |
| 06 Composition and size | layouts as built (strawberry cluster, broccoli lying down, watermelon pair), composition lessons |
| 07 Ingredient system | kit recipes as built per archetype, form lessons |
| 08 The first 12 | each card keeps its reference, gains our final painting, spec text corrected to what was built; the egg marked skipped |
| 09 How Claude Code builds a form | the pre-check list of recurring errors |

Every lesson on a board carries a small ingredient tag. Each touched board gets a "Last updated
{date}: {ingredient}" line, so the user sees what changed after each run.

### The backfill

Run once over all ten, oldest first, so later lessons merge into earlier ones. The apple's lessons
come from the painterly era (October) and the auto-memory file on painterly taste. Present the whole
backfill's Figma changes in one proposal, not ten.

Include the strawberry fixes from 2026-11-09 (both on `main`): the berries sank up to 1.1 cm into
each other because the layout only checked that sample points stayed apart (lens 4: "close points
is not the same as not overlapping"; the fix checks which side of the surface a point is on), and
the highlight read as "glossy candy flat" on the berries' broad faces (lens 1: a bumpy skin breaks
its shine into a faint sheen and small glints; trying the new sheen on every ingredient made the
apple's vanish and the orange's scratchy, so it stays on dimpled skins only).

### Trimming `CLAUDE.md` (the user's choice)

Once an ingredient's lessons are in its record and the guide, its round-by-round history in
`CLAUDE.md` ("Done so far" and the dated feedback paragraphs) is trimmed to a short pointer: one or
two lines saying what it is, the decisions still in force (switched-off features and how to bring
them back, such as `WITH_LABEL`, `WITH_SCRAPE`, `WITH_SHELL`), and a link to
`docs/ingredients/lessons/{id}.md`. Project-wide rules in `CLAUDE.md` (the Rules section, shadow
rules, layouts, the pipeline) stay where they are; they are rules, not history. Nothing is deleted
without landing somewhere first: each trimmed paragraph's facts must appear in the record, the
guide or the remaining pointer. Each run trims the ingredient it covers; the backfill trims all ten.

## Calls Claude made (for the user to check)

- One Figma OK per run, even though it runs automatically: the repo side is written without asking,
  the Figma side is shown as a list and applied after one yes. `CLAUDE.md` currently says "ask before
  editing the Figma boards"; this keeps that rule but makes it one question per ingredient.
- Final paintings are taken in the default style (Playful strokes off), from the starting view.
- Lessons records are kept in the repo as well as Figma, because the repo is what Claude reads when
  building the next ingredient.
- **Which branch**: the run happens on the ingredient's own branch, right after the user approves
  and before the merge, so the lessons ride along with the ingredient into `main` in the same merge.
  The backfill runs on its own branch (`forage-brand`) and is merged when the user says so.
- **Where Figma is not reachable** (a cloud session): the repo side is written as usual, and the
  Figma proposal is saved to `docs/ingredients/lessons/figma-pending.md`. The next run that can reach
  Figma shows and applies everything pending first. The same goes for searching past transcripts:
  used where available, skipped otherwise.
- **Paintings on board 08**: Claude uploads them to Figma itself (the Figma connection has an asset
  upload); the first build step confirms this works. If it does not, board 08 gets the text edits
  and the user places the images from `docs/ingredients/lessons/img/`.
- **The claude.ai upload** carries the guide only (with the lifted lessons and the pre-check list);
  the per-ingredient records stay in the repo.
- **Pre-check list**: a checklist Claude works through with screenshots and the dev checks. Items
  that could be measured automatically are marked as candidates for a later code task, which the
  skill never does itself.
- **Board size**: a board may grow taller to fit new content, and the boards below it move down to
  keep the gaps; widths and the board's look stay as they are. Growth is listed in the Figma proposal.

## Left to the builder

- The exact wording and layout of each lessons record and of the skill file.
- How to place new content on each board so it matches that board's existing grid and type styles.
- Which commits belong to which ingredient when a commit touches several.
