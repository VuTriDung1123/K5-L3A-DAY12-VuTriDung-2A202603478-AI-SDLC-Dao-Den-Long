import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createDefaultLanterns } from "../core/config.js";
import { runHeadlessSession } from "../core/headlessRunner.js";
import type { InputsConfig, ScenarioConfig } from "../core/types.js";
import {
  ContractFormatError,
  validateInputsConfig,
  validateScenarioConfig,
} from "../core/validation.js";

interface CliArgs {
  seed: number;
  night: number;
  scenarioPath?: string;
  inputsPath?: string;
  ticks: number;
  outPath: string;
  snapshotEvery: number;
}

class CliArgError extends Error {}

function parseArgs(argv: string[]): CliArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new CliArgError(`Unexpected argument: ${token}`);
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new CliArgError(`Missing value for flag ${token}`);
    }
    map.set(token, next);
    i += 1;
  }

  const seed = parseIntFlag(map.get("--seed"), "--seed");
  const night = parseIntFlag(map.get("--night"), "--night");
  if (night !== 1) {
    throw new CliArgError(`Unsupported --night ${night} (Phase 1 supports --night 1)`);
  }

  const ticks = parseIntFlag(map.get("--ticks"), "--ticks");
  if (ticks < 0) {
    throw new CliArgError("--ticks must be >= 0");
  }

  const outPath = map.get("--out");
  if (!outPath) {
    throw new CliArgError("Missing required flag --out <file.jsonl>");
  }

  const snapshotEveryRaw = map.get("--snapshot-every");
  const snapshotEvery =
    snapshotEveryRaw !== undefined ? parseIntFlag(snapshotEveryRaw, "--snapshot-every") : 10;
  if (snapshotEvery < 1) {
    throw new CliArgError("--snapshot-every must be >= 1");
  }

  return {
    seed,
    night,
    scenarioPath: map.get("--scenario"),
    inputsPath: map.get("--inputs"),
    ticks,
    outPath,
    snapshotEvery,
  };
}

function parseIntFlag(raw: string | undefined, name: string): number {
  if (raw === undefined) {
    throw new CliArgError(`Missing required flag ${name}`);
  }
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new CliArgError(`${name} must be an integer, received "${raw}"`);
  }
  return value;
}

function readJsonFile(path: string, label: string): unknown {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch (error) {
    throw new CliArgError(
      `Failed to read ${label} file "${path}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
  try {
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new ContractFormatError(
      `Invalid JSON in ${label} file "${path}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function main(): void {
  try {
    const args = parseArgs(process.argv.slice(2));
    const validLanternIds = new Set(createDefaultLanterns().map((l) => l.id));

    let scenario: ScenarioConfig | undefined;
    if (args.scenarioPath) {
      const rawScenario = readJsonFile(args.scenarioPath, "scenario");
      scenario = validateScenarioConfig(rawScenario, validLanternIds);
    }

    let inputs: InputsConfig | undefined;
    if (args.inputsPath) {
      const rawInputs = readJsonFile(args.inputsPath, "inputs");
      inputs = validateInputsConfig(rawInputs);
    }

    const { lines } = runHeadlessSession({
      seed: args.seed,
      night: args.night,
      scenario,
      inputs,
      ticks: args.ticks,
      snapshotEvery: args.snapshotEvery,
    });

    mkdirSync(dirname(args.outPath), { recursive: true });
    const payload = lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
    writeFileSync(args.outPath, payload, "utf8");
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof ContractFormatError) {
      console.error(`Format error: ${error.message}`);
      process.exitCode = 2;
      return;
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
