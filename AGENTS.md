# AGENTS.md — Đảo Đèn Lồng (Day 12 AI SDLC)

- **Tác giả:** Vũ Trí Dũng (MSSV: `2A202603478`, Lớp: `K5-L3A`)
- **Stack:** TypeScript + Three.js + Vite (3D WebGL) + Node.js (`>=20`, headless CLI) + Vitest.

## Quy tắc kiến trúc (Bắt buộc)

1. **Tách tuyệt đối logic khỏi hiển thị:**
   - `src/core/` và `src/headless/` **không được** import `three`, `window`, `document`, hay bất kỳ API trình duyệt nào.
   - Ranh giới này được ép bằng compile-time check trong `tsconfig.headless.json` (`"lib": ["ES2022"]`, `"types": ["node"]`).
2. **Logic phải tất định (deterministic):** Dùng PRNG có seed, fixed timestep `dt = 1/60`, và tính nhiên liệu đèn theo đơn vị nguyên `1/60` (`fuelTicks`, max `6000 = 100.0 fuel`).
3. **Đồng bộ Contract v1.2 & Luật Phase 3:**
   - `game.contract.json` (`contract_version: "1.2"`) phải khớp 1:1 với `DEFAULT_TUNING` (`tests/contractSync.test.ts`).
   - Góc bản đồ đo từ `+X`, ngược chiều kim đồng hồ khi nhìn từ trên xuống: `x = r * cos(θ), z = r * sin(θ)`.
   - Dùng `withinRadiusXZ` / `withinRadius3D` (`BOUNDARY_EPS = 1e-6`) cho kiểm tra bán kính.
   - Trạng thái Bóng Mực chuẩn v1.2: `"spawning" | "wander" | "chase" | "recoil" | "stunned" | "drain"`; Gió Lạc: `"idle" | "chase" | "flee" | "removed"`.
   - Không còn thắng sớm `all_lit`: chỉ thắng `dawn_survived` khi sống tới hết giờ (`240/270/300 s`) và số đèn đang sáng `>= ceil(0.6 * tổng đèn)`.
4. **Sáng tạo cô lập & Trung thực:** Phần sáng tạo đồ họa/minimap/cây cỏ/hiệu ứng/âm thanh chỉ nằm trong `src/render/`, không ảnh hưởng output headless. Khi luật mới thay thế luật cũ, ghi ADR (`docs/notes/adr-phase-3.md`), cập nhật `CHANGELOG.md` và sửa test cũ kèm lý do trong `docs/notes/assumptions.md`.

## Lệnh chuẩn

- Cài đặt: `npm ci` (hoặc `npm install`)
- Chạy test đơn vị & contract: `npm test`
- Build typecheck + headless + 3D: `npm run build`
- Chạy chế độ headless (Đêm 1/2/3): `node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 120 --out out.jsonl`
- Chạy kiểm chứng tổng hợp (test + build + kiểm tra tất định 3 Đêm + benchmark 21.600 tick): `npm run verify`
- Chạy 3D local: `npm run dev`

## Quy trình mỗi phase

1. Đọc kỹ PRD/Ticket, ghi ADR/assumptions/spec trước khi code.
2. Cập nhật test cũ bị luật mới thay thế kèm lý do rõ ràng; viết test cho mọi cơ chế mới.
3. Code theo bước nhỏ, commit nhỏ, không commit `.env` hoặc API key.
4. Chạy `npm run verify` và lưu bằng chứng thật vào `docs/proof/phase-N.md`.
5. Cập nhật `docs/notes/ai-log.md` và `docs/notes/retro.md`.
6. Không xóa file harness; **không tự ý `git push`** (để sinh viên tự push).
