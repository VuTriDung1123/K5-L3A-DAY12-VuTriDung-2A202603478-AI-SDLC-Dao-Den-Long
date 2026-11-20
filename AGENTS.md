# AGENTS.md — Đảo Đèn Lồng (Day 12 AI SDLC)

- **Tác giả:** Vũ Trí Dũng (MSSV: `2A202603478`, Lớp: `K5-L3A`)
- **Stack:** TypeScript + Three.js + Vite (3D WebGL) + Node.js (`>=20`, headless CLI + soak + launcher) + Vitest.

## Quy tắc kiến trúc (Bắt buộc)

1. **Tách tuyệt đối logic khỏi hiển thị:**
   - `src/core/` và `src/headless/` **không được** import `three`, `window`, `document`, hay bất kỳ API trình duyệt nào.
   - Ranh giới này được ép bằng compile-time check trong `tsconfig.headless.json` (`"lib": ["ES2022"]`, `"types": ["node"]`).
2. **Logic phải tất định (deterministic):** Dùng PRNG có seed, fixed timestep `dt = 1/60`, và tính nhiên liệu đèn theo đơn vị nguyên `1/60` (`fuelTicks`, max `6000 = 100.0 fuel`).
3. **Đồng bộ Contract v1.3 & Luật Phase 3–4:**
   - `game.contract.json` (`contract_version: "1.3"`) phải khớp 1:1 với `DEFAULT_TUNING` và khai báo đủ `build_cmd`, `run_cmd`, `headless_cmd`, `bench_cmd`, `soak_cmd` (`tests/contractSync.test.ts`).
   - Góc bản đồ và quỹ đạo camera benchmark đo từ `+X`, ngược chiều kim đồng hồ khi nhìn từ trên xuống: `x = r * cos(θ), z = r * sin(θ)`.
   - Dùng `withinRadiusXZ` / `withinRadius3D` (`BOUNDARY_EPS = 1e-6`) cho kiểm tra bán kính.
   - Trạng thái Bóng Mực chuẩn v1.2+: `"spawning" | "wander" | "chase" | "recoil" | "stunned" | "drain"`; Gió Lạc: `"idle" | "chase" | "flee" | "removed"`.
   - Không còn thắng sớm `all_lit`: chỉ thắng `dawn_survived` khi sống tới hết giờ (`240/270/300 s`) và số đèn đang sáng `>= ceil(0.6 * tổng đèn)`.
4. **Sáng tạo cô lập & Đo lường trung thực:**
   - Phần sáng tạo đồ họa làng đèn lồng / minimap / cây cỏ / anh đào / hiệu ứng / âm thanh chỉ nằm trong `src/render/`, **tắt hoàn toàn trong chế độ benchmark** (`src/render/benchScene.ts`) và không ảnh hưởng output headless/soak.
   - Mọi số liệu `bench.json`, `soak.json`, `docs/proof/phase-*.md` phải ghi trung thực từ lần chạy thật khớp commit/tag.

## Lệnh chuẩn

- Cài đặt: `npm ci`
- Build typecheck + headless + 3D: `npm run build`
- Chạy game v1.0.0: `npm start` (`node scripts/run-game.mjs`)
- Xuất bảng xếp hạng CLI: `node scripts/run-game.mjs --export-leaderboard out.json`
- Chạy test đơn vị & contract: `npm test`
- Chạy chế độ headless (Đêm 1/2/3): `node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 120 --out out.jsonl`
- Chạy benchmark 3D chuẩn hóa (`1280×720`): `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`
- Chạy soak test 10 Đêm liên tiếp: `node dist-headless/headless/soak.js --seed 7 --nights 10 --out soak.json`
- Chạy kiểm chứng tổng hợp: `npm run verify`

## Quy trình mỗi phase

1. Đọc kỹ PRD/Ticket, ghi ADR/assumptions/spec trước khi code.
2. Cập nhật test cũ bị luật mới thay thế kèm lý do rõ ràng; viết test cho mọi cơ chế mới.
3. Code theo bước nhỏ, commit nhỏ, không commit `.env` hoặc API key.
4. Chạy `npm run verify` (cùng `bench`/`soak` ở Phase 4) và lưu bằng chứng thật vào `docs/proof/phase-N.md`.
5. Cập nhật `docs/notes/ai-log.md` và `docs/notes/retro.md`.
6. Không xóa file harness; **không tự ý `git push`** (để sinh viên tự push).
