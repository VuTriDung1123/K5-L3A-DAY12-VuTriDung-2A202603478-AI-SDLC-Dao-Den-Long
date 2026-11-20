# Changelog

Tài liệu ghi nhận các mốc phát triển qua từng checkpoint/phase.

## [0.0.0] - Checkpoint 0 (Chuẩn bị)
- Khởi tạo cấu trúc repo cá nhân `K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long`.
- Chọn stack: TypeScript + Three.js + Vite (3D) + Node.js (`>=20`, headless CLI) + Vitest.
- Tách ranh giới `src/core/` + `src/headless/` (compile với `tsconfig.headless.json` không có DOM) khỏi `src/render/`.
- Tạo chương trình thử Hello 3D (`src/render/helloScene.ts`) và Hello Headless tất định (`src/headless/cli.ts`), kèm `npm run verify` và GitHub Actions CI.
- Tạo hệ thống ghi chép (`docs/notes/`), bằng chứng (`docs/proof/`), và harness (`AGENTS.md`, `.agents/skills/verify-and-proof/SKILL.md`).
