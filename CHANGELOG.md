# Changelog

Tài liệu ghi nhận các mốc phát triển qua từng checkpoint/phase.

## [0.2.0] - Phase 2 (Ticket-02 "Ba hòn đảo" + Test Contract v1.1)
- Chuẩn hóa `game.contract.json` (`v1.1`) và toàn bộ số liệu vật lý, đom đóm, đèn lồng, Tỏa Sáng, Bóng Mực (`spawning/wander/chase/recoil/stunned`), rơi khỏi đảo và tính điểm.
- Mở rộng thành 3 Đêm chuẩn: Đêm 1 (Đảo Bến), Đêm 2 (Đảo Cau với cầu tre, bục nhảy, Bùa Gió, Gió Lạc), Đêm 3 (Đảo Chuông 3 tầng, dốc `30°`/`150°`, bục nhảy, tháp chuông, gió mạnh).
- Bổ sung cơ chế Lướt (`dash`), Tạm dừng (`pause`/`resumed`), Gió Lạc (`drifters`), Bùa Gió (`charms`), đom đóm rơi có TTL `480` tick, và đẩy Bóng trong `safe_radius` ra mép trong `<= 30` tick.
- Hoàn thiện UI/UX 3D theo bảng màu chuẩn: Menu chính, lời Ông Đăng giới thiệu Đêm, màn hình Bình Minh, Menu tạm dừng (`Esc`/`P`), Cài đặt âm lượng & độ nhạy chuột (`localStorage`), HUD đầy đủ + mũi tên chỉ đèn ngoài màn hình + âm thanh tổng hợp đầy đủ.
- Thêm suite kiểm chứng mở rộng (19 tests), kiểm tra tất định 3 Đêm và benchmark `21,600` tick.

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
