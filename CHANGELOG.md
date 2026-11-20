# Changelog

Tài liệu ghi nhận các mốc phát triển và các thay đổi phá vỡ tương thích (Breaking Changes) qua toàn bộ 4 phase từ `v0.0.0` đến phát hành chính thức `v1.0.0`.

---

## [1.0.0] - Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0" + Test Contract v1.3)

### Tính năng phát hành & Non-Functional (Contract v1.3)
1. **Nâng cấp `game.contract.json` lên `contract_version: "1.3"`:**
   - Bổ sung `bench_cmd: "node scripts/bench.mjs"` và `soak_cmd: "node dist-headless/headless/soak.js"`.
   - Cập nhật `run_cmd: "node scripts/run-game.mjs"` hỗ trợ vừa chạy game đã build vừa xuất bảng xếp hạng qua `--export-leaderboard <out.json>`.
2. **Chế độ Benchmark 3D chuẩn hóa (`scripts/bench.mjs`, `src/core/benchSim.ts`, `src/render/benchScene.ts`):**
   - Cửa sổ `1280×720` không toàn màn hình, tắt vsync (`--disable-frame-rate-limit --disable-gpu-vsync`), tải Đêm 1 với ánh sáng chuẩn (tắt trang trí sáng tạo thêm), đúng `200` Bóng Mực `wander` (seed `42`) và `100` đom đóm vẽ qua `InstancedMesh`, đèn `L1..L3` sáng `fuel: 100`, Mây đứng yên `(0,0,0)`, camera quay vòng tròn `r=30 m, Y=15 m` CCW từ `(30,15,0)` chu kỳ `15 s/vòng`, `3 s` khởi động + `--duration` giây đo, xuất `bench.json` và tự thoát mã `0`.
3. **Soak Test ổn định dài hạn (`src/headless/soak.ts`):**
   - Chạy liên tiếp 10 Đêm (luân phiên `1 → 2 → 3`) trong cùng một tiến trình Node.js với input ngẫu nhiên có seed (`seed + i`), đo RSS `mem_start_mb` và `mem_end_mb`, xuất `soak.json`.
4. **Bảng Xếp Hạng cục bộ & Xuất CLI (`src/core/leaderboard.ts`, `scripts/run-game.mjs`, `src/main.ts`):**
   - Nhập tên (`3–12` ký tự `[A-Za-z0-9_]` và chữ cái tiếng Việt) sau thắng Bình Minh (Đêm 3) hoặc sau khi thua bất kỳ Đêm nào.
   - Lưu Top 10 trên ổ đĩa (`data/leaderboard.json`, kèm dự phòng `localStorage`), sắp xếp `score` giảm dần → `achieved_at` (ISO 8601 có múi giờ) tăng dần.
   - Hỗ trợ `<run_cmd> --export-leaderboard <out.json>` xuất `{"entries": [...]}` và thoát mã `0`.
5. **Khả năng tiếp cận (Accessibility):**
   - Đổi phím cho đủ 9 hành động (`moveUp/Down/Left/Right`, `jump`, `dash`, `interact`, `pulse`, `pause`) kèm phát hiện phím trùng, lưu cài đặt và nút **"Khôi phục mặc định"**.
   - Phụ đề trực quan (`#subtitle-banner`) + mũi tên rìa màn hình chỉ hướng Bóng Mực mới sinh (`#shade-arrow`), cảnh báo gió mạnh, 10 giây cuối, đèn dầu `< 30`.
   - Tùy chọn **Giảm chuyển động (Reduced Motion)** tắt rung camera, chớp ánh sáng và nhấp nháy UI.
   - Phông chữ tối thiểu `18px` tại `1280×720` kèm chế độ **Chữ lớn (`×1.25`)**.
6. **Nâng cấp Đồ họa & Phong cách Làng Đèn Lồng Cổ (`src/render/worldDecor.ts`, `src/render/gameScene.ts`):**
   - Bổ sung cổng Torii sơn son, nhà đền mái ngói shoji phát sáng ấm, cây hoa anh đào nở rộ kèm cánh hoa rơi nhẹ (tự dừng khi bật Giảm chuyển động), rặng tre, đèn đá *tōrō*, ao nước lung linh và nón sáng thể tích trên các Đèn Lồng đang cháy.
   - Tất cả cảnh vật sáng tạo hoàn toàn nằm trong `src/render/worldDecor.ts`, tự tắt trong chế độ benchmark và không ảnh hưởng headless/soak.
7. **Đóng gói & Tài liệu Phát hành:**
   - Thêm `Dockerfile` chuẩn chạy trên cổng `4173`, hướng dẫn chạy `<= 3` lệnh (`npm ci`, `npm run build`, `npm start`), ảnh minh họa `docs/images/dao-den-long-showcase.jpg`, cập nhật `README.md`, `CREDITS.md`, `docs/notes/retro.md` và `docs/proof/phase-4.md`.

---

## [0.3.0] - Phase 3 (Ticket-03 Change Request "Đèn cạn dầu" + Test Contract v1.2)

### Breaking Changes (Thay đổi phá vỡ tương thích so với Phase 2 / Contract v1.1)
1. **Nâng cấp `contract_version` từ `"1.1"` lên `"1.2"`:**
   - Thêm các khóa bắt buộc vào `tuning`: `fuel_max: 100`, `fuel_decay_per_s: 1.0`, `fuel_per_mote: 10`, `relight_cost: 5`, `win_ratio: 0.6`, `drain_per_s: 5`, `low_fuel_threshold: 30`, `capacity_max: 20`.
   - Đổi thời lượng 3 Đêm: `night1_duration_s: 240` (cũ `300`), `night2_duration_s: 270` (cũ `330`), `night3_duration_s: 300` (cũ `360`).
2. **Thay thế mô hình Đèn Lồng vĩnh viễn bằng Đèn có Nhiên liệu (`fuel`):**
   - Đèn đã sáng không còn sáng vĩnh viễn: tự hao `1.0 fuel/s` (`1/60` mỗi tick), nhận châm dầu (`refuel`) khi `fuel < 100`, và tắt (`lantern_out`) khi `fuel <= 0`.
   - Đèn tắt sau khi đã từng sáng (`ever_lit: true`) chỉ cần `5` đom đóm để thắp lại (`relight: true`).
   - Snapshot `lanterns[]` thêm các trường bắt buộc: `fuel` (làm tròn 1 chữ số thập phân), `ever_lit`, `relit_count`.
3. **Thay thế luật Vùng an toàn cố định & Mở rộng trạng thái Bóng Mực (`drain`):**
   - Đèn có `fuel < 30` bị mất vùng an toàn `6 m`.
   - Bóng Mực ở `wander` ưu tiên đi tới đèn sáng có `fuel < 30` gần nhất và chuyển sang trạng thái mới `"drain"` khi cách `<= 2 m` (hút `5 fuel/s`, phát `fuel_drain` mỗi `60` tick).
   - Khi hết thời gian `stunned` (`120` tick), Bóng Mực luôn chuyển về `"wander"` (thay vì về thẳng `"chase"`).
4. **Thay thế luật thắng sớm `all_lit` bằng luật sống sót tới Bình Minh (`dawn_survived`):**
   - Thắp đủ tất cả đèn không còn kết thúc Đêm sớm; sự kiện `game_over` không còn dùng `reason: "all_lit"`.
   - Chỉ thắng (`reason: "dawn_survived"`) khi sống tới hết giờ và số đèn đang sáng `>= ceil(0.6 * tổng đèn)` (`3/5`, `4/6`, `5/7`).
5. **Thay thế toàn bộ công thức tính điểm:**
   - Điểm mỗi đom đóm nạp/châm dầu giảm từ `+10` xuống `+5` (`score.per_mote: 5`).
   - Thắp lần đầu `+100`, thắp lại `+40`.
   - Bóng Mực trúng Tỏa Sáng: `+5` (`+15` nếu đang `drain`).
   - Bỏ thưởng thời gian (`score.per_second_left: 0`); thay bằng thưởng Bình Minh khi thắng: mỗi đèn đang sáng `+50 + floor(fuel)`, mỗi Ngọn Lửa còn lại `+50`.

### Tính năng mới & Cải tiến Đồ họa / UI (Phase 3)
- **Sức chứa tăng dần (`player.capacity`):** `10 + 2 * successful_lights` (tối đa `20`).
- **Chế độ Mù màu ("Bảng màu dễ phân biệt"):** Đổi viền/mắt Bóng Mực sang `#00B3FF`, cảnh báo UI sang `#FFFFFF` kèm `⚠`; đèn tắt xẹp `20%` kèm vết rách giấy, đèn `fuel < 30` nhấp nháy `1 Hz`.
- **Nâng cấp Đồ họa 3D & Minimap Radar:** Thêm Minimap 2D thời gian thực, thảm cỏ đung đưa theo gió, cây liễu đèn lồng, đường đá, bầu trời sao, vệt bóng mờ khi Lướt (`Shift`), tia hút dầu 3D và thanh dầu nổi trên từng Đèn Lồng.

---

## [0.2.0] - Phase 2 (Ticket-02 "Ba hòn đảo" + Test Contract v1.1)
- Chuẩn hóa `game.contract.json` (`v1.1`) và mở rộng thành 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông) kèm Lướt, Gió Lạc, Bùa Gió, Gió mạnh, Tạm dừng, HUD và âm thanh Web Audio.

## [0.1.0] - Phase 1 (PRD-0 + Test Contract v1.0)
- Cài đặt Đêm 1 – Đảo Bến 3D và CLI headless theo Test Contract v1.0.

## [0.0.0] - Checkpoint 0 (Chuẩn bị)
- Khởi tạo dự án, harness AI và chương trình thử Hello 3D + Hello Headless.
