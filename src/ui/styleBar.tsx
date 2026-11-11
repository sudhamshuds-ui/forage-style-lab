import { StrictMode, useEffect, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu } from '@base-ui/react/menu';
import { PAINTERS, findPainter } from '../painters';
import './styleBar.css';

/**
 * The controls on the card (the user's design, 2026-11-11; explored in prototypes/brush.html,
 * round 5 "Names", see docs/process/README.md):
 *
 *   [ New ingredient ]  [ brush | v ]
 *
 *   New ingredient  Shuffle ingredient (the painted transition). Dims while a swap plays.
 *   brush           switches the painterly look (Playful strokes) on and off.
 *   v               opens the painters above it (grown from the arrow); picking one paints
 *                   like that painter and switches the look on.
 *
 * React draws only these controls; the Style Lab itself stays plain TypeScript and hands this
 * file what it needs (StyleBarApi), like a pre-comp with exposed controls.
 */

export interface StyleBarApi {
  shuffle: () => void;
  /** Listen for the busy state (a swap playing); returns a stop function. */
  onBusy: (listener: (busy: boolean) => void) => () => void;
  painterly: () => boolean;
  painter: () => string;
  setPainterly: (on: boolean) => void;
  setPainter: (id: string) => void;
  /** How long the Shuffle transition plays (seconds): the loading state lasts as long. */
  swapSeconds: number;
}

/** The painters in the menu, calmest first; Sargent is today's default. */
const ORDER = ['sargent', 'monet', 'degas', 'cezanne', 'seurat', 'van-gogh'];
const MENU_PAINTERS = ORDER.map(findPainter).filter((p) => PAINTERS.includes(p));

const BrushIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </svg>
);

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function StyleBar({ api }: { api: StyleBarApi }) {
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(api.painterly);
  const [painter, setPainter] = useState(api.painter);
  useEffect(() => api.onBusy(setBusy), [api]);

  return (
    <div className="sb">
      {/*
        While a swap plays, the button shows a loading state. Its layers (fill, trace, scribble,
        dots) are hidden until one is chosen in CSS; the prototype page (prototypes/loading.html)
        picks between them with data-loader on the page. --swap keeps them in step with the
        transition's length.
      */}
      <button
        type="button"
        className="sb-new"
        data-busy={busy || undefined}
        aria-busy={busy}
        style={{ '--swap': `${api.swapSeconds}s` } as CSSProperties}
        onClick={() => !busy && api.shuffle()}
      >
        <span className="sb-new-label">New ingredient</span>
        <span className="sb-new-fill" aria-hidden="true">
          <span className="sb-new-label">New ingredient</span>
        </span>
        <span className="sb-new-trace" aria-hidden="true" />
        <svg className="sb-new-scribble" viewBox="0 0 120 24" aria-hidden="true">
          <path pathLength={1} d="M6 15c8-9 14-9 18-2s9 7 14-1 11-8 15 0 9 8 15 0 10-8 14 0 9 7 14-1 9-6 14 1" />
        </svg>
        <span className="sb-new-dots" aria-hidden="true">
          Painting<i>.</i><i>.</i><i>.</i>
        </span>
      </button>
      {/* Off: a round brush button. On: it turns dark and stretches into a pill, showing the
          arrow that opens the painters (the user, 2026-11-11). */}
      <div className="sb-split" data-on={on || undefined}>
        <button
          type="button"
          className="sb-brush"
          aria-pressed={on}
          aria-label="Painterly"
          onClick={() => {
            api.setPainterly(!on);
            setOn(!on);
          }}
        >
          <BrushIcon />
        </button>
        <div className="sb-more-wrap" inert={!on}>
          <div className="sb-more-clip">
            <Menu.Root>
              <Menu.Trigger className="sb-more" aria-label="Painting style">
                <Chevron />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="top" align="end" sideOffset={10}>
                  <Menu.Popup className="sb-menu">
                    <Menu.RadioGroup
                      value={on ? painter : null}
                      onValueChange={(id: string) => {
                        api.setPainter(id);
                        setPainter(id);
                        setOn(true);
                      }}
                    >
                      {MENU_PAINTERS.map((p) => (
                        <Menu.RadioItem key={p.id} value={p.id} className="sb-item" closeOnClick>
                          <span className="sb-dot" aria-hidden="true" />
                          {p.name}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Draw the controls into the layer over the card. */
export function mountStyleBar(root: HTMLElement, api: StyleBarApi): void {
  createRoot(root).render(
    <StrictMode>
      <StyleBar api={api} />
    </StrictMode>,
  );
}
