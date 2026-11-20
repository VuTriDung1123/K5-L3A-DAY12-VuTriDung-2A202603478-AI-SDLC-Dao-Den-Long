export interface Vec3Tuple extends Array<number> {
  0: number;
  1: number;
  2: number;
  length: 3;
}

export type Vec3 = [number, number, number];

export interface ScoreTuning {
  per_mote: number;
  per_lantern: number;
  per_stun: number;
  per_second_left: number;
  per_flame_left: number;
}

export interface GameTuning {
  player_speed: number;
  carry_capacity: number;
  lantern_cost: number;
  lantern_count_night1: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  flames: number;
  invuln_s: number;
  hit_drop_ratio: number;
  pulse_stun_s: number;
  pulse_push_m: number;
  pulse_cooldown_s: number;
  safe_radius: number;
  shade_speed: number;
  shade_hit_radius: number;
  fall_enabled: boolean;
  score: ScoreTuning;
}

export type PlayState = "playing" | "won" | "lost";
export type GameOverReason = "all_lit" | "dawn" | "no_flames";
export type ShadeBehaviorState = "chase" | "stunned";

export interface PlayerState {
  pos: Vec3;
  vy: number;
  facingYawRad: number;
  flames: number;
  carried: number;
}

export interface LanternState {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
}

export interface ShadeState {
  id: string;
  pos: Vec3;
  state: ShadeBehaviorState;
  stunTicks: number;
}

export interface MoteState {
  id: string;
  pos: Vec3;
}

export interface FrameInput {
  tick: number;
  move?: [number, number];
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
  dash?: boolean;
}

export interface ActiveInputState {
  move: [number, number];
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
}

export interface InputsConfig {
  frames: FrameInput[];
}

export interface ScenarioLanternOverride {
  id: string;
  pos?: Vec3;
  deposited?: number;
  lit?: boolean;
}

export interface ScenarioShadeOverride {
  id?: string;
  pos: Vec3;
  state?: ShadeBehaviorState;
}

export type ScenarioMoteOverride = Vec3 | { id?: string; pos: Vec3 };

export interface ScenarioConfig {
  player?: {
    pos?: Vec3;
    carried?: number;
    flames?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  motes?: ScenarioMoteOverride[];
  shades?: ScenarioShadeOverride[];
  lanterns?: ScenarioLanternOverride[];
  time_left_s?: number;
}

export interface ScoreBreakdown {
  motes: number;
  lanterns: number;
  stuns: number;
  timeBonus: number;
  flameBonus: number;
}

export interface JsonlSnapshot {
  type: "snapshot";
  tick: number;
  sim_tick: number;
  state: PlayState;
  time_left_s: number;
  score: number;
  player: {
    pos: Vec3;
    flames: number;
    carried: number;
  };
  lanterns: Array<{
    id: string;
    pos: Vec3;
    lit: boolean;
    deposited: number;
  }>;
  shades: Array<{
    id: string;
    pos: Vec3;
    state: ShadeBehaviorState;
  }>;
  motes: Array<{
    id: string;
    pos: Vec3;
  }>;
  motes_active: number;
}

export interface JsonlEvent {
  type: "event";
  tick: number;
  name:
    | "mote_picked"
    | "deposit"
    | "lantern_lit"
    | "pulse"
    | "player_hit"
    | "shade_spawned"
    | "game_over";
  data: Record<string, unknown>;
}

export interface JsonlEnd {
  type: "end";
  ticks: number;
  state: PlayState;
  score: number;
}

export type JsonlLine = JsonlSnapshot | JsonlEvent | JsonlEnd;
