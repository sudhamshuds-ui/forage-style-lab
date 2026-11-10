import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Switch } from '@base-ui/react/switch';
import { Tooltip } from '@base-ui/react/tooltip';
import clsx from 'clsx';
import { shuffle, useIngredientName, useShuffleBusy } from './useLab';

/**
 * Small parts every dock variant uses: the ingredient's name, the Shuffle button, the
 * Painterly switch, and the timing values (the "motion tokens").
 */

/** Strong ease-out for things arriving; quick and crisp, never bouncy (a tool, used often). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** The dock changing size: a spring with no bounce, so it settles without wobbling. */
export const SIZE_SPRING = { type: 'spring', duration: 0.3, bounce: 0 } as const;

/**
 * The name: the old one blurs out and the new one blurs in, overlapping, so it reads as one
 * word changing rather than two words swapping (blur bridges the crossfade).
 */
export function IngredientName({ className }: { className?: string }) {
  const name = useIngredientName();
  return (
    <span className={clsx('dk-name', className)} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={name}
          className="dk-name-text"
          initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {name}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.45-7.6a4 4 0 0 1 3.3-1.7H22" />
    <path d="M2 6h1.97a4 4 0 0 1 3.6 2.2" />
    <path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45" />
  </svg>
);

/**
 * Shuffle ingredient: a round icon button with a tooltip (an icon alone needs its words
 * somewhere). Each press spins the icon one turn; while the swap plays it looks busy.
 */
export function ShuffleButton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const busy = useShuffleBusy();
  const [turns, setTurns] = useState(0);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className={clsx('dk-shuffle', `dk-shuffle--${variant}`)}
        aria-label="Shuffle ingredient"
        aria-busy={busy}
        data-busy={busy || undefined}
        onClick={() => {
          if (busy) return;
          setTurns((t) => t + 1);
          shuffle();
        }}
      >
        <span className="dk-shuffle-icon" style={{ transform: `rotate(${turns * 180}deg)` }}>
          <ShuffleIcon />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={10}>
          <Tooltip.Popup className="dk-tip">Shuffle ingredient</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** The Painterly switch: a small track and knob, with its label (the whole thing is the button). */
export function PainterlySwitch({ checked, onChange, label = 'Painterly' }: { checked: boolean; onChange: (on: boolean) => void; label?: string }) {
  return (
    <label className="dk-switch-label">
      <Switch.Root className="dk-switch" checked={checked} onCheckedChange={(on) => onChange(on)}>
        <Switch.Thumb className="dk-switch-thumb" />
      </Switch.Root>
      {label}
    </label>
  );
}

export const Separator = () => <span className="dk-sep" aria-hidden="true" />;
