# Giả định & Quyết định Thiết kế (Assumptions Log)

- **Sinh viên:** Vũ Trí Dũng — MSSV: `2A202603478` — Lớp: `K5-L3A`

Tài liệu này ghi nhận các giả định cho phần yêu cầu mơ hồ, các thông số tự chọn, và mọi thay đổi thiết kế khi ticket phase mới làm thay đổi luật cũ.

---

## Checkpoint 0 — Chuẩn bị môi trường

| Hạng mục | Quyết định / Giả định | Lý do |
|---|---|---|
| Ngôn ngữ & 3D Engine | TypeScript + Three.js + Vite | Chạy đa nền tảng (Windows/macOS/Linux), xuất được web tĩnh cho Release `v1.0.0`, không vướng biên dịch native. |
| Chế độ Headless | Node.js `>=20` chạy `src/core/` + `src/headless/` | Không cần cửa sổ/GPU/X11; chạy nhanh trong môi trường chấm tự động Linux/macOS. |
| Ranh giới kiến trúc | `tsconfig.headless.json` loại trừ `DOM` | Ép tại thời điểm compile rằng logic game không phụ thuộc trình duyệt hay Three.js. |
| Tính tất định (Determinism) | PRNG `mulberry32` có seed + fixed timestep `dt` | Đảm bảo cùng đầu vào cho cùng kết quả trên mọi máy và qua các lần chạy lặp lại. |

---

## Phase 1 (PRD-0 + Test Contract v1.0)

### 1. Yêu cầu bắt buộc chính xác (Test Contract v1.0)
- `game.contract.json` ở gốc repo theo schema v1.0, `lantern_count_night1 = 5`, tất cả thông số `tuning` khớp 1:1 với logic game.
- Chế độ headless: `<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]`.
- Fixed timestep `60 tick/giây` (`dt = 1/60`); snapshot tick `0` sau dựng scenario trước input `0`; bước `k` đọc input `k` và sinh trạng thái/sự kiện `tick = k + 1`.
- Dừng khi đủ `--ticks` hoặc game `won`/`lost` (thoát mã `0`). Lỗi tham số/IO thoát `!= 0`; lỗi định dạng `scenario`/`inputs` thoát `2`.
- Mặt phẳng đất `Y = 0`, người chơi xuất phát `(0, 0, 0)`, mọi khoảng cách đo theo mặt phẳng ngang `XZ` (`<= r`), tọa độ làm tròn 3 chữ số thập phân.
- Chuyển động theo góc nhìn camera `cam_yaw_deg`: `x' = x*cosθ + z*sinθ`, `z' = -x*sinθ + z*cosθ`, vector `move` dài hơn `1` chuẩn hóa về `1`.
- Nút `jump`, `interact`, `pulse` kích hoạt trên cạnh lên (`false -> true`).
- Dựng `scenario` không phát sự kiện và không cộng điểm; khi `random_motes: false` / `random_shades: false`, không tự sinh thêm đom đóm / Bóng Mực.
- Output JSONL gồm `snapshot` (mỗi `--snapshot-every` tick từ `0`), `event` (ngay khi xảy ra), và `end` ở dòng cuối.
- Tính tất định tuyệt đối: cùng `--seed`, `--scenario`, `--inputs` cho output JSONL giống hệt nhau.

### 2. Chỗ mơ hồ & Giả định / Thông số đã chọn

| Hạng mục | Giả định & Thông số chọn | Lý do |
|---|---|---|
| Kích thước Đảo Bến & `fall_enabled` | Đảo tròn bán kính `35 m`, `fall_enabled: false` | Dùng tường vô hình mềm giữ nhân vật trên đảo, tránh rơi bất ngờ và đủ rộng cho các scenario kiểm thử quanh `30 m`. |
| Vị trí mặc định 5 Đèn Lồng Lớn (`L1..L5`) | Đặt đều quanh vòng tròn bán kính `20 m` (`L1` tại `[0, 0, 20]`, góc cách `72°`) | Đủ rộng để di chuyển chiến thuật quanh đảo mà không quá xa trong `180 s`. |
| Vật lý di chuyển & nhảy | `player_speed = 6.0 m/s` (`0.1 m/tick`), `jumpVy = 7.2 m/s`, `gravity = 20 m/s²` | Di chuyển mượt, nhảy linh hoạt, bước mỗi tick gọn và ổn định. |
| Đom đóm & nạp đèn | `carry_capacity = 5`, `lantern_cost = 3`, `pickup_radius = 1.5 m`, `interact_radius = 2.5 m` | Cho phép nạp 1 đèn + dư đom đóm để Tỏa sáng tự vệ; hỗ trợ nạp từng phần (`deposited`). |
| Tỏa sáng (Light Pulse) | `pulse_cost = 1`, `pulse_radius = 6.0 m`, `pulse_stun_s = 3.0 s`, `pulse_push_m = 4.5 m`, `pulse_cooldown_s = 3.0 s` | `cooldown = stun` giúp tránh tình trạng stun chồng lên Bóng Mực đang bị choáng; đẩy lùi rõ rệt trong 3D và headless. |
| Bóng Mực & va chạm | `shade_speed = 3.6 m/s`, `shade_hit_radius = 0.9 m`, `safe_radius = 5.0 m`, `flames = 3`, `invuln_s = 1.5 s`, `hit_drop_ratio = 0.5` | Người chơi nhanh hơn Bóng Mực để né được; số đom đóm rơi `floor(carried * 0.5)` biến mất vào sương đen (không farm lại). |
| Sinh ngẫu nhiên khi `random_motes/shades = true` | Đom đóm khởi đầu `12` con, giữ tối thiểu `10` / tối đa `14` (sinh cách tâm >= `2.5 m`). Bóng Mực khởi đầu `2` con (cách tâm >= `14 m`), tối đa `4` con (mỗi `25 s` sinh thêm `1` nếu chưa đủ). | Đảm bảo luôn đủ đom đóm hoàn thành `5` đèn dù có dùng Tỏa sáng; áp lực Bóng Mực tăng dần nhẹ nhàng. |
| Quy tắc điểm số | `per_mote = 10`, `per_lantern = 100`, `per_stun = 25`, `per_second_left = 5`, `per_flame_left = 50` | Thưởng `per_second_left` (`floor(time_left_s)`) và `per_flame_left` chỉ cộng khi `won` (`all_lit`). |
| Thứ tự xử lý trong mỗi tick | Timer/Hồi stun -> Di chuyển & Nhảy -> Nhặt đom đóm -> Nạp đèn (kiểm tra thắng `all_lit`) -> Tỏa sáng (nếu chưa thắng) -> Sinh ngẫu nhiên -> Bóng Mực đuổi + chặn `safe_radius` + va chạm (kiểm tra thua `no_flames`) -> Giảm thời gian (kiểm tra thua `dawn`). | Rõ ràng, không xảy ra trường hợp vừa thắp hết đèn vừa bị thua cùng tick. |
| Sáng tạo thêm (ngoài lõi) | Audio tổng hợp WebAudio + trang trí Bến tàu/hoa đăng trôi/vệt sáng/bầu trời ấm dần đặt hoàn toàn trong `src/render/` | Không chạm `src/core/`, đảm bảo 0% ảnh hưởng đến đầu ra headless theo Test Contract. |

### 3. Kế hoạch kiểm chứng Phase 1 (lập trước khi code)
1. Test đồng bộ `game.contract.json` với `DEFAULT_TUNING` (`tests/contractSync.test.ts`).
2. Unit test đầy đủ từng cơ chế trong `tests/simulation.test.ts`: tính tất định, mô hình tick `0..N`, di chuyển theo `cam_yaw_deg` + chuẩn hóa vector, nhặt/mang tối đa, nạp đèn một phần & đủ để thắng + cộng điểm thưởng, Tỏa sáng đẩy lùi + làm choáng + hồi chiêu, Bóng Mực đuổi + bị chặn ngoài `safe_radius` + va chạm mất máu/rơi đom đóm/`invuln_s`, hết giờ `dawn`, và dựng `scenario` không phát event/điểm.
3. Kiểm tra ranh giới biên dịch headless (`tsconfig.headless.json`) và build 3D (`vite build`).
4. Chạy CLI headless trực tiếp theo đúng cú pháp contract trên các kịch bản tự tạo và kiểm tra mã thoát `2` khi file `scenario`/`inputs` lỗi định dạng.
5. Chạy bản 3D trên trình duyệt (hoặc dev server + kiểm tra runtime) để chơi thử Đêm 1 từ đầu đến thắng/thua.

## Phase 2 (Ticket-02)
*(Chờ phát hành Ticket-02.)*

## Phase 3 (Ticket-03)
*(Chờ phát hành Ticket-03.)*

## Phase 4 (Ticket-04)
*(Chờ phát hành Ticket-04.)*
