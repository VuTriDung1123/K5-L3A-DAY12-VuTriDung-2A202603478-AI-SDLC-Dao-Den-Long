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

describe("Phase 1-2 Regression updated for Contract v1.2 (Ticket-03 Change Request)", () => {
  it("produces byte-identical output across repeated deterministic runs on Nights 1, 2, 3", () => {
    for (const night of [1, 2, 3] as const) {
      const runA = runHeadlessSession({ seed: 77, night, ticks: 240, snapshotEvery: 20 });
      const runB = runHeadlessSession({ seed: 77, night, ticks: 240, snapshotEvery: 20 });
      expect(runA.lines).toEqual(runB.lines);
      expect(runA.end).toEqual(runB.end);
    }
  });

  it("initializes scenario without emitting events/score and defaults pre-lit lanterns to fuel=100", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 10,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 240,
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
    expect(snaps[0].score).toBe(0);
    expect(snaps[0].player.capacity).toBe(10); // Pre-lit scenario lanterns do not increase capacity
    const l2 = snaps[0].lanterns.find((l) => l.id === "L2")!;
    expect(l2.lit).toBe(true);
    expect(l2.fuel).toBe(100);
    expect(l2.ever_lit).toBe(true);
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
    expect(snaps[1].player.pos[1]).toBeGreaterThan(0);
    expect(snaps[1].player.grounded).toBe(false);
    expect(snaps[4].player.pos[1]).toBe(0);
    expect(snaps[4].player.grounded).toBe(true);
    expect(snaps[4].player.pos[0]).toBeGreaterThan(8);
  });

  /**
   * UPDATED FOR TICKET-03 (Contract v1.2):
   * - Old rule: Lighting all 5 lanterns immediately ended the game with reason "all_lit", and per_mote was +10.
   * - New rule: Lighting all lanterns does NOT end the game early; player must survive until dawn
   *   with >= ceil(0.6 * 5) = 3 lit lanterns ("dawn_survived"). Score is +5/mote, +100 first light,
   *   and dawn bonus is +(50 + floor(fuel)) per lit lantern + 50 * flames (no time bonus).
   */
  it("deposits motes (+5/mote), lights lantern (+100, capacity +2), does NOT end early, and wins dawn_survived at dawn", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 20,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 1.5, // Dawn arrives at tick 90
        player: { pos: [0, 0, 0], carried: 8, flames: 3 },
        motes: [
          [0, 0, 2],
          [0, 0, 3],
          [0, 0, 4],
        ],
        lanterns: [
          { id: "L1", pos: [0, 0, 6], deposited: 0 },
          { id: "L2", lit: true, fuel: 80 },
          { id: "L3", lit: true, fuel: 80 },
          { id: "L4", lit: false },
          { id: "L5", lit: false },
        ],
      },
      inputs: {
        frames: [
          { tick: 0, move: [0, 1] },
          { tick: 55, move: [0, 0], interact: true }, // Lights L1 at tick 56 (3/5 lit >= 60%)
          { tick: 56, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    expect(events.filter((e) => e.name === "mote_picked")).toHaveLength(2);

    const lit = events.find((e) => e.name === "lantern_lit");
    expect(lit?.tick).toBe(56);
    expect(lit?.data).toEqual({ lantern_id: "L1", relight: false });

    // Game continues past tick 56 until dawn at tick 90
    const snaps = snapshotsOf(res.lines);
    const snap60 = snaps.find((s) => s.tick === 60)!;
    expect(snap60.state).toBe("playing");
    expect(snap60.player.capacity).toBe(12); // 10 + 2 * 1 successful light

    const win = events.find((e) => e.name === "game_over");
    expect(win?.tick).toBe(90);
    expect(win?.data).toEqual({ result: "won", reason: "dawn_survived" });
    expect(res.end.state).toBe("won");
    expect(res.end.ticks).toBe(90);
  });

  /**
   * UPDATED FOR TICKET-03 (Contract v1.2):
   * - Old rule: Shade recovering from "stunned" went directly to "chase" if within 18m.
   * - New rule (Section 2): "Hết choáng thì về wander" (then if player is > 12m, stays in wander).
   */
  it("pulses to stun (120 ticks) and push (4m in 15 ticks), then returns shade to wander when stun expires", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 160,
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
          { tick: 2, move: [0, -1] }, // Move to z=-8 so distance to S1 (at z=+7) is 15m (> 12m detect radius)
          { tick: 85, move: [0, 0] },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    const snap20 = snaps.find((s) => s.tick === 20)!;
    expect(snap20.shades[0].state).toBe("stunned");
    expect(snap20.shades[0].pos[2]).toBeCloseTo(3 + DEFAULT_TUNING.pulse_push_m, 2);

    // At tick 130 (after 120-tick stun), shade recovered to "wander"
    const snap130 = snaps.find((s) => s.tick === 130)!;
    expect(snap130.shades[0].state).toBe("wander");
  });

  it("blocks shades outside safe_radius (6m) when lantern fuel >= 30 and handles shade hits + no_flames loss", () => {
    const safeCheck = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 120,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 80 }],
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
    expect(playerHits[1].tick).toBeGreaterThanOrEqual(1 + DEFAULT_TUNING.invuln_s * TICK_RATE);
    expect(hitCheck.end.state).toBe("lost");
    expect(hitEvents.at(-1)?.data).toEqual({ result: "lost", reason: "no_flames" });
  });

  it("ends with dawn loss when time_left_s reaches 0 and lit lanterns < 60%", () => {
    const res = runHeadlessSession({
      seed: 1,
      night: 1,
      ticks: 60,
      snapshotEvery: 30,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 0.5,
        lanterns: [
          { id: "L1", lit: true },
          { id: "L2", lit: true }, // Only 2/5 lit (< 3/5 required)
        ],
      },
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
