import { useCallback, useEffect, useState } from 'react';
import {
  STYLES,
  currentStyle,
  isPainterly,
  setPainterly,
  setStyle,
  shuffle,
  watchBusy,
  watchName,
} from '../ui/shared';

/**
 * React hooks over the live Style Lab. Think of them as the dock's "links" to the app: the
 * ingredient's name, whether a Shuffle is playing, and the look (Painterly on or off, and
 * which painter). The app does the work; the dock only shows it and asks for changes.
 */

export { STYLES, shuffle };

/** The ingredient's name, changing when the painted transition reveals the next card. */
export function useIngredientName(): string {
  const [name, setName] = useState(() => document.getElementById('ingredient-name')?.textContent ?? '');
  useEffect(
    () =>
      watchName((next, changing) => {
        // The app fades its own label out for 100 ms before the new name; we switch on the new name.
        if (!changing) setName(next);
      }),
    [],
  );
  return name;
}

/** True while a Shuffle transition plays (clicks are ignored meanwhile). */
export function useShuffleBusy(): boolean {
  const [busy, setBusy] = useState(false);
  useEffect(() => watchBusy(setBusy), []);
  return busy;
}

/** The look: Painterly strokes on or off, and the painter they follow. */
export function useLook() {
  const [painterly, setOn] = useState(isPainterly);
  const [styleId, setId] = useState(() => currentStyle().id);
  const togglePainterly = useCallback((on: boolean) => {
    setPainterly(on);
    setOn(on);
  }, []);
  const chooseStyle = useCallback((id: string) => {
    setStyle(id);
    setOn(true);
    setId(id);
  }, []);
  /** Step to the previous (-1) or next (+1) style, wrapping round. */
  const stepStyle = useCallback(
    (direction: 1 | -1) => {
      const at = Math.max(0, STYLES.findIndex((p) => p.id === styleId));
      chooseStyle(STYLES[(at + direction + STYLES.length) % STYLES.length].id);
    },
    [styleId, chooseStyle],
  );
  return { painterly, styleId, style: STYLES.find((p) => p.id === styleId) ?? STYLES[0], togglePainterly, chooseStyle, stepStyle };
}
