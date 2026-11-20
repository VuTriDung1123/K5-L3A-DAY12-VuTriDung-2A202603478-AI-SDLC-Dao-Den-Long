---
name: verify-and-proof
description: Run automated verification (unit tests, headless build boundary check, 3D bundle build, multi-night determinism check, and 21,600-tick performance benchmark) and record real, tag-matched evidence into docs/proof/. Use at the end of every phase or after completing a core feature before committing or tagging.
---

# Verify and Record Real Proof

## When to use
- Before finalizing any phase (`phase-1` through `phase-4`).
- After modifying simulation logic in `src/core/`, night maps, or CLI contracts in `src/headless/`.

## Procedure
1. **Run the full verification suite:**
   ```bash
   npm run verify
   ```
   Confirm all stages pass:
   - `[1/5]` Vitest unit, contract sync (v1.1), and feature scenario tests (`npm test`)
   - `[2/5]` `tsc --noEmit`, `tsc -p tsconfig.headless.json` (DOM-free boundary), and `vite build`
   - `[3/5]` Determinism check across Nights 1, 2, and 3 (byte-identical JSONL across two runs)
   - `[4/5]` Full-night 21,600-tick headless performance benchmark completes in `<= 30s`
   - `[5/5]` Contract schema validation on snapshots, events, and final `end` line
2. **Run phase-specific Test Contract scenarios:**
   Execute targeted scenario checks via `node dist-headless/headless/cli.js --night <1|2|3> ...` and capture verbatim outputs.
3. **Record honest evidence:**
   Update `docs/proof/phase-N.md` with:
   - Requirement-to-proof traceability table (`Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả`)
   - Exact command lines, timings, and verbatim outputs (never hand-edit or fabricate outputs)
   - Honest status (`Đạt` or `Chưa đạt` / manual check needed with reason)
4. **Gate before tagging:**
   Never run `git tag phase-N` while any check fails or `docs/proof/phase-N.md` is missing real evidence matching the commit. Never `git push` automatically if the user prefers pushing manually.
