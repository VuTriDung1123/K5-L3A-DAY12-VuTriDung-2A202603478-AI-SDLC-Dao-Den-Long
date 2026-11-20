import type { GameTuning } from "./types.js";

export const TICK_RATE = 60;
export const FIXED_DT = 1 / TICK_RATE;

export const PLAYER_JUMP_VELOCITY = 7.0;
export const GRAVITY = 20.0;
export const PLAYER_ACCEL = 150.0;
export const FALL_VOID_Y = -10.0;
export const RESPAWN_WAIT_TICKS = 60;
export const PICKUP_HEIGHT_TOL = 1.5;

export const INITIAL_MOTE_COUNT = 20;
export const MAX_ACTIVE_MOTES = 30;
export const MOTE_SPAWN_INTERVAL_TICKS = 240;
export const DROPPED_MOTE_TTL_TICKS = 480;

export const SHADE_DEFAULT_Y = 0.8;
export const SHADE_SPAWN_DELAY_TICKS = 300;
export const SHADE_SPAWNING_STATE_TICKS = 20;
export const SHADE_DETECT_RADIUS = 12.0;
export const SHADE_LOSE_RADIUS = 18.0;
export const SHADE_DRAIN_RADIUS = 2.0;
export const SHADE_DRAIN_CHASE_RADIUS = 6.0;
export const SHADE_DRAIN_EVENT_TICKS = 60;
export const SHADE_RECOIL_DISTANCE = 2.0;
export const SHADE_RECOIL_TICKS = 60;
export const SHADE_SAFE_PUSH_MAX_TICKS = 30;

export const RELIGHT_SCORE = 40;
export const DRAIN_STUN_SCORE = 15;
export const DAWN_LIT_LANTERN_BASE_BONUS = 50;

export const PULSE_CENTER_HEIGHT = 0.8;
export const PULSE_PUSH_TICKS = 15;

export const DRIFTER_IDLE_SPEED = 2.0;
export const DRIFTER_CHASE_SPEED = 7.0;
export const DRIFTER_FLEE_SPEED = 7.0;
export const DRIFTER_DETECT_RADIUS = 15.0;
export const DRIFTER_STEAL_RADIUS = 1.2;
export const DRIFTER_MIN_CARRIED = 5;
export const DRIFTER_MAX_STEAL = 3;
export const DRIFTER_MAX_ACTIVE = 2;
export const DRIFTER_SPAWN_INTERVAL_TICKS = 1200;
export const DRIFTER_FLEE_TICKS = 240;
export const DRIFTER_DROP_FLEE_TICKS = 120;
export const DRIFTER_DEFAULT_Y = 1.4;

export const CHARM_SPEED = 7.2;
export const CHARM_DURATION_TICKS = 600;
export const CHARM_RESPAWN_TICKS = 2700;

export const WIND_CYCLE_TICKS = 1800;
export const WIND_WARN_TICKS = 120;
export const WIND_ACTIVE_TICKS = 300;
export const WIND_PUSH_SPEED = 2.0;

export const DEFAULT_TUNING: GameTuning = {
  player_speed: 6,
  dash_speed: 14,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  carry_capacity: 10,
  capacity_max: 20,
  lantern_cost: 10,
  relight_cost: 5,
  lantern_count_night1: 5,
  fuel_max: 100,
  fuel_decay_per_s: 1,
  fuel_per_mote: 10,
  low_fuel_threshold: 30,
  drain_per_s: 5,
  win_ratio: 0.6,
  pickup_radius: 1,
  interact_radius: 2,
  pulse_cost: 3,
  pulse_radius: 5,
  night1_duration_s: 240,
  night2_duration_s: 270,
  night3_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2,
  pulse_push_m: 4,
  pulse_cooldown_s: 3,
  safe_radius: 6,
  shade_speed: 4,
  shade_hit_radius: 1,
  fall_enabled: true,
  score: {
    per_mote: 5,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 0,
    per_flame_left: 50,
  },
};
