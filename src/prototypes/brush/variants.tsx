import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Slider } from '@base-ui/react/slider';
import { Menu } from '@base-ui/react/menu';
import { STYLES, currentStyle, isPainterly, setPainterly, setStyle, shuffle, watchBusy } from '../ui/shared';
import { usePainterlyAmount } from './amount';

/**
 * Round 3 of the UI (the user's Figma directions, 2026-11-11, node 124:352): a square-cornered
 * card with no shadow, "Forage pantry" above it, a "New ingredient" pill, no ingredient or
 * painter names, and a round brush button that switches the painterly look on and brings in a
 * slider from normal to very painterly. Three ways for that slider to arrive:
 *   Grow   the brush button stretches down into a tall pill with the slider (the user's frame 6)
 *   Scrub  no slider at rest: tap to switch, drag up or down on the button to set how much
 *   Bar    brush beside "New ingredient"; switching on slides a short slider out of it
 *
 * Motion (emil-design-eng, filtered by find-animation-opportunities): the button growing into
 * the slider is a state change (spring, no bounce, 300 ms in, faster out); the slider itself
 * follows the finger with no easing (it drives the painting); presses scale to 0.97.
 */

/** A spring with no bounce: settles without wobble. Exits are quicker than entrances. */
const GROW = { type: 'spring', duration: 0.3, bounce: 0 } as const;
const SHRINK = { type: 'spring', duration: 0.2, bounce: 0 } as const;

export const BrushIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </svg>
);

/** The arrow keys belong to the slider while it has focus (not to the variant picker). */
const keepKeys = (e: KeyboardEvent) => e.stopPropagation();

/** "New ingredient": the Shuffle button, as a glass pill. Dims while a swap plays. */
export function NewIngredient() {
  const [busy, setBusy] = useState(false);
  useEffect(() => watchBusy(setBusy), []);
  return (
    <button type="button" className="br-new" data-busy={busy || undefined} aria-busy={busy} onClick={() => !busy && shuffle()}>
      New ingredient
    </button>
  );
}

/** The slider itself (base-ui: keyboard, focus and dragging handled). */
function AmountSlider({ amount, onChange, vertical }: { amount: number; onChange: (v: number) => void; vertical: boolean }) {
  return (
    <div onKeyDown={keepKeys} className={vertical ? 'br-slider br-slider--v' : 'br-slider br-slider--h'}>
      <Slider.Root
        orientation={vertical ? 'vertical' : 'horizontal'}
        value={amount}
        min={1}
        max={100}
        onValueChange={(v) => onChange(v as number)}
      >
        <Slider.Control className="br-control">
          <Slider.Track className="br-track">
            <Slider.Indicator className="br-indicator" />
            <Slider.Thumb className="br-thumb" aria-label="How painterly" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ Grow */

export function Grow() {
  const brush = usePainterlyAmount();
  return (
    <div className="br-corner">
      <motion.div layout transition={brush.on ? GROW : SHRINK} className="br-grow" style={{ borderRadius: 22 }}>
        <motion.button
          layout="position"
          transition={brush.on ? GROW : SHRINK}
          type="button"
          className="br-icon"
          aria-pressed={brush.on}
          aria-label="Painterly"
          onClick={brush.toggle}
        >
          <BrushIcon />
        </motion.button>
        <AnimatePresence initial={false}>
          {brush.on && (
            <motion.div
              key="slider"
              className="br-grow-slider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15, delay: 0.08 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
            >
              <AmountSlider amount={brush.amount} onChange={brush.setAmount} vertical />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ Scrub */

export function Scrub() {
  const brush = usePainterlyAmount();
  const start = useRef<{ y: number; amount: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const C = 2 * Math.PI * 23; // the ring's length
  return (
    <div className="br-corner">
      <div className="br-scrub-wrap">
        {/* While dragging, a small level shows how far it has gone (fades out after). */}
        <div className="br-level" data-show={dragging || undefined} aria-hidden="true">
          <div className="br-level-fill" style={{ transform: `scaleY(${brush.on ? brush.amount / 100 : 0})` }} />
        </div>
        <button
          type="button"
          role="slider"
          className="br-icon br-scrub"
          aria-label="Painterly: tap to switch, drag up or down to set how much"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={brush.on ? brush.amount : 0}
          aria-valuetext={brush.on ? `${brush.amount}%` : 'Off'}
          aria-pressed={brush.on}
          data-dragging={dragging || undefined}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start.current = { y: e.clientY, amount: brush.on ? brush.amount : 0, moved: false };
          }}
          onPointerMove={(e) => {
            const s = start.current;
            if (!s) return;
            const dy = s.y - e.clientY; // up is more
            if (!s.moved && Math.abs(dy) < 4) return;
            s.moved = true;
            setDragging(true);
            brush.setAmount(Math.max(s.amount, 1) + dy * 0.6);
          }}
          onPointerUp={() => {
            if (start.current && !start.current.moved) brush.toggle();
            start.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') brush.setAmount(brush.amount + 5);
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') brush.setAmount(brush.amount - 5);
            else if (e.key === 'Enter' || e.key === ' ') brush.toggle();
            else return;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <svg className="br-ring" viewBox="0 0 52 52" aria-hidden="true" data-on={brush.on || undefined}>
            <circle cx="26" cy="26" r="23" className="br-ring-bg" />
            <circle
              cx="26"
              cy="26"
              r="23"
              className="br-ring-fill"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - (brush.on ? brush.amount : 0) / 100)}
            />
          </svg>
          <BrushIcon />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Bar (toggle only) */

/**
 * The user's pick (2026-11-11): the Bar layout, with the brush as a plain switch for the
 * painterly look (no slider), and more room under it. On paints with today's default strokes.
 */
export function Toggle() {
  const brush = usePainterlyAmount();
  return (
    <div className="br-bar">
      <NewIngredient />
      <button
        type="button"
        className="br-icon br-glass"
        aria-pressed={brush.on}
        aria-label="Painterly"
        onClick={brush.toggle}
      >
        <BrushIcon />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Bar with the style menu */

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * The user's mock-up (2026-11-11): the Bar, with the brush as a split button. The brush half
 * switches the painterly look on and off; the arrow half opens a list of styles above it,
 * grown from the button (base-ui Menu). Picking a style switches the look on too. The names
 * are the painters' ("names"), or Style 1 to 6 ("numbers"), never with a description.
 */
function StyleMenuBar({ numbered }: { numbered: boolean }) {
  const [on, setOn] = useState(isPainterly);
  const [styleId, setStyleId] = useState(() => currentStyle().id);
  const label = (i: number) => (numbered ? `Style ${i + 1}` : STYLES[i].name);
  return (
    <div className="br-bar">
      <NewIngredient />
      <div className="br-split" data-on={on || undefined}>
        <button
          type="button"
          className="br-split-brush"
          aria-pressed={on}
          aria-label="Painterly"
          onClick={() => {
            setPainterly(!on);
            setOn(!on);
          }}
        >
          <BrushIcon />
        </button>
        <Menu.Root>
          <Menu.Trigger className="br-split-more" aria-label="Painting style">
            <Chevron />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="top" align="end" sideOffset={10} className="br-menu-pos">
              <Menu.Popup className="br-menu">
                <Menu.RadioGroup
                  value={on ? styleId : null}
                  onValueChange={(id: string) => {
                    setStyle(id);
                    setStyleId(id);
                    setOn(true);
                  }}
                >
                  {STYLES.map((p, i) => (
                    <Menu.RadioItem key={p.id} value={p.id} className="br-menu-item" closeOnClick>
                      <span className="br-menu-dot" aria-hidden="true" />
                      {label(i)}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  );
}

export const MenuNames = () => <StyleMenuBar numbered={false} />;
export const MenuNumbers = () => <StyleMenuBar numbered />;

/* ------------------------------------------------------------------ Bar */

export function Bar() {
  const brush = usePainterlyAmount();
  return (
    <motion.div layout className="br-bar" transition={brush.on ? GROW : SHRINK} style={{ borderRadius: 22 }}>
      <motion.div layout="position" transition={brush.on ? GROW : SHRINK}>
        <NewIngredient />
      </motion.div>
      <motion.div layout transition={brush.on ? GROW : SHRINK} className="br-bar-brush" style={{ borderRadius: 22 }}>
        <motion.button
          layout="position"
          transition={brush.on ? GROW : SHRINK}
          type="button"
          className="br-icon"
          aria-pressed={brush.on}
          aria-label="Painterly"
          onClick={brush.toggle}
        >
          <BrushIcon />
        </motion.button>
        <AnimatePresence initial={false} mode="popLayout">
          {brush.on && (
            <motion.div
              key="slider"
              className="br-bar-slider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15, delay: 0.08 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
            >
              <AmountSlider amount={brush.amount} onChange={brush.setAmount} vertical={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
