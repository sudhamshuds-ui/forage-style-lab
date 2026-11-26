import { EASE, gsap, prefersReducedMotion } from '../motion';
import { TEST_CHECKS, type TestCheck } from './testSheet';

/**
 * The ingredient tray: a row of small paintings under the card. Drag one onto the card to put
 * it on the table (or just click it). While it is on the table its tile stays in the row,
 * greyed out. The shuffle button deals new ingredients into every tile and swaps the table's for new ones too.
 *
 * The drag, step by step (like dragging a layer out of a bin):
 *   1. Press a tile and move a few pixels: a copy of the tile (the "ghost") lifts off and
 *      follows the pointer exactly; the tile underneath dims.
 *   2. Once the ghost has left the row, the tile greys out.
 *   3. Over the card the ghost grows a little and the card shows it is ready to take it.
 *   4. Let go over the card: the ghost shrinks into the table and the ingredient appears.
 *      Let go anywhere else: the ghost flies back to its tile.
 */

/** Every thumbnail, by ingredient id (small paintings made from the approved ones). */
const THUMBS = import.meta.glob('./thumbs/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const thumb = (id: string) => THUMBS[`./thumbs/${id}.webp`] ?? '';

/** How many tiles the row shows. */
const TILES = 5;
/** How far the pointer moves before a press becomes a drag (px). */
const DRAG_START = 6;

export interface TrayOptions {
  pantry: { id: string; name: string }[];
  /** The card: a drop anywhere on it adds the ingredient. */
  card: HTMLElement;
  canAdd: (id: string) => boolean;
  add: (id: string) => boolean;
  /** True while this ingredient is on the table (its tile is greyed out). */
  isUsed: (id: string) => boolean;
  onDragState: (dragging: boolean) => void;
  /** A greyed tile was clicked: point at that ingredient on the table. */
  onUsedClick: (id: string) => void;
  /** The tiles changed (at the start and after each shuffle): the ids now showing, and the next
   * Shuffle's deal (to be made ready ahead). */
  onDeal: (ids: string[], upcoming: string[]) => void;
  /** The preview's test tools (an ingredient search, the test sheet): only with ?test=1. */
  testTools?: boolean;
  /** The ingredients on the table now. */
  tableIds: () => string[];
  /** Shuffle replaces the table too (Group 4): put these on the table instead of what is there. */
  replaceTable: (ids: string[]) => void;
  /** Just before a shuffle changes anything (for Undo). */
  beforeShuffle?: () => void;
  /** A test-sheet check picked in the ingredients panel: set its table and controls and cook it. */
  onTestCheck?: (check: TestCheck) => void;
}

export interface Tray {
  /** Re-read which tiles are in use (call after the table changes). */
  refresh(): void;
  /** The ingredients showing in the tiles, left to right. */
  ids(): string[];
  /** Deal exactly these into the tiles (Undo), with the shuffle's motion. */
  setTiles(ids: string[]): void;
  /** The tray's own box (a table item dragged back here is removed). */
  element: HTMLElement;
}

const MORE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>`;
const SHUFFLE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>`;

export function mountTray(root: HTMLElement, options: TrayOptions): Tray {
  const names = new Map(options.pantry.map((entry) => [entry.id, entry.name]));
  /** A random pick of ids that are not in `taken`. */
  const deal = (count: number, taken: Set<string>): string[] => {
    const pool = options.pantry.map((entry) => entry.id).filter((id) => !taken.has(id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  };

  const list = document.createElement('ul');
  list.className = 'tray-list';
  const shuffle = document.createElement('button');
  shuffle.type = 'button';
  shuffle.className = 'tray-shuffle';
  shuffle.setAttribute('aria-label', 'New ingredients');
  shuffle.title = 'New ingredients';
  shuffle.innerHTML = SHUFFLE_ICON;
  // Every pantry ingredient, not only the five dealt (R7: a test table like spinach and cheese
  // rarely turns up together in five random tiles): a search box over all of them.
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'tray-more';
  more.setAttribute('aria-label', 'All ingredients');
  more.setAttribute('aria-expanded', 'false');
  more.title = 'All ingredients';
  more.innerHTML = MORE_ICON;
  const panel = document.createElement('div');
  panel.className = 'tray-panel';
  panel.hidden = true;
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'tray-search';
  search.placeholder = 'Find an ingredient';
  search.setAttribute('aria-label', 'Find an ingredient');
  const grid = document.createElement('ul');
  grid.className = 'tray-grid';
  const choices = [...options.pantry].sort((a, b) => a.name.localeCompare(b.name));
  const picks: HTMLButtonElement[] = [];
  for (const entry of choices) {
    const li = document.createElement('li');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'tray-pick';
    pick.dataset.id = entry.id;
    const img = document.createElement('img');
    img.src = thumb(entry.id);
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('span');
    label.textContent = entry.name;
    pick.append(img, label);
    pick.addEventListener('click', () => {
      if (options.isUsed(entry.id) || !options.add(entry.id)) {
        gsap.fromTo(pick, { x: 0 }, { keyframes: { x: [0, -4, 4, -2, 0] }, duration: 0.28, ease: 'power1.out', clearProps: 'transform' });
        return;
      }
      refresh();
    });
    li.append(pick);
    grid.append(li);
    picks.push(pick);
  }
  // The preview's test sheet (R7): pick a check to set its table and controls and cook it.
  const checks = document.createElement('select');
  checks.className = 'tray-checks';
  checks.setAttribute('aria-label', 'Test sheet check');
  checks.append(new Option('Test sheet: set up a check', ''));
  for (const check of TEST_CHECKS) checks.append(new Option(`${check.n}. ${check.name}`, String(check.n)));
  checks.addEventListener('change', () => {
    const check = TEST_CHECKS.find((c) => String(c.n) === checks.value);
    checks.value = '';
    if (!check) return;
    open(false);
    options.onTestCheck?.(check);
  });
  panel.append(search, grid, checks);
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    for (const pick of picks) (pick.parentElement as HTMLElement).hidden = !!q && !`${pick.dataset.id} ${pick.textContent}`.toLowerCase().includes(q);
  };
  search.addEventListener('input', filter);
  const open = (on: boolean) => {
    panel.hidden = !on;
    more.setAttribute('aria-expanded', String(on));
    if (on) {
      refresh();
      search.value = '';
      filter();
      search.focus();
    }
  };
  more.addEventListener('click', () => open(panel.hidden !== false));
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') open(false);
    if (event.key === 'Enter') (picks.find((pick) => !(pick.parentElement as HTMLElement).hidden && !pick.disabled))?.click();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !panel.contains(event.target as Node) && !more.contains(event.target as Node)) open(false);
  });
  root.append(list, shuffle);
  if (options.testTools) root.append(more, panel);

  const tiles: HTMLButtonElement[] = [];
  const setTile = (tile: HTMLButtonElement, id: string) => {
    tile.dataset.id = id;
    const name = names.get(id) ?? id;
    tile.setAttribute('aria-label', name);
    tile.title = name;
    (tile.firstElementChild as HTMLImageElement).src = thumb(id);
  };
  for (const id of deal(TILES, new Set())) {
    const item = document.createElement('li');
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    tile.append(image);
    setTile(tile, id);
    item.append(tile);
    list.append(item);
    tiles.push(tile);
    wireDrag(tile);
  }

  function refresh(): void {
    for (const pick of picks) {
      const id = pick.dataset.id ?? '';
      pick.toggleAttribute('data-used', options.isUsed(id));
      pick.disabled = !options.isUsed(id) && !options.canAdd(id);
    }
    for (const tile of tiles) {
      const id = tile.dataset.id ?? '';
      tile.toggleAttribute('data-used', options.isUsed(id));
      tile.toggleAttribute('data-blocked', !options.isUsed(id) && !options.canAdd(id));
    }
  }

  const ids = () => tiles.map((tile) => tile.dataset.id ?? '');

  /** The next Shuffle's deal, picked ahead so its ingredients are ready before the click. */
  let upcoming: string[] = [];
  const dealAhead = (taken: string[]) => (upcoming = deal(TILES, new Set(taken)));

  /**
   * Deal these ids into the tiles: each tile's picture dissolves into the next one (a soft blur
   * and fade, rising a few pixels), one tile after another, like cards being re-dealt. The live
   * kitchen's Shuffle exactly (main). The button only presses in; its icon does not spin (it "felt
   * weird", the user, 2026-11-16).
   */
  const dealInto = (next: string[]) => {
    const changing = tiles.filter((tile, index) => next[index] && next[index] !== tile.dataset.id);
    changing.forEach((tile, index) => {
      const id = next[tiles.indexOf(tile)];
      // (The tile reads as the new ingredient at once, for Undo; its picture changes as on main.)
      tile.dataset.id = id;
      const image = tile.firstElementChild as HTMLElement;
      if (prefersReducedMotion()) return setTile(tile, id);
      gsap.killTweensOf(image);
      gsap
        .timeline({ delay: index * 0.045 })
        .to(image, { opacity: 0, filter: 'blur(4px)', y: 4, duration: 0.12, ease: EASE.out })
        .call(() => setTile(tile, id))
        .fromTo(image, { opacity: 0, filter: 'blur(4px)', y: -6 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.26, ease: EASE.out, clearProps: 'transform,opacity,filter' });
    });
    window.setTimeout(() => {
      refresh();
      dealAhead([...ids(), ...options.tableIds()]);
      options.onDeal(ids(), upcoming);
    }, 120 + changing.length * 45);
  };

  shuffle.addEventListener('click', () => {
    // Every tile is dealt again, and what was on the table is replaced by the first new ones, so a
    // shuffle changes the whole kitchen, not only the tray (Group 4). The deal was picked ahead.
    options.beforeShuffle?.();
    const onTable = options.tableIds();
    const taken = new Set([...ids(), ...onTable]);
    const fresh = upcoming.filter((id) => !taken.has(id));
    fresh.push(...deal(TILES - fresh.length, new Set([...taken, ...fresh])));
    if (onTable.length) options.replaceTable(fresh.slice(0, onTable.length));
    dealInto(fresh.slice(0, TILES));
  });

  function wireDrag(tile: HTMLButtonElement): void {
    let start: { x: number; y: number; id: number } | null = null;
    let ghost: HTMLElement | null = null;
    let offset = { x: 0, y: 0 };
    let lastX = 0;
    let tilt = 0;
    /** A real drag just ended: swallow the click the browser sends after it. */
    let dragged = false;

    const overCard = (x: number, y: number) => {
      const rect = options.card.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };
    const overTray = (x: number, y: number) => {
      const rect = root.getBoundingClientRect();
      return x >= rect.left - 8 && x <= rect.right + 8 && y >= rect.top - 8 && y <= rect.bottom + 8;
    };

    const lift = (event: PointerEvent) => {
      const rect = tile.getBoundingClientRect();
      ghost = document.createElement('div');
      ghost.className = 'tile-ghost';
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      const image = document.createElement('img');
      image.src = thumb(tile.dataset.id ?? '');
      image.alt = '';
      ghost.append(image);
      document.body.append(ghost);
      offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      lastX = event.clientX;
      tile.setAttribute('data-lifted', '');
      document.documentElement.classList.add('is-tray-dragging');
      options.onDragState(true);
      // It starts at the tile's own place and size, then eases up a little (CSS, kitchen.css).
      ghost.setAttribute('data-fresh', '');
      ghost.style.translate = `${rect.left}px ${rect.top}px`;
      const lifted = ghost;
      requestAnimationFrame(() => lifted.removeAttribute('data-fresh'));
    };

    const follow = (event: PointerEvent) => {
      if (!ghost) return;
      // Exactly under the pointer (no lag), leaning a little into the direction it moves.
      tilt += (Math.max(-8, Math.min(8, (event.clientX - lastX) * 0.6)) - tilt) * 0.25;
      lastX = event.clientX;
      ghost.style.translate = `${event.clientX - offset.x}px ${event.clientY - offset.y}px`;
      ghost.style.rotate = `${tilt.toFixed(2)}deg`;
      const ready = overCard(event.clientX, event.clientY) && options.canAdd(tile.dataset.id ?? '');
      ghost.toggleAttribute('data-ready', ready);
      options.card.toggleAttribute('data-drop', ready);
      // Greyed out once it has left the row.
      tile.toggleAttribute('data-out', !overTray(event.clientX, event.clientY));
    };

    const settle = (event: PointerEvent) => {
      if (!ghost) return;
      const flying = ghost;
      ghost = null;
      const id = tile.dataset.id ?? '';
      options.card.removeAttribute('data-drop');
      document.documentElement.classList.remove('is-tray-dragging');
      options.onDragState(false);
      const cleanUp = () => {
        flying.remove();
        tile.removeAttribute('data-lifted');
        tile.removeAttribute('data-out');
        refresh();
      };
      flying.removeAttribute('data-ready');
      if (overCard(event.clientX, event.clientY) && options.add(id)) {
        // Dropped on the table: the ghost melts into it while the ingredient fades in.
        refresh();
        flying.setAttribute('data-dropped', '');
        window.setTimeout(cleanUp, prefersReducedMotion() ? 0 : 200);
        return;
      }
      // Anywhere else (or a full table): one smooth move home. Its place, lean, size and shadow
      // all ease back together (CSS transitions on the ghost, kitchen.css) and it lands exactly
      // as the tile, which then takes over with no fade or jump of its own. (Before, two
      // animations fought over its size and lean, and it landed with a jolt; the user, 2026-11-16.)
      // One animation takes it from exactly where and how it is now (its place, its lean, its
      // size, read from the screen) to the tile, slowing gently as it arrives: 460 ms on the
      // drawer curve, which starts quickly and takes its time to settle.
      // The tile's resting place, without its hover lift: measured while the pointer is over it, the
      // ghost landed 3 px high and the tile then snapped down (the user, 2026-11-16: "they sort of
      // snap/bounce back"). The tile also keeps still under the pointer until it is left.
      tile.setAttribute('data-homing', '');
      const lifted = new DOMMatrixReadOnly(getComputedStyle(tile).transform === 'none' ? undefined : getComputedStyle(tile).transform);
      const rect = tile.getBoundingClientRect();
      const home = { left: rect.left - lifted.m41, top: rect.top - lifted.m42 };
      const now = getComputedStyle(flying);
      const from = { translate: now.translate, rotate: now.rotate === 'none' ? '0deg' : now.rotate, scale: now.scale === 'none' ? '1' : now.scale };
      flying.setAttribute('data-landing', '');
      const land = () => {
        tile.style.transition = 'none';
        cleanUp();
        // Still under the pointer: stay put until it leaves (no lift right after landing).
        if (tile.matches(':hover')) tile.addEventListener('pointerleave', () => tile.removeAttribute('data-homing'), { once: true });
        else tile.removeAttribute('data-homing');
        // Let the tile's own transitions (hover, greying) work again from the next frame.
        requestAnimationFrame(() => requestAnimationFrame(() => (tile.style.transition = '')));
      };
      if (prefersReducedMotion()) return land();
      const flight = flying.animate([from, { translate: `${home.left}px ${home.top}px`, rotate: '0deg', scale: '1' }], {
        duration: 460,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      });
      flight.finished.then(land, land);
    };

    tile.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || tile.hasAttribute('data-used')) return;
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
      dragged = false;
      // Keep getting the pointer's moves even when it leaves the tile. (Some browsers refuse if
      // the pointer has already gone, a quick tap on a phone: the drag still works without it.)
      try {
        tile.setPointerCapture(event.pointerId);
      } catch {
        /* no capture: fine */
      }
    });
    tile.addEventListener('pointermove', (event) => {
      if (!start || event.pointerId !== start.id) return;
      if (!ghost && Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_START) {
        dragged = true;
        lift(event);
      }
      follow(event);
    });
    const end = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      start = null;
      settle(event);
    };
    tile.addEventListener('pointerup', end);
    tile.addEventListener('pointercancel', end);
    // A plain click (or Enter on the keyboard) adds it straight away.
    tile.addEventListener('click', () => {
      if (dragged) return void (dragged = false);
      const id = tile.dataset.id ?? '';
      if (options.isUsed(id)) return options.onUsedClick(id);
      if (!options.add(id)) {
        // A full table: a small shake says no.
        gsap.fromTo(tile, { x: 0 }, { keyframes: { x: [0, -4, 4, -2, 0] }, duration: 0.28, ease: 'power1.out', clearProps: 'transform' });
        return;
      }
      refresh();
    });
  }

  refresh();
  dealAhead(ids());
  options.onDeal(ids(), upcoming);
  return { refresh, ids, setTiles: dealInto, element: root };
}
