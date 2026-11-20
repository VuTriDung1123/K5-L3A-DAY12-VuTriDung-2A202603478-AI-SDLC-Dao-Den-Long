import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { TICK_RATE } from "../core/config.js";
import { mulberry32, round1 } from "../core/prng.js";
import { GameSimulation } from "../core/simulation.js";
import type { ActiveInputState, NightNumber } from "../core/types.js";

interface SoakArgs {
  seed: number;
  nights: number;
  outPath: string;
}

function parseSoakArgs(argv: string[]): SoakArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for flag ${token}`);
    }
    map.set(token, next);
    i += 1;
  }

  const seedRaw = map.get("--seed") ?? "7";
  const nightsRaw = map.get("--nights") ?? "10";
  const outPath = map.get("--out");

  const seed = Number(seedRaw);
  const nights = Number(nightsRaw);
  if (!Number.isInteger(seed)) throw new Error(`--seed must be an integer, got "${seedRaw}"`);
  if (!Number.isInteger(nights) || nights < 1) {
    throw new Error(`--nights must be an integer >= 1, got "${nightsRaw}"`);
  }
  if (!outPath) throw new Error("Missing required flag --out <soak.json>");

  return { seed, nights, outPath };
}

function getRssMb(): number {
  return round1(process.memoryUsage().rss / (1024 * 1024));
}

function main(): void {
  try {
    const args = parseSoakArgs(process.argv.slice(2));
    const t0 = performance.now();

    let crashes = 0;
    const results: Array<"won" | "lost"> = [];
    let memStartMb = 0;

    // Reusable input object to minimize per-tick GC churn
    const input: ActiveInputState = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false,
    };

    for (let i = 0; i < args.nights; i += 1) {
      const nightNum = ((i % 3) + 1) as NightNumber;
      const nightSeed = args.seed + i;
      const inputRng = mulberry32((nightSeed ^ 0x9e3779b9) >>> 0);

      let sim: GameSimulation | null = new GameSimulation({
        seed: nightSeed,
        night: nightNum,
      });

      if (i === 0) {
        memStartMb = getRssMb();
      }

      const maxTicks = sim.map.durationS * TICK_RATE;
      try {
        for (let k = 0; k < maxTicks; k += 1) {
          if (sim.isFinished()) break;

          if (k % 30 === 0) {
            const angle = inputRng() * Math.PI * 2;
            input.move[0] = Math.cos(angle);
            input.move[1] = Math.sin(angle);
          }
          input.jump = inputRng() < 0.05;
          input.dash = inputRng() < 0.03;
          input.pulse = inputRng() < 0.02;
          input.interact = inputRng() < 0.1;

          sim.step(input);
        }
        results.push(sim.state === "won" ? "won" : "lost");
      } catch (err) {
        crashes += 1;
        results.push("lost");
        console.error(`Soak night ${i + 1} (seed ${nightSeed}) crashed:`, err);
      } finally {
        // Explicit reset/release before next night
        sim = null;
      }
    }

    const memEndMb = getRssMb();
    const durationS = round1((performance.now() - t0) / 1000);

    const report = {
      nights: args.nights,
      crashes,
      results,
      mem_start_mb: memStartMb,
      mem_end_mb: memEndMb,
      duration_s: durationS,
    };

    mkdirSync(dirname(args.outPath), { recursive: true });
    writeFileSync(args.outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(report));
    process.exitCode = 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
