import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function runCli(args: string[]) {
  const cliPath = resolve(process.cwd(), "src/headless/cli.ts");
  return spawnSync(process.execPath, ["--import", "tsx", cliPath, ...args], {
    encoding: "utf8",
  });
}

describe("Headless CLI Contract v1.1", () => {
  it("supports --night 1, 2, 3 and outputs valid v1.1 JSONL snapshots/events/end", () => {
    const dir = mkdtempSync(join(tmpdir(), "ddl-cli-v11-"));
    try {
      for (const night of ["1", "2", "3"]) {
        const outPath = join(dir, `night-${night}.jsonl`);
        const proc = runCli([
          "--seed",
          "42",
          "--night",
          night,
          "--ticks",
          "30",
          "--out",
          outPath,
          "--snapshot-every",
          "15",
        ]);
        expect(proc.status).toBe(0);
        const lines = readFileSync(outPath, "utf8")
          .trim()
          .split(/\r?\n/)
          .map((line) => JSON.parse(line));
        expect(lines[0].type).toBe("snapshot");
        expect(lines[0].night).toBe(Number(night));
        expect(lines[0].wind).toBeDefined();
        expect(Array.isArray(lines[0].drifters)).toBe(true);
        expect(Array.isArray(lines[0].charms)).toBe(true);
        expect(lines.at(-1)).toEqual({ type: "end", ticks: 30, state: "playing", score: 0 });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits with code 2 when inputs or scenario JSON format is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "ddl-cli-bad-v11-"));
    try {
      const badScenarioPath = join(dir, "bad-scenario.json");
      const outPath = join(dir, "out.jsonl");

      writeFileSync(
        badScenarioPath,
        JSON.stringify({ shades: [{ pos: [0, 0, 0], state: "invalid_state" }] })
      );

      const proc = runCli([
        "--seed",
        "42",
        "--night",
        "2",
        "--scenario",
        badScenarioPath,
        "--ticks",
        "10",
        "--out",
        outPath,
      ]);

      expect(proc.status).toBe(2);
      expect(proc.stderr).toContain("invalid");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
