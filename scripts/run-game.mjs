import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { addLeaderboardEntry, sortAndTrimLeaderboard } from "../dist-headless/core/leaderboard.js";

const ROOT = process.cwd();
const DIST_DIR = resolve(ROOT, "dist");
const LEADERBOARD_FILE = resolve(ROOT, "data/leaderboard.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function loadEntriesFromDisk() {
  if (!existsSync(LEADERBOARD_FILE)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(LEADERBOARD_FILE, "utf8"));
    return sortAndTrimLeaderboard(Array.isArray(parsed?.entries) ? parsed.entries : []);
  } catch {
    return [];
  }
}

function saveEntriesToDisk(entries) {
  const sorted = sortAndTrimLeaderboard(entries);
  mkdirSync(dirname(LEADERBOARD_FILE), { recursive: true });
  writeFileSync(LEADERBOARD_FILE, JSON.stringify({ entries: sorted }, null, 2) + "\n", "utf8");
  return sorted;
}

// CLI mode: <run_cmd> --export-leaderboard <out.json>
const argv = process.argv.slice(2);
const exportIdx = argv.indexOf("--export-leaderboard");
if (exportIdx !== -1) {
  const outPath = argv[exportIdx + 1];
  if (!outPath) {
    console.error("Missing output path for --export-leaderboard <out.json>");
    process.exit(1);
  }
  const entries = loadEntriesFromDisk();
  const absOut = resolve(ROOT, outPath);
  mkdirSync(dirname(absOut), { recursive: true });
  writeFileSync(absOut, JSON.stringify({ entries }, null, 2) + "\n", "utf8");
  process.exit(0);
}

// Interactive server mode serving built dist/ + disk-backed leaderboard API
if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error("dist/index.html not found. Please run `npm run build` first.");
  process.exit(1);
}

const port = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/api/leaderboard" && req.method === "GET") {
    const entries = loadEntriesFromDisk();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ entries }));
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16384) req.destroy();
    });
    req.on("end", () => {
      try {
        const candidate = JSON.parse(body);
        const updated = saveEntriesToDisk(addLeaderboardEntry(loadEntriesFromDisk(), candidate));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ entries: updated }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
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

server.listen(port, "0.0.0.0", () => {
  console.log(`Đảo Đèn Lồng v1.0.0 running at http://localhost:${port}`);
});
