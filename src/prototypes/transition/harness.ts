import { app } from '../../main';
import '../ui/picker.css';
import './transition.css';
import { shuffle, watchBusy, watchName } from '../ui/shared';

/**
 * The transition prototypes: the picker at the top switches the Shuffle transition's style,
 * then Shuffle (or R, or the replay button) plays it on the live Style Lab. Keys 1 to 5 and
 * the arrows switch; the choice is kept in the address (?v=5).
 */

const STYLES = [
  { name: 'Current', about: 'Dry brush: long strokes smudge the card in a wave from the ingredient, then paint the next one in, crossing three ways.' },
  { name: 'Sweep', about: 'Wide strokes in rows, top to bottom, each row the other way, like a wall painted back and forth.' },
  { name: 'Dabs', about: 'Short, round, loaded dabs scattered everywhere, like Monet: the card dissolves into touches of colour.' },
  { name: 'Swirl', about: 'Strokes stir round the ingredient in a spiral, then the next card is painted in, circling outward.' },
  { name: 'Feather burn', about: 'No strokes: a soft, hairy, grainy front melts the old card into a smear, then burns through to the next.' },
];

const picker = document.querySelector('.proto-picker') as HTMLElement;
const highlight = picker.querySelector('.proto-picker-highlight') as HTMLElement;
const items = [...picker.querySelectorAll<HTMLButtonElement>('.proto-picker-item:not(.proto-picker-replay)')];
const replay = picker.querySelector('.proto-picker-replay') as HTMLButtonElement;
const about = document.getElementById('trp-about') as HTMLElement;
let current = 0;

function moveHighlight(): void {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

function setActive(i: number): void {
  if (i < 0 || i >= STYLES.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  app.setTransitionStyle(i);
  about.textContent = STYLES[i].about;
  const url = new URL(location.href);
  url.searchParams.set('v', String(i + 1));
  history.replaceState(null, '', url);
}

items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
replay.addEventListener('click', shuffle);
window.addEventListener('resize', moveHighlight);
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= STYLES.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % STYLES.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + STYLES.length) % STYLES.length);
  else if (e.key === 'r' || e.key === 'R') shuffle();
});

// The little bar under the card: the name, the Painterly switch and Shuffle.
const name = document.getElementById('trp-name') as HTMLElement;
watchName((text, changing) => {
  name.textContent = text;
  name.classList.toggle('is-changing', changing);
});
const shuffleButton = document.getElementById('trp-shuffle') as HTMLButtonElement;
shuffleButton.addEventListener('click', shuffle);
watchBusy((busy) => shuffleButton.toggleAttribute('data-busy', busy));
const painterly = document.getElementById('trp-painterly') as HTMLInputElement;
painterly.checked = app.settings.brush.classic;
painterly.addEventListener('change', () => {
  app.settings.brush.classic = painterly.checked;
  app.redraw();
});

setActive((parseInt(new URLSearchParams(location.search).get('v') ?? '', 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
