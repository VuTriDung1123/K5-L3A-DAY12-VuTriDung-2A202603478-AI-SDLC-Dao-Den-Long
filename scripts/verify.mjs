import { execFileSync } from "node:child_process";

function runNodeCommand(command, args) {
  return execFileSync(command, args, {
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

console.log("[1/4] Running unit tests...");
runNpm(["test"]);

console.log("[2/4] Typechecking and building headless + 3D bundle...");
runNpm(["run", "build"]);

console.log("[3/4] Running headless determinism check (two identical runs)...");
const out1 = runNodeCommand(process.execPath, [
  "dist-headless/headless/cli.js",
  "--seed",
  "42",
  "--steps",
  "10",
]).trim();
const out2 = runNodeCommand(process.execPath, [
  "dist-headless/headless/cli.js",
  "--seed",
  "42",
  "--steps",
  "10",
]).trim();

if (out1 !== out2) {
  console.error("Determinism check FAILED!");
  console.error("Run 1:", out1);
  console.error("Run 2:", out2);
  process.exit(1);
}

const parsed = JSON.parse(out1);
if (parsed.status !== "ok" || parsed.result?.step !== 10) {
  console.error("Unexpected headless output:", out1);
  process.exit(1);
}

console.log("[4/4] Verification PASSED. Headless output:", out1);
