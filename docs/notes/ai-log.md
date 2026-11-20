# Nhật ký sử dụng AI (AI Log)

- **Sinh viên:** Vũ Trí Dũng — MSSV: `2A202603478` — Lớp: `K5-L3A`

Ghi lại công cụ AI đã dùng, ước tính token/chi phí mỗi phase, các lần AI sai (nếu có) và cách chỉnh harness để không lặp lại.

---

## Bảng theo dõi token & chi phí ước tính

| Giai đoạn | Công cụ / Model | Công việc chính | Token ước tính (In / Out) | Chi phí ước tính | Cách tiết kiệm token |
|---|---|---|---|---|---|
| CP0 (Chuẩn bị) | Antigravity AI | Đọc 6 tài liệu lab, dựng skeleton dự án, hello 3D + headless, harness, CI | ~15k in / ~6k out (ước tính phiên CP0) | Free / quota IDE | Đọc song song toàn bộ 6 file `.md` một lượt; viết code hello tối giản, không tạo asset thừa. |
| Phase 1 | | | | | |
| Phase 2 | | | | | |
| Phase 3 | | | | | |
| Phase 4 | | | | | |

---

## Nhật ký lời nhắc chính & lỗi của AI

### Checkpoint 0
- **Lời nhắc chính:** Đọc 6 file `.md` hướng dẫn lab và hoàn thành Checkpoint 0 (điền thông tin sinh viên, tạo cấu trúc dự án, chương trình thử 3D + headless, nơi ghi chép).
- **Lỗi AI gặp phải:** Chưa ghi nhận ở bước khởi tạo (sẽ cập nhật khi kiểm chứng thực tế phát hiện lỗi).
- **Cập nhật harness:** Tạo mới `AGENTS.md`, skill `.agents/skills/verify-and-proof/SKILL.md`, script `scripts/verify.mjs` và `.github/workflows/ci.yml` để ép tách logic headless khỏi 3D ngay từ đầu.
