# Nhật ký sử dụng AI (AI Log)

- **Sinh viên:** Vũ Trí Dũng — MSSV: `2A202603478` — Lớp: `K5-L3A`

Ghi lại công cụ AI đã dùng, ước tính token/chi phí mỗi phase, các lần AI sai (nếu có) và cách chỉnh harness để không lặp lại.

---

## Bảng theo dõi token & chi phí ước tính

| Giai đoạn | Công cụ / Model | Công việc chính | Token ước tính (In / Out) | Chi phí ước tính | Cách tiết kiệm token |
|---|---|---|---|---|---|
| CP0 (Chuẩn bị) | Antigravity AI | Đọc 6 tài liệu lab, dựng skeleton dự án, hello 3D + headless, harness, CI | ~15k in / ~6k out (ước tính phiên CP0) | Free / quota IDE | Đọc song song toàn bộ 6 file `.md` một lượt; viết code hello tối giản, không tạo asset thừa. |
| Phase 1 | Antigravity AI | Phân tích PRD-0 + Test Contract v1.0, viết `src/core/`, CLI headless, game 3D Three.js, audio, bộ 11 unit/CLI test, verify bản clone sạch | ~45k in / ~18k out (ước tính phiên Phase 1) | Free / quota IDE | Thiết kế tách `src/core/` và `game.contract.json` một lượt; viết kế hoạch test trước khi code để bắt lỗi sớm trong 1 lần sửa. |
| Phase 2 | | | | | |
| Phase 3 | | | | | |
| Phase 4 | | | | | |

---

## Nhật ký lời nhắc chính & lỗi của AI

### Checkpoint 0
- **Lời nhắc chính:** Đọc 6 file `.md` hướng dẫn lab và hoàn thành Checkpoint 0 (điền thông tin sinh viên, tạo cấu trúc dự án, chương trình thử 3D + headless, nơi ghi chép).
- **Lỗi AI gặp phải:** Chưa ghi nhận ở bước khởi tạo (sẽ cập nhật khi kiểm chứng thực tế phát hiện lỗi).
- **Cập nhật harness:** Tạo mới `AGENTS.md`, skill `.agents/skills/verify-and-proof/SKILL.md`, script `scripts/verify.mjs` và `.github/workflows/ci.yml` để ép tách logic headless khỏi 3D ngay từ đầu.

### Phase 1 (PRD-0 + Test Contract v1.0)
- **Lời nhắc chính:** Triển khai toàn bộ Phase 1 theo PRD-0 và Test Contract v1.0, tạo `game.contract.json`, tách sáng tạo ra `src/render/`, kiểm chứng đầy đủ và lưu bằng chứng.
- **Lỗi / Bất cập phát hiện khi chạy test thật:**
  1. **Lệch số thực dấu phẩy động IEEE-754 tại biên bán kính:** Cộng `6 * (1/60)` 65 lần cho `6.499999999999994`, khiến khoảng cách `9 - 6.499999999999994 = 2.500000000000006 > 2.5` bị trượt điều kiện `<= interact_radius`. **Cách sửa:** Tạo `withinRadiusXZ` với `BOUNDARY_EPS = 1e-6`.
  2. **Làm tròn `round3` quanh biên `safe_radius`:** Bóng Mực di chuyển chạm `5.000000000000007` không kích hoạt đẩy ra ngoài và khi làm tròn `round3` bị thành đúng `5.0` (trên biên). **Cách sửa:** Đẩy ra ngoài khi `dist <= safe_radius + 0.002` tới `safe_radius + 0.05`.
  3. **UTF-8 BOM khi tạo file JSON trên Windows PowerShell:** `JSON.parse` lỗi khi file `scenario.json` có BOM `\uFEFF`. **Cách sửa:** Strip BOM đầu chuỗi trước `JSON.parse` trong `src/headless/cli.ts`.
  4. **Lỗi cú pháp `if exist ... && ...` trong `cmd /c`** và dấu `&&` trong PowerShell 5.1 ở lệnh kiểm tra thủ công -> sửa sang PowerShell chuẩn có kiểm tra `$LASTEXITCODE`.
- **Cập nhật harness:** Cập nhật `AGENTS.md` bổ sung quy tắc đồng bộ `game.contract.json` (`tests/contractSync.test.ts`), bắt buộc dùng `withinRadiusXZ` cho bán kính, và cô lập phần sáng tạo trong `src/render/`.
