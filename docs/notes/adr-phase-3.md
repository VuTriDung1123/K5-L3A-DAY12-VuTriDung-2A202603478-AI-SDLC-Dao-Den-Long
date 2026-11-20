# ADR-001: Thay đổi mô hình trạng thái Đèn Lồng, Bóng Mực hút dầu và Luật thắng Bình Minh (Phase 3 / Ticket-03)

- **Ngày:** 2026-11-20
- **Tác giả:** Vũ Trí Dũng (`2A202603478`, `K5-L3A`)
- **Trạng thái:** Đã chấp nhận & Triển khai (Test Contract `v1.2`)

---

## 1. Bối cảnh (Context)

Ở Phase 1 và Phase 2 (Contract `v1.0` – `v1.1`):
1. Đèn Lồng là máy trạng thái một chiều (`unlit -> lit`): khi nạp đủ `10` đom đóm thì sáng vĩnh viễn tới hết Đêm, không nhận thêm đom đóm và luôn giữ vùng an toàn `6 m`.
2. Bóng Mực không bao giờ vào được vùng `6 m` quanh đèn đang sáng.
3. Trò chơi kết thúc **thắng ngay lập tức** (`reason: "all_lit"`) tại tick thắp sáng chiếc đèn cuối cùng.

Qua playtest, người chơi có kinh nghiệm thắp đủ đèn chỉ sau ~2 phút làm giảm kịch tính cuối màn. **Ticket-03 ("Đèn cạn dầu")** yêu cầu thay thế 3 luật cốt lõi trên để chuyển mục tiêu sang **"giữ đảo sáng tới bình minh"**.

---

## 2. Quyết định thiết kế (Decisions)

### A. Mô hình trạng thái Đèn Lồng có Nhiên liệu (`fuelTicks` nguyên theo đơn vị `1/60`)
- Thay vì chỉ lưu `lit: boolean`, mỗi `LanternState` lưu thêm:
  - `fuelTicks: number` (số nguyên từ `0` đến `6000`, biểu diễn chính xác đơn vị `1/60` nhiên liệu; `6000 fuelTicks = 100.0 fuel`).
  - `ever_lit: boolean` (đánh dấu đèn đã từng sáng ít nhất 1 lần).
  - `relit_count: number` (số lần được thắp sáng lại sau khi tắt).
- **Lý do dùng số nguyên `fuelTicks` (`1/60`):** Mỗi tick đèn tự hao `1/60` nhiên liệu (`fuelTicks -= 1`) và mỗi Bóng Mực đang `drain` hút `5/60` nhiên liệu (`fuelTicks -= 5`). Dùng số nguyên loại bỏ hoàn toàn sai số dấu phẩy động IEEE-754 qua `18,000+` tick; khi xuất ra JSONL snapshot/event mới quy đổi `round1(fuelTicks / 60)`.
- **Vòng đời trạng thái Đèn:**
  1. `Unlit (chưa từng sáng: ever_lit=false, fuel=0)`: cần `10` đom đóm (`lantern_cost = 10`) -> khi đủ chuyển sang `Lit (fuelTicks=6000, ever_lit=true)`, phát `lantern_lit { lantern_id, relight: false }`, cộng `+100` điểm và tăng `player.successful_lights += 1`.
  2. `Lit (fuelTicks > 0)`:
     - Khi `fuelTicks >= 1800` (`fuel >= 30`): duy trì vùng an toàn `6 m`.
     - Khi `0 < fuelTicks < 1800` (`fuel < 30`): **mất vùng an toàn**, trở thành mục tiêu ưu tiên của Bóng Mực đang `wander`.
     - Khi `fuelTicks < 6000`: cho phép tương tác **Châm dầu (`refuel`)** với `used = min(carried, ceil((6000 - fuelTicks) / 600))`, tăng `fuelTicks = min(6000, fuelTicks + used * 600)`, phát `refuel { lantern_id, amount: used, fuel }`. Nếu châm lên `>= 1800` (`fuel >= 30`), đẩy mọi Bóng Mực trong `6 m` ra mép trong tối đa `30` tick (không gây sát thương) và đưa Bóng đang `drain` đèn đó về `wander`.
  3. `Out / Unlit (đã từng sáng: ever_lit=true, fuel=0)`: ngay sau Bước 2 nếu `fuelTicks <= 0`, đèn tắt (`lit=false, deposited=0`), phát `lantern_out { lantern_id }`. Khi thắp lại chỉ cần **`5` đom đóm** (`relight_cost = 5`), phát `lantern_lit { lantern_id, relight: true }`, tăng `relit_count += 1`, cộng `+40` điểm và tăng `player.successful_lights += 1`.

### B. Mở rộng máy trạng thái Bóng Mực thêm trạng thái `drain`
- Tập trạng thái chuẩn v1.2: `"spawning" | "wander" | "chase" | "recoil" | "stunned" | "drain"`.
- Chỉ Bóng Mực ở `wander` (khi không phát hiện Mây trong `12 m`) mới chọn mục tiêu đèn: ưu tiên đèn đang sáng có `fuel < 30` gần nhất (bằng nhau chọn `id` nhỏ hơn); nếu không có mới đi về đèn tắt gần nhất.
- Khi cách đèn mục tiêu (`lit && fuel < 30`) `<= 2.0 m` (XZ), Bóng chuyển sang `drain`, đứng yên hút `5 fuel/s` (`5/60` mỗi tick) và mỗi `60` tick đang hút phát `fuel_drain { lantern_id, shade_id, fuel }`.
- Chuyển tiếp từ `drain`:
  - Mây vào `<= 6 m` -> `chase`.
  - Trúng Tỏa Sáng (`pulse`) -> `stunned` (cộng **`+15` điểm** thay vì `+5`).
  - Đèn tắt (`fuel <= 0`), hoặc đèn được châm lên `fuel >= 30`, hoặc Bóng bị đẩy cách đèn `> 2 m` -> `wander`.
- Khi hết thời gian `stunned` (`120` tick): luôn chuyển về **`wander`** (thay vì về thẳng `chase` như v1.1).

### C. Luật thắng Bình Minh (`dawn_survived`) & Công thức điểm mới
- Loại bỏ điều kiện thắng sớm `all_lit`.
- Ở Bước 11 (cuối mỗi tick, sau mọi cập nhật):
  1. Nếu `player.flames <= 0` -> thua ngay (`result: "lost", reason: "no_flames"`).
  2. Nếu hết giờ (`time_left_s <= 0`):
     - Đếm số đèn đang sáng `litCount`. Ngưỡng thắng `required = Math.ceil(0.6 * totalLanterns)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
     - Nếu `litCount >= required`: thắng (`result: "won", reason: "dawn_survived"`), cộng thưởng bình minh: mỗi đèn đang sáng `+50 + floor(fuel)`, mỗi Ngọn Lửa còn lại `+50` (bỏ thưởng thời gian).
     - Ngược lại: thua (`result: "lost", reason: "dawn"`).

---

## 3. Hệ quả & Cập nhật Kiểm chứng (Consequences)

- **Breaking changes** đối với Contract `v1.1` được ghi rõ trong `CHANGELOG.md`.
- Các unit test ở `tests/simulation.test.ts` trước đây kiểm tra thắng sớm `all_lit` khi thắp đủ đèn hoặc cộng `+10` mỗi đom đóm được cập nhật sang luật `v1.2` (`+5`/đom đóm, `dawn_survived` tại bình minh, `relight`, `refuel`, `drain`, `capacity`), có chú thích rõ lý do trong `docs/notes/assumptions.md`.
