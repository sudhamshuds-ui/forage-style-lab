import '../../main';
import './picker.css';
import './proto.css';
import { dial, dock, placard } from './variants';
import type { Slots } from './shared';

/**
 * The prototype harness: the real Style Lab runs (imported above), and the picker at the top
 * flips between the UI variants. Wiring follows the prototype skill's PICKER.md: keys 1 to 3
 * and the arrows switch, R replays, the choice is kept in the address (?v=2).
 */

const variants = [
  { key: 'dock', variant: dock },
  { key: 'placard', variant: placard },
  { key: 'dial', variant: dial },
];

const layout = document.getElementById('proto-layout') as HTMLElement;
const slots: Slots = {
  over: document.getElementById('slot-over') as HTMLElement,
  side: document.getElementById('slot-side') as HTMLElement,
  below: document.getElementById('slot-below') as HTMLElement,
};
const picker = document.querySelector('.proto-picker') as HTMLElement;
const highlight = picker.querySelector('.proto-picker-highlight') as HTMLElement;
const items = [...picker.querySelectorAll<HTMLButtonElement>('.proto-picker-item:not(.proto-picker-replay)')];
const replay = picker.querySelector('.proto-picker-replay');
let current = 0;
let unmount: (() => void) | null = null;

function moveHighlight(): void {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

function mount(i: number): void {
  unmount?.();
  unmount = null;
  layout.dataset.variant = variants[i].key;
  // Clear first, render next frame, so entrance animations re-run.
  requestAnimationFrame(() => {
    unmount = variants[i].variant.mount(slots);
  });
}

function setActive(i: number): void {
  if (i < 0 || i >= variants.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  const url = new URL(location.href);
  url.searchParams.set('v', String(i + 1));
  history.replaceState(null, '', url);
  mount(i);
}

items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
replay?.addEventListener('click', () => mount(current));
window.addEventListener('resize', moveHighlight);

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= variants.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
  else if (e.key === 'r' || e.key === 'R') mount(current);
});

setActive((parseInt(new URLSearchParams(location.search).get('v') ?? '', 10) || 1) - 1);
// Enable the slide only after first paint, so load doesn't animate.
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
