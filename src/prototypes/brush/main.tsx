import '../../main';
import '../ui/picker.css';
import './brush.css';
import { StrictMode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { MotionConfig } from 'motion/react';
import { Bar, Grow, NewIngredient, Scrub } from './variants';

/**
 * UI round 3 harness. The picker (harness chrome, PICKER.md) flips between the three ways the
 * brush's slider arrives; keys 1 to 3, R replays, ?v=2 is kept. Grow and Scrub keep "New
 * ingredient" at the bottom of the card and the brush in the top-right corner (the user's
 * frames 4 to 6); Bar puts both at the bottom (frames 1 and 2).
 */

const VARIANTS = [
  { name: 'Grow', Component: Grow, pill: true },
  { name: 'Scrub', Component: Scrub, pill: true },
  { name: 'Bar', Component: Bar, pill: false },
];

const initial = Math.min(VARIANTS.length, Math.max(1, parseInt(new URLSearchParams(location.search).get('v') ?? '', 10) || 1)) - 1;

function Harness() {
  const [current, setCurrent] = useState(initial);
  const [mountKey, setMountKey] = useState(0);
  const choose = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setMountKey((k) => k + 1);
    const url = new URL(location.href);
    url.searchParams.set('v', String(i + 1));
    history.replaceState(null, '', url);
  }, []);
  const replay = useCallback(() => setMountKey((k) => k + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) choose(num - 1);
      else if (e.key === 'ArrowRight') choose((current + 1) % VARIANTS.length);
      else if (e.key === 'ArrowLeft') choose((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === 'r' || e.key === 'R') replay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, choose, replay]);

  const { Component, pill } = VARIANTS[current];
  return (
    <>
      <div className="br-enter" key={mountKey}>
        <Component />
        {pill && (
          <div className="br-bottom">
            <NewIngredient />
          </div>
        )}
      </div>
      {createPortal(<Picker current={current} onChoose={choose} onReplay={replay} />, document.getElementById('picker-root')!)}
    </>
  );
}

function Picker({ current, onChoose, onReplay }: { current: number; onChoose: (i: number) => void; onReplay: () => void }) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const moveHighlight = useCallback(() => {
    const el = items.current[current];
    if (!el || !highlight.current) return;
    highlight.current.style.width = el.offsetWidth + 'px';
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);
  useLayoutEffect(moveHighlight, [moveHighlight]);
  useEffect(() => {
    window.addEventListener('resize', moveHighlight);
    void document.fonts.ready.then(moveHighlight);
    return () => window.removeEventListener('resize', moveHighlight);
  }, [moveHighlight]);
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, []);
  return (
    <nav className="proto-picker" data-position="top" data-ready={ready ? '' : undefined} aria-label="Prototype variants">
      <span className="proto-picker-highlight" aria-hidden="true" ref={highlight} />
      {VARIANTS.map((v, i) => (
        <button
          key={v.name}
          ref={(el) => {
            items.current[i] = el;
          }}
          className="proto-picker-item"
          data-active={i === current ? '' : undefined}
          aria-current={i === current ? 'true' : undefined}
          onClick={() => onChoose(i)}
        >
          {v.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>
        ↻
      </button>
    </nav>
  );
}

// The drag hint is for the first visit: it fades out once you have dragged the view.
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const hint = document.getElementById('br-hint') as HTMLElement;
canvas.addEventListener('pointerdown', () => hint.classList.add('is-done'), { once: true });

createRoot(document.getElementById('brush-root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Harness />
    </MotionConfig>
  </StrictMode>,
);
