import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

console.log("[1/4] Running unit and contract tests...");
runNpm(["test"]);

console.log("[2/4] Typechecking, verifying headless boundary, and building 3D bundle...");
runNpm(["run", "build"]);

console.log("[3/4] Running Test Contract v1.0 headless determinism check...");
const tmpDir = mkdtempSync(join(tmpdir(), "ddl-verify-"));
try {
  const out1Path = join(tmpDir, "run1.jsonl");
  const out2Path = join(tmpDir, "run2.jsonl");

  runNodeCommand([
    "dist-headless/headless/cli.js",
    "--seed",
    "42",
    "--night",
    "1",
    "--ticks",
    "120",
    "--out",
    out1Path,
    "--snapshot-every",
    "30",
  ]);
  runNodeCommand([
    "dist-headless/headless/cli.js",
    "--seed",
    "42",
    "--night",
    "1",
    "--ticks",
    "120",
    "--out",
    out2Path,
    "--snapshot-every",
    "30",
  ]);

  const content1 = readFileSync(out1Path, "utf8");
  const content2 = readFileSync(out2Path, "utf8");
  if (content1 !== content2) {
    console.error("Determinism check FAILED: two identical headless runs differed!");
    process.exit(1);
  }

  const lines = content1.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const first = lines[0];
  const last = lines[lines.length - 1];

  if (first?.type !== "snapshot" || first?.tick !== 0 || first?.lanterns?.length !== 5) {
    console.error("Contract check FAILED on initial snapshot:", first);
    process.exit(1);
  }
  if (last?.type !== "end" || last?.ticks !== 120) {
    console.error("Contract check FAILED on final end line:", last);
    process.exit(1);
  }

  console.log("[4/4] Verification PASSED! Initial snapshot and end line validated.");
  console.log("End line:", JSON.stringify(last));
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
