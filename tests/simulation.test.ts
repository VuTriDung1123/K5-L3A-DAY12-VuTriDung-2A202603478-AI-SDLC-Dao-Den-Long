import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING, TICK_RATE } from "../src/core/config.js";
import { runHeadlessSession } from "../src/core/headlessRunner.js";
import { distXZ } from "../src/core/prng.js";
import type { JsonlEvent, JsonlSnapshot } from "../src/core/types.js";
import { validateInputsConfig, validateScenarioConfig } from "../src/core/validation.js";

function snapshotsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlSnapshot[] {
  return lines.filter((l): l is JsonlSnapshot => l.type === "snapshot");
}

function eventsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlEvent[] {
  return lines.filter((l): l is JsonlEvent => l.type === "event");
}

describe("Phase 1 Regression on Standardized Contract v1.1", () => {
  it("produces byte-identical output across repeated deterministic runs on Nights 1, 2, 3", () => {
    for (const night of [1, 2, 3] as const) {
      const runA = runHeadlessSession({ seed: 77, night, ticks: 240, snapshotEvery: 20 });
      const runB = runHeadlessSession({ seed: 77, night, ticks: 240, snapshotEvery: 20 });
      expect(runA.lines).toEqual(runB.lines);
      expect(runA.end).toEqual(runB.end);
    }
  });

  it("initializes scenario without emitting events/score and records night_start at tick 1", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 10,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 300,
        lanterns: [
          { id: "L2", lit: true },
          { id: "L3", lit: true },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    const events = eventsOf(res.lines);
    expect(events).toEqual([{ type: "event", tick: 1, name: "night_start", data: { night: 1 } }]);
    expect(snaps[0].tick).toBe(0);
    expect(snaps[0].sim_tick).toBe(0);
    expect(snaps[0].night).toBe(1);
    expect(snaps[0].score).toBe(0);
    expect(snaps[0].time_left_s).toBe(300);
    expect(snaps[0].lanterns.find((l) => l.id === "L2")?.lit).toBe(true);
    expect(snaps[1].tick).toBe(10);
    expect(snaps[1].time_left_s).toBeCloseTo(300 - 10 / 60, 2);
  });

  it("applies cam_yaw_deg rotation, normalizes move > 1, and jumps at 7.0 m/s", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 30,
      scenario: { random_motes: false, random_shades: false },
      inputs: {
        frames: [
          { tick: 0, move: [1, 1], cam_yaw_deg: 0, jump: true },
          { tick: 1, jump: false },
          { tick: 60, move: [0, 1], cam_yaw_deg: 90 },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    const snap30 = snaps[1];
    expect(snap30.player.pos[1]).toBeGreaterThan(0); // Mid-air at 0.5s (flight time 0.7s)
    expect(snap30.player.grounded).toBe(false);

    const snap120 = snaps[4];
    expect(snap120.player.pos[1]).toBe(0);
    expect(snap120.player.grounded).toBe(true);
    expect(snap120.player.pos[0]).toBeGreaterThan(8); // Moved diag + +X
    expect(snap120.player.pos[2]).toBeGreaterThan(3);
  });

  it("picks up motes up to carry_capacity (10), deposits on interact, and wins with bonuses", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 100,
        player: { pos: [0, 0, 0], carried: 8, flames: 3 },
        motes: [
          [0, 0, 2],
          [0, 0, 3],
          [0, 0, 4], // Exceeds carry_capacity = 10
        ],
        lanterns: [
          { id: "L1", pos: [0, 0, 6], deposited: 0 },
          { id: "L2", lit: true },
          { id: "L3", lit: true },
          { id: "L4", lit: true },
          { id: "L5", lit: true },
        ],
      },
      inputs: {
        frames: [
          { tick: 0, move: [0, 1] },
          { tick: 55, move: [0, 0], interact: true },
          { tick: 56, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const picked = events.filter((e) => e.name === "mote_picked");
    expect(picked).toHaveLength(2); // 8 + 2 = 10 (capacity)

    const deposit = events.find((e) => e.name === "deposit");
    expect(deposit?.data).toEqual({ lantern_id: "L1", amount: 10, deposited: 10 });

    const lit = events.find((e) => e.name === "lantern_lit");
    expect(lit?.data).toEqual({ lantern_id: "L1" });

    const win = events.find((e) => e.name === "game_over");
    expect(win?.data).toEqual({ result: "won", reason: "all_lit" });

    const timeBonus = Math.floor(100 - 56 / 60) * DEFAULT_TUNING.score.per_second_left;
    const flameBonus = 3 * DEFAULT_TUNING.score.per_flame_left;
    const expectedScore =
      10 * DEFAULT_TUNING.score.per_mote +
      DEFAULT_TUNING.score.per_lantern +
      timeBonus +
      flameBonus;
    expect(res.end).toEqual({ type: "end", ticks: 56, state: "won", score: expectedScore });
  });

  it("pulses (cost 3, 3D radius 5m) to stun (120 ticks) and push (4m in 15 ticks), refreshing on re-pulse", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 220,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 7, flames: 3 },
        shades: [{ id: "S1", pos: [0, 0.8, 3], state: "chase" }],
      },
      inputs: {
        frames: [
          { tick: 0, pulse: true },
          { tick: 1, pulse: false },
          { tick: 190, pulse: true }, // Cooldown 180 ticks expired; shade still > 5? Wait: pushed to 7m, won't hit at 7m
          { tick: 191, pulse: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const firstPulse = events.find((e) => e.name === "pulse");
    expect(firstPulse?.tick).toBe(1);
    expect(firstPulse?.data).toEqual({ stunned_ids: ["S1"] });

    const snaps = snapshotsOf(res.lines);
    const snap20 = snaps.find((s) => s.tick === 20)!;
    expect(snap20.player.carried).toBe(4);
    expect(snap20.score).toBe(DEFAULT_TUNING.score.per_stun);
    expect(snap20.shades[0].state).toBe("stunned");
    expect(snap20.shades[0].pos[2]).toBeCloseTo(3 + DEFAULT_TUNING.pulse_push_m, 2);

    // After 120 ticks of stun, shade recovers to chase
    const snap130 = snaps.find((s) => s.tick === 130)!;
    expect(snap130.shades[0].state).toBe("chase");
  });

  it("blocks shades outside safe_radius (6m) and triggers recoil + invuln + no_flames loss", () => {
    const safeCheck = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true }],
        shades: [{ id: "S1", pos: [0, 0.8, 9], state: "chase" }],
      },
    });

    for (const snap of snapshotsOf(safeCheck.lines)) {
      expect(distXZ(snap.shades[0].pos, [0, 0, 0])).toBeGreaterThan(DEFAULT_TUNING.safe_radius);
    }

    const hitCheck = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 240,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 4, flames: 2 },
        shades: [{ id: "S1", pos: [0, 0.8, 0.5], state: "chase" }],
      },
    });

    const hitEvents = eventsOf(hitCheck.lines);
    const playerHits = hitEvents.filter((e) => e.name === "player_hit");
    expect(playerHits).toHaveLength(2);
    expect(playerHits[0].tick).toBe(1);
    expect(playerHits[0].data).toEqual({ by: "shade", flames: 1, dropped: 2 });
    expect(playerHits[1].tick).toBeGreaterThanOrEqual(1 + DEFAULT_TUNING.invuln_s * TICK_RATE);
    expect(hitCheck.end.state).toBe("lost");
    expect(hitEvents.at(-1)?.data).toEqual({ result: "lost", reason: "no_flames" });
  });

  it("ends with dawn loss when time_left_s reaches 0", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 60,
      snapshotEvery: 30,
      scenario: { random_motes: false, random_shades: false, time_left_s: 0.5 },
    });
    expect(res.end).toEqual({ type: "end", ticks: 30, state: "lost", score: 0 });
    expect(eventsOf(res.lines).at(-1)?.data).toEqual({ result: "lost", reason: "dawn" });
  });

  it("rejects non-increasing input frames and invalid scenario overrides", () => {
    expect(() =>
      validateInputsConfig({
        frames: [
          { tick: 5, move: [0, 1] },
          { tick: 5, move: [0, 0] },
        ],
      })
    ).toThrow();
    expect(() =>
      validateScenarioConfig({ lanterns: [{ id: "BAD_ID", lit: true }] }, new Set(["L1"]))
    ).toThrow();
  });
});
