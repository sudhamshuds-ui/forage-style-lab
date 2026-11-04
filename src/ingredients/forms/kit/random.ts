/**
 * Seeded randomness for forms.
 *
 * A form uses a little randomness (a lemon is never perfectly symmetric), but
 * it must look the same on every reload. So the dice are "seeded": the same
 * seed always rolls the same numbers, like a saved random seed in a particle
 * system. Each ingredient's seed comes from its id.
 */

/** Turn a word (the ingredient id) into a seed number. Same word, same seed. */
export function seedFromId(id: string): number {
  // FNV-1a: a tiny, well-known string hash.
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A random number generator (0 to 1) that always gives the same numbers for the same seed. */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number between -1 and 1, handy for "a little this way or that". */
export function signed(random: () => number): number {
  return random() * 2 - 1;
}
