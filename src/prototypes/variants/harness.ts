import { app } from '../../main';
import '../ui/picker.css';

/**
 * The variations page: the real Forage pantry page, with a picker on top that puts each
 * variation of an ingredient on stage. Like flipping between artboards. To compare a new
 * ingredient's variations, add them to VARIANTS (each is a registry entry). Keys 1 to 9 and the
 * arrows switch; the choice is kept in the address (?v=2).
 */
// The red onion's three (2026-11-11). The user chose Upright (2026-11-12); the other two left the
// registry (they stay in forms/onion.ts), so only Upright still shows here. The published page
// keeps all three.
const VARIANTS = [
  { name: 'Upright', id: 'onion' },
  { name: 'Pair', id: 'onion-pair' },
  { name: 'Whole and cut', id: 'onion-cut' },
];

const picker = document.querySelector('.proto-picker') as HTMLElement;
const highlight = picker.querySelector('.proto-picker-highlight') as HTMLElement;
const items = VARIANTS.map((variant) => {
  const button = document.createElement('button');
  button.className = 'proto-picker-item';
  button.textContent = variant.name;
  picker.appendChild(button);
  return button;
});
let current = 0;

function moveHighlight(): void {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

function setActive(i: number): void {
  if (i < 0 || i >= VARIANTS.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  app.show(VARIANTS[i].id);
  const url = new URL(location.href);
  url.searchParams.set('v', String(i + 1));
  history.replaceState(null, '', url);
}

items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
window.addEventListener('resize', moveHighlight);
// The font arrives after the first layout: measure the highlight again once it has.
void document.fonts.ready.then(moveHighlight);
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= VARIANTS.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % VARIANTS.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
});

const start = parseInt(new URL(location.href).searchParams.get('v') ?? '1', 10) - 1;
setActive(Number.isFinite(start) ? Math.min(Math.max(start, 0), VARIANTS.length - 1) : 0);
