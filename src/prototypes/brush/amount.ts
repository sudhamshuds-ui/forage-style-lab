import { useCallback, useRef, useState } from 'react';
import { app } from '../../main';

/**
 * One "how painterly" amount, 0 to 100, for the brush button's slider (the user, 2026-11-11:
 * "from normal to very painterly"). Like one master dial on an adjustment layer that moves
 * several sliders together:
 *   0       Playful strokes off: the soft, glazed watercolour look.
 *   1..100  Strokes on, getting bigger, longer, looser, more streaked and more broken in
 *           colour as it rises. 50 is exactly today's default strokes (Sargent).
 * Painter names stay hidden (the user). Only stroke settings change, never colours or light.
 */

/** Today's default sits in the middle: low at 0, default at 50, boldest at 100. */
const through = (t: number, low: number, mid: number, high: number) =>
  Math.round(t < 0.5 ? low + (mid - low) * t * 2 : mid + (high - mid) * (t - 0.5) * 2);

/** Where the slider lands the first time the brush is switched on: today's default. */
export const DEFAULT_AMOUNT = 50;

export function applyAmount(amount: number): void {
  const s = app.settings;
  if (amount <= 0) {
    s.brush.classic = false;
    app.redraw();
    return;
  }
  const t = Math.min(1, amount / 100);
  s.brush.classic = true;
  Object.assign(s.brush, {
    painter: 'sargent',
    type: 'flat',
    pattern: 'none',
    followForm: 100,
    swirl: 0,
    size: through(t, 30, 55, 78),
    length: through(t, 40, 60, 78),
    texture: through(t, 20, 35, 60),
    loose: through(t, 25, 45, 75),
    colourBreak: through(t, 12, 25, 50),
    backdrop: through(t, 35, 50, 66),
  });
  s.paint.painterly = through(t, 30, 45, 85);
  s.paint.variation = through(t, 30, 45, 70);
  app.redraw();
}

/**
 * The brush state for a variant: on or off, and the amount (kept while off, so switching
 * back on returns to where you left it). Repaints at most once a frame while dragging.
 */
export function usePainterlyAmount() {
  const [on, setOn] = useState(() => app.settings.brush.classic);
  const [amount, setAmountState] = useState(DEFAULT_AMOUNT);
  const frame = useRef(0);
  const push = useCallback((value: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => applyAmount(value));
  }, []);
  const toggle = useCallback(() => {
    setOn((was) => {
      const next = !was;
      push(next ? amount : 0);
      return next;
    });
  }, [amount, push]);
  const setAmount = useCallback(
    (value: number) => {
      const v = Math.max(1, Math.min(100, Math.round(value)));
      setAmountState(v);
      setOn(true);
      push(v);
    },
    [push],
  );
  return { on, amount, toggle, setAmount };
}
