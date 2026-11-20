import { round3 } from "./prng.js";
import type { GameTuning, LanternState } from "./types.js";

export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;
export const ISLAND_RADIUS = 35;
export const LANTERN_RING_RADIUS = 20;
export const PLAYER_JUMP_VELOCITY = 7.2;
export const GRAVITY = 20;
export const SHADE_DEFAULT_Y = 0.8;

export const INITIAL_MOTE_COUNT = 12;
export const MIN_ACTIVE_MOTES = 10;
export const MAX_ACTIVE_MOTES = 14;
export const MOTE_RESPAWN_TICKS = 180;

export const INITIAL_SHADE_COUNT = 2;
export const MAX_ACTIVE_SHADES = 4;
export const SHADE_SPAWN_INTERVAL_TICKS = 1500;

export const DEFAULT_TUNING: GameTuning = {
  player_speed: 6,
  carry_capacity: 5,
  lantern_cost: 3,
  lantern_count_night1: 5,
  pickup_radius: 1.5,
  interact_radius: 2.5,
  pulse_cost: 1,
  pulse_radius: 6,
  night1_duration_s: 180,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3,
  pulse_push_m: 4.5,
  pulse_cooldown_s: 3,
  safe_radius: 5,
  shade_speed: 3.6,
  shade_hit_radius: 0.9,
  fall_enabled: false,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 25,
    per_second_left: 5,
    per_flame_left: 50,
  },
};

/** Generates the 5 default Great Lanterns evenly arranged around Dao Ben. */
export function createDefaultLanterns(count = DEFAULT_TUNING.lantern_count_night1): LanternState[] {
  const lanterns: LanternState[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i * Math.PI * 2) / count;
    const x = round3(Math.sin(angle) * LANTERN_RING_RADIUS);
    const z = round3(Math.cos(angle) * LANTERN_RING_RADIUS);
    lanterns.push({
      id: `L${i + 1}`,
      pos: [x, 0, z],
      lit: false,
      deposited: 0,
    });
  }
  return lanterns;
}
