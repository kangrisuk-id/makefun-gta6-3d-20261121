// A tiny seeded random number generator (mulberry32): the same seed always builds the same
// Palmera Bay, so screenshot scenes and play-tests are reproducible.
export function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Random integer in [min, max]. */
export function intRange(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One random element of an array. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
