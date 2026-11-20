# Credits & Attribution

- **Sinh viên thực hiện:** Vũ Trí Dũng (`2A202603478`, Lớp `K5-L3A`)
- **Đề bài & bối cảnh gốc:** Day 12 — AI SDLC: *Đảo Đèn Lồng* (Mây, đom đóm, Đèn Lồng Lớn, Bóng Mực, Gió Lạc, Ông Đăng, 3 hòn đảo).

## Thư viện & Công cụ mã nguồn mở

| Thành phần | Giấy phép | Ghi chú |
|---|---|---|
| Three.js (`three`) | MIT | Engine đồ họa 3D WebGL / InstancedMesh benchmark |
| Vite (`vite`) | MIT | Bundler & dev server |
| TypeScript (`typescript`) | Apache-2.0 | Ngôn ngữ & ép ranh giới headless không DOM |
| Vitest (`vitest`) | MIT | Unit, contract sync & regression test runner |
| tsx (`tsx`) | MIT | Thực thi TypeScript trong phát triển |
| Node.js (`>=20`) | MIT | Runtime cho headless CLI, soak test & launcher `scripts/run-game.mjs` |

## Asset đồ họa & Âm thanh

| Tài nguyên | Nguồn gốc / Giấy phép | Ghi chú |
|---|---|---|
| Toàn bộ mô hình 3D trong game (Mây, Đèn Lồng Lớn, Bóng Mực, Gió Lạc, Bùa Gió, Tháp Chuông, cổng Torii, nhà đền mái ngói shoji, cây anh đào & cánh hoa, rặng tre, đèn đá *tōrō*, thảm cỏ, ao nước) | Tự lập trình thủ tục (procedural Three.js primitives) trong `src/render/` | MIT (thuộc dự án), không tải asset 3D từ bên thứ ba |
| Nhạc nền ngũ cung & toàn bộ hiệu ứng âm thanh (SFX) | Tổng hợp thời gian thực bằng Web Audio API trong `src/render/audio.ts` | MIT (thuộc dự án), không dùng file âm thanh có bản quyền |
| Ảnh minh họa `docs/images/dao-den-long-showcase.jpg` | Ảnh minh họa nghệ thuật do AI tạo (công cụ `image-generator` của Antigravity AI) theo mô tả phong cách ngôi làng cổ Nhật Bản lung linh ánh đèn của sinh viên | Dùng làm ảnh bìa minh họa ý tưởng cho `README.md` |

## Công cụ AI hỗ trợ

- **Antigravity AI coding assistant:** Hỗ trợ phân tích PRD/Ticket, xây dựng kiến trúc tách biệt `src/core` – `src/headless` – `src/render`, tạo harness (`AGENTS.md`, `verify-and-proof`), viết test tự động, benchmark/soak script và tài liệu kiểm chứng theo điều phối và nghiệm thu của sinh viên.
- **Antigravity `image-generator`:** Tạo ảnh minh họa `docs/images/dao-den-long-showcase.jpg` cho `README.md`.
