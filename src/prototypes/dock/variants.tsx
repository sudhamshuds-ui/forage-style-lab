import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Popover } from '@base-ui/react/popover';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { EASE_OUT, IngredientName, PainterlySwitch, SIZE_SPRING, Separator, ShuffleButton } from './parts';
import { STYLES, useLook } from './useLab';

/**
 * Three takes on the Dock (the one the user liked). Same five things each time: the card,
 * the name, Shuffle, the Painterly switch and the painting styles. What changes is how the
 * styles are reached:
 *   Morph    the dock itself grows a row of styles when Painterly is on (one object, not two)
 *   Popover  a tiny dock; a brush button opens a panel of styles with a line about each
 *   Stepper  one slim line; the style steps inline with arrows, like flipping through
 */

/* ------------------------------------------------------------------ Morph */

export function Morph() {
  const look = useLook();
  return (
    <motion.div layout transition={SIZE_SPRING} className="dk dk--morph" style={{ borderRadius: 24 }}>
      <AnimatePresence initial={false} mode="popLayout">
        {look.painterly && (
          <motion.div
            key="styles"
            layout="position"
            className="dk-styles-wrap"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.2, ease: EASE_OUT, delay: 0.05 } }}
            exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12, ease: EASE_OUT } }}
          >
            <RadioGroup className="dk-chips" aria-label="Painting style" value={look.styleId} onValueChange={(v) => look.chooseStyle(String(v))}>
              {STYLES.map((p) => (
                <Radio.Root key={p.id} value={p.id} className="dk-chip" title={p.note}>
                  {look.styleId === p.id && (
                    <motion.span layoutId="morph-chip" className="dk-chip-fill" transition={SIZE_SPRING} />
                  )}
                  <span className="dk-chip-text">{p.name}</span>
                </Radio.Root>
              ))}
            </RadioGroup>
            <div className="dk-rule" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div layout="position" transition={SIZE_SPRING} className="dk-row">
        <IngredientName />
        <Separator />
        <PainterlySwitch checked={look.painterly} onChange={look.togglePainterly} />
        <ShuffleButton />
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ Popover */

const BrushIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </svg>
);

export function PopoverDock() {
  const look = useLook();
  return (
    <div className="dk dk--pop">
      <IngredientName />
      <Separator />
      <Popover.Root>
        <Popover.Trigger className="dk-brush" aria-label="Painting style" data-on={look.painterly || undefined}>
          <BrushIcon />
          <span className="dk-brush-label">{look.painterly ? look.style.name : 'Style'}</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="top" sideOffset={12} align="center">
            <Popover.Popup className="dk-pop">
              <div className="dk-pop-head">
                <PainterlySwitch checked={look.painterly} onChange={look.togglePainterly} label="Painterly strokes" />
              </div>
              <RadioGroup
                className="dk-pop-list"
                aria-label="Painting style"
                value={look.painterly ? look.styleId : null}
                onValueChange={(v) => look.chooseStyle(String(v))}
              >
                {STYLES.map((p) => (
                  <Radio.Root key={p.id} value={p.id} className="dk-pop-item">
                    <span className="dk-pop-check" aria-hidden="true" />
                    <span className="dk-pop-text">
                      <span className="dk-pop-name">{p.name}</span>
                      <span className="dk-pop-note">{p.note}</span>
                    </span>
                  </Radio.Root>
                ))}
              </RadioGroup>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <ShuffleButton />
    </div>
  );
}

/* ------------------------------------------------------------------ Stepper */

export function Stepper() {
  const look = useLook();
  // Which way the last step went, so the new name slides in from that side.
  const [direction, setDirection] = useState<1 | -1>(1);
  const step = (d: 1 | -1) => {
    setDirection(d);
    look.stepStyle(d);
  };
  return (
    <motion.div layout transition={SIZE_SPRING} className="dk dk--step" style={{ borderRadius: 999 }}>
      <motion.div layout="position" transition={SIZE_SPRING}>
        <IngredientName />
      </motion.div>
      <Separator />
      <motion.div layout="position" transition={SIZE_SPRING}>
        <PainterlySwitch checked={look.painterly} onChange={look.togglePainterly} />
      </motion.div>
      <AnimatePresence initial={false} mode="popLayout">
        {look.painterly && (
          <motion.div
            key="stepper"
            layout="position"
            className="dk-stepper"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.2, ease: EASE_OUT, delay: 0.05 } }}
            exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
          >
            <button type="button" className="dk-arrow" aria-label="Previous style" onClick={() => step(-1)}>
              <Chevron flip />
            </button>
            <span className="dk-step-name" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.span
                  key={look.styleId}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: 8 * d, filter: 'blur(3px)' }),
                    centre: { opacity: 1, x: 0, filter: 'blur(0px)' },
                    leave: (d: number) => ({ opacity: 0, x: -8 * d, filter: 'blur(3px)' }),
                  }}
                  initial="enter"
                  animate="centre"
                  exit="leave"
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  {look.style.name}
                </motion.span>
              </AnimatePresence>
            </span>
            <button type="button" className="dk-arrow" aria-label="Next style" onClick={() => step(1)}>
              <Chevron />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div layout="position" transition={SIZE_SPRING}>
        <ShuffleButton />
      </motion.div>
    </motion.div>
  );
}

const Chevron = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
