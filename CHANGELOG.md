# Changelog

Tài liệu ghi nhận các mốc phát triển qua từng checkpoint/phase.

## [0.1.0] - Phase 1 (PRD-0 + Test Contract v1.0)
- Cài đặt game 3D **Đêm 1 – Đảo Bến** bằng Three.js (`src/render/`): nhân vật Mây đội nón lá treo đèn lồng, 5 Đèn Lồng Lớn, đom đóm, Bóng Mực, Tỏa sáng, HUD đầy đủ, chơi lại sau thắng/thua.
- Cài đặt lõi mô phỏng thuần TypeScript tất định `60 tick/s` (`src/core/`) và CLI headless chuẩn Test Contract v1.0 (`src/headless/cli.ts`), kèm `game.contract.json`.
- Thêm sáng tạo cục bộ trong `src/render/`: Web Audio tổng hợp (`audio.ts`) và cảnh quan bến tàu/hoa đăng biển mây (`worldDecor.ts`).
- Bổ sung bộ test đồng bộ contract, unit test cơ chế, CLI contract test (gồm mã thoát `2`), và bằng chứng `docs/proof/phase-1.md`.

## [0.0.0] - Checkpoint 0 (Chuẩn bị)
- Khởi tạo cấu trúc repo cá nhân `K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long`.
- Chọn stack: TypeScript + Three.js + Vite (3D) + Node.js (`>=20`, headless CLI) + Vitest.
- Tách ranh giới `src/core/` + `src/headless/` (compile với `tsconfig.headless.json` không có DOM) khỏi `src/render/`.
- Tạo chương trình thử Hello 3D (`src/render/helloScene.ts`) và Hello Headless tất định (`src/headless/cli.ts`), kèm `npm run verify` và GitHub Actions CI.
- Tạo hệ thống ghi chép (`docs/notes/`), bằng chứng (`docs/proof/`), và harness (`AGENTS.md`, `.agents/skills/verify-and-proof/SKILL.md`).
