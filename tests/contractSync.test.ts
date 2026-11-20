import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../src/core/config.js";

describe("game.contract.json sync (v1.2)", () => {
  it("matches Test Contract v1.2 schema and DEFAULT_TUNING exactly", () => {
    const raw = readFileSync(resolve(process.cwd(), "game.contract.json"), "utf8");
    const contract = JSON.parse(raw);

    expect(contract.contract_version).toBe("1.2");
    expect(contract.team).toBe("2A202603478-VuTriDung");
    expect(typeof contract.build_cmd).toBe("string");
    expect(typeof contract.run_cmd).toBe("string");
    expect(typeof contract.headless_cmd).toBe("string");
    expect(contract.tuning).toEqual(DEFAULT_TUNING);
    expect(contract.tuning.fuel_max).toBe(100);
    expect(contract.tuning.relight_cost).toBe(5);
    expect(contract.tuning.win_ratio).toBe(0.6);
    expect(contract.tuning.capacity_max).toBe(20);
    expect(contract.tuning.night1_duration_s).toBe(240);
    expect(contract.tuning.night2_duration_s).toBe(270);
    expect(contract.tuning.night3_duration_s).toBe(300);
  });
});
