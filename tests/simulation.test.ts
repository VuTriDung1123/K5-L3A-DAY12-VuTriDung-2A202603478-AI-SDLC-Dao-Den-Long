import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING, TICK_RATE } from "../src/core/config.js";
import { runHeadlessSession } from "../src/core/headlessRunner.js";
import { distXZ } from "../src/core/prng.js";
import { validateInputsConfig, validateScenarioConfig } from "../src/core/validation.js";
import type { JsonlEvent, JsonlSnapshot } from "../src/core/types.js";

function snapshotsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlSnapshot[] {
  return lines.filter((l): l is JsonlSnapshot => l.type === "snapshot");
}

function eventsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlEvent[] {
  return lines.filter((l): l is JsonlEvent => l.type === "event");
}

describe("Test Contract v1.0 Headless Simulation", () => {
  it("produces identical JSONL output across repeated deterministic runs", () => {
    const runA = runHeadlessSession({ seed: 77, night: 1, ticks: 180, snapshotEvery: 15 });
    const runB = runHeadlessSession({ seed: 77, night: 1, ticks: 180, snapshotEvery: 15 });
    expect(runA.lines).toEqual(runB.lines);
    expect(runA.end).toEqual(runB.end);
  });

  it("initializes scenario without emitting events or score and follows exact tick model", () => {
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
    expect(events).toHaveLength(0);
    expect(snaps[0].tick).toBe(0);
    expect(snaps[0].sim_tick).toBe(0);
    expect(snaps[0].score).toBe(0);
    expect(snaps[0].time_left_s).toBe(300);
    expect(snaps[0].lanterns.find((l) => l.id === "L2")?.lit).toBe(true);
    expect(snaps[1].tick).toBe(10);
    expect(snaps[1].time_left_s).toBeCloseTo(300 - 10 / 60, 2);
    expect(res.end).toEqual({ type: "end", ticks: 10, state: "playing", score: 0 });
  });

  it("applies cam_yaw_deg rotation, normalizes move vectors > 1, and jumps cleanly", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 60,
      snapshotEvery: 60,
      scenario: { random_motes: false, random_shades: false },
      inputs: {
        frames: [
          { tick: 0, move: [1, 1], cam_yaw_deg: 0, jump: true },
          { tick: 1, jump: false },
          { tick: 30, move: [0, 1], cam_yaw_deg: 90 },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    const snap60 = snaps[1];
    // First 30 ticks move along normalized [1, 1] => 0.5s * 6 m/s = 3m along (1/sqrt(2), 1/sqrt(2))
    // Next 30 ticks move along +X (yaw 90 deg, move [0, 1]) => +3m on X
    const expectedX = 3 / Math.SQRT2 + 3;
    const expectedZ = 3 / Math.SQRT2;
    expect(snap60.player.pos[0]).toBeCloseTo(expectedX, 2);
    expect(snap60.player.pos[2]).toBeCloseTo(expectedZ, 2);
    expect(snap60.player.pos[1]).toBe(0);

    // Also verify mid-air jump height at tick 10
    const midAir = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 10,
      snapshotEvery: 10,
      scenario: { random_motes: false, random_shades: false },
      inputs: { frames: [{ tick: 0, jump: true }] },
    });
    expect(snapshotsOf(midAir.lines)[1].player.pos[1]).toBeGreaterThan(0);
  });

  it("picks up motes up to carry_capacity, deposits into lantern, and wins on all_lit", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 100,
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        motes: [
          [0, 0, 2],
          [0, 0, 3],
          [0, 0, 4],
          [0, 0, 5],
          [0, 0, 6],
          [0, 0, 7], // 6th mote exceeds carry_capacity=5
        ],
        lanterns: [
          { id: "L1", pos: [0, 0, 9], deposited: 0 },
          { id: "L2", lit: true },
          { id: "L3", lit: true },
          { id: "L4", lit: true },
          { id: "L5", lit: true },
        ],
      },
      inputs: {
        frames: [
          { tick: 0, move: [0, 1] },
          { tick: 65, move: [0, 0], interact: true }, // reached z=6.5 (within 2.5m of L1 at z=9)
          { tick: 66, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const picked = events.filter((e) => e.name === "mote_picked");
    expect(picked).toHaveLength(DEFAULT_TUNING.carry_capacity);

    const deposit = events.find((e) => e.name === "deposit");
    expect(deposit?.data).toEqual({ lantern_id: "L1", amount: 3, deposited: 3 });

    const lit = events.find((e) => e.name === "lantern_lit");
    expect(lit?.data).toEqual({ lantern_id: "L1" });

    const win = events.find((e) => e.name === "game_over");
    expect(win?.data).toEqual({ result: "won", reason: "all_lit" });
    expect(win?.tick).toBe(66);

    const timeBonus = Math.floor(100 - 66 / 60) * DEFAULT_TUNING.score.per_second_left;
    const flameBonus = 3 * DEFAULT_TUNING.score.per_flame_left;
    const expectedScore =
      5 * DEFAULT_TUNING.score.per_mote +
      DEFAULT_TUNING.score.per_lantern +
      timeBonus +
      flameBonus;
    expect(res.end).toEqual({ type: "end", ticks: 66, state: "won", score: expectedScore });
  });

  it("pulses to stun and push shades, awards per_stun, enforces cooldown and recovery", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 220,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 2, flames: 3 },
        shades: [{ id: "S1", pos: [0, 0.8, 3] }],
      },
      inputs: {
        frames: [
          { tick: 0, pulse: true },
          { tick: 1, pulse: false },
          { tick: 30, pulse: true }, // should be ignored due to 3s cooldown
          { tick: 31, pulse: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const pulses = events.filter((e) => e.name === "pulse");
    expect(pulses).toHaveLength(1);
    expect(pulses[0].tick).toBe(1);
    expect(pulses[0].data).toEqual({ stunned_ids: ["S1"] });

    const snaps = snapshotsOf(res.lines);
    const snap10 = snaps.find((s) => s.tick === 10)!;
    expect(snap10.player.carried).toBe(1);
    expect(snap10.score).toBe(DEFAULT_TUNING.score.per_stun);
    expect(snap10.shades[0].state).toBe("stunned");
    expect(snap10.shades[0].pos[2]).toBeCloseTo(3 + DEFAULT_TUNING.pulse_push_m, 2);

    // After pulse_stun_s (180 ticks) shade recovers to chase
    const snap200 = snaps.find((s) => s.tick === 200)!;
    expect(snap200.shades[0].state).toBe("chase");
  });

  it("blocks shades outside lit lantern safe_radius and handles shade hits + no_flames loss", () => {
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
        shades: [{ id: "S1", pos: [0, 0.8, 8] }],
      },
    });

    for (const snap of snapshotsOf(safeCheck.lines)) {
      const dist = distXZ(snap.shades[0].pos, [0, 0, 0]);
      expect(dist).toBeGreaterThan(DEFAULT_TUNING.safe_radius);
    }
    expect(eventsOf(safeCheck.lines)).toHaveLength(0);

    // Hit and loss test
    const hitCheck = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 240,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 4, flames: 2 },
        shades: [{ id: "S1", pos: [0, 0.8, 0.5] }],
      },
    });

    const hitEvents = eventsOf(hitCheck.lines);
    const playerHits = hitEvents.filter((e) => e.name === "player_hit");
    expect(playerHits).toHaveLength(2);
    expect(playerHits[0].tick).toBe(1);
    expect(playerHits[0].data).toEqual({ by: "shade", flames: 1, dropped: 2 });
    // Second hit only occurs after invuln_s (90 ticks)
    expect(playerHits[1].tick).toBeGreaterThanOrEqual(1 + DEFAULT_TUNING.invuln_s * TICK_RATE);
    expect(playerHits[1].data).toEqual({ by: "shade", flames: 0, dropped: 1 });

    expect(hitCheck.end.state).toBe("lost");
    expect(hitEvents.at(-1)?.name).toBe("game_over");
    expect(hitEvents.at(-1)?.data).toEqual({ result: "lost", reason: "no_flames" });
  });

  it("ends with dawn loss when time_left_s reaches 0", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 100,
      snapshotEvery: 30,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 0.5,
      },
    });

    expect(res.end).toEqual({ type: "end", ticks: 30, state: "lost", score: 0 });
    expect(eventsOf(res.lines).at(-1)).toEqual({
      type: "event",
      tick: 30,
      name: "game_over",
      data: { result: "lost", reason: "dawn" },
    });
  });

  it("rejects non-strictly-increasing frame ticks and invalid scenario payloads", () => {
    expect(() =>
      validateInputsConfig({
        frames: [
          { tick: 10, move: [0, 1] },
          { tick: 10, move: [0, 0] },
        ],
      })
    ).toThrow();

    expect(() =>
      validateScenarioConfig({ lanterns: [{ id: "UNKNOWN_ID", lit: true }] }, new Set(["L1"]))
    ).toThrow();
  });
});
