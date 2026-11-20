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

## Phase 2 (Ticket-02 — Contract v1.1)

### 1. Các giả định Phase 1 được Ticket-02 chuẩn hóa / thay thế
| Hạng mục | Phase 1 (tự chọn cũ) | Phase 2 (Ticket-02 chuẩn hóa) |
|---|---|---|
| Contract & tham số | `v1.0`, tốc độ `6`, sức chứa `5`, chi phí đèn `3`, `pickup 1.5`, `interact 2.5`, `pulse 1 / 6m / 3s`, `safe_radius 5`, `shade_speed 3.6`, `fall_enabled: false` | `v1.1`, sức chứa `10`, chi phí đèn `10`, `pickup 1.0`, `interact 2.0`, `pulse 3 / 5m / 3s` (`stun 2s`, `push 4m / 15 tick`), `safe_radius 6`, `shade_speed 4.0` (`4.5` Đêm 3), `fall_enabled: true`, bổ sung `dash` & `night2/3` |
| Bản đồ Đêm 1 | Đảo `35m`, đèn `r=20m` | Đảo `40m`, 5 đèn tọa độ chuẩn (`L1 (0,0,25)...`), 24 điểm đom đóm, 12 điểm Bóng Mực (`r=37m`) |
| Điểm số | `per_mote: 10`, `per_stun: 25`, `per_second_left: 5` | `+10` mỗi đom đóm **khi nạp vào đèn**, `+100` mỗi đèn, `+5` mỗi Bóng trúng Tỏa Sáng, `+ floor(s) * 2 + flames * 50` khi thắng |
| Rơi đom đóm khi bị đánh | Mất vào bóng đêm (không nhặt lại) | Rơi `floor(carried/2)` ra vành `1.5–2.5 m`, `kind="dropped"`, `ttl=480` tick, nhặt lại được từ tick sau |

### 2. Giả định mới cho các chi tiết còn mở ở Phase 2
- **Lưu ý điểm `per_mote`:** Ticket-02 ghi `"+10 mỗi đom đóm nạp"` (khác Phase 1 cộng lúc nhặt). Do đó `per_mote = 10` cộng khi sự kiện `deposit` nạp đom đóm vào đèn (`amount * 10`), tránh farm điểm bằng cách để Bóng Mực đánh rơi rồi nhặt lại.
- **Tăng tốc/dừng `<= 0.1 s`:** Dùng gia tốc `150 m/s²` (`0.04 s` để đạt `6 m/s`, `0.08 s` khi đảo chiều `180°` — luôn `<= 0.1 s`).
- **Tương tác & góc dốc Đêm 3:** Dốc rộng `3 m` tại `30°` và `150°` (`x = r*cosθ, z = r*sinθ`) có miệng nối mượt ở đỉnh `r=24` vào tầng 1; vách tầng và tháp chuông `(0,6,0)` bán kính `2 m` chặn chuyển động ngang và đẩy lùi Tỏa Sáng.
- **Bóng Mực vượt tầng / hố:** Bóng Mực lơ lửng trong sương nên di chuyển ngang vượt qua khoảng trống giữa 2 đảo và điều chỉnh độ cao mượt theo địa hình / độ cao Mây khi đuổi, vẫn bị chặn bởi tháp chuông (`r < 2`) và vùng an toàn `6 m` quanh đèn sáng.
- **Định dạng `ttl_s` và `respawn_s`:** Đom đóm `kind="random"` dùng `ttl_s: null`; `kind="dropped"` dùng `ttl_s = round3(ttlTicks / 60)`. Bùa `available: true` dùng `respawn_s: 0`.
- **Trình tự `night_start`:** Phát sự kiện `night_start { night }` tại tick hoạt động đầu tiên (`tick: 1`) sau khi dựng xong snapshot `tick: 0` (để `--ticks 0` không phát sự kiện ngoài snapshot 0).
- **Gió Đêm 3:** Chu kỳ `1800` tick (`30 s`): cảnh báo `120` tick cuối chu kỳ (`1680..1799`), thổi mạnh `300` tick (`1800..2099`, `3600..3899`, ...) theo hướng `dir_deg` sinh tất định bằng PRNG.
- **Độ cao kiểm tra chạm Bóng Mực & Tỏa Sáng:** Tâm Bóng Mực mặc định `Y = groundY + 0.8`. Chạm Bóng kiểm tra `distXZ <= 1.0` và `|(player.y + 0.8) - shade.y| <= 1.5` (tương đương chênh cao tâm-tâm `<= 1.5 m`).
- **Phím tắt 3D:** `Shift` là **Lướt (Dash)**, `Q` là **Tỏa Sáng (Pulse)**, `E`/`F` là **Nạp ánh sáng**, `Esc`/`P` là **Tạm dừng**.

### 3. Kế hoạch kiểm chứng Phase 2 (lập trước khi code)
1. **Contract v1.1 sync (`tests/contractSync.test.ts`):** Xác nhận `contract_version === "1.1"` và toàn bộ khóa `tuning` khớp `DEFAULT_TUNING`.
2. **Cập nhật test regression Phase 1 (`tests/simulation.test.ts`):** Giữ toàn bộ kịch bản cốt lõi nhưng cập nhật theo số liệu chuẩn v1.1 (ghi rõ lý do thay đổi giá trị cũ).
3. **Kịch bản headless cho TỪNG tính năng mới (`tests/phase2Features.test.ts`):**
   - Lướt (mặt đất & giữ độ cao trên không, hồi chiêu `1.5s`, sự kiện `dash`).
   - Đom đóm rơi `ttl_s = 480 tick` khi bị đánh và nhặt lại từ tick sau + cộng điểm khi nạp đèn.
   - Đẩy Bóng Mực đang ở trong `safe_radius` ra mép trong `<= 30 tick` không gây sát thương khi vừa thắp đèn.
   - Rơi khỏi đảo (`Y < -10`): mất 1 lửa + mất hết đom đóm (`lost`), chờ `60` tick, hồi sinh `(0,0,0)` + bất tử `90` tick; hoặc thua ngay nếu `flames === 0`.
   - Đêm 2: cầu tre, bục nhảy `(20,0,18)` đáp sang đảo B, Bùa Gió `(35,0,0)` tăng tốc `7.2 m/s` + Lướt không hồi chiêu trong `600` tick.
   - Đêm 3: 3 tầng, dốc `30°`/`150°`, bục nhảy `(0,3,13)` đáp tầng 2, tháp chuông chặn, gió mạnh `2 m/s` theo `wind.dir_deg`.
   - Gió Lạc (`D1`): `idle -> chase` (`carried >= 5 && dist <= 15`) -> `drifter_steal` -> `flee` -> `drifter_drop` khi trúng Tỏa Sáng -> `removed`.
   - Tạm dừng (`pause` toggle): đóng băng `sim_tick`, `time_left_s`, cooldown, TTL; phát `paused` & `resumed`.
4. **Benchmark hiệu năng headless (`scripts/verify.mjs`):** Đo thời gian chạy `21,600` tick trên Đêm 3 (yêu cầu `<= 30 s`) và kiểm tra tính tất định ở cả 3 Đêm.

## Phase 3 (Ticket-03 — Change Request "Đèn cạn dầu" / Contract v1.2)

### 1. Danh sách luật cũ bị `[THAY THẾ]` và Test cũ được cập nhật (kèm lý do)

| Luật / Test ở Phase 1–2 | Thay đổi ở Ticket-03 (Contract v1.2) | Cách cập nhật Test & Lý do |
|---|---|---|
| Đèn đã sáng không nhận thêm đom đóm, sáng vĩnh viễn (`tests/simulation.test.ts`) | Đèn sáng có `fuel = 100`, tự hao `1.0/s`; nhận châm dầu (`refuel`) khi `fuel < 100`; tắt (`lantern_out`) khi `fuel <= 0` và nhớ `ever_lit = true` (thắp lại tốn `5` đom đóm) | Cập nhật test nạp đèn trong `tests/simulation.test.ts` và thêm `tests/phase3Changes.test.ts` kiểm tra chuỗi `lit -> decay -> refuel -> lantern_out -> relight (cost 5)` vì luật cũ đã bị Ticket-03 Mục 1 thay thế. |
| Bóng Mực không bao giờ vào vùng `safe_radius = 6 m` quanh đèn sáng (`tests/simulation.test.ts`) | Đèn có `fuel < 30` mất vùng an toàn (`fuel == 30` vẫn còn); Bóng `wander` tìm đèn sáng `fuel < 30` gần nhất, vào `<= 2 m` chuyển sang `drain` hút `5 fuel/s` | Giữ test chặn `safe_radius` cho đèn có `fuel >= 30` (`fuel = 100`), bổ sung test đèn `fuel < 30` mất vùng an toàn và Bóng vào hút dầu (`drain` + `fuel_drain`). |
| Thắng sớm `all_lit` ngay khi thắp đủ đèn & thời lượng `300/330/360 s` (`tests/simulation.test.ts`) | Thời lượng mới `240/270/300 s`; bỏ `all_lit`; chỉ xét thắng `dawn_survived` khi sống sót tới hết giờ và số đèn đang sáng `>= ceil(0.6 * tổng đèn)` (`3/5`, `4/6`, `5/7`) | Cập nhật test thắng trong `tests/simulation.test.ts`: thắp đủ đèn không kết thúc sớm mà chạy tới bình minh đạt `dawn_survived`; thêm test hết giờ thiếu đèn -> thua `dawn`. |
| Công thức điểm cũ (`+10`/đom đóm, `+2 * giây còn lại`) (`tests/simulation.test.ts`) | `+5`/đom đóm nạp hoặc châm dầu, `+100` thắp đầu, `+40` thắp lại, `+5` stun thường / `+15` stun Bóng đang `drain`, thưởng bình minh `+50 + floor(fuel)` mỗi đèn sáng + `+50` mỗi Ngọn Lửa (bỏ thưởng thời gian) | Cập nhật kỳ vọng điểm số trong `tests/simulation.test.ts` và `tests/phase3Changes.test.ts` theo bảng điểm Mục 5 Ticket-03. |
| Hết choáng (`stunned`) quay lại `chase` nếu trong `18 m` | Ticket-03 Mục 2 quy định: `"Hết choáng thì về wander"` | Cập nhật logic kết thúc `stunned` về `wander` (sau đó trong bước di chuyển `wander`, nếu Mây trong `<= 12 m` mới chuyển sang `chase`, ngoài `12 m` sẽ đi tìm đèn yếu/đèn tắt). |

### 2. Giả định chi tiết cho Phase 3
- **Biểu diễn nhiên liệu nguyên `fuelTicks`:** Lưu `fuelTicks` nguyên theo đơn vị `1/60` (`fuel = 100` tương ứng `6000 fuelTicks`). Mỗi tick ở Bước 2: đèn sáng trừ `1` (`1/60`), mỗi Bóng đang `drain` đèn đó trừ thêm `5` (`5/60`). Khi xuất ra snapshot hoặc event (`refuel`, `fuel_drain`), làm tròn 1 chữ số thập phân: `Math.round((fuelTicks / 60) * 10) / 10`.
- **Sự kiện `fuel_drain` mỗi 60 tick:** Mỗi Bóng ở trạng thái `drain` có bộ đếm `drainTicks` tăng `1` ở mỗi tick nó hút dầu tại Bước 2; khi `drainTicks % 60 === 0` thì phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }`. Khi Bóng rời trạng thái `drain` thì `drainTicks` đặt lại về `0`.
- **Tốc độ di chuyển ở trạng thái `wander`:** Bóng Mực ở `wander` di chuyển về đèn mục tiêu (`fuel < 30` gần nhất, hoặc đèn tắt gần nhất) với tốc độ chuẩn `shade_speed` (`4.0 m/s` ở Đêm 1–2, `4.5 m/s` ở Đêm 3), đảm bảo thời gian tiếp cận đèn khớp công thức vật lý.
- **Kịch bản `scenario` cho đèn & người chơi:**
  - Nếu `scenario.lanterns[]` đặt `lit: true` mà không truyền `fuel`, mặc định `fuel = 100` (`6000 fuelTicks`) và `ever_lit = true`.
  - Nếu `scenario.lanterns[]` đặt `fuel > 0` mà không truyền `lit`, đèn cũng ở trạng thái `lit = true, ever_lit = true`.
  - Đèn đặt sẵn `lit: true` qua `scenario` không tính vào `player.successful_lights` (trừ khi `scenario.player.successful_lights` được truyền tường minh).

## Phase 4 (Ticket-04 — "Bình minh: phát hành v1.0.0" / Contract v1.3)

### 1. Thiết kế & Giả định cho các yêu cầu Non-Functional & Phát hành
- **Chế độ Benchmark (`scripts/bench.mjs` + `src/core/benchSim.ts` + `src/render/benchScene.ts`):**
  - Mở cửa sổ Chrome/Chromium/Edge `1280×720` (`--app=... --window-size=1280,720`) với cờ `--disable-frame-rate-limit --disable-gpu-vsync` để tắt vsync (`vsync_off: true`) và cô lập profile tạm (`--user-data-dir=<tmp>`).
  - Sử dụng `THREE.InstancedMesh` cho `200` Bóng Mực và `100` đom đóm, chỉ dựng Đêm 1 với ánh sáng chuẩn (tắt hoàn toàn cảnh vật sáng tạo trong `worldDecor.ts`) để đo công bằng và mượt `>= 60 FPS`.
  - Thời gian tải `load_ms` đo từ lúc tiến trình `scripts/bench.mjs` bắt đầu tới khi nhận `POST /api/bench-first-frame` ngay sau khung hình WebGL đầu tiên.
  - Bộ nhớ đỉnh `peak_mem_mb` tổng hợp Working Set / RSS của toàn bộ cây tiến trình trình duyệt gắn với `--user-data-dir` phiên benchmark.
- **Soak Test 10 Đêm (`src/headless/soak.ts`):**
  - Chạy liên tiếp 10 Đêm luân phiên `1 → 2 → 3` trong một tiến trình Node.js duy nhất; mỗi Đêm tạo `GameSimulation` mới với `seed = args.seed + i` và giải phóng (`sim = null`) ngay sau khi kết thúc.
  - Ghi `mem_start_mb` từ `process.memoryUsage().rss` ngay sau khi khởi tạo Đêm 1 (`i === 0`) và `mem_end_mb` sau khi giải phóng Đêm cuối.
- **Bảng Xếp Hạng cục bộ & Xuất CLI (`src/core/leaderboard.ts` + `scripts/run-game.mjs`):**
  - `run_cmd` (`node scripts/run-game.mjs`) phục vụ bản build `dist/` qua HTTP kèm API `/api/leaderboard` ghi ra ổ đĩa tại `data/leaderboard.json` (tự tạo thư mục `data/`, đã thêm vào `.gitignore` để không rác git).
  - Khi chạy `node scripts/run-game.mjs --export-leaderboard <out.json>`, tiến trình đọc `data/leaderboard.json`, sắp xếp Top 10 và ghi `{"entries": [...]}` rồi thoát mã `0` (trả `{"entries": []}` nếu chưa có lượt chơi nào).
  - Tên người chơi hợp lệ: `3–12` ký tự gồm `[A-Za-z0-9_]` và chữ cái tiếng Việt có dấu; thời điểm `achieved_at` định dạng ISO 8601 có múi giờ địa phương (`±HH:MM`).
- **Khả năng tiếp cận (Accessibility):**
  - Đổi phím lưu qua `localStorage` cho đủ 9 hành động (`moveUp`, `moveDown`, `moveLeft`, `moveRight`, `jump`, `dash`, `interact`, `pulse`, `pause`), chặn phím trùng và có nút **"Khôi phục mặc định"**.
  - Kích thước phông chữ chuẩn của toàn bộ HUD/Menu là `18px` (`--base-font: calc(18px * var(--ui-scale))`), bật **Chữ lớn** nâng `--ui-scale: 1.25` (`22.5px`).
  - Phụ đề trực quan hiển thị cảnh báo Bóng Mực xuất hiện (kèm mũi tên tím/xanh ở rìa màn hình), Gió Lạc, Gió mạnh, 10 giây cuối và đèn dầu `< 30`.
  - **Giảm chuyển động (Reduced Motion):** tắt rung camera, chớp vòng sáng, nhấp nháy CSS và cánh hoa rơi.
- **Sáng tạo giao diện & Đóng gói:**
  - Nâng cấp cảnh quan chơi thường (`src/render/worldDecor.ts`) theo phong cách làng đèn lồng cổ (cổng Torii sơn son, nhà đền mái ngói shoji, hoa anh đào rơi, rặng tre, đèn đá *tōrō*, ao nước, nón sáng đèn lồng) nhưng hoàn toàn cô lập khỏi `benchScene.ts` và `src/core/`.
  - Đóng gói chạy trong 3 lệnh (`npm ci`, `npm run build`, `npm start`) kèm `Dockerfile` (`node:22-slim`, cổng `4173`).
