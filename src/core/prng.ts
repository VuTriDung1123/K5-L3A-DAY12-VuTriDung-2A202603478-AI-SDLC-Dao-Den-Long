/**
 * Deterministic 32-bit PRNG (Mulberry32).
 * Produces reproducible floats in [0, 1) across runs and platforms.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounds to 1 decimal place and normalizes -0 to 0 (used for lantern fuel). */
export function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

/** Rounds to 3 decimal places and normalizes -0 to 0. */
export function round3(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

export const BOUNDARY_EPS = 1e-6;

/** Computes horizontal XZ Euclidean distance between two 3D points. */
export function distXZ(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/** Computes full 3D Euclidean distance between two 3D points. */
export function dist3D(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Checks whether horizontal XZ distance is <= radius (with float-drift epsilon). */
export function withinRadiusXZ(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  radius: number
): boolean {
  return distXZ(a, b) <= radius + BOUNDARY_EPS;
}

/** Checks whether 3D Euclidean distance is <= radius (with float-drift epsilon). */
export function withinRadius3D(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  radius: number
): boolean {
  return dist3D(a, b) <= radius + BOUNDARY_EPS;
}
