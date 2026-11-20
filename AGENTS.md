# AGENTS.md — Đảo Đèn Lồng (Day 12 AI SDLC)

- **Tác giả:** Vũ Trí Dũng (MSSV: `2A202603478`, Lớp: `K5-L3A`)
- **Stack:** TypeScript + Three.js + Vite (3D WebGL) + Node.js (`>=20`, headless CLI) + Vitest.

## Quy tắc kiến trúc (Bắt buộc)

1. **Tách tuyệt đối logic khỏi hiển thị:**
   - `src/core/` và `src/headless/` **không được** import `three`, `window`, `document`, hay bất kỳ API trình duyệt nào.
   - Ranh giới này được ép bằng compile-time check trong `tsconfig.headless.json` (`"lib": ["ES2022"]`, `"types": ["node"]`).
2. **Logic phải tất định (deterministic):** Dùng PRNG có seed và fixed timestep `dt = 1/60`; không dùng `Math.random()` hay `Date.now()` trong `src/core/`.
3. **Đồng bộ Contract v1.1 & Tọa độ chuẩn:**
   - `game.contract.json` (`contract_version: "1.1"`) phải khớp 1:1 với `DEFAULT_TUNING` (`tests/contractSync.test.ts`).
   - Góc bản đồ đo từ `+X`, ngược chiều kim đồng hồ khi nhìn từ trên xuống: `x = r * cos(θ), z = r * sin(θ)`.
   - Dùng `withinRadiusXZ` / `withinRadius3D` (`BOUNDARY_EPS = 1e-6`) cho kiểm tra bán kính để tránh lệch số thực IEEE-754.
   - Trạng thái Bóng Mực chuẩn: `"spawning" | "wander" | "chase" | "recoil" | "stunned"`; Gió Lạc: `"idle" | "chase" | "flee" | "removed"`.
4. **Sáng tạo cô lập & Trung thực:** Phần sáng tạo đồ họa/âm thanh/UI chỉ nằm trong `src/render/`, không ảnh hưởng output headless. Không bịa yêu cầu / không sửa tay output / không viết test giả; khi số chuẩn mới làm đổi test cũ, cập nhật kèm lý do trong `docs/notes/assumptions.md`.

## Lệnh chuẩn

- Cài đặt: `npm ci` (hoặc `npm install`)
- Chạy test đơn vị & contract: `npm test`
- Build typecheck + headless + 3D: `npm run build`
- Chạy chế độ headless (Đêm 1/2/3): `node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 120 --out out.jsonl`
- Chạy kiểm chứng tổng hợp (test + build + kiểm tra tất định 3 Đêm + benchmark 21.600 tick): `npm run verify`
- Chạy 3D local: `npm run dev`

## Quy trình mỗi phase

1. Đọc kỹ PRD/Ticket, tách yêu cầu bắt buộc và chỗ mơ hồ -> ghi vào `docs/notes/assumptions.md` và spec phase.
2. Lên kế hoạch kiểm chứng **trước** khi code.
3. Code theo bước nhỏ, commit nhỏ, không commit `.env` hoặc API key.
4. Chạy `npm run verify` và lưu bằng chứng thật (kèm lệnh chạy và output thực) vào `docs/proof/phase-N.md`.
5. Cập nhật `docs/notes/ai-log.md` và `docs/notes/retro.md`.
6. Không xóa `AGENTS.md`, `.agents/skills/`, hoặc `.github/workflows/`; không tự ý `git push`.
