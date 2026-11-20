import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import { dirname, extname, join, resolve } from "node:path";

const PROCESS_START_MS = Date.now();
const ROOT = process.cwd();
const DIST_DIR = resolve(ROOT, "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function parseBenchArgs(argv) {
  const map = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) throw new Error(`Missing value for ${token}`);
    map.set(token, next);
    i += 1;
  }
  const seed = Number(map.get("--seed") ?? "42");
  const duration = Number(map.get("--duration") ?? "30");
  const outPath = map.get("--out") ?? "bench.json";
  if (!Number.isInteger(seed)) throw new Error("--seed must be an integer");
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("--duration must be > 0");
  return { seed, duration, outPath };
}

function findBrowserExecutable() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function sampleChromeRssMb(userDataMarker, rootPid) {
  try {
    if (process.platform === "win32") {
      const escaped = userDataMarker.replace(/'/g, "''");
      const psCmd = `
        $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*${escaped}*' };
        if ($procs) {
          $sum = ($procs | Measure-Object -Property WorkingSetSize -Sum).Sum;
          [math]::Round($sum / 1MB, 1)
        } else {
          $p = Get-Process -Id ${rootPid} -ErrorAction SilentlyContinue;
          if ($p) { [math]::Round($p.WorkingSet64 / 1MB, 1) }
        }
      `.trim();
      const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", psCmd], {
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      const val = Number(out);
      return Number.isFinite(val) && val > 0 ? val : null;
    }
    const out = execFileSync("ps", ["-eo", "rss,args"], {
      encoding: "utf8",
      timeout: 2000,
    });
    let totalKb = 0;
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(userDataMarker)) {
        const kb = Number(line.trim().split(/\s+/)[0]);
        if (Number.isFinite(kb)) totalKb += kb;
      }
    }
    if (totalKb > 0) {
      return Math.round((totalKb / 1024) * 10) / 10;
    }
    const fallback = execFileSync("ps", ["-o", "rss=", "-p", String(rootPid)], {
      encoding: "utf8",
      timeout: 2000,
    }).trim();
    const kb = Number(fallback);
    return Number.isFinite(kb) && kb > 0 ? Math.round((kb / 1024) * 10) / 10 : null;
  } catch {
    return null;
  }
}

function killBrowserTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        timeout: 3000,
      });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    try {
      child.kill();
    } catch {
      // ignore
    }
  }
}

async function run() {
  const args = parseBenchArgs(process.argv.slice(2));
  if (!existsSync(join(DIST_DIR, "index.html"))) {
    console.error("dist/index.html not found. Run `npm run build` first.");
    process.exit(1);
  }

  const browserPath = findBrowserExecutable();
  if (!browserPath) {
    console.error("No Chrome/Chromium/Edge executable found. Set CHROME_PATH env variable.");
    process.exit(1);
  }

  let firstFrameLoadMs = null;
  let resolveResult;
  const resultPromise = new Promise((res) => {
    resolveResult = res;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");

    if (url.pathname === "/api/bench-first-frame" && req.method === "POST") {
      if (firstFrameLoadMs === null) {
        firstFrameLoadMs = Date.now() - PROCESS_START_MS;
      }
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === "/api/bench-result" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
        try {
          resolveResult(JSON.parse(body));
        } catch (e) {
          resolveResult({ error: String(e) });
        }
      });
      return;
    }

    let filePath = join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(DIST_DIR) || !existsSync(filePath)) {
      filePath = join(DIST_DIR, "index.html");
    }
    const mime = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(readFileSync(filePath));
  });

  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 4173;

  const userDataDir = mkdtempSync(join(os.tmpdir(), "ddl-bench-chrome-"));
  const benchUrl = `http://127.0.0.1:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}`;

  const chromeArgs = [
    `--app=${benchUrl}`,
    "--window-size=1280,720",
    "--window-position=80,60",
    "--disable-frame-rate-limit",
    "--disable-gpu-vsync",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--autoplay-policy=no-user-gesture-required",
    `--user-data-dir=${userDataDir}`,
  ];

  const child = spawn(browserPath, chromeArgs, {
    stdio: "ignore",
    detached: false,
  });

  let peakMemMb = null;
  const memInterval = setInterval(() => {
    if (child.pid) {
      const m = sampleChromeRssMb(userDataDir, child.pid);
      if (m !== null && (peakMemMb === null || m > peakMemMb)) {
        peakMemMb = m;
      }
    }
  }, 2000);

  const timeoutMs = (args.duration + 35) * 1000;
  const timeoutHandle = setTimeout(() => {
    resolveResult({ error: `Benchmark timed out after ${timeoutMs / 1000}s` });
  }, timeoutMs);

  const rawResult = await resultPromise;
  clearTimeout(timeoutHandle);
  clearInterval(memInterval);

  // One final memory sample before shutdown if none captured yet
  if (peakMemMb === null && child.pid) {
    peakMemMb = sampleChromeRssMb(userDataDir, child.pid);
  }

  // Cleanly terminate browser tree and HTTP server
  killBrowserTree(child);
  await new Promise((res) => server.close(res));
  await new Promise((res) => setTimeout(res, 350));
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    // ignore locked temp file
  }

  if (rawResult.error) {
    console.error("Benchmark error:", rawResult.error);
    process.exit(1);
  }

  const finalOutput = {
    contract_version: "1.3",
    avg_fps: rawResult.avg_fps,
    p1_low_fps: rawResult.p1_low_fps,
    frame_ms_p95: rawResult.frame_ms_p95,
    frames: rawResult.frames,
    load_ms: firstFrameLoadMs ?? rawResult.load_ms ?? Date.now() - PROCESS_START_MS,
    peak_mem_mb: peakMemMb ?? rawResult.peak_mem_mb ?? null,
    vsync_off: true,
    renderer: rawResult.renderer,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
  };

  const absOut = resolve(ROOT, args.outPath);
  mkdirSync(dirname(absOut), { recursive: true });
  writeFileSync(absOut, JSON.stringify(finalOutput, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(finalOutput, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
