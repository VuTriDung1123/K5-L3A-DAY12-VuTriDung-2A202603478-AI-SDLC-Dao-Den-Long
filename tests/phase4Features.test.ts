import { describe, expect, it } from "vitest";
import {
  BENCH_MOTE_COUNT,
  BENCH_SHADE_COUNT,
  BenchSimulation,
  computeBenchStats,
  getBenchCameraPosition,
} from "../src/core/benchSim.js";
import { DEFAULT_TUNING } from "../src/core/config.js";
import {
  addLeaderboardEntry,
  formatIsoWithTimezone,
  isValidLeaderboardName,
  LEADERBOARD_MAX_ENTRIES,
  sortAndTrimLeaderboard,
  type LeaderboardEntry,
} from "../src/core/leaderboard.js";

describe("Phase 4 — Leaderboard logic", () => {
  it("validates 3-12 character names (ASCII [A-Za-z0-9_] and Vietnamese letters)", () => {
    expect(isValidLeaderboardName("May")).toBe(true);
    expect(isValidLeaderboardName("Dung_2026")).toBe(true);
    expect(isValidLeaderboardName("MâyĐêm")).toBe(true);
    expect(isValidLeaderboardName("A12345678901")).toBe(true); // 12 chars

    expect(isValidLeaderboardName("Ab")).toBe(false); // < 3
    expect(isValidLeaderboardName("A123456789012")).toBe(false); // > 12
    expect(isValidLeaderboardName("Bad Name")).toBe(false); // space
    expect(isValidLeaderboardName("Bad!Name")).toBe(false); // symbol
    expect(isValidLeaderboardName("")).toBe(false);
  });

  it("formats ISO 8601 timestamps with explicit timezone offset", () => {
    const iso = formatIsoWithTimezone(new Date("2026-04-12T10:15:30Z"));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it("sorts by score descending, ties by achieved_at ascending, and caps at top 10", () => {
    let list: LeaderboardEntry[] = [];
    for (let i = 1; i <= 12; i += 1) {
      list = addLeaderboardEntry(list, {
        name: `Player_${i}`,
        score: i === 5 || i === 6 ? 1500 : i * 100,
        nights_won: i % 4,
        seed: i,
        achieved_at: `2026-04-12T10:${String(i).padStart(2, "0")}:00+07:00`,
      });
    }

    expect(list.length).toBe(LEADERBOARD_MAX_ENTRIES);
    // Tie at 1500: Player_5 (10:05) must precede Player_6 (10:06)
    expect(list[0].name).toBe("Player_5");
    expect(list[0].score).toBe(1500);
    expect(list[1].name).toBe("Player_6");
    expect(list[1].score).toBe(1500);
    // Next highest is Player_12 (1200)
    expect(list[2].name).toBe("Player_12");
    expect(list[2].score).toBe(1200);
    // Lowest entries dropped
    expect(list.some((e) => e.name === "Player_1")).toBe(false);
    expect(list.some((e) => e.name === "Player_2")).toBe(false);
  });

  it("rejects invalid candidate name when adding entry", () => {
    expect(() =>
      addLeaderboardEntry([], { name: "x!", score: 100, nights_won: 1, seed: 42 })
    ).toThrow();
    expect(
      sortAndTrimLeaderboard([
        {
          name: "ValidUser",
          score: 500,
          nights_won: 3,
          achieved_at: "2026-04-12T10:00:00+07:00",
          seed: 42,
        },
        {
          name: "x!",
          score: 9999,
          nights_won: 3,
          achieved_at: "2026-04-12T09:00:00+07:00",
          seed: 42,
        },
      ]).length
    ).toBe(1);
  });
});

describe("Phase 4 — Standardized Benchmark Simulation & Stats", () => {
  it("initializes exact Ticket-04 benchmark scene deterministically", () => {
    const simA = new BenchSimulation(42);
    const simB = new BenchSimulation(42);

    expect(simA.shades.length).toBe(BENCH_SHADE_COUNT);
    expect(simA.motes.length).toBe(BENCH_MOTE_COUNT);
    expect(simA.playerPos).toEqual([0, 0, 0]);
    expect(simA.lanterns.length).toBe(5);
    expect(simA.lanterns.slice(0, 3).every((l) => l.lit && l.fuelTicks === 6000)).toBe(true);
    expect(simA.lanterns.slice(3).every((l) => !l.lit && l.fuelTicks === 0)).toBe(true);
    expect(simA.shades.map((s) => s.pos)).toEqual(simB.shades.map((s) => s.pos));
    expect(simA.motes.map((m) => m.pos)).toEqual(simB.motes.map((m) => m.pos));
  });

  it("moves 200 wandering shades while keeping them outside L1-L3 6m safe zones and preserving fuel", () => {
    const sim = new BenchSimulation(42);
    const initialPos = sim.shades[0].pos.slice();

    for (let t = 0; t < 120; t += 1) {
      sim.step();
    }

    expect(sim.shades[0].pos).not.toEqual(initialPos);
    expect(sim.lanterns.slice(0, 3).every((l) => l.lit && l.fuelTicks === 6000)).toBe(true);

    for (const s of sim.shades) {
      for (const l of sim.lanterns.slice(0, 3)) {
        const dist = Math.hypot(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]);
        expect(dist).toBeGreaterThanOrEqual(DEFAULT_TUNING.safe_radius);
      }
    }
  });

  it("computes exact CCW camera orbit from (30, 15, 0) at 15 s/rev", () => {
    const p0 = getBenchCameraPosition(0);
    expect(p0[0]).toBeCloseTo(30, 6);
    expect(p0[1]).toBeCloseTo(15, 6);
    expect(p0[2]).toBeCloseTo(0, 6);

    const pQuarter = getBenchCameraPosition(3.75);
    expect(pQuarter[0]).toBeCloseTo(0, 6);
    expect(pQuarter[1]).toBeCloseTo(15, 6);
    expect(pQuarter[2]).toBeCloseTo(30, 6);

    const pHalf = getBenchCameraPosition(7.5);
    expect(pHalf[0]).toBeCloseTo(-30, 6);
    expect(pHalf[1]).toBeCloseTo(15, 6);
    expect(pHalf[2]).toBeCloseTo(0, 6);
  });

  it("computes avg_fps, p1_low_fps, and frame_ms_p95 according to Contract v1.3", () => {
    // 100 frames: 99 frames at 10ms, 1 slow frame at 50ms
    const dts = [...Array(99).fill(10), 50];
    const stats = computeBenchStats(dts);
    // sum = 1040 ms -> avg_fps = 100000 / 1040 = 96.153... -> 96.2
    expect(stats.frames).toBe(100);
    expect(stats.avg_fps).toBe(96.2);
    // top 1% = 1 frame (50ms) -> p1_low_fps = 1000 / 50 = 20
    expect(stats.p1_low_fps).toBe(20);
    // 95th percentile of 100 sorted items (index 94) = 10ms
    expect(stats.frame_ms_p95).toBe(10);
  });
});
