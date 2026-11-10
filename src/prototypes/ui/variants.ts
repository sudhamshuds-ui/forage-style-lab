import {
  SHUFFLE_ICON,
  STYLES,
  currentStyle,
  html,
  isPainterly,
  setPainterly,
  setStyle,
  shuffle,
  watchBusy,
  watchName,
  type Variant,
} from './shared';

/**
 * Three directions for the Style Lab's UI. Each one has the same five things (the card, the
 * Painterly switch, Shuffle ingredient, the name, the painting styles) and answers the brief
 * differently:
 *   Dock     everything in one small frosted dock floating on the card (your sketch 2)
 *   Placard  the card stays clean; a museum-style label below it, stepping through styles (sketch 1)
 *   Dial     one control: a slider from no strokes to the boldest painter; Shuffle as a big round button
 */

/** Keep the name and the Shuffle buttons in step with the app. */
function follow(nameEls: HTMLElement[], shuffleEls: HTMLElement[]): () => void {
  const stopName = watchName((name, changing) => {
    for (const el of nameEls) {
      el.textContent = name;
      el.classList.toggle('is-changing', changing);
    }
  });
  const stopBusy = watchBusy((busy) => {
    for (const el of shuffleEls) {
      el.toggleAttribute('data-busy', busy);
      el.setAttribute('aria-busy', String(busy));
    }
  });
  return () => {
    stopName();
    stopBusy();
  };
}

/* ---------------------------------------------------------------- Dock */

export const dock: Variant = {
  mount({ over }) {
    const root = html(`
      <div class="dock-wrap">
        <div class="dock-styles" role="radiogroup" aria-label="Painting style">
          ${STYLES.map((p) => `<button type="button" role="radio" class="dock-chip" data-id="${p.id}" title="${p.note}">${p.name}</button>`).join('')}
        </div>
        <div class="dock">
          <span class="dock-name" aria-live="polite"></span>
          <span class="dock-sep" aria-hidden="true"></span>
          <button type="button" role="switch" class="dock-switch">
            <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
            Painterly
          </button>
          <button type="button" class="dock-shuffle" aria-label="Shuffle ingredient">${SHUFFLE_ICON}</button>
        </div>
      </div>`);
    over.append(root);

    const styles = root.querySelector('.dock-styles') as HTMLElement;
    const toggle = root.querySelector('.dock-switch') as HTMLButtonElement;
    const chips = [...root.querySelectorAll<HTMLButtonElement>('.dock-chip')];
    const render = () => {
      const on = isPainterly();
      toggle.setAttribute('aria-checked', String(on));
      styles.toggleAttribute('data-open', on);
      styles.inert = !on;
      for (const chip of chips) chip.setAttribute('aria-checked', String(chip.dataset.id === currentStyle().id));
      // On a narrow card the row scrolls: keep the chosen style in view.
      const chosen = chips.find((c) => c.dataset.id === currentStyle().id);
      if (chosen) styles.scrollLeft = chosen.offsetLeft - (styles.clientWidth - chosen.offsetWidth) / 2;
    };
    toggle.addEventListener('click', () => {
      setPainterly(!isPainterly());
      render();
    });
    for (const chip of chips) {
      chip.addEventListener('click', () => {
        setStyle(chip.dataset.id!);
        render();
      });
    }
    root.querySelector('.dock-shuffle')!.addEventListener('click', shuffle);
    render();
    const stop = follow([root.querySelector('.dock-name')!], [root.querySelector('.dock-shuffle')!]);
    return () => {
      stop();
      root.remove();
    };
  },
};

/* ---------------------------------------------------------------- Placard */

export const placard: Variant = {
  mount({ below }) {
    const root = html(`
      <div class="plac">
        <div class="plac-row">
          <h1 class="plac-name" aria-live="polite"></h1>
          <button type="button" class="plac-shuffle">${SHUFFLE_ICON}<span>Shuffle</span></button>
        </div>
        <div class="plac-rule" aria-hidden="true"></div>
        <div class="plac-row plac-row--style">
          <div class="seg" role="radiogroup" aria-label="Look">
            <span class="seg-thumb" aria-hidden="true"></span>
            <button type="button" role="radio" class="seg-item" data-on="false">Soft</button>
            <button type="button" role="radio" class="seg-item" data-on="true">Painterly</button>
          </div>
          <div class="plac-step">
            <button type="button" class="plac-arrow" data-dir="-1" aria-label="Previous style">‹</button>
            <div class="plac-style">
              <span class="plac-style-name"></span>
              <span class="plac-style-note"></span>
            </div>
            <button type="button" class="plac-arrow" data-dir="1" aria-label="Next style">›</button>
          </div>
        </div>
      </div>`);
    below.append(root);

    const seg = root.querySelector('.seg') as HTMLElement;
    const segItems = [...root.querySelectorAll<HTMLButtonElement>('.seg-item')];
    const step = root.querySelector('.plac-step') as HTMLElement;
    const styleName = root.querySelector('.plac-style-name') as HTMLElement;
    const styleNote = root.querySelector('.plac-style-note') as HTMLElement;
    const render = () => {
      const on = isPainterly();
      seg.dataset.value = String(on);
      for (const item of segItems) item.setAttribute('aria-checked', String(item.dataset.on === String(on)));
      step.toggleAttribute('data-open', on);
      step.inert = !on;
      const style = currentStyle();
      styleName.textContent = `After ${style.name}`;
      styleNote.textContent = style.note;
    };
    for (const item of segItems) {
      item.addEventListener('click', () => {
        setPainterly(item.dataset.on === 'true');
        render();
      });
    }
    for (const arrow of root.querySelectorAll<HTMLButtonElement>('.plac-arrow')) {
      arrow.addEventListener('click', () => {
        const at = Math.max(0, STYLES.findIndex((p) => p.id === currentStyle().id));
        const next = STYLES[(at + Number(arrow.dataset.dir) + STYLES.length) % STYLES.length];
        setStyle(next.id);
        // A quick crossfade on the name, so each step reads as a new style.
        const text = root.querySelector('.plac-style') as HTMLElement;
        text.classList.remove('is-new');
        void text.offsetWidth;
        text.classList.add('is-new');
        render();
      });
    }
    root.querySelector('.plac-shuffle')!.addEventListener('click', shuffle);
    render();
    const stop = follow([root.querySelector('.plac-name')!], [root.querySelector('.plac-shuffle')!]);
    return () => {
      stop();
      root.remove();
    };
  },
};

/* ---------------------------------------------------------------- Dial */

/** The dial's stops: no strokes first, then each painter, calmest to boldest. */
const STOPS = [{ id: 'off', name: 'No strokes' }, ...STYLES.map((p) => ({ id: p.id, name: p.name }))];

export const dial: Variant = {
  mount({ over, side }) {
    const name = html(`<h1 class="dial-name" aria-live="polite"></h1>`);
    const shuffleButton = html<HTMLButtonElement>(
      `<button type="button" class="dial-shuffle" aria-label="Shuffle ingredient">${SHUFFLE_ICON}</button>`,
    );
    const rail = html(`
      <div class="dial">
        <span class="dial-end">Calm</span>
        <div class="dial-track" role="slider" tabindex="0" aria-label="Painting style"
             aria-valuemin="0" aria-valuemax="${STOPS.length - 1}">
          <span class="dial-line" aria-hidden="true"></span>
          ${STOPS.map((s, i) => `<span class="dial-stop" data-i="${i}"><span class="dial-dot"></span><span class="dial-label">${s.name}</span></span>`).join('')}
          <span class="dial-knob" aria-hidden="true"></span>
        </div>
        <span class="dial-end">Bold</span>
      </div>`);
    over.append(name, shuffleButton);
    side.append(rail);

    const track = rail.querySelector('.dial-track') as HTMLElement;
    const knob = rail.querySelector('.dial-knob') as HTMLElement;
    const stops = [...rail.querySelectorAll<HTMLElement>('.dial-stop')];
    const indexNow = () => (isPainterly() ? Math.max(1, STOPS.findIndex((s) => s.id === currentStyle().id)) : 0);

    const render = () => {
      const i = indexNow();
      const dot = stops[i].querySelector('.dial-dot') as HTMLElement;
      // The knob sits on the chosen stop's dot (measured, so it works both upright and flat).
      const x = dot.offsetLeft + stops[i].offsetLeft + dot.offsetWidth / 2;
      const y = dot.offsetTop + stops[i].offsetTop + dot.offsetHeight / 2;
      knob.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      stops.forEach((s, j) => s.toggleAttribute('data-active', j === i));
      track.setAttribute('aria-valuenow', String(i));
      track.setAttribute('aria-valuetext', STOPS[i].name);
    };
    const choose = (i: number) => {
      i = Math.max(0, Math.min(STOPS.length - 1, i));
      if (i === indexNow()) return;
      if (i === 0) setPainterly(false);
      else setStyle(STOPS[i].id);
      render();
    };

    // Drag along the rail (or tap a stop): the nearest stop wins, so you can scrub through styles.
    const nearest = (event: PointerEvent) => {
      let best = 0;
      let bestDistance = Infinity;
      stops.forEach((s, i) => {
        const r = s.querySelector('.dial-dot')!.getBoundingClientRect();
        const d = Math.hypot(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2));
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      return best;
    };
    track.addEventListener('pointerdown', (event) => {
      track.setPointerCapture(event.pointerId);
      track.dataset.dragging = '';
      choose(nearest(event));
    });
    track.addEventListener('pointermove', (event) => {
      if (track.hasPointerCapture(event.pointerId)) choose(nearest(event));
    });
    const endDrag = () => delete track.dataset.dragging;
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('keydown', (event) => {
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      if (!forward && !back) return;
      event.preventDefault();
      event.stopPropagation(); // the picker's arrows stay on the picker
      choose(indexNow() + (forward ? 1 : -1));
    });

    // Each Shuffle spins the icon once round, so the press is felt.
    let turns = 0;
    shuffleButton.addEventListener('click', () => {
      if (shuffleButton.hasAttribute('data-busy')) return;
      turns += 1;
      shuffleButton.style.setProperty('--turn', `${turns * 360}deg`);
      shuffle();
    });

    const onResize = () => render();
    window.addEventListener('resize', onResize);
    render();
    const stop = follow([name], [shuffleButton]);
    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      name.remove();
      shuffleButton.remove();
      rail.remove();
    };
  },
};
