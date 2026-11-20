import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../src/core/config.js";

describe("game.contract.json sync", () => {
  it("matches Test Contract v1.0 schema and DEFAULT_TUNING exactly", () => {
    const raw = readFileSync(resolve(process.cwd(), "game.contract.json"), "utf8");
    const contract = JSON.parse(raw);

    expect(contract.contract_version).toBe("1.0");
    expect(contract.team).toBe("2A202603478-VuTriDung");
    expect(typeof contract.build_cmd).toBe("string");
    expect(contract.build_cmd.length).toBeGreaterThan(0);
    expect(typeof contract.run_cmd).toBe("string");
    expect(contract.run_cmd.length).toBeGreaterThan(0);
    expect(typeof contract.headless_cmd).toBe("string");
    expect(contract.headless_cmd.length).toBeGreaterThan(0);

    expect(contract.tuning).toEqual(DEFAULT_TUNING);
    expect(contract.tuning.lantern_count_night1).toBe(5);
  });
});
