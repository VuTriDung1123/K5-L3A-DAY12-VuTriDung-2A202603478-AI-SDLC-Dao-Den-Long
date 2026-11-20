import {
  CHARM_DURATION_TICKS,
  CHARM_RESPAWN_TICKS,
  CHARM_SPEED,
  DEFAULT_TUNING,
  DRIFTER_CHASE_SPEED,
  DRIFTER_DEFAULT_Y,
  DRIFTER_DETECT_RADIUS,
  DRIFTER_DROP_FLEE_TICKS,
  DRIFTER_FLEE_SPEED,
  DRIFTER_FLEE_TICKS,
  DRIFTER_IDLE_SPEED,
  DRIFTER_MAX_ACTIVE,
  DRIFTER_MAX_STEAL,
  DRIFTER_MIN_CARRIED,
  DRIFTER_SPAWN_INTERVAL_TICKS,
  DRIFTER_STEAL_RADIUS,
  DROPPED_MOTE_TTL_TICKS,
  FALL_VOID_Y,
  FIXED_DT,
  GRAVITY,
  INITIAL_MOTE_COUNT,
  MAX_ACTIVE_MOTES,
  MOTE_SPAWN_INTERVAL_TICKS,
  PICKUP_HEIGHT_TOL,
  PLAYER_ACCEL,
  PLAYER_JUMP_VELOCITY,
  PULSE_CENTER_HEIGHT,
  PULSE_PUSH_TICKS,
  RESPAWN_WAIT_TICKS,
  SHADE_DEFAULT_Y,
  SHADE_DETECT_RADIUS,
  SHADE_LOSE_RADIUS,
  SHADE_RECOIL_DISTANCE,
  SHADE_RECOIL_TICKS,
  SHADE_SAFE_PUSH_MAX_TICKS,
  SHADE_SPAWN_DELAY_TICKS,
  SHADE_SPAWNING_STATE_TICKS,
  SHADE_WANDER_SPEED,
  TICK_RATE,
  WIND_ACTIVE_TICKS,
  WIND_CYCLE_TICKS,
  WIND_PUSH_SPEED,
  WIND_WARN_TICKS,
} from "./config.js";
import {
  getNightMapConfig,
  getSupportGroundY,
  isBlockedByObstacle,
  resolvePlayerHorizontalMove,
  type NightMapConfig,
} from "./maps.js";
import { dist3D, distXZ, mulberry32, round3, withinRadius3D, withinRadiusXZ } from "./prng.js";
import type {
  ActiveInputState,
  CharmState,
  DrifterState,
  GameOverReason,
  GameTuning,
  JsonlEvent,
  JsonlSnapshot,
  LanternState,
  MoteState,
  NightNumber,
  PlayerState,
  PlayState,
  ScenarioConfig,
  ScoreBreakdown,
  ShadeState,
  Vec3,
  WindState,
} from "./types.js";

export interface SimulationOptions {
  seed: number;
  night?: NightNumber;
  scenario?: ScenarioConfig;
  tuning?: GameTuning;
}

/**
 * Pure deterministic simulation for Dao Den Long across Nights 1, 2, and 3.
 * Executes the exact 12-step tick pipeline of Test Contract v1.1.
 */
export class GameSimulation {
  readonly seed: number;
  readonly night: NightNumber;
  readonly tuning: GameTuning;
  readonly map: NightMapConfig;

  private readonly rng: () => number;
  private readonly randomMotesEnabled: boolean;
  private readonly randomShadesEnabled: boolean;
  private readonly randomDriftersEnabled: boolean;
  private readonly windEnabled: boolean;
  private readonly initialTimeLeftS: number;

  state: PlayState = "playing";
  paused = false;
  gameOverReason: GameOverReason | null = null;
  outerTick = 0;
  simTick = 0;
  score = 0;
  scoreBreakdown: ScoreBreakdown = {
    motesDeposited: 0,
    lanterns: 0,
    stuns: 0,
    timeBonus: 0,
    flameBonus: 0,
  };

  player: PlayerState;
  lanterns: LanternState[];
  shades: ShadeState[] = [];
  motes: MoteState[] = [];
  drifters: DrifterState[] = [];
  charms: CharmState[] = [];
  wind: WindState = { active: false, warning: false, dirDeg: 0 };

  lastPulseTick = -1000;
  lastShadeSpawnTick = -1000;
  lastCountdownSecond = -1;

  private moteSeq = 1;
  private shadeSeq = 1;
  private drifterSeq = 1;
  private nightStartEmitted = false;
  private prevButtons = { jump: false, interact: false, pulse: false, dash: false, pause: false };

  constructor(options: SimulationOptions) {
    this.seed = options.seed >>> 0;
    this.night = options.night ?? 1;
    this.tuning = options.tuning ?? DEFAULT_TUNING;
    this.map = getNightMapConfig(this.night);
    this.rng = mulberry32(this.seed);

    const scenario = options.scenario;
    this.randomMotesEnabled = scenario?.random_motes ?? true;
    this.randomShadesEnabled = scenario?.random_shades ?? true;
    this.randomDriftersEnabled = scenario?.random_drifters ?? this.map.driftersEnabled;
    this.windEnabled = scenario?.wind_enabled ?? this.map.windEnabled;
    this.initialTimeLeftS = scenario?.time_left_s ?? this.map.durationS;

    this.player = {
      pos: scenario?.player?.pos ? [...scenario.player.pos] : [0, 0, 0],
      vel: [0, 0, 0],
      grounded: (scenario?.player?.pos?.[1] ?? 0) <= 0.001,
      facingYawRad: 0,
      flames: scenario?.player?.flames ?? this.tuning.flames,
      carried: scenario?.player?.carried ?? 0,
      invulnTicks: scenario?.player?.invuln_ticks ?? 0,
      dashTicks: 0,
      dashDir: [0, 1],
      dashCdTicks: scenario?.player?.dash_cd_ticks ?? 0,
      pulseCdTicks: scenario?.player?.pulse_cd_ticks ?? 0,
      charmTicks: scenario?.player?.charm_ticks ?? 0,
      jumpPadAirborne: false,
      respawnTicks: 0,
      fallTriggered: false,
    };

    const startGround = getSupportGroundY(
      this.night,
      this.player.pos[0],
      this.player.pos[2],
      this.player.pos[1]
    );
    this.player.grounded = startGround !== null && Math.abs(this.player.pos[1] - startGround) <= 0.05;

    this.lanterns = this.map.lanterns.map((l) => ({ ...l, pos: [...l.pos] }));
    if (scenario?.lanterns) {
      this.applyScenarioLanterns(scenario.lanterns);
    }

    if (scenario?.motes) {
      this.applyScenarioMotes(scenario.motes);
    } else if (this.randomMotesEnabled) {
      this.spawnInitialMotes();
    }

    if (scenario?.shades) {
      this.applyScenarioShades(scenario.shades);
    }

    if (scenario?.drifters) {
      this.applyScenarioDrifters(scenario.drifters);
    }

    if (scenario?.charms) {
      this.applyScenarioCharms(scenario.charms);
    } else {
      this.charms = this.map.charms.map((c) => ({
        id: c.id,
        pos: [...c.pos],
        available: true,
        respawnTicks: 0,
      }));
    }
  }

  get rawTimeLeftS(): number {
    return Math.max(0, this.initialTimeLeftS - this.simTick / TICK_RATE);
  }

  get timeLeftS(): number {
    return round3(this.rawTimeLeftS);
  }

  isFinished(): boolean {
    return this.state === "won" || this.state === "lost";
  }

  /** Builds a Test Contract v1.1 JSONL snapshot at the given outer tick. */
  toSnapshot(tick = this.outerTick): JsonlSnapshot {
    return {
      type: "snapshot",
      tick,
      sim_tick: this.simTick,
      night: this.night,
      state: this.state,
      time_left_s: this.timeLeftS,
      score: this.score,
      wind: {
        active: this.wind.active,
        dir_deg: round3(this.wind.dirDeg),
      },
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        vel: [round3(this.player.vel[0]), round3(this.player.vel[1]), round3(this.player.vel[2])],
        grounded: this.player.grounded,
        flames: this.player.flames,
        carried: this.player.carried,
        invuln: this.player.invulnTicks > 0,
        dash_cd_s: round3(this.player.dashCdTicks / TICK_RATE),
        pulse_cd_s: round3(this.player.pulseCdTicks / TICK_RATE),
        charm_s: round3(this.player.charmTicks / TICK_RATE),
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state,
      })),
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: [round3(m.pos[0]), round3(m.pos[1]), round3(m.pos[2])],
        kind: m.kind,
        ttl_s: m.ttlTicks === null ? null : round3(m.ttlTicks / TICK_RATE),
      })),
      motes_active: this.motes.length,
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: [round3(d.pos[0]), round3(d.pos[1]), round3(d.pos[2])],
        state: d.state,
        stolen: d.stolen,
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawnTicks / TICK_RATE),
      })),
    };
  }

  /** Executes one 1/60s tick following the mandatory 12-step order of Ticket-02. */
  step(input: ActiveInputState): JsonlEvent[] {
    if (this.state === "won" || this.state === "lost") {
      return [];
    }

    const events: JsonlEvent[] = [];
    this.outerTick += 1;
    const tick = this.outerTick;

    // 1. Read input (process pause first; if just paused, stop step immediately)
    const pauseTriggered = input.pause && !this.prevButtons.pause;
    const jumpTriggered = input.jump && !this.prevButtons.jump;
    const interactTriggered = input.interact && !this.prevButtons.interact;
    const pulseTriggered = input.pulse && !this.prevButtons.pulse;
    const dashTriggered = input.dash && !this.prevButtons.dash;

    this.prevButtons = {
      jump: input.jump,
      interact: input.interact,
      pulse: input.pulse,
      dash: input.dash,
      pause: input.pause,
    };

    if (pauseTriggered) {
      if (!this.paused) {
        this.paused = true;
        this.state = "paused";
        events.push({ type: "event", tick, name: "paused", data: {} });
        return events;
      }
      this.paused = false;
      this.state = "playing";
      events.push({ type: "event", tick, name: "resumed", data: {} });
    } else if (this.paused) {
      return events;
    }

    if (!this.nightStartEmitted) {
      this.nightStartEmitted = true;
      events.push({ type: "event", tick, name: "night_start", data: { night: this.night } });
    }

    // 2. Advance simTick and decrement all timers / cooldowns / TTLs
    this.simTick += 1;
    this.updateWindState();
    this.decrementTimers();

    // 3. Move May (jump, dash, jump pad, wind) and check falling off island
    this.updatePlayerMovement(input, jumpTriggered, dashTriggered, tick, events);

    // 4. Pick up motes and charms (only interactable if spawned before current simTick)
    this.collectMotesAndCharms(tick, events);

    // 5. Interact with nearest unlit lantern
    if (interactTriggered) {
      this.tryDepositToNearestLantern(tick, events);
    }

    // 6. Update safe zones around lit lanterns
    this.updateSafeZones();

    // 7. Light Pulse (Toa Sang)
    if (pulseTriggered) {
      this.tryCastPulse(tick, events);
    }

    // 8. Move Shades and Drifters (Gio Lac)
    this.moveShades();
    this.moveDrifters();

    // 9. Touch collisions: Drifters steal first, then Shades hit sorted by id ascending
    this.handleTouchCollisions(tick, events);

    // 10. Scheduled spawns (motes, shades, drifters — interactable starting next tick)
    this.handleScheduledSpawns(tick, events);

    // 11. Check win / loss
    this.evaluateWinLoss(tick, events);

    return events;
  }

  /** Finds closest unlit lantern within interact_radius (and matching vertical reach). */
  findInteractableLantern(): LanternState | null {
    const sorted = [...this.lanterns].sort((a, b) => a.id.localeCompare(b.id));
    let best: LanternState | null = null;
    let bestDist = Infinity;
    for (const lantern of sorted) {
      if (lantern.lit) continue;
      if (Math.abs(this.player.pos[1] - lantern.pos[1]) > 2.0) continue;
      const d = distXZ(this.player.pos, lantern.pos);
      if (withinRadiusXZ(this.player.pos, lantern.pos, this.tuning.interact_radius) && d < bestDist - 1e-6) {
        best = lantern;
        bestDist = d;
      }
    }
    return best;
  }

  private applyScenarioLanterns(overrides: NonNullable<ScenarioConfig["lanterns"]>): void {
    const byId = new Map(this.lanterns.map((l) => [l.id, l]));
    for (const ov of overrides) {
      const target = byId.get(ov.id);
      if (!target) continue;
      if (ov.pos) target.pos = [...ov.pos];
      if (ov.deposited !== undefined) target.deposited = ov.deposited;
      if (ov.lit !== undefined) {
        target.lit = ov.lit;
        if (ov.lit && ov.deposited === undefined) {
          target.deposited = Math.max(target.deposited, this.tuning.lantern_cost);
        }
      } else if (target.deposited >= this.tuning.lantern_cost) {
        target.lit = true;
      }
    }
  }

  private applyScenarioMotes(overrides: NonNullable<ScenarioConfig["motes"]>): void {
    const usedIds = new Set<string>();
    for (const entry of overrides) {
      if (!Array.isArray(entry) && entry.id) usedIds.add(entry.id);
    }
    for (const entry of overrides) {
      const pos: Vec3 = Array.isArray(entry) ? [...entry] : [...entry.pos];
      const id = !Array.isArray(entry) && entry.id ? entry.id : this.allocateMoteId(usedIds);
      const kind = !Array.isArray(entry) && entry.kind ? entry.kind : "random";
      const ttlTicks =
        !Array.isArray(entry) && entry.ttl_s !== undefined
          ? entry.ttl_s === null
            ? null
            : Math.round(entry.ttl_s * TICK_RATE)
          : kind === "dropped"
            ? DROPPED_MOTE_TTL_TICKS
            : null;
      usedIds.add(id);
      this.motes.push({ id, pos, kind, ttlTicks, spawnTick: -1 });
    }
  }

  private applyScenarioShades(overrides: NonNullable<ScenarioConfig["shades"]>): void {
    const usedIds = new Set<string>();
    for (const entry of overrides) {
      if (entry.id) usedIds.add(entry.id);
    }
    for (const entry of overrides) {
      const id = entry.id ?? this.allocateShadeId(usedIds);
      usedIds.add(id);
      const d3 = dist3D([this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]], entry.pos);
      const state = entry.state ?? (d3 <= SHADE_DETECT_RADIUS ? "chase" : "wander");
      const defaultTicks =
        state === "stunned"
          ? Math.round(this.tuning.pulse_stun_s * TICK_RATE)
          : state === "recoil"
            ? SHADE_RECOIL_TICKS
            : state === "spawning"
              ? SHADE_SPAWNING_STATE_TICKS
              : 0;
      const dx = entry.pos[0] - this.player.pos[0];
      const dz = entry.pos[2] - this.player.pos[2];
      const len = Math.hypot(dx, dz);
      this.shades.push({
        id,
        pos: [...entry.pos],
        state,
        stateTicksLeft: entry.state_ticks_left ?? defaultTicks,
        pushDir: len > 1e-6 ? [dx / len, dz / len] : [1, 0],
        pushTicksLeft: 0,
        recoilDir: len > 1e-6 ? [dx / len, dz / len] : [1, 0],
        safePushTicks: 0,
        wanderAngle: this.rng() * Math.PI * 2,
        spawnTick: -1,
      });
    }
  }

  private applyScenarioDrifters(overrides: NonNullable<ScenarioConfig["drifters"]>): void {
    const usedIds = new Set<string>();
    for (const entry of overrides) {
      if (entry.id) usedIds.add(entry.id);
    }
    for (const entry of overrides) {
      const id = entry.id ?? this.allocateDrifterId(usedIds);
      usedIds.add(id);
      const state = entry.state ?? "idle";
      const stolen = entry.stolen ?? 0;
      this.drifters.push({
        id,
        pos: [...entry.pos],
        state,
        stolen,
        hasStolen: stolen > 0 || state === "flee" || state === "removed",
        fleeTicks: state === "flee" ? DRIFTER_FLEE_TICKS : 0,
        patrolAngle: this.rng() * Math.PI * 2,
        spawnTick: -1,
      });
    }
  }

  private applyScenarioCharms(overrides: NonNullable<ScenarioConfig["charms"]>): void {
    const defaultPosById = new Map(this.map.charms.map((c) => [c.id, c.pos]));
    this.charms = overrides.map((ov, idx) => {
      const id = ov.id ?? `C${idx + 1}`;
      const pos: Vec3 = ov.pos ? [...ov.pos] : [...(defaultPosById.get(id) ?? [0, 0, 0])];
      const available = ov.available ?? true;
      const respawnTicks =
        ov.respawn_s !== undefined
          ? Math.round(ov.respawn_s * TICK_RATE)
          : available
            ? 0
            : CHARM_RESPAWN_TICKS;
      return { id, pos, available, respawnTicks };
    });
  }

  private allocateMoteId(usedIds?: Set<string>): string {
    while (true) {
      const candidate = `M${this.moteSeq}`;
      this.moteSeq += 1;
      if (!usedIds?.has(candidate) && !this.motes.some((m) => m.id === candidate)) {
        return candidate;
      }
    }
  }

  private allocateShadeId(usedIds?: Set<string>): string {
    while (true) {
      const candidate = `S${this.shadeSeq}`;
      this.shadeSeq += 1;
      if (!usedIds?.has(candidate) && !this.shades.some((s) => s.id === candidate)) {
        return candidate;
      }
    }
  }

  private allocateDrifterId(usedIds?: Set<string>): string {
    while (true) {
      const candidate = `D${this.drifterSeq}`;
      this.drifterSeq += 1;
      if (!usedIds?.has(candidate) && !this.drifters.some((d) => d.id === candidate)) {
        return candidate;
      }
    }
  }

  private spawnInitialMotes(): void {
    const pool = this.map.moteSpawns.map((p) => [...p] as Vec3);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const count = Math.min(INITIAL_MOTE_COUNT, pool.length);
    for (let i = 0; i < count; i += 1) {
      this.motes.push({
        id: this.allocateMoteId(),
        pos: pool[i],
        kind: "random",
        ttlTicks: null,
        spawnTick: -1,
      });
    }
  }

  private updateWindState(): void {
    if (!this.windEnabled) {
      this.wind.active = false;
      this.wind.warning = false;
      this.wind.dirDeg = 0;
      return;
    }
    const cycleMod = this.simTick % WIND_CYCLE_TICKS;
    if (cycleMod === WIND_CYCLE_TICKS - WIND_WARN_TICKS) {
      this.wind.dirDeg = round3(this.rng() * 360);
      this.wind.warning = true;
      this.wind.active = false;
    } else if (this.simTick >= WIND_CYCLE_TICKS && cycleMod < WIND_ACTIVE_TICKS) {
      if (!this.wind.active && !this.wind.warning) {
        this.wind.dirDeg = round3(this.rng() * 360);
      }
      this.wind.warning = false;
      this.wind.active = true;
    } else if (cycleMod < WIND_CYCLE_TICKS - WIND_WARN_TICKS) {
      this.wind.warning = false;
      this.wind.active = false;
      this.wind.dirDeg = 0;
    }
  }

  private decrementTimers(): void {
    if (this.player.respawnTicks > 0) {
      this.player.respawnTicks -= 1;
      if (this.player.respawnTicks === 0) {
        this.player.pos = [0, 0, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.facingYawRad = 0;
        this.player.invulnTicks = Math.round(this.tuning.invuln_s * TICK_RATE);
        this.player.fallTriggered = false;
        this.player.jumpPadAirborne = false;
      }
    }

    if (this.player.invulnTicks > 0) this.player.invulnTicks -= 1;
    if (this.player.dashCdTicks > 0) this.player.dashCdTicks -= 1;
    if (this.player.pulseCdTicks > 0) this.player.pulseCdTicks -= 1;
    if (this.player.charmTicks > 0) this.player.charmTicks -= 1;
    if (this.player.dashTicks > 0) this.player.dashTicks -= 1;

    for (const charm of this.charms) {
      if (!charm.available && charm.respawnTicks > 0) {
        charm.respawnTicks -= 1;
        if (charm.respawnTicks <= 0) {
          charm.respawnTicks = 0;
          charm.available = true;
        }
      }
    }

    this.motes = this.motes.filter((m) => {
      if (m.kind === "dropped" && m.ttlTicks !== null) {
        m.ttlTicks -= 1;
        return m.ttlTicks > 0;
      }
      return true;
    });

    for (const shade of this.shades) {
      if (shade.safePushTicks > 0) {
        shade.safePushTicks -= 1;
      }
      if (shade.state === "spawning" || shade.state === "recoil" || shade.state === "stunned") {
        shade.stateTicksLeft -= 1;
        if (shade.stateTicksLeft <= 0) {
          shade.stateTicksLeft = 0;
          shade.pushTicksLeft = 0;
          const d3 = dist3D([this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]], shade.pos);
          shade.state = d3 <= SHADE_LOSE_RADIUS ? "chase" : "wander";
        }
      }
    }

    for (const drifter of this.drifters) {
      if (drifter.state === "flee") {
        drifter.fleeTicks -= 1;
        if (drifter.fleeTicks <= 0) {
          drifter.fleeTicks = 0;
          drifter.state = "removed";
        }
      }
    }
  }

  private updatePlayerMovement(
    input: ActiveInputState,
    jumpTriggered: boolean,
    dashTriggered: boolean,
    tick: number,
    events: JsonlEvent[]
  ): void {
    if (this.player.respawnTicks > 0) {
      return;
    }

    let [mx, mz] = input.move;
    const mag = Math.hypot(mx, mz);
    if (mag > 1) {
      mx /= mag;
      mz /= mag;
    }

    const theta = (input.cam_yaw_deg * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const wx = mx * cos + mz * sin;
    const wz = -mx * sin + mz * cos;
    const hasMove = Math.hypot(wx, wz) > 1e-4;

    if (hasMove) {
      this.player.facingYawRad = Math.atan2(wx, wz);
    }

    if (dashTriggered && this.player.dashTicks === 0 && (this.player.dashCdTicks === 0 || this.player.charmTicks > 0)) {
      const dirLen = Math.hypot(wx, wz);
      const dirX = dirLen > 1e-4 ? wx / dirLen : Math.sin(this.player.facingYawRad);
      const dirZ = dirLen > 1e-4 ? wz / dirLen : Math.cos(this.player.facingYawRad);
      this.player.dashDir = [dirX, dirZ];
      this.player.dashTicks = Math.round(this.tuning.dash_duration_s * TICK_RATE);
      this.player.dashCdTicks =
        this.player.charmTicks > 0 ? 0 : Math.round(this.tuning.dash_cooldown_s * TICK_RATE);
      this.player.jumpPadAirborne = false;
      this.player.vel[1] = 0;
      events.push({ type: "event", tick, name: "dash", data: {} });
    }

    if (jumpTriggered && this.player.grounded && this.player.dashTicks === 0) {
      this.player.vel[1] = PLAYER_JUMP_VELOCITY;
      this.player.grounded = false;
    }

    if (this.player.dashTicks > 0) {
      this.player.vel[0] = this.player.dashDir[0] * this.tuning.dash_speed;
      this.player.vel[2] = this.player.dashDir[1] * this.tuning.dash_speed;
      this.player.vel[1] = 0;
    } else if (!this.player.jumpPadAirborne) {
      const maxSpeed = this.player.charmTicks > 0 ? CHARM_SPEED : this.tuning.player_speed;
      const targetVx = wx * maxSpeed;
      const targetVz = wz * maxSpeed;
      const dvx = targetVx - this.player.vel[0];
      const dvz = targetVz - this.player.vel[2];
      const dvLen = Math.hypot(dvx, dvz);
      const maxDelta = PLAYER_ACCEL * FIXED_DT;
      if (dvLen <= maxDelta || dvLen === 0) {
        this.player.vel[0] = targetVx;
        this.player.vel[2] = targetVz;
      } else {
        this.player.vel[0] += (dvx / dvLen) * maxDelta;
        this.player.vel[2] += (dvz / dvLen) * maxDelta;
      }
    }

    if (this.player.dashTicks === 0 && !this.player.grounded) {
      this.player.vel[1] -= GRAVITY * FIXED_DT;
    }

    let windVx = 0;
    let windVz = 0;
    if (this.wind.active) {
      const wRad = (this.wind.dirDeg * Math.PI) / 180;
      windVx = Math.cos(wRad) * WIND_PUSH_SPEED;
      windVz = Math.sin(wRad) * WIND_PUSH_SPEED;
    }

    const wasGrounded = this.player.grounded;
    const nextX = this.player.pos[0] + (this.player.vel[0] + windVx) * FIXED_DT;
    const nextZ = this.player.pos[2] + (this.player.vel[2] + windVz) * FIXED_DT;
    const [rx, rz] = resolvePlayerHorizontalMove(
      this.night,
      this.player.pos[0],
      this.player.pos[1],
      this.player.pos[2],
      nextX,
      nextZ
    );
    this.player.pos[0] = rx;
    this.player.pos[2] = rz;

    let nextY = this.player.pos[1] + this.player.vel[1] * FIXED_DT;
    const supportY = getSupportGroundY(this.night, rx, rz, this.player.pos[1]);

    if (
      wasGrounded &&
      !jumpTriggered &&
      this.player.dashTicks === 0 &&
      supportY !== null &&
      nextY > supportY &&
      nextY - supportY <= 0.18
    ) {
      nextY = supportY;
    }

    if (this.player.dashTicks === 0 && supportY !== null && nextY <= supportY + 1e-4 && this.player.vel[1] <= 0) {
      this.player.pos[1] = supportY;
      this.player.vel[1] = 0;
      this.player.grounded = true;
      this.player.jumpPadAirborne = false;
    } else {
      this.player.pos[1] = nextY;
      this.player.grounded = this.player.dashTicks > 0 && supportY !== null && Math.abs(nextY - supportY) <= 0.05;
    }

    // Trigger Jump Pad if touching pad on ground/low hop
    if (!this.player.jumpPadAirborne && this.player.dashTicks === 0) {
      for (const pad of this.map.jumpPads) {
        if (
          withinRadiusXZ(this.player.pos, pad.pos, pad.radius) &&
          Math.abs(this.player.pos[1] - pad.pos[1]) <= 0.6
        ) {
          const dx = pad.targetXZ[0] - pad.pos[0];
          const dz = pad.targetXZ[1] - pad.pos[2];
          const d = Math.hypot(dx, dz) || 1;
          const ux = dx / d;
          const uz = dz / d;
          this.player.vel[0] = ux * pad.horizSpeed;
          this.player.vel[2] = uz * pad.horizSpeed;
          this.player.vel[1] = pad.vy;
          this.player.grounded = false;
          this.player.jumpPadAirborne = true;
          this.player.facingYawRad = Math.atan2(ux, uz);
          break;
        }
      }
    }

    // Fall into cloud sea (Y < -10)
    if (this.tuning.fall_enabled && this.player.pos[1] < FALL_VOID_Y && !this.player.fallTriggered) {
      this.player.fallTriggered = true;
      this.player.flames = Math.max(0, this.player.flames - 1);
      const lost = this.player.carried;
      this.player.carried = 0;
      this.player.vel = [0, 0, 0];
      this.player.dashTicks = 0;
      this.player.jumpPadAirborne = false;
      events.push({
        type: "event",
        tick,
        name: "player_hit",
        data: { by: "fall", flames: this.player.flames, dropped: 0, lost },
      });
      if (this.player.flames > 0) {
        this.player.respawnTicks = RESPAWN_WAIT_TICKS;
      }
    }
  }

  private collectMotesAndCharms(tick: number, events: JsonlEvent[]): void {
    if (this.player.respawnTicks > 0) {
      return;
    }

    if (this.player.carried < this.tuning.carry_capacity) {
      const remaining: MoteState[] = [];
      for (const mote of this.motes) {
        const interactable = mote.spawnTick < this.simTick;
        if (
          interactable &&
          this.player.carried < this.tuning.carry_capacity &&
          withinRadiusXZ(this.player.pos, mote.pos, this.tuning.pickup_radius) &&
          Math.abs(this.player.pos[1] - mote.pos[1]) <= PICKUP_HEIGHT_TOL + 1e-6
        ) {
          this.player.carried += 1;
          events.push({
            type: "event",
            tick,
            name: "mote_picked",
            data: { carried: this.player.carried },
          });
        } else {
          remaining.push(mote);
        }
      }
      this.motes = remaining;
    }

    for (const charm of this.charms) {
      if (
        charm.available &&
        withinRadiusXZ(this.player.pos, charm.pos, this.tuning.pickup_radius) &&
        Math.abs(this.player.pos[1] - charm.pos[1]) <= PICKUP_HEIGHT_TOL + 1e-6
      ) {
        charm.available = false;
        charm.respawnTicks = CHARM_RESPAWN_TICKS;
        this.player.charmTicks = CHARM_DURATION_TICKS;
        events.push({
          type: "event",
          tick,
          name: "charm_picked",
          data: { charm_id: charm.id, charm_ticks: CHARM_DURATION_TICKS },
        });
      }
    }
  }

  private tryDepositToNearestLantern(tick: number, events: JsonlEvent[]): void {
    if (this.player.respawnTicks > 0 || this.player.carried <= 0) {
      return;
    }
    const lantern = this.findInteractableLantern();
    if (!lantern) {
      return;
    }

    const needed = Math.max(0, this.tuning.lantern_cost - lantern.deposited);
    const amount = Math.min(this.player.carried, needed);
    if (amount <= 0) {
      return;
    }

    this.player.carried -= amount;
    lantern.deposited += amount;
    const depositPoints = amount * this.tuning.score.per_mote;
    this.score += depositPoints;
    this.scoreBreakdown.motesDeposited += depositPoints;

    events.push({
      type: "event",
      tick,
      name: "deposit",
      data: {
        lantern_id: lantern.id,
        amount,
        deposited: lantern.deposited,
      },
    });

    if (lantern.deposited >= this.tuning.lantern_cost && !lantern.lit) {
      lantern.lit = true;
      this.score += this.tuning.score.per_lantern;
      this.scoreBreakdown.lanterns += this.tuning.score.per_lantern;
      events.push({
        type: "event",
        tick,
        name: "lantern_lit",
        data: { lantern_id: lantern.id },
      });

      // Push any Shade currently inside the new lantern's 6m safe zone within <= 30 ticks
      for (const shade of this.shades) {
        if (withinRadiusXZ(shade.pos, lantern.pos, this.tuning.safe_radius)) {
          shade.safePushTicks = SHADE_SAFE_PUSH_MAX_TICKS;
        }
      }
    }
  }

  private updateSafeZones(): void {
    for (const shade of this.shades) {
      if (shade.state === "spawning" || shade.safePushTicks > 0) continue;
      for (const lantern of this.lanterns) {
        if (!lantern.lit) continue;
        if (withinRadiusXZ(shade.pos, lantern.pos, this.tuning.safe_radius)) {
          // Shades outside safe_radius remain blocked at the 6m rim; if placed inside, push out <= 30 ticks
          shade.safePushTicks = SHADE_SAFE_PUSH_MAX_TICKS;
          break;
        }
      }
    }
  }

  private tryCastPulse(tick: number, events: JsonlEvent[]): void {
    if (
      this.player.respawnTicks > 0 ||
      this.player.pulseCdTicks > 0 ||
      this.player.carried < this.tuning.pulse_cost
    ) {
      return;
    }

    this.player.carried -= this.tuning.pulse_cost;
    this.player.pulseCdTicks = Math.round(this.tuning.pulse_cooldown_s * TICK_RATE);
    this.lastPulseTick = tick;

    const pulseOrigin: Vec3 = [
      this.player.pos[0],
      this.player.pos[1] + PULSE_CENTER_HEIGHT,
      this.player.pos[2],
    ];
    const stunTicks = Math.round(this.tuning.pulse_stun_s * TICK_RATE);
    const stunnedIds: string[] = [];

    for (const shade of this.shades) {
      if (shade.spawnTick >= this.simTick) continue;
      if (withinRadius3D(pulseOrigin, shade.pos, this.tuning.pulse_radius)) {
        const dx = shade.pos[0] - this.player.pos[0];
        const dz = shade.pos[2] - this.player.pos[2];
        const len = Math.hypot(dx, dz);
        const dirX = len > 1e-6 ? dx / len : 1; // Coincident -> +X
        const dirZ = len > 1e-6 ? dz / len : 0;

        shade.state = "stunned";
        shade.stateTicksLeft = stunTicks;
        shade.pushDir = [dirX, dirZ];
        shade.pushTicksLeft = PULSE_PUSH_TICKS;
        shade.safePushTicks = 0;

        stunnedIds.push(shade.id);
        this.score += this.tuning.score.per_stun;
        this.scoreBreakdown.stuns += this.tuning.score.per_stun;
      }
    }

    events.push({
      type: "event",
      tick,
      name: "pulse",
      data: { stunned_ids: stunnedIds },
    });

    // Pulse effects on Drifters (Gio Lac)
    for (const drifter of this.drifters) {
      if (drifter.spawnTick >= this.simTick || drifter.state === "removed") continue;
      if (withinRadius3D(pulseOrigin, drifter.pos, this.tuning.pulse_radius)) {
        if (drifter.state === "chase") {
          drifter.state = "flee";
          drifter.fleeTicks = DRIFTER_FLEE_TICKS;
        } else if (drifter.state === "flee" && drifter.stolen > 0) {
          const amount = drifter.stolen;
          drifter.stolen = 0;
          drifter.fleeTicks = DRIFTER_DROP_FLEE_TICKS;
          const groundY = getSupportGroundY(
            this.night,
            drifter.pos[0],
            drifter.pos[2],
            drifter.pos[1]
          );
          const dropY = groundY ?? 0;
          for (let i = 0; i < amount; i += 1) {
            const angle = (i / Math.max(1, amount)) * Math.PI * 2;
            const mx = drifter.pos[0] + Math.cos(angle) * 0.4;
            const mz = drifter.pos[2] + Math.sin(angle) * 0.4;
            this.motes.push({
              id: this.allocateMoteId(),
              pos: [mx, dropY, mz],
              kind: "dropped",
              ttlTicks: DROPPED_MOTE_TTL_TICKS,
              spawnTick: this.simTick,
            });
          }
          events.push({
            type: "event",
            tick,
            name: "drifter_drop",
            data: { drifter_id: drifter.id, amount },
          });
        }
      }
    }
  }

  private moveShades(): void {
    const chaseStep = this.map.shadeSpeed * FIXED_DT;
    const wanderStep = SHADE_WANDER_SPEED * FIXED_DT;
    const pulsePushStep = this.tuning.pulse_push_m / PULSE_PUSH_TICKS;
    const recoilStep = SHADE_RECOIL_DISTANCE / SHADE_RECOIL_TICKS;

    for (const shade of this.shades) {
      if (shade.spawnTick >= this.simTick) continue;

      if (shade.state === "stunned") {
        if (shade.pushTicksLeft > 0) {
          const nx = shade.pos[0] + shade.pushDir[0] * pulsePushStep;
          const nz = shade.pos[2] + shade.pushDir[1] * pulsePushStep;
          if (isBlockedByObstacle(this.night, nx, shade.pos[1], nz)) {
            shade.pushTicksLeft = 0;
          } else {
            shade.pos[0] = nx;
            shade.pos[2] = nz;
            shade.pushTicksLeft -= 1;
          }
        }
        continue;
      }

      if (shade.state === "recoil") {
        const nx = shade.pos[0] + shade.recoilDir[0] * recoilStep;
        const nz = shade.pos[2] + shade.recoilDir[1] * recoilStep;
        if (!isBlockedByObstacle(this.night, nx, shade.pos[1], nz)) {
          shade.pos[0] = nx;
          shade.pos[2] = nz;
        }
        this.clampShadeOutsideLitSafeZones(shade);
        continue;
      }

      if (shade.state === "spawning") {
        continue;
      }

      // If inside safe zone from a newly lit lantern, push smoothly outward within <= 30 ticks
      if (shade.safePushTicks > 0) {
        let insideAny = false;
        for (const lantern of this.lanterns) {
          if (!lantern.lit) continue;
          const dx = shade.pos[0] - lantern.pos[0];
          const dz = shade.pos[2] - lantern.pos[2];
          const dist = Math.hypot(dx, dz);
          if (dist <= this.tuning.safe_radius + 0.02) {
            insideAny = true;
            const dirX = dist > 1e-6 ? dx / dist : 1;
            const dirZ = dist > 1e-6 ? dz / dist : 0;
            const remaining = this.tuning.safe_radius + 0.05 - dist;
            const stepOut = Math.max(chaseStep, remaining / Math.max(1, shade.safePushTicks));
            shade.pos[0] += dirX * stepOut;
            shade.pos[2] += dirZ * stepOut;
          }
        }
        if (!insideAny) {
          shade.safePushTicks = 0;
        }
        continue;
      }

      // Detect / Lose player
      const d3 = dist3D([this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]], shade.pos);
      if (this.player.respawnTicks > 0) {
        shade.state = "wander";
      } else if (shade.state === "wander" && d3 <= SHADE_DETECT_RADIUS) {
        shade.state = "chase";
      } else if (shade.state === "chase" && d3 > SHADE_LOSE_RADIUS) {
        shade.state = "wander";
      }

      if (shade.state === "chase") {
        const dx = this.player.pos[0] - shade.pos[0];
        const dz = this.player.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 1e-6) {
          const moveDist = Math.min(chaseStep, dist);
          const nx = shade.pos[0] + (dx / dist) * moveDist;
          const nz = shade.pos[2] + (dz / dist) * moveDist;
          if (!this.isInsideTowerOnly(nx, nz)) {
            shade.pos[0] = nx;
            shade.pos[2] = nz;
          }
        }
        const targetY = this.player.pos[1] + SHADE_DEFAULT_Y;
        const dy = targetY - shade.pos[1];
        const maxDy = 3.0 * FIXED_DT;
        shade.pos[1] += Math.abs(dy) <= maxDy ? dy : Math.sign(dy) * maxDy;
      } else {
        // Wander
        shade.wanderAngle += 0.35 * FIXED_DT;
        const nx = shade.pos[0] + Math.cos(shade.wanderAngle) * wanderStep;
        const nz = shade.pos[2] + Math.sin(shade.wanderAngle) * wanderStep;
        const hitsLitZone = this.lanterns.some(
          (l) => l.lit && Math.hypot(nx - l.pos[0], nz - l.pos[2]) <= this.tuning.safe_radius
        );
        if (hitsLitZone || this.isInsideTowerOnly(nx, nz)) {
          shade.wanderAngle += Math.PI * 0.75;
        } else {
          shade.pos[0] = nx;
          shade.pos[2] = nz;
        }
      }

      this.clampShadeOutsideLitSafeZones(shade);
    }
  }

  private isInsideTowerOnly(x: number, z: number): boolean {
    return this.night === 3 && Math.hypot(x, z) < 2.0;
  }

  private clampShadeOutsideLitSafeZones(shade: ShadeState): void {
    const rimDist = this.tuning.safe_radius + 0.02;
    for (const lantern of this.lanterns) {
      if (!lantern.lit) continue;
      const dx = shade.pos[0] - lantern.pos[0];
      const dz = shade.pos[2] - lantern.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist <= this.tuning.safe_radius + 0.002) {
        const dirX = dist > 1e-6 ? dx / dist : 1;
        const dirZ = dist > 1e-6 ? dz / dist : 0;
        shade.pos[0] = lantern.pos[0] + dirX * rimDist;
        shade.pos[2] = lantern.pos[2] + dirZ * rimDist;
      }
    }
  }

  private moveDrifters(): void {
    for (const drifter of this.drifters) {
      if (drifter.spawnTick >= this.simTick || drifter.state === "removed") continue;

      if (drifter.state === "idle") {
        if (
          this.player.respawnTicks === 0 &&
          this.player.carried >= DRIFTER_MIN_CARRIED &&
          withinRadiusXZ(this.player.pos, drifter.pos, DRIFTER_DETECT_RADIUS)
        ) {
          drifter.state = "chase";
        } else {
          drifter.patrolAngle += 0.6 * FIXED_DT;
          drifter.pos[0] += Math.cos(drifter.patrolAngle) * DRIFTER_IDLE_SPEED * FIXED_DT;
          drifter.pos[2] += Math.sin(drifter.patrolAngle) * DRIFTER_IDLE_SPEED * FIXED_DT;
        }
      }

      if (drifter.state === "chase") {
        if (
          this.player.respawnTicks > 0 ||
          this.player.carried < DRIFTER_MIN_CARRIED ||
          !withinRadiusXZ(this.player.pos, drifter.pos, DRIFTER_DETECT_RADIUS)
        ) {
          drifter.state = "idle";
          continue;
        }
        const dx = this.player.pos[0] - drifter.pos[0];
        const dy = this.player.pos[1] + 1.0 - drifter.pos[1];
        const dz = this.player.pos[2] - drifter.pos[2];
        const dist = Math.hypot(dx, dy, dz);
        const step = DRIFTER_CHASE_SPEED * FIXED_DT;
        if (dist > 1e-6) {
          const moveDist = Math.min(step, dist);
          drifter.pos[0] += (dx / dist) * moveDist;
          drifter.pos[1] += (dy / dist) * moveDist;
          drifter.pos[2] += (dz / dist) * moveDist;
        }
      } else if (drifter.state === "flee") {
        const dx = drifter.pos[0] - this.player.pos[0];
        const dz = drifter.pos[2] - this.player.pos[2];
        const len = Math.hypot(dx, dz);
        const dirX = len > 1e-6 ? dx / len : 1;
        const dirZ = len > 1e-6 ? dz / len : 0;
        drifter.pos[0] += dirX * DRIFTER_FLEE_SPEED * FIXED_DT;
        drifter.pos[2] += dirZ * DRIFTER_FLEE_SPEED * FIXED_DT;
      }
    }
  }

  private handleTouchCollisions(tick: number, events: JsonlEvent[]): void {
    if (this.player.respawnTicks > 0) {
      return;
    }

    // 1. Drifters steal first (ignores safe zone and invulnerability)
    const sortedDrifters = [...this.drifters].sort((a, b) => a.id.localeCompare(b.id));
    for (const drifter of sortedDrifters) {
      if (drifter.spawnTick >= this.simTick) continue;
      if (
        drifter.state === "chase" &&
        !drifter.hasStolen &&
        this.player.carried > 0 &&
        withinRadiusXZ(this.player.pos, drifter.pos, DRIFTER_STEAL_RADIUS)
      ) {
        const amount = Math.min(DRIFTER_MAX_STEAL, this.player.carried);
        this.player.carried -= amount;
        drifter.stolen = amount;
        drifter.hasStolen = true;
        drifter.state = "flee";
        drifter.fleeTicks = DRIFTER_FLEE_TICKS;
        events.push({
          type: "event",
          tick,
          name: "drifter_steal",
          data: { drifter_id: drifter.id, amount, carried: this.player.carried },
        });
      }
    }

    // 2. Shades deal hit (max 1 flame lost per tick, sorted by id ascending)
    if (this.player.invulnTicks > 0) {
      return;
    }

    const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
    for (const shade of sortedShades) {
      if (shade.spawnTick >= this.simTick) continue;
      if (shade.state !== "chase" && shade.state !== "wander") continue;
      if (shade.safePushTicks > 0) continue;

      const heightDiff = Math.abs(this.player.pos[1] + SHADE_DEFAULT_Y - shade.pos[1]);
      if (
        withinRadiusXZ(this.player.pos, shade.pos, this.tuning.shade_hit_radius) &&
        heightDiff <= PICKUP_HEIGHT_TOL + 1e-6
      ) {
        this.player.flames = Math.max(0, this.player.flames - 1);
        const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
        this.player.carried -= dropped;
        this.spawnDroppedMotesRing(dropped);
        this.player.invulnTicks = Math.round(this.tuning.invuln_s * TICK_RATE);

        const dx = shade.pos[0] - this.player.pos[0];
        const dz = shade.pos[2] - this.player.pos[2];
        const len = Math.hypot(dx, dz);
        shade.recoilDir = len > 1e-6 ? [dx / len, dz / len] : [1, 0];
        shade.state = "recoil";
        shade.stateTicksLeft = SHADE_RECOIL_TICKS;

        events.push({
          type: "event",
          tick,
          name: "player_hit",
          data: { by: "shade", flames: this.player.flames, dropped },
        });
        break;
      }
    }
  }

  private spawnDroppedMotesRing(count: number): void {
    if (count <= 0) return;
    const baseGround =
      getSupportGroundY(this.night, this.player.pos[0], this.player.pos[2], this.player.pos[1]) ?? 0;

    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const r = 1.5 + this.rng() * 1.0; // Ring [1.5, 2.5] m
      const mx = this.player.pos[0] + Math.cos(angle) * r;
      const mz = this.player.pos[2] + Math.sin(angle) * r;
      const ground = getSupportGroundY(this.night, mx, mz, this.player.pos[1] + 0.5);
      const pos: Vec3 =
        ground !== null && !isBlockedByObstacle(this.night, mx, ground, mz)
          ? [mx, ground, mz]
          : [this.player.pos[0], baseGround, this.player.pos[2]];

      this.motes.push({
        id: this.allocateMoteId(),
        pos,
        kind: "dropped",
        ttlTicks: DROPPED_MOTE_TTL_TICKS,
        spawnTick: this.simTick,
      });
    }
  }

  private handleScheduledSpawns(tick: number, events: JsonlEvent[]): void {
    // Motes at tick 240, 480, ...
    if (
      this.randomMotesEnabled &&
      this.simTick % MOTE_SPAWN_INTERVAL_TICKS === 0 &&
      this.motes.length < MAX_ACTIVE_MOTES
    ) {
      const emptySpots = this.map.moteSpawns.filter(
        (pt) => !this.motes.some((m) => distXZ(m.pos, pt) <= 0.5 && Math.abs(m.pos[1] - pt[1]) <= 0.5)
      );
      if (emptySpots.length > 0) {
        const chosen = emptySpots[Math.floor(this.rng() * emptySpots.length)];
        this.motes.push({
          id: this.allocateMoteId(),
          pos: [...chosen],
          kind: "random",
          ttlTicks: null,
          spawnTick: this.simTick,
        });
      }
    }

    // Shades at tick 300 (2 shades), then 300 + interval * k
    if (this.randomShadesEnabled && this.simTick >= SHADE_SPAWN_DELAY_TICKS) {
      const isInitial = this.simTick === SHADE_SPAWN_DELAY_TICKS;
      const isPeriodic =
        this.simTick > SHADE_SPAWN_DELAY_TICKS &&
        (this.simTick - SHADE_SPAWN_DELAY_TICKS) % this.map.shadeIntervalTicks === 0;

      if (isInitial || isPeriodic) {
        const toSpawn = isInitial ? 2 : 1;
        for (let i = 0; i < toSpawn; i += 1) {
          if (this.shades.length >= this.map.maxShades) break;
          const validPoints = this.map.shadeSpawns.filter((pt) => {
            const awayFromPlayer = distXZ(pt, this.player.pos) >= 15 - 1e-6;
            const outsideSafe = this.lanterns.every(
              (l) => !l.lit || distXZ(pt, l.pos) > this.tuning.safe_radius
            );
            const notOccupied = !this.shades.some((s) => distXZ(s.pos, pt) < 1.0);
            return awayFromPlayer && outsideSafe && notOccupied;
          });
          if (validPoints.length === 0) break;
          const chosen = validPoints[Math.floor(this.rng() * validPoints.length)];
          const id = this.allocateShadeId();
          this.lastShadeSpawnTick = tick;
          this.shades.push({
            id,
            pos: [...chosen],
            state: "spawning",
            stateTicksLeft: SHADE_SPAWNING_STATE_TICKS,
            pushDir: [1, 0],
            pushTicksLeft: 0,
            recoilDir: [1, 0],
            safePushTicks: 0,
            wanderAngle: this.rng() * Math.PI * 2,
            spawnTick: this.simTick,
          });
          events.push({ type: "event", tick, name: "shade_spawned", data: { id } });
        }
      }
    }

    // Drifters at tick 1200, 2400, ... in Nights 2 & 3
    if (
      this.randomDriftersEnabled &&
      this.map.driftersEnabled &&
      this.simTick % DRIFTER_SPAWN_INTERVAL_TICKS === 0
    ) {
      const activeCount = this.drifters.filter((d) => d.state !== "removed").length;
      if (activeCount < DRIFTER_MAX_ACTIVE && this.map.moteSpawns.length > 0) {
        const chosen = this.map.moteSpawns[Math.floor(this.rng() * this.map.moteSpawns.length)];
        this.drifters.push({
          id: this.allocateDrifterId(),
          pos: [chosen[0], chosen[1] + DRIFTER_DEFAULT_Y, chosen[2]],
          state: "idle",
          stolen: 0,
          hasStolen: false,
          fleeTicks: 0,
          patrolAngle: this.rng() * Math.PI * 2,
          spawnTick: this.simTick,
        });
      }
    }
  }

  private evaluateWinLoss(tick: number, events: JsonlEvent[]): void {
    if (this.player.flames <= 0) {
      this.state = "lost";
      this.gameOverReason = "no_flames";
      events.push({
        type: "event",
        tick,
        name: "game_over",
        data: { result: "lost", reason: "no_flames" },
      });
      return;
    }

    if (this.lanterns.every((l) => l.lit)) {
      this.state = "won";
      this.gameOverReason = "all_lit";
      const timeBonus = Math.floor(this.rawTimeLeftS) * this.tuning.score.per_second_left;
      const flameBonus = this.player.flames * this.tuning.score.per_flame_left;
      this.scoreBreakdown.timeBonus = timeBonus;
      this.scoreBreakdown.flameBonus = flameBonus;
      this.score += timeBonus + flameBonus;
      events.push({
        type: "event",
        tick,
        name: "game_over",
        data: { result: "won", reason: "all_lit" },
      });
      return;
    }

    if (this.initialTimeLeftS - this.simTick / TICK_RATE <= 1e-9) {
      this.state = "lost";
      this.gameOverReason = "dawn";
      events.push({
        type: "event",
        tick,
        name: "game_over",
        data: { result: "lost", reason: "dawn" },
      });
    }
  }
}
