# Bằng chứng Phase 1 (PRD-0 + Test Contract v1.0)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Commit code kiểm chứng:** `d70c1e9` (`docs(phase-1): update README, CHANGELOG, CREDITS, and Phase 1 assumptions`)

## Bảng truy vết yêu cầu đến bằng chứng

| Yêu cầu PRD-0 / Test Contract v1.0 | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` theo schema v1.0, `lantern_count_night1 = 5`, khớp logic game | `tests/contractSync.test.ts` so sánh `game.contract.json` với `DEFAULT_TUNING` | `✓ tests/contractSync.test.ts (1 test)` trong `npm run verify` | Đạt |
| Logic `60 tick/s`, tách hoàn toàn khỏi Three.js/DOM | `tsc -p tsconfig.headless.json` chỉ gồm `src/core/` + `src/headless/` với `"lib": ["ES2022"], "types": ["node"]` | Bước `[2/4]` của `npm run verify` pass không lỗi | Đạt |
| Mô hình tick `0..N`, tọa độ `round3`, `cam_yaw_deg`, chuẩn hóa `move`, nhảy | `tests/simulation.test.ts` kiểm tra tick 0, góc xoay camera `90°`, chuẩn hóa `[1,1]`, nhảy `pos[1] > 0` | `8/8` tests pass trong `tests/simulation.test.ts` | Đạt |
| Đom đóm, `carry_capacity`, nạp đèn từng phần & đủ để thắng `all_lit` + thưởng | `tests/simulation.test.ts` + chạy CLI kịch bản thắng thực tế (`tick 61`, `score: 755`) | Output JSONL verbatim bên dưới | Đạt |
| Tỏa sáng (`pulse`): đẩy lùi, làm choáng (`stunned`), hồi chiêu, hồi phục | `tests/simulation.test.ts` + CLI kịch bản (`stunned_ids: ["S1"]`) | Output JSONL verbatim bên dưới | Đạt |
| Bóng Mực đuổi, bị chặn ngoài `safe_radius`, chạm mất lửa / rơi đom đóm / `invuln_s`, thua `no_flames` & `dawn` | `tests/simulation.test.ts` kiểm tra mọi snapshot `distXZ > 5`, 2 lần chạm cách nhau `>= 90` ticks, thua `dawn` ở `time_left_s = 0` | `8/8` tests pass trong `tests/simulation.test.ts` | Đạt |
| CLI đúng tham số, thoát `0` khi xong, thoát `2` khi lỗi định dạng `scenario`/`inputs` | `tests/cli.test.ts` chạy qua `cli.ts` + chạy trực tiếp `dist-headless/headless/cli.js` | `2/2` tests pass + `EXIT=0` ở bản clone sạch | Đạt |
| Tính tất định tuyệt đối | `scripts/verify.mjs` chạy 2 lần `--seed 42 --night 1 --ticks 120` và so khớp byte-by-byte | Bước `[3/4]` & `[4/4]` của `npm run verify` | Đạt |
| Clone sạch theo `build_cmd` và chạy `headless_cmd` trong `game.contract.json` | Clone sang `%TEMP%\ddl-phase1-clean-clone`, chạy `npm ci && npm run build`, `npm run verify`, `node dist-headless/headless/cli.js ...` | Toàn bộ pass với exit code `0` (xem mục 1 bên dưới) | Đạt |
| Phần sáng tạo (`src/render/audio.ts`, `worldDecor.ts`) không đổi đầu ra headless | Cô lập hoàn toàn trong `src/render/`; `tsconfig.headless.json` không compile `src/render/` | Headless & `verify` vẫn xanh và bất biến giữa các lần chạy | Đạt |
| Trình duyệt 3D (`npm run dev`): Mây đội nón lá, 5 đèn, HUD, chơi thử thắng/thua & chơi lại | `vite build` đóng gói thành công `dist/` (`12 modules`, `1.31s`); *Lưu ý: công cụ browser tự động không kết nối được Chrome (chưa bật Chrome remote debugging)* | Build 3D thành công; sinh viên tự chơi kiểm trên `npm run dev` | Chưa kiểm tự động trên trình duyệt (đã build sạch) |

---

## Output thực tế (verbatim)

### 1. Kiểm chứng trên bản clone sạch (`build_cmd` + `npm run verify` + `headless_cmd`)

Lệnh thực thi trên `%TEMP%\ddl-phase1-clean-clone` (commit `d70c1e9`):

```powershell
git clone . $tmp
npm ci
npm run build
npm run verify
node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 60 --out contract-check.jsonl --snapshot-every 30
```

Output thực tế:

```text
Cloning into 'C:\Users\VUTRID~1\AppData\Local\Temp\ddl-phase1-clean-clone'...
done.

added 65 packages, and audited 66 packages in 6s

> k5-l3a-day12-vutridung-dao-den-long@0.1.0 build
> tsc --noEmit && tsc -p tsconfig.headless.json && vite build

vite v6.4.6 building for production...
transforming...
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  6.76 kB │ gzip:   2.02 kB
dist/assets/index-BSXAp-Ns.js  502.82 kB │ gzip: 128.90 kB
✓ built in 1.31s

> k5-l3a-day12-vutridung-dao-den-long@0.1.0 verify
> node scripts/verify.mjs

[1/4] Running unit and contract tests...

 ✓ tests/contractSync.test.ts (1 test) 3ms
 ✓ tests/simulation.test.ts (8 tests) 14ms
 ✓ tests/cli.test.ts (2 tests) 411ms

 Test Files  3 passed (3)
      Tests  11 passed (11)

[2/4] Typechecking, verifying headless boundary, and building 3D bundle...
✓ built in 1.31s
[3/4] Running Test Contract v1.0 headless determinism check...
[4/4] Verification PASSED! Initial snapshot and end line validated.
End line: {"type":"end","ticks":120,"state":"playing","score":0}
```

Đầu ra `contract-check.jsonl` từ `node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 60 --out contract-check.jsonl --snapshot-every 30`:

```json
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":180,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[{"id":"L1","pos":[0,0,20],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":false,"deposited":0},{"id":"L3","pos":[11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L4","pos":[-11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L5","pos":[-19.021,0,6.18],"lit":false,"deposited":0}],"shades":[{"id":"S1","pos":[-1.614,0.8,15.088],"state":"chase"},{"id":"S2","pos":[11.358,0.8,26.561],"state":"chase"}],"motes":[{"id":"M1","pos":[-18.446,0,-13.598]},{"id":"M2","pos":[16.346,0,-21.781]},{"id":"M3","pos":[11.168,0,21.856]},{"id":"M4","pos":[-3.842,0,26.141]},{"id":"M5","pos":[15.547,0,-17.529]},{"id":"M6","pos":[0.015,0,30.736]},{"id":"M7","pos":[-0.524,0,-19.561]},{"id":"M8","pos":[7.816,0,22.714]},{"id":"M9","pos":[-10.146,0,-24.114]},{"id":"M10","pos":[23.391,0,0.565]},{"id":"M11","pos":[5.249,0,-8.585]},{"id":"M12","pos":[-7.235,0,-4.741]}],"motes_active":12}
{"type":"snapshot","tick":30,"sim_tick":30,"state":"playing","time_left_s":179.5,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[{"id":"L1","pos":[0,0,20],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":false,"deposited":0},{"id":"L3","pos":[11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L4","pos":[-11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L5","pos":[-19.021,0,6.18],"lit":false,"deposited":0}],"shades":[{"id":"S1","pos":[-1.423,0.8,13.298],"state":"chase"},{"id":"S2","pos":[10.65,0.8,24.906],"state":"chase"}],"motes":[{"id":"M1","pos":[-18.446,0,-13.598]},{"id":"M2","pos":[16.346,0,-21.781]},{"id":"M3","pos":[11.168,0,21.856]},{"id":"M4","pos":[-3.842,0,26.141]},{"id":"M5","pos":[15.547,0,-17.529]},{"id":"M6","pos":[0.015,0,30.736]},{"id":"M7","pos":[-0.524,0,-19.561]},{"id":"M8","pos":[7.816,0,22.714]},{"id":"M9","pos":[-10.146,0,-24.114]},{"id":"M10","pos":[23.391,0,0.565]},{"id":"M11","pos":[5.249,0,-8.585]},{"id":"M12","pos":[-7.235,0,-4.741]}],"motes_active":12}
{"type":"snapshot","tick":60,"sim_tick":60,"state":"playing","time_left_s":179,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[{"id":"L1","pos":[0,0,20],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":false,"deposited":0},{"id":"L3","pos":[11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L4","pos":[-11.756,0,-16.18],"lit":false,"deposited":0},{"id":"L5","pos":[-19.021,0,6.18],"lit":false,"deposited":0}],"shades":[{"id":"S1","pos":[-1.231,0.8,11.508],"state":"chase"},{"id":"S2","pos":[9.943,0.8,23.251],"state":"chase"}],"motes":[{"id":"M1","pos":[-18.446,0,-13.598]},{"id":"M2","pos":[16.346,0,-21.781]},{"id":"M3","pos":[11.168,0,21.856]},{"id":"M4","pos":[-3.842,0,26.141]},{"id":"M5","pos":[15.547,0,-17.529]},{"id":"M6","pos":[0.015,0,30.736]},{"id":"M7","pos":[-0.524,0,-19.561]},{"id":"M8","pos":[7.816,0,22.714]},{"id":"M9","pos":[-10.146,0,-24.114]},{"id":"M10","pos":[23.391,0,0.565]},{"id":"M11","pos":[5.249,0,-8.585]},{"id":"M12","pos":[-7.235,0,-4.741]}],"motes_active":12}
{"type":"end","ticks":60,"state":"playing","score":0}
```

### 2. Chạy thử kịch bản đầy đủ sự kiện (`mote_picked`, `player_hit`, `pulse`, `deposit`, `lantern_lit`, `game_over`, `end`)

Lệnh chạy qua `node dist-headless/headless/cli.js --seed 42 --night 1 --scenario scenario.json --inputs inputs.json --ticks 120 --out out.jsonl --snapshot-every 20`:

```json
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":100,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[{"id":"L1","pos":[0,0,8],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":true,"deposited":3},{"id":"L3","pos":[11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L4","pos":[-11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L5","pos":[-19.021,0,6.18],"lit":true,"deposited":3}],"shades":[{"id":"S1","pos":[0,0.8,0.5],"state":"chase"}],"motes":[{"id":"M1","pos":[0,0,1]},{"id":"M2","pos":[0,0,2]},{"id":"M3","pos":[0,0,3]},{"id":"M4","pos":[0,0,4]}],"motes_active":4}
{"type":"event","tick":1,"name":"mote_picked","data":{"carried":1}}
{"type":"event","tick":1,"name":"player_hit","data":{"by":"shade","flames":2,"dropped":0}}
{"type":"event","tick":5,"name":"mote_picked","data":{"carried":2}}
{"type":"event","tick":15,"name":"mote_picked","data":{"carried":3}}
{"type":"event","tick":19,"name":"pulse","data":{"stunned_ids":["S1"]}}
{"type":"snapshot","tick":20,"sim_tick":20,"state":"playing","time_left_s":99.667,"score":55,"player":{"pos":[0,0,2],"flames":2,"carried":2},"lanterns":[{"id":"L1","pos":[0,0,8],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":true,"deposited":3},{"id":"L3","pos":[11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L4","pos":[-11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L5","pos":[-19.021,0,6.18],"lit":true,"deposited":3}],"shades":[{"id":"S1","pos":[0,0.8,-3.28],"state":"stunned"}],"motes":[{"id":"M4","pos":[0,0,4]}],"motes_active":1}
{"type":"event","tick":25,"name":"mote_picked","data":{"carried":3}}
{"type":"snapshot","tick":40,"sim_tick":40,"state":"playing","time_left_s":99.333,"score":65,"player":{"pos":[0,0,4],"flames":2,"carried":3},"lanterns":[{"id":"L1","pos":[0,0,8],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":true,"deposited":3},{"id":"L3","pos":[11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L4","pos":[-11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L5","pos":[-19.021,0,6.18],"lit":true,"deposited":3}],"shades":[{"id":"S1","pos":[0,0.8,-3.28],"state":"stunned"}],"motes":[],"motes_active":0}
{"type":"snapshot","tick":60,"sim_tick":60,"state":"playing","time_left_s":99,"score":65,"player":{"pos":[0,0,6],"flames":2,"carried":3},"lanterns":[{"id":"L1","pos":[0,0,8],"lit":false,"deposited":0},{"id":"L2","pos":[19.021,0,6.18],"lit":true,"deposited":3},{"id":"L3","pos":[11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L4","pos":[-11.756,0,-16.18],"lit":true,"deposited":3},{"id":"L5","pos":[-19.021,0,6.18],"lit":true,"deposited":3}],"shades":[{"id":"S1","pos":[0,0.8,-3.28],"state":"stunned"}],"motes":[],"motes_active":0}
{"type":"event","tick":61,"name":"deposit","data":{"lantern_id":"L1","amount":3,"deposited":3}}
{"type":"event","tick":61,"name":"lantern_lit","data":{"lantern_id":"L1"}}
{"type":"event","tick":61,"name":"game_over","data":{"result":"won","reason":"all_lit"}}
{"type":"end","ticks":61,"state":"won","score":755}
```
