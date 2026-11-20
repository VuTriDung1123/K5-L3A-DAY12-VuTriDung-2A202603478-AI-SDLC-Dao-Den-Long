import { describe, expect, it } from "vitest";
import { createHelloState, runHelloSimulation, stepHelloState } from "../src/core/helloSim.js";

describe("helloSim", () => {
  it("produces identical output for identical seed and step count (determinism)", () => {
    const runA = runHelloSimulation(42, 10, 0.1);
    const runB = runHelloSimulation(42, 10, 0.1);
    expect(runA).toEqual(runB);
  });

  it("changes initial state for different seeds", () => {
    const stateA = createHelloState(1);
    const stateB = createHelloState(2);
    expect(stateA.angle).not.toBe(stateB.angle);
  });

  it("advances step and time cleanly without NaN", () => {
    let state = createHelloState(99);
    state = stepHelloState(state, 0.25);
    expect(state.step).toBe(1);
    expect(state.time).toBe(0.25);
    expect(Number.isFinite(state.lanternPos.x)).toBe(true);
    expect(Number.isFinite(state.lanternPos.y)).toBe(true);
    expect(Number.isFinite(state.lanternPos.z)).toBe(true);
  });
});
