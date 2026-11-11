import '../../main';
import '../ui/picker.css';
import './loading.css';

/**
 * Loading states for New ingredient (2026-11-11). The real page runs as it is; the picker
 * sets data-loader on <html>, which styleBar.css reads. Keys 1 to 5 and the arrows switch,
 * R (or the replay button) shuffles again so the loading state plays; ?v=2 is kept.
 */

const LOADERS = ['fill', 'trace', 'shimmer', 'scribble', 'dots'];

const picker = document.querySelector('.proto-picker') as HTMLElement;
const highlight = picker.querySelector('.proto-picker-highlight') as HTMLElement;
const items = [...picker.querySelectorAll<HTMLButtonElement>('.proto-picker-item:not(.proto-picker-replay)')];
const replay = picker.querySelector('.proto-picker-replay') as HTMLButtonElement;
let current = 0;

const shuffle = () => (document.querySelector('.sb-new') as HTMLButtonElement | null)?.click();

function moveHighlight(): void {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

function setActive(i: number): void {
  if (i < 0 || i >= LOADERS.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  document.documentElement.dataset.loader = LOADERS[i];
  const url = new URL(location.href);
  url.searchParams.set('v', String(i + 1));
  history.replaceState(null, '', url);
}

items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
replay.addEventListener('click', shuffle);
window.addEventListener('resize', moveHighlight);
void document.fonts.ready.then(moveHighlight);
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= LOADERS.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % LOADERS.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + LOADERS.length) % LOADERS.length);
  else if (e.key === 'r' || e.key === 'R') shuffle();
});

setActive((parseInt(new URLSearchParams(location.search).get('v') ?? '', 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
