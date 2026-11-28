import type { BufferGeometry } from 'three';

/**
 * Building in slices (R10, the Cook lag). A dish's meshes take a few seconds to build, and built in
 * one go they froze the page, so the painted transition could not play over the wait. The heavy
 * kernels (surface nets, smoothing a mesh onto its surface) are written as steps, and a build can be
 * run against a deadline: when the time is up, the kernel stops where it is and the build is set
 * aside (`SUSPEND` is thrown); the next frame the build is run again from its start, every kernel
 * it already finished hands back its result at once, and the unfinished one carries on from where
 * it stopped. Outside such a run everything builds in one go, exactly as before.
 *
 * A build run again must ask for the same things in the same order: the composer feeds it the
 * same random numbers again (`replaying`).
 */
export const SUSPEND = Symbol('suspend');

interface Run {
  deadline: number;
  /** The kernel calls so far in this attempt. */
  index: number;
  finished: Map<number, unknown>;
  running: Map<number, Generator<void, unknown>>;
  /** Steps taken this attempt (each attempt moves at least one step on). */
  stepped: boolean;
}

let run: Run | null = null;

export function drain<T>(steps: Generator<unknown, T>): T {
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
}

/** One kernel call: run in one go, or as far as the deadline allows inside a sliced build. */
export function kernel<T, R>(start: () => Generator<void, T>, adopt: (result: T) => R): R {
  if (!run) return adopt(drain(start()));
  const key = run.index++;
  if (run.finished.has(key)) return adopt(run.finished.get(key) as T);
  let steps = run.running.get(key) as Generator<void, T> | undefined;
  if (!steps) run.running.set(key, (steps = start()));
  for (;;) {
    if (run.stepped && performance.now() > run.deadline) throw SUSPEND;
    const next = steps.next();
    run.stepped = true;
    if (next.done) {
      run.running.delete(key);
      run.finished.set(key, next.value);
      return adopt(next.value);
    }
  }
}

/** Geometry kernels hand back a fresh copy each attempt (the caller moves and bends what it gets). */
export const copyOf = (geometry: BufferGeometry): BufferGeometry => geometry.clone();

/**
 * Run `build` in slices: as much as fits before each deadline, then a pause (a yield) for the
 * next frame. Returns what `build` returns. `random` numbers are replayed on every attempt, so it
 * asks for the same things each time.
 */
export function* sliced<T>(build: (random: () => number) => T, random: () => number, budgetMs: () => number): Generator<void, T> {
  const drawn: number[] = [];
  const state: Run = { deadline: 0, index: 0, finished: new Map(), running: new Map(), stepped: false };
  for (;;) {
    let at = 0;
    const replaying = () => (at < drawn.length ? drawn[at++] : (drawn.push(random()), drawn[at++]));
    const outer = run;
    state.index = 0;
    state.stepped = false;
    state.deadline = performance.now() + budgetMs();
    run = state;
    try {
      return build(replaying);
    } catch (error) {
      if (error !== SUSPEND) throw error;
    } finally {
      run = outer;
    }
    yield;
  }
}
