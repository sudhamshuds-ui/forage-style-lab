# Forage Style Lab

Forage is a cooking discovery web game where combined ingredients become painterly trading-card artworks.

## Stack
- Vite + TypeScript + Three.js (WebGL). Plain TypeScript for the Style Lab itself.
- React (base-ui, motion, clsx) only for the controls on the card and the prototype pages.
- GSAP for code-driven page motion (import from `src/motion.ts`), cannon-es for the kit's physics.
- Tweakpane 4 for the hidden panel, Vitest for tests.

## Run, test, build
- `npm run dev`: dev server at http://localhost:5173
- `npm test`: Vitest
- `npm run build`: type-check and production build
- `npm run build:kitchen`: the kitchen page build (`dist-kitchen`)

## Where things live
- Dish code: `src/dishes/compose/`
- Ingredients: `src/ingredients/` (registry, families, forms on the shared kit)
- Shaders and painting: `src/shading/`, `src/painting/`

## Rules
- Merges to `main` happen only when the user says so. Never merge on your own.
- UI copy uses sentence case and never uses em dashes.

## More detail
- Specs: `docs/forage-specs/`
- Full project history and every past rule: `docs/claude-history.md` (the previous CLAUDE.md, kept whole)
