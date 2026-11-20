import {
  DEFAULT_TUNING,
  FIXED_DT,
  GRAVITY,
  INITIAL_MOTE_COUNT,
  INITIAL_SHADE_COUNT,
  ISLAND_RADIUS,
  MAX_ACTIVE_MOTES,
  MAX_ACTIVE_SHADES,
  MIN_ACTIVE_MOTES,
  MOTE_RESPAWN_TICKS,
  PLAYER_JUMP_VELOCITY,
  SHADE_DEFAULT_Y,
  SHADE_SPAWN_INTERVAL_TICKS,
  TICK_RATE,
  createDefaultLanterns,
} from "./config.js";
import { clampToRadiusXZ, distXZ, mulberry32, round3, withinRadiusXZ } from "./prng.js";
import type {
  ActiveInputState,
  GameOverReason,
  GameTuning,
  JsonlEvent,
  JsonlSnapshot,
  LanternState,
  MoteState,
  PlayerState,
  PlayState,
  ScenarioConfig,
  ScoreBreakdown,
  ShadeState,
  Vec3,
} from "./types.js";

const SAFE_PUSH_EPSILON = 0.05;

export interface SimulationOptions {
  seed: number;
  night?: number;
  scenario?: ScenarioConfig;
  tuning?: GameTuning;
}

/**
 * Pure deterministic simulation for Dao Den Long (Night 1).
 * Runs identically in Node headless mode and browser 60 Hz fixed-timestep loop.
 */
export class GameSimulation {
  readonly seed: number;
  readonly night: number;
  readonly tuning: GameTuning;

  private readonly rng: () => number;
  private readonly randomMotesEnabled: boolean;
  private readonly randomShadesEnabled: boolean;
  private readonly initialTimeLeftS: number;

  state: PlayState = "playing";
  gameOverReason: GameOverReason | null = null;
  simTick = 0;
  score = 0;
  scoreBreakdown: ScoreBreakdown = {
    motes: 0,
    lanterns: 0,
    stuns: 0,
    timeBonus: 0,
    flameBonus: 0,
  };

  player: PlayerState;
  lanterns: LanternState[];
  shades: ShadeState[] = [];
  motes: MoteState[] = [];

  pulseCooldownTicks = 0;
  invulnTicks = 0;
  lastPulseTick = -1000;

  private moteSeq = 1;
  private shadeSeq = 1;
  private moteSpawnTimer = 0;
  private shadeSpawnTimer = 0;
  private prevButtons = { jump: false, interact: false, pulse: false };

  constructor(options: SimulationOptions) {
    this.seed = options.seed >>> 0;
    this.night = options.night ?? 1;
    this.tuning = options.tuning ?? DEFAULT_TUNING;
    this.rng = mulberry32(this.seed);

    const scenario = options.scenario;
    this.randomMotesEnabled = scenario?.random_motes ?? true;
    this.randomShadesEnabled = scenario?.random_shades ?? true;
    this.initialTimeLeftS = scenario?.time_left_s ?? this.tuning.night1_duration_s;

    this.player = {
      pos: scenario?.player?.pos ? [...scenario.player.pos] : [0, 0, 0],
      vy: 0,
      facingYawRad: 0,
      flames: scenario?.player?.flames ?? this.tuning.flames,
      carried: scenario?.player?.carried ?? 0,
    };

    this.lanterns = createDefaultLanterns(this.tuning.lantern_count_night1);
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
    } else if (this.randomShadesEnabled) {
      this.spawnInitialShades();
    }
  }

  get timeLeftS(): number {
    return Math.max(0, round3(this.initialTimeLeftS - this.simTick / TICK_RATE));
  }

  get rawTimeLeftS(): number {
    return Math.max(0, this.initialTimeLeftS - this.simTick / TICK_RATE);
  }

  /** Builds a Test Contract v1.0 JSONL snapshot at the specified tick. */
  toSnapshot(tick = this.simTick): JsonlSnapshot {
    return {
      type: "snapshot",
      tick,
      sim_tick: this.simTick,
      state: this.state,
      time_left_s: this.timeLeftS,
      score: this.score,
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        flames: this.player.flames,
        carried: this.player.carried,
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
      })),
      motes_active: this.motes.length,
    };
  }

  /** Executes one 1/60s simulation step and returns events emitted at tick = simTick. */
  step(input: ActiveInputState): JsonlEvent[] {
    if (this.state !== "playing") {
      return [];
    }

    const events: JsonlEvent[] = [];
    const nextTick = this.simTick + 1;

    this.tickTimers();
    this.updatePlayerMovement(input);
    this.collectNearbyMotes(nextTick, events);

    const interactTriggered = input.interact && !this.prevButtons.interact;
    const pulseTriggered = input.pulse && !this.prevButtons.pulse;
    this.prevButtons = {
      jump: input.jump,
      interact: input.interact,
      pulse: input.pulse,
    };

    if (interactTriggered) {
      this.tryDepositToNearestLantern(nextTick, events);
    }

    if (this.allLanternsLit()) {
      this.simTick = nextTick;
      this.finalizeWin(nextTick, events);
      return events;
    }

    if (pulseTriggered) {
      this.tryCastPulse(nextTick, events);
    }

    this.handleRandomSpawns(nextTick, events);
    this.updateShadesAndHits(nextTick, events);

    this.simTick = nextTick;
    if (this.state === "playing" && this.initialTimeLeftS - this.simTick / TICK_RATE <= 1e-9) {
      this.state = "lost";
      this.gameOverReason = "dawn";
      events.push({
        type: "event",
        tick: nextTick,
        name: "game_over",
        data: { result: "lost", reason: "dawn" },
      });
    }

    return events;
  }

  /** Finds the closest unlit lantern within interact_radius, if any. */
  findInteractableLantern(): LanternState | null {
    let best: LanternState | null = null;
    let bestDist = Infinity;
    for (const lantern of this.lanterns) {
      if (lantern.lit) continue;
      const d = distXZ(this.player.pos, lantern.pos);
      if (withinRadiusXZ(this.player.pos, lantern.pos, this.tuning.interact_radius) && d < bestDist) {
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
      if (ov.pos) {
        target.pos = [...ov.pos];
      }
      if (ov.deposited !== undefined) {
        target.deposited = ov.deposited;
      }
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
      if (!Array.isArray(entry) && entry.id) {
        usedIds.add(entry.id);
      }
    }
    for (const entry of overrides) {
      const pos: Vec3 = Array.isArray(entry) ? [...entry] : [...entry.pos];
      const id = !Array.isArray(entry) && entry.id ? entry.id : this.allocateMoteId(usedIds);
      usedIds.add(id);
      this.motes.push({ id, pos });
    }
  }

  private applyScenarioShades(overrides: NonNullable<ScenarioConfig["shades"]>): void {
    const usedIds = new Set<string>();
    for (const entry of overrides) {
      if (entry.id) {
        usedIds.add(entry.id);
      }
    }
    for (const entry of overrides) {
      const id = entry.id ?? this.allocateShadeId(usedIds);
      usedIds.add(id);
      const state = entry.state ?? "chase";
      this.shades.push({
        id,
        pos: [...entry.pos],
        state,
        stunTicks: state === "stunned" ? Math.round(this.tuning.pulse_stun_s * TICK_RATE) : 0,
      });
    }
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

  private spawnInitialMotes(): void {
    for (let i = 0; i < INITIAL_MOTE_COUNT; i += 1) {
      this.motes.push({
        id: this.allocateMoteId(),
        pos: this.sampleMotePosition(),
      });
    }
  }

  private spawnInitialShades(): void {
    for (let i = 0; i < INITIAL_SHADE_COUNT; i += 1) {
      this.shades.push({
        id: this.allocateShadeId(),
        pos: this.sampleShadePosition(),
        state: "chase",
        stunTicks: 0,
      });
    }
  }

  private sampleMotePosition(): Vec3 {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = this.rng() * Math.PI * 2;
      const radius = 3.5 + Math.sqrt(this.rng()) * (ISLAND_RADIUS - 6);
      const x = round3(Math.cos(angle) * radius);
      const z = round3(Math.sin(angle) * radius);
      const pos: Vec3 = [x, 0, z];
      const tooCloseToLantern = this.lanterns.some((l) => distXZ(pos, l.pos) < 2.2);
      const tooCloseToMote = this.motes.some((m) => distXZ(pos, m.pos) < 3.0);
      if (!tooCloseToLantern && !tooCloseToMote) {
        return pos;
      }
    }
    const fallbackAngle = this.rng() * Math.PI * 2;
    return [round3(Math.cos(fallbackAngle) * 10), 0, round3(Math.sin(fallbackAngle) * 10)];
  }

  private sampleShadePosition(): Vec3 {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = this.rng() * Math.PI * 2;
      const radius = 14 + this.rng() * (ISLAND_RADIUS - 16);
      const pos: Vec3 = [round3(Math.cos(angle) * radius), SHADE_DEFAULT_Y, round3(Math.sin(angle) * radius)];
      const awayFromPlayer = distXZ(pos, this.player.pos) >= 12;
      const outsideSafeZones = this.lanterns.every(
        (l) => !l.lit || distXZ(pos, l.pos) > this.tuning.safe_radius + 0.5
      );
      if (awayFromPlayer && outsideSafeZones) {
        return pos;
      }
    }
    return [round3(ISLAND_RADIUS - 4), SHADE_DEFAULT_Y, 0];
  }

  private tickTimers(): void {
    if (this.pulseCooldownTicks > 0) {
      this.pulseCooldownTicks -= 1;
    }
    if (this.invulnTicks > 0) {
      this.invulnTicks -= 1;
    }
    for (const shade of this.shades) {
      if (shade.state === "stunned") {
        shade.stunTicks -= 1;
        if (shade.stunTicks <= 0) {
          shade.stunTicks = 0;
          shade.state = "chase";
        }
      }
    }
  }

  private updatePlayerMovement(input: ActiveInputState): void {
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

    if (Math.hypot(wx, wz) > 1e-4) {
      const nextX = this.player.pos[0] + wx * this.tuning.player_speed * FIXED_DT;
      const nextZ = this.player.pos[2] + wz * this.tuning.player_speed * FIXED_DT;
      const [cx, cz] = clampToRadiusXZ(nextX, nextZ, ISLAND_RADIUS);
      this.player.pos[0] = cx;
      this.player.pos[2] = cz;
      this.player.facingYawRad = Math.atan2(wx, wz);
    }

    const jumpTriggered = input.jump && !this.prevButtons.jump;
    if (jumpTriggered && this.player.pos[1] <= 0.0001) {
      this.player.vy = PLAYER_JUMP_VELOCITY;
    }

    if (this.player.pos[1] > 0 || this.player.vy !== 0) {
      this.player.vy -= GRAVITY * FIXED_DT;
      this.player.pos[1] += this.player.vy * FIXED_DT;
      if (this.player.pos[1] <= 0) {
        this.player.pos[1] = 0;
        this.player.vy = 0;
      }
    }
  }

  private collectNearbyMotes(tick: number, events: JsonlEvent[]): void {
    if (this.player.carried >= this.tuning.carry_capacity) {
      return;
    }
    const remaining: MoteState[] = [];
    for (const mote of this.motes) {
      if (
        this.player.carried < this.tuning.carry_capacity &&
        withinRadiusXZ(this.player.pos, mote.pos, this.tuning.pickup_radius)
      ) {
        this.player.carried += 1;
        this.score += this.tuning.score.per_mote;
        this.scoreBreakdown.motes += this.tuning.score.per_mote;
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

  private tryDepositToNearestLantern(tick: number, events: JsonlEvent[]): void {
    if (this.player.carried <= 0) {
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
    }
  }

  private tryCastPulse(tick: number, events: JsonlEvent[]): void {
    if (this.pulseCooldownTicks > 0 || this.player.carried < this.tuning.pulse_cost) {
      return;
    }

    this.player.carried -= this.tuning.pulse_cost;
    this.pulseCooldownTicks = Math.round(this.tuning.pulse_cooldown_s * TICK_RATE);
    this.lastPulseTick = tick;

    const stunnedIds: string[] = [];
    const stunDurationTicks = Math.round(this.tuning.pulse_stun_s * TICK_RATE);

    for (const shade of this.shades) {
      if (withinRadiusXZ(this.player.pos, shade.pos, this.tuning.pulse_radius)) {
        const dx = shade.pos[0] - this.player.pos[0];
        const dz = shade.pos[2] - this.player.pos[2];
        const len = Math.hypot(dx, dz);
        const dirX = len > 1e-6 ? dx / len : 0;
        const dirZ = len > 1e-6 ? dz / len : 1;

        shade.pos[0] += dirX * this.tuning.pulse_push_m;
        shade.pos[2] += dirZ * this.tuning.pulse_push_m;
        this.pushShadeOutsideSafeZones(shade);

        shade.state = "stunned";
        shade.stunTicks = stunDurationTicks;
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
  }

  private handleRandomSpawns(tick: number, events: JsonlEvent[]): void {
    if (this.randomMotesEnabled && this.motes.length < MIN_ACTIVE_MOTES) {
      this.moteSpawnTimer += 1;
      if (this.moteSpawnTimer >= MOTE_RESPAWN_TICKS && this.motes.length < MAX_ACTIVE_MOTES) {
        this.moteSpawnTimer = 0;
        this.motes.push({
          id: this.allocateMoteId(),
          pos: this.sampleMotePosition(),
        });
      }
    } else {
      this.moteSpawnTimer = 0;
    }

    if (this.randomShadesEnabled && this.shades.length < MAX_ACTIVE_SHADES) {
      this.shadeSpawnTimer += 1;
      if (this.shadeSpawnTimer >= SHADE_SPAWN_INTERVAL_TICKS) {
        this.shadeSpawnTimer = 0;
        const id = this.allocateShadeId();
        this.shades.push({
          id,
          pos: this.sampleShadePosition(),
          state: "chase",
          stunTicks: 0,
        });
        events.push({
          type: "event",
          tick,
          name: "shade_spawned",
          data: { id },
        });
      }
    }
  }

  private updateShadesAndHits(tick: number, events: JsonlEvent[]): void {
    const stepDistance = this.tuning.shade_speed * FIXED_DT;

    for (const shade of this.shades) {
      if (shade.state !== "stunned") {
        const dx = this.player.pos[0] - shade.pos[0];
        const dz = this.player.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 1e-6) {
          const moveDist = Math.min(stepDistance, dist);
          shade.pos[0] += (dx / dist) * moveDist;
          shade.pos[2] += (dz / dist) * moveDist;
        }
      }

      this.pushShadeOutsideSafeZones(shade);
      const [cx, cz] = clampToRadiusXZ(shade.pos[0], shade.pos[2], ISLAND_RADIUS + 2);
      shade.pos[0] = cx;
      shade.pos[2] = cz;
    }

    if (this.invulnTicks > 0) {
      return;
    }

    for (const shade of this.shades) {
      if (shade.state === "stunned") continue;
      if (withinRadiusXZ(this.player.pos, shade.pos, this.tuning.shade_hit_radius)) {
        this.applyShadeHit(tick, events);
        break;
      }
    }
  }

  private pushShadeOutsideSafeZones(shade: ShadeState): void {
    const minSafeDist = this.tuning.safe_radius + SAFE_PUSH_EPSILON;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const lantern of this.lanterns) {
        if (!lantern.lit) continue;
        const dx = shade.pos[0] - lantern.pos[0];
        const dz = shade.pos[2] - lantern.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist <= this.tuning.safe_radius + 0.002) {
          const dirX = dist > 1e-6 ? dx / dist : 0;
          const dirZ = dist > 1e-6 ? dz / dist : 1;
          shade.pos[0] = lantern.pos[0] + dirX * minSafeDist;
          shade.pos[2] = lantern.pos[2] + dirZ * minSafeDist;
        }
      }
    }
  }

  private applyShadeHit(tick: number, events: JsonlEvent[]): void {
    this.player.flames = Math.max(0, this.player.flames - 1);
    const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
    this.player.carried -= dropped;
    this.invulnTicks = Math.round(this.tuning.invuln_s * TICK_RATE);

    events.push({
      type: "event",
      tick,
      name: "player_hit",
      data: {
        by: "shade",
        flames: this.player.flames,
        dropped,
      },
    });

    if (this.player.flames <= 0) {
      this.state = "lost";
      this.gameOverReason = "no_flames";
      events.push({
        type: "event",
        tick,
        name: "game_over",
        data: { result: "lost", reason: "no_flames" },
      });
    }
  }

  private allLanternsLit(): boolean {
    return this.lanterns.every((l) => l.lit);
  }

  private finalizeWin(tick: number, events: JsonlEvent[]): void {
    this.state = "won";
    this.gameOverReason = "all_lit";

    const secondsLeftBonus = Math.floor(this.rawTimeLeftS) * this.tuning.score.per_second_left;
    const flamesLeftBonus = this.player.flames * this.tuning.score.per_flame_left;

    this.scoreBreakdown.timeBonus = secondsLeftBonus;
    this.scoreBreakdown.flameBonus = flamesLeftBonus;
    this.score += secondsLeftBonus + flamesLeftBonus;

    events.push({
      type: "event",
      tick,
      name: "game_over",
      data: { result: "won", reason: "all_lit" },
    });
  }
}
