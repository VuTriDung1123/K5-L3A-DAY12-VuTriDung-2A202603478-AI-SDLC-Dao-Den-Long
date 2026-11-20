# Bằng chứng Phase 3 (Ticket-03 Change Request "Đèn cạn dầu" + Contract v1.2)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Commit code kiểm chứng:** `5be79d8` (`docs(phase-3): update README and CHANGELOG with Phase 3 breaking changes`)

## Bảng truy vết yêu cầu đến bằng chứng

| Yêu cầu Ticket-03 / DoD | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` (`v1.2`) khớp toàn bộ khóa `tuning` mới (`fuel_max`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`, thời lượng `240/270/300`) | `tests/contractSync.test.ts` so sánh 1:1 với `DEFAULT_TUNING` | `✓ tests/contractSync.test.ts (1 test)` | Đạt |
| Nhiên liệu đèn (`fuelTicks` nguyên `1/60`), hao `1/s`, châm dầu (`refuel`), tắt khi `<= 0` (`lantern_out`), thắp lại tốn `5` đom đóm (`relight: true`, `+40` điểm) | `tests/phase3Changes.test.ts` + chạy CLI kịch bản thực tế bên dưới | `6/6` tests trong `phase3Changes.test.ts` + JSONL verbatim bên dưới | Đạt |
| Đèn `fuel < 30` mất vùng an toàn (`fuel == 30` còn), Bóng `wander` tìm đèn yếu vào `<= 2 m` chuyển sang `drain` hút `5 fuel/s` (`fuel_drain` mỗi `60` tick), hết choáng về `wander`, châm dầu `>= 30` đẩy Bóng ra mép trong `<= 30` tick | `tests/phase3Changes.test.ts` (4 tests chuyên biệt cho `drain`, `+15` stun và châm dầu phục hồi vùng an toàn) | `✓ tests/phase3Changes.test.ts` + JSONL verbatim bên dưới | Đạt |
| Luật thắng mới `dawn_survived` (`>= ceil(0.6 * tổng đèn)` khi hết giờ), bỏ thắng sớm `all_lit`, công thức điểm mới (`+5`/đom đóm, `+50 + floor(fuel)` mỗi đèn sáng lúc bình minh) | `tests/simulation.test.ts` + `tests/phase3Changes.test.ts` | `25/25` tests pass trong `vitest run` | Đạt |
| Sức chứa tăng dần `10 + 2 * successful_lights` (tối đa `20`) | `tests/phase3Changes.test.ts` kiểm tra tăng từ `10 -> 12` và `18 -> 20` | `✓ scales carry capacity by +2 per successful light` | Đạt |
| Ghi chú quyết định thiết kế (ADR) & Changelog liệt kê Breaking Changes & Cập nhật test cũ kèm lý do | `docs/notes/adr-phase-3.md`, `CHANGELOG.md`, `docs/notes/assumptions.md`, comment trong `tests/simulation.test.ts` | Đã lưu và commit trong lịch sử git | Đạt |
| Regression toàn bộ tính năng Phase 1–2 không bị thay thế (Lướt, Bùa Gió, Gió Lạc, Đêm 2/3, Pause, Rơi & Hồi sinh, Tất định, Benchmark `21,600` tick `<= 30s`) | `npm run verify` (`25/25` tests + tất định 3 Đêm + benchmark `21,600` tick hoàn tất trong **`189 ms`**) | Output `npm run verify` verbatim bên dưới | Đạt |
| Chế độ Mù màu (`#00B3FF`, `#FFFFFF` + `⚠`, đèn tắt xẹp `20%` + vết rách, đèn `fuel < 30` nhấp nháy `1 Hz`) + Minimap Radar + Cây cỏ / Hiệu ứng Lướt 3D | `vite build` đóng gói sạch `dist/` (`13 modules`, `1.46s`); *Lưu ý: kiểm tra trực quan trên trình duyệt chờ sinh viên mở `npm run dev` do Chrome chưa bật remote debugging* | Build 3D thành công không lỗi TypeScript/Vite | Chờ sinh viên tự kiểm trên trình duyệt (`npm run dev`) |

---

## Output thực tế (verbatim)

### 1. Kết quả `npm run verify` (25 tests + Build + Tất định 3 Đêm + Benchmark 21.600 tick)

```text
> k5-l3a-day12-vutridung-dao-den-long@0.1.0 verify
> node scripts/verify.mjs

[1/5] Running unit, regression, and Phase 2 feature tests...

 ✓ tests/contractSync.test.ts (1 test) 2ms
 ✓ tests/phase3Changes.test.ts (6 tests) 15ms
 ✓ tests/phase2Features.test.ts (8 tests) 33ms
 ✓ tests/simulation.test.ts (8 tests) 45ms
 ✓ tests/cli.test.ts (2 tests) 512ms

 Test Files  5 passed (5)
      Tests  25 passed (25)

[2/5] Typechecking, verifying headless boundary, and building 3D bundle...
vite v6.4.6 building for production...
transforming...
✓ 13 modules transformed.
dist/index.html                 16.41 kB │ gzip:   4.18 kB
dist/assets/index-CWfVll8V.js  554.55 kB │ gzip: 142.95 kB
✓ built in 1.46s
[3/5] Checking determinism across Nights 1, 2, 3...
[4/5] Running full 21,600-tick Night 3 performance benchmark (limit <= 30,000 ms)...
[5/5] Verification PASSED! 21,600-tick benchmark finished in 189 ms. End: {"type":"end","ticks":21600,"state":"lost","score":0}
```

### 2. Chạy CLI Headless kịch bản Phase 3 (`fuel_drain`, `lantern_out`, `relight`, `refuel`, `capacity`, `dawn_survived`)

Lệnh thực thi:

```powershell
node dist-headless/headless/cli.js --seed 42 --night 1 --scenario scenario.json --inputs inputs.json --ticks 200 --out out.jsonl --snapshot-every 50
```

Output JSONL thực tế:

```json
{"type":"snapshot","tick":0,"sim_tick":0,"night":1,"state":"playing","time_left_s":2.5,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,24],"vel":[0,0,0],"grounded":true,"flames":3,"carried":8,"capacity":10,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":true,"deposited":10,"fuel":1,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":80,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":20,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0}],"shades":[{"id":"S1","pos":[14.7,0.8,-19.5],"state":"drain"}],"motes":[],"motes_active":0,"drifters":[],"charms":[]}
{"type":"event","tick":1,"name":"night_start","data":{"night":1}}
{"type":"snapshot","tick":50,"sim_tick":50,"night":1,"state":"playing","time_left_s":1.667,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,24],"vel":[0,0,0],"grounded":true,"flames":3,"carried":8,"capacity":10,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":true,"deposited":10,"fuel":0.2,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":79.2,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":15,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0}],"shades":[{"id":"S1","pos":[14.7,0.8,-19.5],"state":"drain"}],"motes":[],"motes_active":0,"drifters":[],"charms":[]}
{"type":"event","tick":60,"name":"fuel_drain","data":{"lantern_id":"L3","shade_id":"S1","fuel":14}}
{"type":"event","tick":60,"name":"lantern_out","data":{"lantern_id":"L1"}}
{"type":"event","tick":71,"name":"deposit","data":{"lantern_id":"L1","amount":5,"deposited":5}}
{"type":"event","tick":71,"name":"lantern_lit","data":{"lantern_id":"L1","relight":true}}
{"type":"snapshot","tick":100,"sim_tick":100,"night":1,"state":"playing","time_left_s":0.833,"score":65,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,24],"vel":[0,0,0],"grounded":true,"flames":3,"carried":3,"capacity":12,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":true,"deposited":5,"fuel":99.5,"ever_lit":true,"relit_count":1},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":78.3,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":10,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0}],"shades":[{"id":"S1","pos":[14.7,0.8,-19.5],"state":"drain"}],"motes":[],"motes_active":0,"drifters":[],"charms":[]}
{"type":"event","tick":120,"name":"fuel_drain","data":{"lantern_id":"L3","shade_id":"S1","fuel":8}}
{"type":"event","tick":131,"name":"refuel","data":{"lantern_id":"L1","amount":1,"fuel":100}}
{"type":"event","tick":150,"name":"game_over","data":{"result":"won","reason":"dawn_survived"}}
{"type":"snapshot","tick":150,"sim_tick":150,"night":1,"state":"won","time_left_s":0,"score":551,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,24],"vel":[0,0,0],"grounded":true,"flames":3,"carried":2,"capacity":12,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":true,"deposited":5,"fuel":99.7,"ever_lit":true,"relit_count":1},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":77.5,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":5,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0}],"shades":[{"id":"S1","pos":[14.7,0.8,-19.5],"state":"drain"}],"motes":[],"motes_active":0,"drifters":[],"charms":[]}
{"type":"end","ticks":150,"state":"won","score":551}
```
