import '../../main';
import '../ui/picker.css';
import './dock.css';
import { StrictMode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { MotionConfig } from 'motion/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { Morph, PopoverDock, Stepper } from './variants';

/**
 * The React harness for the dock variants. The Style Lab runs underneath (imported above);
 * the dock renders on the card, the picker (harness chrome, from the prototype skill's
 * PICKER.md) floats at the top. Keys 1 to 3 and the arrows switch, R replays, ?v=2 is kept.
 */

const VARIANTS = [
  { name: 'Morph', Component: Morph },
  { name: 'Popover', Component: PopoverDock },
  { name: 'Stepper', Component: Stepper },
];

const initial = Math.min(VARIANTS.length, Math.max(1, parseInt(new URLSearchParams(location.search).get('v') ?? '', 10) || 1)) - 1;

function Harness() {
  const [current, setCurrent] = useState(initial);
  // Bumped by replay: a new key re-mounts the variant, so its entrance runs again.
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

  const { Component } = VARIANTS[current];
  return (
    <>
      <div className="dk-enter" key={mountKey}>
        <Component />
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
    return () => window.removeEventListener('resize', moveHighlight);
  }, [moveHighlight]);
  // Enable the slide only after first paint, so load doesn't animate.
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

createRoot(document.getElementById('dock-root')!).render(
  <StrictMode>
    {/* reducedMotion "user": with reduced motion on, movement is dropped and fades stay. */}
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider delay={500} closeDelay={0}>
        <Harness />
      </Tooltip.Provider>
    </MotionConfig>
  </StrictMode>,
);
