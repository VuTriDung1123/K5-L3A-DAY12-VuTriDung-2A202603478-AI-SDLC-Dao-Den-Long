export type Vec3 = [number, number, number];
export type NightNumber = 1 | 2 | 3;

export interface ScoreTuning {
  per_mote: number;
  per_lantern: number;
  per_stun: number;
  per_second_left: number;
  per_flame_left: number;
}

export interface GameTuning {
  player_speed: number;
  dash_speed: number;
  dash_duration_s: number;
  dash_cooldown_s: number;
  carry_capacity: number;
  capacity_max: number;
  lantern_cost: number;
  relight_cost: number;
  lantern_count_night1: number;
  fuel_max: number;
  fuel_decay_per_s: number;
  fuel_per_mote: number;
  low_fuel_threshold: number;
  drain_per_s: number;
  win_ratio: number;
  pickup_radius: number;
  interact_radius: number;
  pulse_cost: number;
  pulse_radius: number;
  night1_duration_s: number;
  night2_duration_s: number;
  night3_duration_s: number;
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

export type PlayState = "playing" | "paused" | "won" | "lost";
export type GameOverReason = "dawn_survived" | "dawn" | "no_flames";
export type ShadeBehaviorState = "spawning" | "wander" | "chase" | "recoil" | "stunned" | "drain";
export type DrifterBehaviorState = "idle" | "chase" | "flee" | "removed";
export type MoteKind = "random" | "dropped";

export interface PlayerState {
  pos: Vec3;
  vel: Vec3;
  grounded: boolean;
  facingYawRad: number;
  flames: number;
  carried: number;
  capacity: number;
  successful_lights: number;
  invulnTicks: number;
  dashTicks: number;
  dashDir: [number, number];
  dashCdTicks: number;
  pulseCdTicks: number;
  charmTicks: number;
  jumpPadAirborne: boolean;
  respawnTicks: number;
  fallTriggered: boolean;
}

export interface LanternState {
  id: string;
  pos: Vec3;
  lit: boolean;
  deposited: number;
  /** Exact fuel in integer units of 1/60 (6000 = 100.0 fuel). */
  fuelTicks: number;
  ever_lit: boolean;
  relit_count: number;
}

export interface ShadeState {
  id: string;
  pos: Vec3;
  state: ShadeBehaviorState;
  stateTicksLeft: number;
  pushDir: [number, number];
  pushTicksLeft: number;
  recoilDir: [number, number];
  safePushTicks: number;
  wanderAngle: number;
  targetLanternId: string | null;
  drainTicks: number;
  spawnTick: number;
}

export interface MoteState {
  id: string;
  pos: Vec3;
  kind: MoteKind;
  ttlTicks: number | null;
  spawnTick: number;
}

export interface DrifterState {
  id: string;
  pos: Vec3;
  state: DrifterBehaviorState;
  stolen: number;
  hasStolen: boolean;
  fleeTicks: number;
  patrolAngle: number;
  spawnTick: number;
}

export interface CharmState {
  id: string;
  pos: Vec3;
  available: boolean;
  respawnTicks: number;
}

export interface WindState {
  active: boolean;
  warning: boolean;
  dirDeg: number;
}

export interface FrameInput {
  tick: number;
  move?: [number, number];
  cam_yaw_deg?: number;
  jump?: boolean;
  interact?: boolean;
  pulse?: boolean;
  dash?: boolean;
  pause?: boolean;
}

export interface ActiveInputState {
  move: [number, number];
  cam_yaw_deg: number;
  jump: boolean;
  interact: boolean;
  pulse: boolean;
  dash: boolean;
  pause: boolean;
}

export interface InputsConfig {
  frames: FrameInput[];
}

export interface ScenarioLanternOverride {
  id: string;
  pos?: Vec3;
  deposited?: number;
  lit?: boolean;
  fuel?: number;
  ever_lit?: boolean;
}

export interface ScenarioShadeOverride {
  id?: string;
  pos: Vec3;
  state?: ShadeBehaviorState;
  state_ticks_left?: number;
  target_lantern_id?: string;
}

export interface ScenarioDrifterOverride {
  id?: string;
  pos: Vec3;
  state?: DrifterBehaviorState;
  stolen?: number;
}

export interface ScenarioCharmOverride {
  id?: string;
  pos?: Vec3;
  available?: boolean;
  respawn_s?: number;
}

export type ScenarioMoteOverride =
  | Vec3
  | { id?: string; pos: Vec3; kind?: MoteKind; ttl_s?: number | null };

export interface ScenarioConfig {
  player?: {
    pos?: Vec3;
    carried?: number;
    flames?: number;
    successful_lights?: number;
    invuln_ticks?: number;
    dash_cd_ticks?: number;
    pulse_cd_ticks?: number;
    charm_ticks?: number;
  };
  random_motes?: boolean;
  random_shades?: boolean;
  random_drifters?: boolean;
  wind_enabled?: boolean;
  motes?: ScenarioMoteOverride[];
  shades?: ScenarioShadeOverride[];
  drifters?: ScenarioDrifterOverride[];
  charms?: ScenarioCharmOverride[];
  lanterns?: ScenarioLanternOverride[];
  time_left_s?: number;
}

export interface ScoreBreakdown {
  motesUsed: number;
  firstLights: number;
  relights: number;
  stuns: number;
  dawnLanternBonus: number;
  flameBonus: number;
}

export interface JsonlSnapshot {
  type: "snapshot";
  tick: number;
  sim_tick: number;
  night: NightNumber;
  state: PlayState;
  time_left_s: number;
  score: number;
  wind: {
    active: boolean;
    dir_deg: number;
  };
  player: {
    pos: Vec3;
    vel: Vec3;
    grounded: boolean;
    flames: number;
    carried: number;
    capacity: number;
    invuln: boolean;
    dash_cd_s: number;
    pulse_cd_s: number;
    charm_s: number;
  };
  lanterns: Array<{
    id: string;
    pos: Vec3;
    lit: boolean;
    deposited: number;
    fuel: number;
    ever_lit: boolean;
    relit_count: number;
  }>;
  shades: Array<{
    id: string;
    pos: Vec3;
    state: ShadeBehaviorState;
  }>;
  motes: Array<{
    id: string;
    pos: Vec3;
    kind: MoteKind;
    ttl_s: number | null;
  }>;
  motes_active: number;
  drifters: Array<{
    id: string;
    pos: Vec3;
    state: DrifterBehaviorState;
    stolen: number;
  }>;
  charms: Array<{
    id: string;
    available: boolean;
    respawn_s: number;
  }>;
}

export interface JsonlEvent {
  type: "event";
  tick: number;
  name:
    | "night_start"
    | "mote_picked"
    | "deposit"
    | "refuel"
    | "lantern_lit"
    | "lantern_out"
    | "fuel_drain"
    | "pulse"
    | "dash"
    | "charm_picked"
    | "drifter_steal"
    | "drifter_drop"
    | "player_hit"
    | "shade_spawned"
    | "paused"
    | "resumed"
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
