# AGENTS.md — Đảo Đèn Lồng (Day 12 AI SDLC)

- **Tác giả:** Vũ Trí Dũng (MSSV: `2A202603478`, Lớp: `K5-L3A`)
- **Stack:** TypeScript + Three.js + Vite (3D WebGL) + Node.js (`>=20`, headless CLI) + Vitest.

## Quy tắc kiến trúc (Bắt buộc)

1. **Tách tuyệt đối logic khỏi hiển thị:**
   - `src/core/` và `src/headless/` **không được** import `three`, `window`, `document`, hay bất kỳ API trình duyệt nào.
   - Ranh giới này được ép bằng compile-time check trong `tsconfig.headless.json` (`"lib": ["ES2022"]`, `"types": ["node"]`).
2. **Logic phải tất định (deterministic):** Dùng PRNG có seed và fixed timestep `dt = 1/60`; không dùng `Math.random()` hay `Date.now()` trong `src/core/`.
3. **Đồng bộ Contract & Khoảng cách:** `game.contract.json` phải khớp 1:1 với `DEFAULT_TUNING` (`tests/contractSync.test.ts`). Mọi kiểm tra bán kính dùng `withinRadiusXZ` (`BOUNDARY_EPS = 1e-6`) để tránh lệch số thực IEEE-754.
4. **Sáng tạo cô lập & Trung thực:** Phần sáng tạo đồ họa/âm thanh chỉ nằm trong `src/render/`, không ảnh hưởng output headless. Không bịa yêu cầu / không sửa tay output / không viết test giả.

## Lệnh chuẩn

- Cài đặt: `npm ci` (hoặc `npm install`)
- Chạy test đơn vị & contract: `npm test`
- Build typecheck + headless + 3D: `npm run build`
- Chạy chế độ headless chuẩn contract: `node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 120 --out out.jsonl`
- Chạy kiểm chứng tổng hợp (test + build + kiểm tra tính tất định): `npm run verify`
- Chạy 3D local: `npm run dev`

## Quy trình mỗi phase

1. Đọc kỹ PRD/Ticket, tách yêu cầu bắt buộc và chỗ mơ hồ -> ghi vào `docs/notes/assumptions.md`.
2. Lên kế hoạch kiểm chứng **trước** khi code.
3. Code theo bước nhỏ, commit nhỏ, không commit `.env` hoặc API key.
4. Chạy `npm run verify` và lưu bằng chứng thật (kèm lệnh chạy và output thực) vào `docs/proof/phase-N.md`.
5. Cập nhật `docs/notes/ai-log.md` (ước tính token, lỗi AI, thay đổi harness nếu có).
6. Không xóa `AGENTS.md`, `.agents/skills/`, hoặc `.github/workflows/`; giữ nguyên trong lịch sử git.
