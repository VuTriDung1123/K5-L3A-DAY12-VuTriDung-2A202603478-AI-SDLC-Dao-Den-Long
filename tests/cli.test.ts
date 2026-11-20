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

describe("Headless CLI contract", () => {
  it("writes valid JSONL output and exits 0 on valid args + scenario + inputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "ddl-cli-test-"));
    try {
      const scenarioPath = join(dir, "scenario.json");
      const inputsPath = join(dir, "inputs.json");
      const outPath = join(dir, "out.jsonl");

      writeFileSync(
        scenarioPath,
        JSON.stringify({
          random_motes: false,
          random_shades: false,
          motes: [[0, 0, 2]],
        })
      );
      writeFileSync(
        inputsPath,
        JSON.stringify({
          frames: [{ tick: 0, move: [0, 1] }],
        })
      );

      const proc = runCli([
        "--seed",
        "42",
        "--night",
        "1",
        "--scenario",
        scenarioPath,
        "--inputs",
        inputsPath,
        "--ticks",
        "30",
        "--out",
        outPath,
        "--snapshot-every",
        "10",
      ]);

      expect(proc.status).toBe(0);
      const lines = readFileSync(outPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line));

      expect(lines[0].type).toBe("snapshot");
      expect(lines[0].tick).toBe(0);
      expect(lines.some((l) => l.type === "event" && l.name === "mote_picked")).toBe(true);
      expect(lines.at(-1)).toEqual({ type: "end", ticks: 30, state: "playing", score: 10 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits with code 2 when inputs or scenario JSON format is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "ddl-cli-bad-"));
    try {
      const badInputsPath = join(dir, "bad-inputs.json");
      const outPath = join(dir, "out.jsonl");

      writeFileSync(
        badInputsPath,
        JSON.stringify({
          frames: [
            { tick: 5, move: [0, 1] },
            { tick: 3, move: [0, 0] },
          ],
        })
      );

      const proc = runCli([
        "--seed",
        "42",
        "--night",
        "1",
        "--inputs",
        badInputsPath,
        "--ticks",
        "10",
        "--out",
        outPath,
      ]);

      expect(proc.status).toBe(2);
      expect(proc.stderr).toContain("strictly increasing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
