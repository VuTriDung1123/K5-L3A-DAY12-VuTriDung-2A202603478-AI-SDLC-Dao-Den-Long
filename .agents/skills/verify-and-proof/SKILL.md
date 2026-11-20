---
name: verify-and-proof
description: Run automated verification (unit tests, headless build boundary check, 3D bundle build, and headless determinism check) and record real, tag-matched evidence into docs/proof/. Use at the end of every phase or after completing a core feature before committing or tagging.
---

# Verify and Record Real Proof

## When to use
- Before finalizing any phase (`phase-1` through `phase-4`) or Checkpoint 0.
- After modifying simulation logic in `src/core/` or CLI contracts in `src/headless/`.

## Procedure
1. **Run the full verification suite:**
   ```bash
   npm run verify
   ```
   Confirm all 4 stages pass:
   - `[1/4]` Vitest unit tests (`npm test`)
   - `[2/4]` `tsc --noEmit`, `tsc -p tsconfig.headless.json` (DOM-free boundary), and `vite build`
   - `[3/4]` Two identical headless runs produce byte-identical stdout
   - `[4/4]` Expected JSON/Test Contract schema checks pass
2. **Run phase-specific Test Contract scenarios:**
   Execute every scenario defined for the current phase via `node dist-headless/headless/cli.js ...` and capture exact inputs, commands, and verbatim outputs.
3. **Record honest evidence:**
   Update `docs/proof/phase-N.md` with:
   - Requirement-to-proof traceability table (`Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả`)
   - Exact command lines and verbatim outputs (never hand-edit or fabricate outputs)
   - Honest status (`Đạt` or `Chưa đạt` with reason)
4. **Gate before tagging:**
   Never run `git tag phase-N` while any required check fails or `docs/proof/phase-N.md` is missing real command evidence matching the commit.
