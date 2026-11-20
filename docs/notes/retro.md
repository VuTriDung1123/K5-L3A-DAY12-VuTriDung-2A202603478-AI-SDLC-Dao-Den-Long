# Đánh giá từng Phase & Retro cuối dự án

- **Sinh viên:** Vũ Trí Dũng — MSSV: `2A202603478` — Lớp: `K5-L3A`

---

## Đánh giá nhanh từng phase

### Checkpoint 0 — Chuẩn bị
- **Đạt:** Cấu trúc repo, harness, CI, chương trình thử Hello 3D + Hello Headless, kiểm tra clone sạch sang thư mục khác.
- **Chưa xong / Chờ thao tác thủ công:** Đăng nhập `claude.ai` để kiểm tra lab board Phase 1 và xác nhận lịch/hạn nộp chính xác từ Coach.
- **Bài học / Điều chỉnh:** Ranh giới `tsconfig.headless.json` giúp phát hiện ngay nếu code logic vô tình chạm API trình duyệt.

### Phase 1 (PRD-0)
- **Đạt:** Toàn bộ yêu cầu lõi Đêm 1 – Đảo Bến (`src/render/`), mô phỏng thuần `60 tick/s` (`src/core/`), `game.contract.json` đồng bộ tự động, 11/11 test (unit + contract sync + CLI exit codes), tính tất định tuyệt đối và bản clone sạch pass.
- **Chưa đạt / Chờ kiểm thủ công:** Công cụ kiểm tra trình duyệt tự động bị chặn do Chrome chưa bật remote debugging (`DevToolsActivePort`), nên việc chơi thử trực quan trên WebGL cần sinh viên tự mở `npm run dev` kiểm lại.
- **Ảnh hưởng phase trước:** Nâng cấp từ chương trình Hello ở CP0 lên mô phỏng Đêm 1 hoàn chỉnh; giữ nguyên ranh giới `tsconfig.headless.json`.
- **Điều cần chỉnh ở harness / quy trình:** Bổ sung quy tắc dùng `withinRadiusXZ` (`BOUNDARY_EPS`) và cô lập sáng tạo ở `src/render/` vào `AGENTS.md` sau khi test thật phát hiện lỗi biên số thực.

### Phase 2 (Ticket-02)
- **Đạt:** Đồng bộ Contract v1.1 (`game.contract.json` + `DEFAULT_TUNING`), đủ 3 bản đồ Đêm 1/2/3, đầy đủ cơ chế mới (Lướt, Bùa Gió, Gió Lạc, Gió mạnh, Pause, Rơi & Hồi sinh), UI Menu/Ông Đăng/Settings/HUD/Audio, 19/19 tests pass, benchmark 21.600 tick chỉ `139 ms`.
- **Chưa đạt / Chờ kiểm thủ công:** Đo FPS thực tế ở `1280x720` và kiểm tra trải nghiệm chơi 3D trên trình duyệt chờ sinh viên chạy `npm run dev` (do Chrome chưa bật remote debugging).
- **Ảnh hưởng phase trước:** Ticket-02 chuẩn hóa lại nhiều thông số so với Phase 1 (`carry_capacity` 5->10, `lantern_cost` 3->10, `per_mote` tính khi nạp đèn, `fall_enabled` false->true, ...). Đã cập nhật toàn bộ test regression kèm lý do trong `docs/notes/assumptions.md`.
- **Điều cần chỉnh:** Luôn test xuất phát mặc định `(0,0,0)` trên mọi bản đồ mới để phát hiện sớm va chạm cản đường.

### Phase 3 (Ticket-03)
- **Đạt:** Thay thế mượt mà 4 luật cốt lõi sang Contract v1.2 (nhiên liệu đèn `fuelTicks` nguyên `1/60`, Bóng hút dầu `drain`, luật thắng `dawn_survived`, bảng điểm mới & sức chứa tăng dần `10..20`), ghi ADR-001 & Breaking Changes trong `CHANGELOG.md`, nâng cấp mạnh đồ họa 3D (Minimap Radar, cỏ cây đung đưa, vệt Lướt, thanh dầu 3D, chế độ Mù màu), 25/25 tests pass ngay lượt đầu.
- **Chưa đạt / Chờ kiểm thủ công:** Trải nghiệm trực quan trên trình duyệt chờ sinh viên mở `npm run dev` kiểm tra.
- **Ảnh hưởng phase trước & lý do sửa/bỏ test cũ:** Các test ở `tests/simulation.test.ts` giả định đèn sáng vĩnh viễn và thắng sớm `all_lit` đã được cập nhật sang luật `dawn_survived` và điểm `+5`/đom đóm (ghi rõ trong `docs/notes/assumptions.md`); toàn bộ 8 test tính năng Phase 2 (`tests/phase2Features.test.ts`) vẫn pass 100% không cần sửa.
- **Điều cần chỉnh:** Dùng số nguyên `1/60` (`fuelTicks`) theo gợi ý của ticket giúp tránh hoàn toàn lỗi làm tròn số thực.

### Phase 4 (Ticket-04)
- Đạt:
- Chưa đạt:
- Kết quả đo hiệu năng:
- Điều cần chỉnh:

---

## Retro tổng kết dự án (hoàn thành ở Checkpoint 5)
1. **Điều gì hiệu quả khi làm việc với AI:**
2. **Những lần AI sai và cách phát hiện:**
3. **Thành phần harness hữu ích nhất:**
4. **Tổng kết token/chi phí và bài học tiết kiệm:**
5. **Nếu làm lại sẽ thay đổi gì:**
