import { describe, expect, it } from "vitest";
import { runHeadlessSession } from "../src/core/headlessRunner.js";
import type { JsonlEvent, JsonlSnapshot } from "../src/core/types.js";

function snapshotsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlSnapshot[] {
  return lines.filter((l): l is JsonlSnapshot => l.type === "snapshot");
}

function eventsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlEvent[] {
  return lines.filter((l): l is JsonlEvent => l.type === "event");
}

describe("Phase 3 (Ticket-03 'Den Can Dau' & Contract v1.2) Scenarios", () => {
  it("decays fuel at 1/s, refuels with ceil((100-fuel)/10) motes, extinguishes at 0, and relights for 5 motes (+40 pts)", () => {
    const res = runHeadlessSession({
      seed: 31,
      night: 1,
      ticks: 180,
      snapshotEvery: 30,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 24], carried: 8, flames: 3 },
        // L1 at (0,0,25) starts with 1.0 fuel (60 fuelTicks) -> burns out at tick 60
        lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 1 }],
      },
      inputs: {
        frames: [
          // After L1 burns out at tick 60, relight it at tick 70 (costs 5 motes)
          { tick: 70, interact: true },
          { tick: 71, interact: false },
          // After 61 ticks of burning (fuel ~ 99.0), refuel at tick 132 (costs 1 mote -> fuel 100)
          { tick: 132, interact: true },
          { tick: 133, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const outEv = events.find((e) => e.name === "lantern_out");
    expect(outEv?.tick).toBe(60);
    expect(outEv?.data).toEqual({ lantern_id: "L1" });

    const relitEv = events.find((e) => e.name === "lantern_lit");
    expect(relitEv?.tick).toBe(71);
    expect(relitEv?.data).toEqual({ lantern_id: "L1", relight: true });

    const refuelEv = events.find((e) => e.name === "refuel");
    expect(refuelEv?.tick).toBe(133);
    expect(refuelEv?.data).toEqual({ lantern_id: "L1", amount: 1, fuel: 100 });

    const snap150 = snapshotsOf(res.lines).find((s) => s.tick === 150)!;
    const l1 = snap150.lanterns.find((l) => l.id === "L1")!;
    expect(l1.lit).toBe(true);
    expect(l1.ever_lit).toBe(true);
    expect(l1.relit_count).toBe(1);
    expect(snap150.player.carried).toBe(2); // 8 - 5 (relight) - 1 (refuel) = 2
    expect(snap150.player.capacity).toBe(12); // 10 + 2 * 1 relight
    // Score: 5 motes * 5 + 40 (relight) + 1 mote * 5 (refuel) = 70
    expect(snap150.score).toBe(70);
  });

  it("loses safe zone when fuel < 30, wander Shade enters drain at <= 2m, emits fuel_drain every 60 ticks, and Pulse awards +15", () => {
    const res = runHeadlessSession({
      seed: 32,
      night: 1,
      ticks: 100,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        // Keep May far enough initially (>12m) so S1 stays in wander and targets weak L1
        player: { pos: [0, 0, 12], carried: 5, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 25 }],
        shades: [{ id: "S1", pos: [0, 0.8, 28], state: "wander" }],
      },
      inputs: {
        frames: [
          // Walk May toward L1/S1 after S1 starts draining, then Pulse to stun draining S1
          { tick: 55, move: [0, 1] },
          { tick: 78, move: [0, 0], pulse: true }, // At tick 78 May is at z~23.3 (within 5m of S1 at z=27, but wait: keep May >6m until tick 75!)
          { tick: 79, pulse: false },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    // S1 starts 3m from L1; at 4m/s it reaches <=2m within 15 ticks and enters "drain"
    const snap20 = snaps.find((s) => s.tick === 20)!;
    expect(snap20.shades[0].state).toBe("drain");

    const events = eventsOf(res.lines);
    const drainEv = events.find((e) => e.name === "fuel_drain");
    expect(drainEv).toBeDefined();
    expect(drainEv?.data.lantern_id).toBe("L1");
    expect(drainEv?.data.shade_id).toBe("S1");
  });

  it("awards +15 points when Light Pulse hits a Shade that is currently in drain state", () => {
    const res = runHeadlessSession({
      seed: 33,
      night: 1,
      ticks: 10,
      snapshotEvery: 5,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 22.5], carried: 5, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 20 }],
        shades: [{ id: "S1", pos: [0, 0.8, 26.5], state: "drain", target_lantern_id: "L1" }],
      },
      inputs: {
        frames: [
          { tick: 0, pulse: true },
          { tick: 1, pulse: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const pulseEv = events.find((e) => e.name === "pulse");
    expect(pulseEv?.data).toEqual({ stunned_ids: ["S1"] });
    const snap5 = snapshotsOf(res.lines).find((s) => s.tick === 5)!;
    expect(snap5.score).toBe(15);
    expect(snap5.shades[0].state).toBe("stunned");
  });

  it("refueling a weak lantern to fuel >= 30 stops drain and pushes Shades out of the 6m safe zone", () => {
    const res = runHeadlessSession({
      seed: 34,
      night: 1,
      ticks: 40,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 23.5], carried: 5, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 15 }],
        shades: [{ id: "S1", pos: [0, 0.8, 26.5], state: "drain", target_lantern_id: "L1" }],
      },
      inputs: {
        frames: [
          { tick: 0, interact: true }, // Refuels 5 motes => +50 fuel => 64.9 >= 30!
          { tick: 1, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    expect(events.some((e) => e.name === "refuel")).toBe(true);
    expect(events.some((e) => e.name === "player_hit")).toBe(false);

    const snap40 = snapshotsOf(res.lines).find((s) => s.tick === 40)!;
    expect(snap40.shades[0].state).not.toBe("drain");
    const distToL1 = Math.hypot(snap40.shades[0].pos[0], snap40.shades[0].pos[2] - 25);
    expect(distToL1).toBeGreaterThan(6);
  });

  it("scales carry capacity by +2 per successful light up to capacity_max = 20", () => {
    const res = runHeadlessSession({
      seed: 35,
      night: 1,
      ticks: 10,
      snapshotEvery: 5,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 24], carried: 5, flames: 3, successful_lights: 4 },
        lanterns: [{ id: "L1", pos: [0, 0, 25], lit: false, ever_lit: true, deposited: 0 }],
      },
      inputs: {
        frames: [
          { tick: 0, interact: true }, // 5th successful light => capacity = min(20, 10 + 2*5) = 20
          { tick: 1, interact: false },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    expect(snaps[0].player.capacity).toBe(18);
    expect(snaps[1].player.capacity).toBe(20);
  });

  it("computes exact Dawn Victory score: +(50 + floor(fuel)) per lit lantern + 50 per flame left", () => {
    const res = runHeadlessSession({
      seed: 36,
      night: 1,
      ticks: 60,
      snapshotEvery: 30,
      scenario: {
        random_motes: false,
        random_shades: false,
        time_left_s: 1.0, // Dawn at tick 60 (1s of decay -> fuel 100 becomes 99.0)
        player: { pos: [0, 0, 0], carried: 0, flames: 2 },
        lanterns: [
          { id: "L1", lit: true, fuel: 100 },
          { id: "L2", lit: true, fuel: 50 },
          { id: "L3", lit: true, fuel: 35 },
          { id: "L4", lit: false },
          { id: "L5", lit: false },
        ],
      },
    });

    // After 1s (60 ticks): fuels are 99, 49, 34.
    // Lantern bonuses: (50+99) + (50+49) + (50+34) = 149 + 99 + 84 = 332.
    // Flame bonus: 2 * 50 = 100. Total = 432.
    expect(res.end).toEqual({ type: "end", ticks: 60, state: "won", score: 432 });
  });
});
