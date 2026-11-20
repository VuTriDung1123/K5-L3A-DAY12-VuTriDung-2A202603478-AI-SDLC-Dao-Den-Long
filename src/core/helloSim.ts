export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HelloState {
  seed: number;
  step: number;
  time: number;
  angle: number;
  lanternPos: Vec3;
  glow: number;
}

/**
 * Deterministic 32-bit PRNG (Mulberry32).
 * Keeps headless runs reproducible across runs and platforms.
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

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Creates the initial deterministic Hello simulation state. */
export function createHelloState(seed = 42): HelloState {
  const rng = mulberry32(seed);
  const initialAngle = round4(rng() * Math.PI * 2);
  const radius = 2.5;
  return {
    seed: seed >>> 0,
    step: 0,
    time: 0,
    angle: initialAngle,
    lanternPos: {
      x: round4(Math.cos(initialAngle) * radius),
      y: 1.4,
      z: round4(Math.sin(initialAngle) * radius),
    },
    glow: 1,
  };
}

/** Advances the Hello simulation by one fixed timestep dt (seconds). */
export function stepHelloState(state: HelloState, dt = 0.1): HelloState {
  const nextStep = state.step + 1;
  const nextTime = round4(state.time + dt);
  const angularSpeed = 1.2;
  const nextAngle = round4((state.angle + angularSpeed * dt) % (Math.PI * 2));
  const radius = 2.5;

  return {
    seed: state.seed,
    step: nextStep,
    time: nextTime,
    angle: nextAngle,
    lanternPos: {
      x: round4(Math.cos(nextAngle) * radius),
      y: round4(1.4 + Math.sin(nextTime * 2) * 0.25),
      z: round4(Math.sin(nextAngle) * radius),
    },
    glow: round4(0.85 + 0.15 * Math.sin(nextTime * 3)),
  };
}

/** Runs N deterministic simulation steps from a seed and returns the final state. */
export function runHelloSimulation(seed = 42, steps = 5, dt = 0.1): HelloState {
  let current = createHelloState(seed);
  for (let i = 0; i < steps; i += 1) {
    current = stepHelloState(current, dt);
  }
  return current;
}
