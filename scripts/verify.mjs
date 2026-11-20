import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runNodeCommand(args) {
  return execFileSync(process.execPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runNpm(args) {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return execFileSync("cmd.exe", ["/c", "npm", ...args], {
      encoding: "utf8",
      stdio: "inherit",
    });
  }
  return execFileSync("npm", args, {
    encoding: "utf8",
    stdio: "inherit",
  });
}

console.log("[1/5] Running unit, regression, and Phase 2 feature tests...");
runNpm(["test"]);

console.log("[2/5] Typechecking, verifying headless boundary, and building 3D bundle...");
runNpm(["run", "build"]);

console.log("[3/5] Checking determinism across Nights 1, 2, 3...");
const tmpDir = mkdtempSync(join(tmpdir(), "ddl-verify-v11-"));
try {
  for (const night of ["1", "2", "3"]) {
    const out1 = join(tmpDir, `n${night}-a.jsonl`);
    const out2 = join(tmpDir, `n${night}-b.jsonl`);
    runNodeCommand([
      "dist-headless/headless/cli.js",
      "--seed",
      "42",
      "--night",
      night,
      "--ticks",
      "300",
      "--out",
      out1,
      "--snapshot-every",
      "60",
    ]);
    runNodeCommand([
      "dist-headless/headless/cli.js",
      "--seed",
      "42",
      "--night",
      night,
      "--ticks",
      "300",
      "--out",
      out2,
      "--snapshot-every",
      "60",
    ]);
    if (readFileSync(out1, "utf8") !== readFileSync(out2, "utf8")) {
      console.error(`Determinism check FAILED on Night ${night}!`);
      process.exit(1);
    }
  }

  console.log("[4/5] Running full 21,600-tick Night 3 performance benchmark (limit <= 30,000 ms)...");
  const benchScenario = join(tmpDir, "bench-scenario.json");
  writeFileSync(
    benchScenario,
    JSON.stringify({ player: { flames: 100 }, random_motes: true, random_shades: true, random_drifters: true, wind_enabled: true })
  );
  const benchOut = join(tmpDir, "bench-21600.jsonl");
  const t0 = performance.now();
  runNodeCommand([
    "dist-headless/headless/cli.js",
    "--seed",
    "42",
    "--night",
    "3",
    "--scenario",
    benchScenario,
    "--ticks",
    "21600",
    "--out",
    benchOut,
    "--snapshot-every",
    "60",
  ]);
  const elapsedMs = Math.round(performance.now() - t0);
  if (elapsedMs > 30000) {
    console.error(`Performance check FAILED: 21,600 ticks took ${elapsedMs} ms (> 30,000 ms)`);
    process.exit(1);
  }

  const lines = readFileSync(benchOut, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  const first = lines[0];
  const last = lines[lines.length - 1];

  if (first?.type !== "snapshot" || first?.night !== 3 || first?.lanterns?.length !== 7) {
    console.error("Contract v1.1 check FAILED on Night 3 initial snapshot:", first);
    process.exit(1);
  }
  if (last?.type !== "end" || last?.ticks !== 21600) {
    console.error("Contract v1.1 check FAILED on full 21,600-tick end line:", last);
    process.exit(1);
  }

  console.log(
    `[5/5] Verification PASSED! 21,600-tick benchmark finished in ${elapsedMs} ms. End: ${JSON.stringify(last)}`
  );
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
