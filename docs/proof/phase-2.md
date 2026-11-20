# Bằng chứng Phase 2 ("Ba hòn đảo" / Ticket-02 + Contract v1.1)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Commit kiểm chứng:** `1ee9811` (`fix(verify): use flames=999 in benchmark scenario so all 21,600 ticks execute`)

## Bảng truy vết yêu cầu đến bằng chứng

| Yêu cầu Ticket-02 / DoD | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` (`v1.1`) khớp số chuẩn Phần 1 | `tests/contractSync.test.ts` so sánh mọi khóa `tuning` với `DEFAULT_TUNING` | `✓ tests/contractSync.test.ts (1 test)` | Đạt |
| Regression Phase 1 với số liệu chuẩn mới | `tests/simulation.test.ts` (8 tests: tick model, yaw, jump, deposit/win, pulse, safe zone, recoil, dawn, validation) | `8/8` tests pass trong `vitest run` | Đạt |
| Kịch bản headless cho TỪNG tính năng mới (Dash, dropped TTL, safe push-out `<=30` tick, rơi & hồi sinh, Đêm 2 cầu/bục/bùa, Đêm 3 3 tầng/dốc/tháp/gió, Gió Lạc, Pause) | `tests/phase2Features.test.ts` (8 tests kịch bản chuyên biệt từng cơ chế) | `8/8` tests pass trong `vitest run` | Đạt |
| CLI hỗ trợ `--night 1, 2, 3`, trả mã `2` khi lỗi schema | `tests/cli.test.ts` (2 tests) + chạy trực tiếp trên bản clone sạch | `2/2` tests pass + sample Đêm 2 bên dưới | Đạt |
| Tính tất định tuyệt đối cả 3 Đêm & Tách ranh giới DOM | `npm run verify` bước `[2/5]` (`tsconfig.headless.json`) và `[3/5]` (chạy 2 lần mỗi Đêm) | Toàn bộ pass với exit code `0` | Đạt |
| Chạy headless Đêm đầy đủ (`21,600` tick) `<= 30 giây` | `npm run verify` bước `[4/5]` đo thời gian Đêm 3 với đủ `21,600` tick | Hoàn tất trong **`139 ms`** (`<= 30,000 ms`) | Đạt |
| Spec có Acceptance Criteria cho Phần 3 & Cập nhật Harness | `docs/notes/spec-phase-2.md`, `AGENTS.md`, `.agents/skills/verify-and-proof/SKILL.md` | Đã commit trong lịch sử git (`ab7fc1d`) | Đạt |
| Bản thường 3D: Menu, lời Ông Đăng, 3 Đảo, Bảng màu chuẩn, HUD đầy đủ, Âm thanh, Settings, đạt `>= 30 FPS` ở `1280x720` | `vite build` đóng gói sạch `dist/` (`13 modules`, `1.35s`); *Lưu ý: công cụ browser tự động không kết nối được Chrome (chưa bật remote debugging), nên kiểm tra trực quan và đo FPS trên `1280x720` chờ sinh viên chơi thử qua `npm run dev`* | Build 3D thành công không lỗi TypeScript/Vite | Chờ sinh viên tự kiểm trên trình duyệt (`npm run dev`) |

---

## Output thực tế (verbatim trên bản clone sạch `1ee9811`)

```text
Cloning into 'C:\Users\VUTRID~1\AppData\Local\Temp\ddl-phase2-clean-clone'...
done.

added 65 packages, and audited 66 packages in 3s

> k5-l3a-day12-vutridung-dao-den-long@0.1.0 build
> tsc --noEmit && tsc -p tsconfig.headless.json && vite build

vite v6.4.6 building for production...
transforming...
✓ 13 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 13.73 kB │ gzip:   3.63 kB
dist/assets/index-gugO94QR.js  534.64 kB │ gzip: 136.98 kB
✓ built in 1.40s

> k5-l3a-day12-vutridung-dao-den-long@0.1.0 verify
> node scripts/verify.mjs

[1/5] Running unit, regression, and Phase 2 feature tests...

 ✓ tests/contractSync.test.ts (1 test) 3ms
 ✓ tests/phase2Features.test.ts (8 tests) 25ms
 ✓ tests/simulation.test.ts (8 tests) 31ms
 ✓ tests/cli.test.ts (2 tests) 512ms

 Test Files  4 passed (4)
      Tests  19 passed (19)

[2/5] Typechecking, verifying headless boundary, and building 3D bundle...
✓ built in 1.35s
[3/5] Checking determinism across Nights 1, 2, 3...
[4/5] Running full 21,600-tick Night 3 performance benchmark (limit <= 30,000 ms)...
[5/5] Verification PASSED! 21,600-tick benchmark finished in 139 ms. End: {"type":"end","ticks":21600,"state":"lost","score":0}
```

### Sample đầu ra Headless Đêm 2 (`--seed 42 --night 2 --ticks 20 --snapshot-every 20`)

```json
{"type":"snapshot","tick":0,"sim_tick":0,"night":2,"state":"playing","time_left_s":330,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,0],"vel":[0,0,0],"grounded":true,"flames":3,"carried":0,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,20],"lit":false,"deposited":0},{"id":"L2","pos":[17,0,-10],"lit":false,"deposited":0},{"id":"L3","pos":[-17,0,-10],"lit":false,"deposited":0},{"id":"L4","pos":[70,0,20],"lit":false,"deposited":0},{"id":"L5","pos":[87,0,-10],"lit":false,"deposited":0},{"id":"L6","pos":[53,0,-10],"lit":false,"deposited":0}],"shades":[],"motes":[{"id":"M1","pos":[0,0,22],"kind":"random","ttl_s":null},{"id":"M2","pos":[-15.556,0,-15.556],"kind":"random","ttl_s":null},{"id":"M3","pos":[48,0,0],"kind":"random","ttl_s":null},{"id":"M4","pos":[92,0,0],"kind":"random","ttl_s":null},{"id":"M5","pos":[-10,0,0],"kind":"random","ttl_s":null},{"id":"M6","pos":[10,0,0],"kind":"random","ttl_s":null},{"id":"M7","pos":[80,0,0],"kind":"random","ttl_s":null},{"id":"M8","pos":[15.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M9","pos":[85.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M10","pos":[0,0,10],"kind":"random","ttl_s":null},{"id":"M11","pos":[70,0,-10],"kind":"random","ttl_s":null},{"id":"M12","pos":[-22,0,0],"kind":"random","ttl_s":null},{"id":"M13","pos":[15.556,0,-15.556],"kind":"random","ttl_s":null},{"id":"M14","pos":[54.444,0,15.556],"kind":"random","ttl_s":null},{"id":"M15","pos":[-15.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M16","pos":[70,0,10],"kind":"random","ttl_s":null},{"id":"M17","pos":[54.444,0,-15.556],"kind":"random","ttl_s":null},{"id":"M18","pos":[22,0,0],"kind":"random","ttl_s":null},{"id":"M19","pos":[70,0,-22],"kind":"random","ttl_s":null},{"id":"M20","pos":[0,0,-10],"kind":"random","ttl_s":null}],"motes_active":20,"drifters":[],"charms":[{"id":"C1","available":true,"respawn_s":0}]}
{"type":"event","tick":1,"name":"night_start","data":{"night":2}}
{"type":"snapshot","tick":20,"sim_tick":20,"night":2,"state":"playing","time_left_s":329.667,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,0],"vel":[0,0,0],"grounded":true,"flames":3,"carried":0,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,20],"lit":false,"deposited":0},{"id":"L2","pos":[17,0,-10],"lit":false,"deposited":0},{"id":"L3","pos":[-17,0,-10],"lit":false,"deposited":0},{"id":"L4","pos":[70,0,20],"lit":false,"deposited":0},{"id":"L5","pos":[87,0,-10],"lit":false,"deposited":0},{"id":"L6","pos":[53,0,-10],"lit":false,"deposited":0}],"shades":[],"motes":[{"id":"M1","pos":[0,0,22],"kind":"random","ttl_s":null},{"id":"M2","pos":[-15.556,0,-15.556],"kind":"random","ttl_s":null},{"id":"M3","pos":[48,0,0],"kind":"random","ttl_s":null},{"id":"M4","pos":[92,0,0],"kind":"random","ttl_s":null},{"id":"M5","pos":[-10,0,0],"kind":"random","ttl_s":null},{"id":"M6","pos":[10,0,0],"kind":"random","ttl_s":null},{"id":"M7","pos":[80,0,0],"kind":"random","ttl_s":null},{"id":"M8","pos":[15.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M9","pos":[85.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M10","pos":[0,0,10],"kind":"random","ttl_s":null},{"id":"M11","pos":[70,0,-10],"kind":"random","ttl_s":null},{"id":"M12","pos":[-22,0,0],"kind":"random","ttl_s":null},{"id":"M13","pos":[15.556,0,-15.556],"kind":"random","ttl_s":null},{"id":"M14","pos":[54.444,0,15.556],"kind":"random","ttl_s":null},{"id":"M15","pos":[-15.556,0,15.556],"kind":"random","ttl_s":null},{"id":"M16","pos":[70,0,10],"kind":"random","ttl_s":null},{"id":"M17","pos":[54.444,0,-15.556],"kind":"random","ttl_s":null},{"id":"M18","pos":[22,0,0],"kind":"random","ttl_s":null},{"id":"M19","pos":[70,0,-22],"kind":"random","ttl_s":null},{"id":"M20","pos":[0,0,-10],"kind":"random","ttl_s":null}],"motes_active":20,"drifters":[],"charms":[{"id":"C1","available":true,"respawn_s":0}]}
{"type":"end","ticks":20,"state":"playing","score":0}
```
