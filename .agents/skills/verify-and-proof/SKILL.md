---
name: verify-and-proof
description: Run automated verification (unit tests, Contract v1.3 sync, headless build boundary check, 3D bundle build, multi-night determinism check, 21,600-tick performance benchmark, soak test, and leaderboard export CLI) and record real, tag-matched evidence into docs/proof/. Use at the end of every phase or after completing a core feature before committing or tagging.
---

# Verify and Record Real Proof

## When to use
- Before finalizing any phase (`phase-1` through `phase-4`) or cutting Release `v1.0.0`.
- After modifying simulation logic in `src/core/`, night maps, CLI contracts in `src/headless/`, or benchmark/launcher scripts in `scripts/`.

## Procedure
1. **Run the full automated verification suite:**
   ```bash
   npm run verify
   ```
   Confirm all 6 stages pass:
   - `[1/6]` Vitest unit, Contract v1.3 sync, regression, and Phase 1–4 feature tests (`npm test`)
   - `[2/6]` `tsc --noEmit`, `tsc -p tsconfig.headless.json` (DOM-free boundary), and `vite build`
   - `[3/6]` Determinism check across Nights 1, 2, and 3 (byte-identical JSONL across two runs)
   - `[4/6]` Full-night 21,600-tick headless performance benchmark completes in `<= 30s`
   - `[5/6]` Quick soak test (`soak.js`, 0 crashes) and `--export-leaderboard` CLI JSON validation
   - `[6/6]` Summary status passed with exit code `0`
2. **For Release / Phase 4, run full non-functional measurements:**
   ```bash
   node dist-headless/headless/soak.js --seed 7 --nights 10 --out soak.json
   node scripts/bench.mjs --seed 42 --duration 30 --out bench.json
   ```
   Verify `soak.json` (`crashes === 0`, `mem_end_mb <= 1.2 * mem_start_mb`) and `bench.json` (`contract_version === "1.3"`, `avg_fps >= 60`, `p1_low_fps >= 30`, `load_ms <= 10000`).
3. **Record honest evidence:**
   Update `docs/proof/phase-N.md` with:
   - Requirement-to-proof traceability table (`Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả`)
   - Machine specs (OS, CPU, GPU, RAM), exact commands, timings, and verbatim outputs (never fabricate or hand-edit results)
   - Honest status (`Đạt` or `Chưa đạt` / manual step pending)
4. **Gate before tagging:**
   Never run `git tag phase-N` while any check fails or `docs/proof/phase-N.md` is missing real evidence matching the commit. Never `git push` automatically when the user manages remote pushes manually.
