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
- Đạt:
- Chưa đạt:
- Ảnh hưởng phase trước:
- Điều cần chỉnh:

### Phase 3 (Ticket-03)
- Đạt:
- Chưa đạt:
- Ảnh hưởng phase trước & lý do sửa/bỏ test cũ:
- Điều cần chỉnh:

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
