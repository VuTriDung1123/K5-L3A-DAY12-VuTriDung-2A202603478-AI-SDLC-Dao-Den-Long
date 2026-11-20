import { describe, expect, it } from "vitest";
import { DROPPED_MOTE_TTL_TICKS } from "../src/core/config.js";
import { runHeadlessSession } from "../src/core/headlessRunner.js";
import { distXZ } from "../src/core/prng.js";
import type { JsonlEvent, JsonlSnapshot } from "../src/core/types.js";

function snapshotsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlSnapshot[] {
  return lines.filter((l): l is JsonlSnapshot => l.type === "snapshot");
}

function eventsOf(lines: ReturnType<typeof runHeadlessSession>["lines"]): JsonlEvent[] {
  return lines.filter((l): l is JsonlEvent => l.type === "event");
}

describe("Phase 2 (Ticket-02) Feature Scenarios", () => {
  it("supports Dash on ground and in mid-air (14 m/s, 12 ticks, constant altitude, 1.5s cooldown)", () => {
    const res = runHeadlessSession({
      seed: 10,
      night: 1,
      ticks: 40,
      snapshotEvery: 1,
      scenario: { random_motes: false, random_shades: false },
      inputs: {
        frames: [
          { tick: 0, jump: true },
          { tick: 1, jump: false },
          { tick: 5, dash: true },
          { tick: 6, dash: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const dashEv = events.find((e) => e.name === "dash");
    expect(dashEv?.tick).toBe(6);

    const snaps = snapshotsOf(res.lines);
    const snap6 = snaps[6];
    const snap10 = snaps[10];
    // Constant height during mid-air dash
    expect(snap10.player.pos[1]).toBe(snap6.player.pos[1]);
    expect(snap6.player.vel[2]).toBeCloseTo(14, 2);
    expect(snap6.player.dash_cd_s).toBeCloseTo(1.5, 2);
  });

  it("spawns dropped motes with 480-tick TTL on shade hit that expire if uncollected", () => {
    const res = runHeadlessSession({
      seed: 11,
      night: 1,
      ticks: DROPPED_MOTE_TTL_TICKS + 10,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 10, flames: 3 },
        // Unlit L1 within interact_radius=2m; lighting it at tick 2 pushes S1 to >=4.1m while May stays still
        lanterns: [{ id: "L1", pos: [0, 0, -1.9], deposited: 9 }],
        shades: [{ id: "S1", pos: [0, 0.8, 0.5], state: "chase" }],
      },
      inputs: {
        frames: [
          { tick: 1, interact: true },
          { tick: 2, interact: false },
        ],
      },
    });

    const snaps = snapshotsOf(res.lines);
    const snap10 = snaps.find((s) => s.tick === 10)!;
    const dropped = snap10.motes.filter((m) => m.kind === "dropped");
    expect(dropped).toHaveLength(5);
    expect(dropped[0].ttl_s).toBeGreaterThan(7.5);

    const snapEnd = snaps.at(-1)!;
    expect(snapEnd.motes_active).toBe(0);
  });

  it("pushes a Shade inside a newly lit lantern safe_radius out to 6m within <= 30 ticks without dealing damage", () => {
    const res = runHeadlessSession({
      seed: 12,
      night: 1,
      ticks: 40,
      snapshotEvery: 5,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 0], carried: 10, flames: 3 },
        lanterns: [{ id: "L1", pos: [0, 0, 1], deposited: 0 }],
        shades: [{ id: "S1", pos: [0, 0.8, 0.5], state: "chase" }],
      },
      inputs: {
        frames: [
          { tick: 0, interact: true },
          { tick: 1, interact: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    expect(events.some((e) => e.name === "lantern_lit")).toBe(true);
    expect(events.some((e) => e.name === "player_hit")).toBe(false);

    const snap35 = snapshotsOf(res.lines).find((s) => s.tick === 35)!;
    expect(distXZ(snap35.shades[0].pos, [0, 0, 1])).toBeGreaterThan(6);
  });

  it("handles falling off island (Y < -10): -1 flame, loses all motes, waits 60 ticks, respawns with invuln", () => {
    const res = runHeadlessSession({
      seed: 13,
      night: 1,
      ticks: 160,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        player: { pos: [0, 0, 39.5], carried: 5, flames: 3 },
      },
      inputs: {
        frames: [
          { tick: 0, move: [0, 1] },
          { tick: 50, move: [0, 0] }, // Stop input before respawn so Mây stands at (0,0,0)
        ],
      },
    });

    const events = eventsOf(res.lines);
    const fallHit = events.find((e) => e.name === "player_hit" && e.data.by === "fall");
    expect(fallHit).toBeDefined();
    expect(fallHit?.data).toEqual({ by: "fall", flames: 2, dropped: 0, lost: 5 });

    const snapFinal = snapshotsOf(res.lines).at(-1)!;
    expect(snapFinal.player.flames).toBe(2);
    expect(snapFinal.player.carried).toBe(0);
    expect(snapFinal.player.pos[0]).toBe(0);
    expect(snapFinal.player.pos[2]).toBe(0);
    expect(snapFinal.player.invuln).toBe(true);
  });

  it("Night 2 (Dao Cau): jump pad launches across to Island B and Wind Charm grants 7.2 m/s + zero dash cooldown", () => {
    const jumpRes = runHeadlessSession({
      seed: 14,
      night: 2,
      ticks: 100,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        player: { pos: [20, 0, 18], carried: 0, flames: 3 },
      },
    });

    const landedSnap = snapshotsOf(jumpRes.lines).at(-1)!;
    expect(landedSnap.player.grounded).toBe(true);
    expect(landedSnap.player.pos[0]).toBeGreaterThan(45); // Safely inside Island B (center x=70, r=28)

    const charmRes = runHeadlessSession({
      seed: 15,
      night: 2,
      ticks: 40,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        player: { pos: [34.5, 0, 0], carried: 0, flames: 3 },
      },
      inputs: {
        frames: [
          { tick: 0, move: [1, 0] },
          { tick: 5, dash: true },
          { tick: 6, dash: false },
          { tick: 20, dash: true }, // Second dash within 15 ticks allowed because Charm removes cooldown
          { tick: 21, dash: false },
        ],
      },
    });

    const charmEv = eventsOf(charmRes.lines);
    expect(charmEv.some((e) => e.name === "charm_picked")).toBe(true);
    expect(charmEv.filter((e) => e.name === "dash")).toHaveLength(2);
  });

  it("Night 3 (Dao Chuong): climbs 30-deg ramp, launches from Tier 1 jump pad onto Tier 2, blocked by bell tower, pushed by wind", () => {
    const rampRes = runHeadlessSession({
      seed: 16,
      night: 3,
      ticks: 80,
      snapshotEvery: 20,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        wind_enabled: false,
        // Start just outside foot of 30-deg ramp (r=30.5)
        player: { pos: [30.5 * Math.cos(Math.PI / 6), 0, 30.5 * Math.sin(Math.PI / 6)], carried: 0, flames: 3 },
      },
      inputs: {
        frames: [{ tick: 0, move: [-Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)] }],
      },
    });
    const rampTop = snapshotsOf(rampRes.lines).at(-1)!;
    expect(rampTop.player.pos[1]).toBeCloseTo(3, 1);

    const padToTier2 = runHeadlessSession({
      seed: 17,
      night: 3,
      ticks: 70,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        wind_enabled: false,
        player: { pos: [0, 3, 13], carried: 0, flames: 3 },
      },
    });
    const tier2Snap = snapshotsOf(padToTier2.lines).at(-1)!;
    expect(tier2Snap.player.pos[1]).toBeCloseTo(6, 1);
    expect(tier2Snap.player.grounded).toBe(true);

    // Central bell tower obstacle (r=2m at Tier 2) blocks walking into (0,6,0)
    const towerRes = runHeadlessSession({
      seed: 17,
      night: 3,
      ticks: 60,
      snapshotEvery: 60,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        wind_enabled: false,
        player: { pos: [0, 6, 4], carried: 0, flames: 3 },
      },
      inputs: { frames: [{ tick: 0, move: [0, -1] }] },
    });
    const towerSnap = snapshotsOf(towerRes.lines).at(-1)!;
    expect(Math.hypot(towerSnap.player.pos[0], towerSnap.player.pos[2])).toBeGreaterThanOrEqual(1.99);

    // Wind active at tick 1800 pushes standing player in Night 3
    const windRes = runHeadlessSession({
      seed: 18,
      night: 3,
      ticks: 1860,
      snapshotEvery: 60,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        wind_enabled: true,
      },
    });
    const windSnap = snapshotsOf(windRes.lines).find((s) => s.tick === 1860)!;
    expect(windSnap.wind.active).toBe(true);
    expect(Math.hypot(windSnap.player.pos[0], windSnap.player.pos[2])).toBeGreaterThan(1.5);
  });

  it("Gio Lac (Drifter): idle -> chase -> steal -> flee -> pulse drops motes -> removed", () => {
    const res = runHeadlessSession({
      seed: 19,
      night: 2,
      ticks: 200,
      snapshotEvery: 10,
      scenario: {
        random_motes: false,
        random_shades: false,
        random_drifters: false,
        player: { pos: [0, 0, 0], carried: 8, flames: 3 },
        drifters: [{ id: "D1", pos: [0, 1.4, 2], state: "idle" }],
      },
      inputs: {
        frames: [
          { tick: 25, pulse: true }, // Pulse hits fleeing drifter to drop stolen motes
          { tick: 26, pulse: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    const steal = events.find((e) => e.name === "drifter_steal");
    expect(steal).toBeDefined();
    expect(steal?.data).toEqual({ drifter_id: "D1", amount: 3, carried: 5 });

    const drop = events.find((e) => e.name === "drifter_drop");
    expect(drop).toBeDefined();
    expect(drop?.data).toEqual({ drifter_id: "D1", amount: 3 });

    const lastSnap = snapshotsOf(res.lines).at(-1)!;
    expect(lastSnap.drifters[0].state).toBe("removed");
  });

  it("Pause freezes sim_tick, time_left_s, and cooldowns while outer tick continues", () => {
    const res = runHeadlessSession({
      seed: 20,
      night: 1,
      ticks: 40,
      snapshotEvery: 10,
      scenario: { random_motes: false, random_shades: false },
      inputs: {
        frames: [
          { tick: 10, pause: true },
          { tick: 11, pause: false },
          { tick: 30, pause: true },
          { tick: 31, pause: false },
        ],
      },
    });

    const events = eventsOf(res.lines);
    expect(events.find((e) => e.name === "paused")?.tick).toBe(11);
    expect(events.find((e) => e.name === "resumed")?.tick).toBe(31);

    const snaps = snapshotsOf(res.lines);
    const snap20 = snaps.find((s) => s.tick === 20)!;
    const snap30 = snaps.find((s) => s.tick === 30)!;
    expect(snap20.state).toBe("paused");
    expect(snap20.sim_tick).toBe(10); // Frozen at sim_tick=10!
    expect(snap30.state).toBe("paused");
    expect(snap30.sim_tick).toBe(10);

    const snap40 = snaps.find((s) => s.tick === 40)!;
    expect(snap40.state).toBe("playing");
    expect(snap40.sim_tick).toBe(20); // Resumed cleanly
  });
});
