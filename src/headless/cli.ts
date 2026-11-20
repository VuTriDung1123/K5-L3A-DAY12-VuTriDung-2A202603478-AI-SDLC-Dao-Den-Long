import { runHelloSimulation } from "../core/helloSim.js";

function parseNumberFlag(args: string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) {
    return fallback;
  }
  const parsed = Number(args[index + 1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function main(): void {
  const args = process.argv.slice(2);
  const seed = parseNumberFlag(args, "--seed", 42);
  const steps = Math.max(0, Math.floor(parseNumberFlag(args, "--steps", 5)));
  const dt = parseNumberFlag(args, "--dt", 0.1);

  const result = runHelloSimulation(seed, steps, dt);
  console.log(
    JSON.stringify({
      mode: "hello-headless",
      status: "ok",
      result,
    })
  );
}

main();
