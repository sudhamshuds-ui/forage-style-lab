import { app } from '../../main';
import '../ui/picker.css';

/**
 * The batch review page (the user, 2026-11-14): the real Forage page, with a picker on top that
 * puts each ingredient of the batch on stage. Like flipping between artboards. For a new batch,
 * list its ingredients in VARIANTS (each is a registry entry). Keys 1 to 9 and the
 * arrows switch; the choice is kept in the address (?v=2).
 */
// Round 2's last five (2026-11-14). For the next batch, list its ingredients here.
const VARIANTS = [
  { name: 'Cabbage', id: 'cabbage' },
  { name: 'Salmon', id: 'salmon' },
  { name: 'Fried egg', id: 'egg' },
  { name: 'Rice', id: 'rice' },
  { name: 'Milk', id: 'milk' },
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
