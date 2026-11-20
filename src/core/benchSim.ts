import { DEFAULT_TUNING, FIXED_DT, SHADE_DEFAULT_Y } from "./config.js";
import { getNightMapConfig, type NightMapConfig } from "./maps.js";
import { distXZ, mulberry32, round3 } from "./prng.js";
import type { LanternState, Vec3 } from "./types.js";

export interface BenchShade {
  id: string;
  pos: Vec3;
  wanderAngle: number;
  targetLanternId: string | null;
}

export interface BenchMote {
  id: string;
  pos: Vec3;
}

export interface BenchMetrics {
  contract_version: "1.3";
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
  frames: number;
  load_ms: number;
  peak_mem_mb: number | null;
  vsync_off: boolean;
  renderer: string;
  os: string;
}

export const BENCH_SHADE_COUNT = 200;
export const BENCH_MOTE_COUNT = 100;
export const BENCH_CAMERA_RADIUS = 30;
export const BENCH_CAMERA_Y = 15;
export const BENCH_CAMERA_PERIOD_S = 15;
export const BENCH_WARMUP_S = 3;

/**
 * Pure deterministic simulation for the standardized Ticket-04 Benchmark Scene:
 * - Night 1 (Dao Ben, radius 40m)
 * - L1, L2, L3 lit with fuel = 100 (no decay), L4, L5 unlit
 * - Exactly 200 Shades in wander state moving by normal wander rules
 * - Exactly 100 Motes spread across the island
 * - May idle at (0,0,0), no spawning, no damage, no pickup, no end condition
 */
export class BenchSimulation {
  readonly seed: number;
  readonly map: NightMapConfig;
  readonly lanterns: LanternState[];
  readonly shades: BenchShade[] = [];
  readonly motes: BenchMote[] = [];
  readonly playerPos: Vec3 = [0, 0, 0];

  constructor(seed = 42) {
    this.seed = seed >>> 0;
    const rng = mulberry32(this.seed);
    this.map = getNightMapConfig(1);

    this.lanterns = this.map.lanterns.map((l, idx) => ({
      ...l,
      pos: [...l.pos],
      lit: idx < 3, // L1, L2, L3 lit with fuel 100
      ever_lit: idx < 3,
      deposited: idx < 3 ? DEFAULT_TUNING.lantern_cost : 0,
      fuelTicks: idx < 3 ? DEFAULT_TUNING.fuel_max * 60 : 0,
    }));

    // Distribute 100 motes across the island (radius 4..38m)
    for (let i = 0; i < BENCH_MOTE_COUNT; i += 1) {
      const angle = rng() * Math.PI * 2;
      const r = 4 + Math.sqrt(rng()) * 34;
      this.motes.push({
        id: `BM${i + 1}`,
        pos: [round3(Math.cos(angle) * r), 0, round3(Math.sin(angle) * r)],
      });
    }

    // Distribute 200 Shades across the island outside L1-L3 safe zones (radius 6m)
    for (let i = 0; i < BENCH_SHADE_COUNT; i += 1) {
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const angle = rng() * Math.PI * 2;
        const r = 3 + Math.sqrt(rng()) * 35;
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
        const insideSafe = this.lanterns.some(
          (l) => l.lit && Math.hypot(x - l.pos[0], z - l.pos[2]) <= DEFAULT_TUNING.safe_radius + 0.5
        );
        if (!insideSafe) break;
      }
      this.shades.push({
        id: `BS${i + 1}`,
        pos: [x, SHADE_DEFAULT_Y, z],
        wanderAngle: rng() * Math.PI * 2,
        targetLanternId: null,
      });
    }
  }

  /** Steps all 200 wandering shades by 1/60s using standard Night 1 wander rules (toward nearest unlit lantern, blocked at 6m safe zones). */
  step(): void {
    const moveStep = this.map.shadeSpeed * FIXED_DT;
    const unlitLanterns = this.lanterns.filter((l) => !l.lit);
    const litLanterns = this.lanterns.filter((l) => l.lit);
    const safeR = DEFAULT_TUNING.safe_radius;

    for (let i = 0; i < this.shades.length; i += 1) {
      const shade = this.shades[i];
      // Pick nearest unlit lantern (same wander rule as Ticket-03 when no weak lit lantern exists)
      let target = unlitLanterns[0];
      let bestDist = Infinity;
      for (let j = 0; j < unlitLanterns.length; j += 1) {
        const d = distXZ(shade.pos, unlitLanterns[j].pos);
        if (d < bestDist - 1e-6) {
          bestDist = d;
          target = unlitLanterns[j];
        }
      }

      if (target) {
        const dx = target.pos[0] - shade.pos[0];
        const dz = target.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 1.5) {
          const step = Math.min(moveStep, dist);
          shade.pos[0] += (dx / dist) * step;
          shade.pos[2] += (dz / dist) * step;
        } else {
          // Orbit gently around unlit lantern so all 200 shades remain visibly active
          shade.wanderAngle += 0.9 * FIXED_DT;
          shade.pos[0] = target.pos[0] + Math.cos(shade.wanderAngle) * 2.5;
          shade.pos[2] = target.pos[2] + Math.sin(shade.wanderAngle) * 2.5;
        }
      }

      // Clamp outside lit safe zones (6m)
      for (let k = 0; k < litLanterns.length; k += 1) {
        const l = litLanterns[k];
        const dx = shade.pos[0] - l.pos[0];
        const dz = shade.pos[2] - l.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist <= safeR + 0.002) {
          const dirX = dist > 1e-6 ? dx / dist : 1;
          const dirZ = dist > 1e-6 ? dz / dist : 0;
          shade.pos[0] = l.pos[0] + dirX * (safeR + 0.02);
          shade.pos[2] = l.pos[2] + dirZ * (safeR + 0.02);
        }
      }
    }
  }
}

/** Computes exact Ticket-04 camera orbit position (CCW from above, r=30, Y=15, 0 deg=(30,15,0), 15s/rev). */
export function getBenchCameraPosition(elapsedSec: number): Vec3 {
  const angle = (elapsedSec / BENCH_CAMERA_PERIOD_S) * Math.PI * 2;
  return [
    BENCH_CAMERA_RADIUS * Math.cos(angle),
    BENCH_CAMERA_Y,
    BENCH_CAMERA_RADIUS * Math.sin(angle),
  ];
}

/** Computes exact Ticket-04 benchmark FPS and frame-time statistics from raw frame deltas (ms). */
export function computeBenchStats(frameDtsMs: number[]): {
  frames: number;
  avg_fps: number;
  p1_low_fps: number;
  frame_ms_p95: number;
} {
  const n = frameDtsMs.length;
  if (n === 0) {
    return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  }
  const sum = frameDtsMs.reduce((acc, v) => acc + v, 0);
  const avgFps = (1000 * n) / Math.max(0.001, sum);

  const sorted = [...frameDtsMs].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * n));
  let topKSum = 0;
  for (let i = n - k; i < n; i += 1) {
    topKSum += sorted[i];
  }
  const p1LowFps = 1000 / Math.max(0.001, topKSum / k);

  const p95Index = Math.min(n - 1, Math.max(0, Math.ceil(0.95 * n) - 1));
  const frameMsP95 = sorted[p95Index];

  return {
    frames: n,
    avg_fps: Math.round(avgFps * 10) / 10,
    p1_low_fps: Math.round(p1LowFps * 10) / 10,
    frame_ms_p95: Math.round(frameMsP95 * 100) / 100,
  };
}
