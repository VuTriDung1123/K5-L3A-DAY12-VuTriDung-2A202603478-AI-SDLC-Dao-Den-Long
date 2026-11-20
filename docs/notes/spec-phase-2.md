# Spec & Acceptance Criteria — Phase 2 ("Ba hòn đảo" / Ticket-02)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Contract áp dụng:** Test Contract `v1.1` (`game.contract.json`)

---

## 1. Chuẩn hóa số liệu & Bản đồ 3 Đêm (Phần 1 & 2)

| Thành phần | Tiêu chí nghiệm thu (Acceptance Criteria) |
|---|---|
| Số liệu chuẩn v1.1 | `game.contract.json` (`contract_version: "1.1"`) khớp 1:1 với `DEFAULT_TUNING`: chạy `6.0 m/s` (tăng tốc/dừng `<= 0.1 s`), nhảy `7.0 m/s`, trọng lực `-20 m/s²`, lướt `14 m/s / 0.2 s / 1.5 s`, sức chứa `10`, chi phí đèn `10`, `pickup_radius = 1.0`, `interact_radius = 2.0`, `pulse = 3 / 5 m / 3 s` (`stun 120 tick`, đẩy `4 m` trong `15 tick`), `safe_radius = 6 m` (đẩy Bóng bên trong ra trong `<= 30 tick` không gây sát thương), Bóng Mực `4.0 m/s` (`4.5` Đêm 3, phát hiện/bỏ đuổi `12 / 18 m`, `recoil 2 m / 60 tick`), rơi `Y < -10` mất 1 lửa + toàn bộ đom đóm + hồi sinh sau `60 tick` + bất tử `90 tick`. |
| Đêm 1 — Đảo Bến | Đảo tròn bán kính `40 m`, `5` đèn `L1..L5` đúng tọa độ chuẩn, `24` điểm sinh đom đóm, `12` điểm sinh Bóng Mực (`tick 300`, mỗi `8 s`, tối đa `6`), thời lượng `300 s`. |
| Đêm 2 — Đảo Cau | Hai đảo tròn bán kính `28 m` tại `(0,0,0)` và `(70,0,0)` nối bằng cầu tre `x in [26,44], z in [-2,2]`; `2` bục nhảy bán kính `1 m` tại `(20,0,18)` và `(50,0,-18)` phóng `(vy=14, vh=24)` về tâm đảo kia giữ nguyên đến khi chạm đất; `6` đèn `L1..L6`; Bóng Mực mỗi `7 s`, tối đa `8`; thời lượng `330 s`. |
| Đêm 3 — Đảo Chuông | Đảo tròn bán kính `45 m`, `3` tầng (`Y=0`, `Y=3` bán kính `12..24` với `z > 0`, `Y=6` bán kính `8`), `2` dốc thẳng rộng `3 m` tại `30°` và `150°` từ `r=30 (Y=0)` lên `r=24 (Y=3)`, bục nhảy `(0,3,13)` phóng `vy=12, vh=8` hướng `-Z` đáp tầng 2, tháp chuông trung tâm bán kính `2 m` cao `8 m` không leo được, `7` đèn `L1..L7`, `30` điểm đom đóm, gió mạnh mỗi `30 s` kéo dài `5 s` (`2 m/s`, báo trước `2 s`), Bóng Mực mỗi `6 s`, tối đa `10`; thời lượng `360 s`. |

---

## 2. Acceptance Criteria cho Phần 3 (Tính năng mới & Giao diện)

| Mục | Acceptance Criteria (Kiểm chứng được) |
|---|---|
| **Lướt (Dash)** | Nhấn `Shift`/`Space`? (Phím riêng: `LeftShift`/`RightShift` hoặc chuột phải) kích hoạt lướt `14 m/s` trong `12` tick theo hướng di chuyển (hoặc hướng quay mặt nếu đứng yên); giữ nguyên độ cao khi lướt trên không; không bất tử; hồi chiêu `1.5 s` (`90` tick) từ lúc bắt đầu; phát sự kiện `dash {}`. |
| **Gió Lạc (Drifters)** | Xuất hiện ở Đêm 2 & 3, tối đa `2` con, sinh tại tick `1200, 2400, ...` (`D1, D2, ...`). `idle` (`2 m/s`) -> `chase` (`7 m/s`) khi Mây mang `>= 5` đom đóm trong `<= 15 m` (mất điều kiện quay về `idle`). Chạm (`XZ <= 1.2 m`) cướp `min(3, carried)` -> `flee` `240` tick rồi `removed` (chỉ cướp 1 lần, bỏ qua vùng an toàn & bất tử, không mất lửa). Tỏa Sáng trúng lúc `chase` -> `flee` không cướp; trúng lúc `flee` có đồ -> thả lại đom đóm rơi tại chỗ (`drifter_drop`) và `removed` sau `120` tick. |
| **Bùa Gió (Charms)** | Đêm 2 tại `(35,0,0)` (`C1`); Đêm 3 tại `(30,0,25)` (`C1`) và `(-30,0,25)` (`C2`). Nhặt cùng luật đom đóm, phát `charm_picked`. Hiệu lực `600` tick (nhặt lại làm mới): tốc độ chạy `7.2 m/s` và Lướt không hồi chiêu (vẫn nhấn lại và bỏ qua nếu đang lướt). Tái sinh sau `2700` tick. |
| **Chuỗi 3 Đêm & Ông Đăng** | Có Menu chính -> Màn giới thiệu Đêm (tên đảo + lời Ông Đăng) -> Chơi -> Kết quả Đêm (tiếp tục Đêm kế nếu thắng, chơi lại Đêm đó nếu thua) -> Màn hình **Bình Minh** hiển thị tổng điểm khi thắng Đêm 3. |
| **Tạm dừng (`Esc` / `P`)** | Chuyển trạng thái sang `paused` (`state: "paused"`, `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; phát `paused`/`resumed`). Menu tạm dừng có: Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu. |
| **Cài đặt (Settings)** | Điều chỉnh âm lượng (`0..100%`) và độ nhạy xoay camera chuột; lưu qua `localStorage` giữa các lần mở game. |
| **Âm thanh** | Nhạc nền đêm êm dịu + hiệu ứng tổng hợp cho đủ 10 sự kiện: nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược `10 s` cuối (+ âm thanh báo gió Đêm 3). |
| **HUD & Bảng màu chuẩn** | Ngọn Lửa (trên trái), đồng hồ `mm:ss` (trên giữa, đỏ + nhấp nháy khi `<= 30 s`), đèn `k/n` và điểm (trên phải), thanh đom đóm `10` ô (dưới giữa), biểu tượng hồi chiêu Lướt & Tỏa Sáng (dưới phải), nhắc `"E — Nạp ánh sáng (x/10)"` khi gần đèn, mũi tên chỉ đèn chưa sáng gần nhất khi ngoài màn hình. Áp dụng đúng bảng màu chuẩn (Hex sai lệch `<= 10%`) và ánh sáng môi trường `0.15 + 0.55 * (đèn sáng / tổng đèn)`. |
| **Hiệu năng & Headless** | Chạy `21,600` tick chế độ headless hết tối đa `<= 30 s`; game 3D đạt `>= 30 FPS` ở `1280x720`; có test regression + test từng tính năng mới. |
