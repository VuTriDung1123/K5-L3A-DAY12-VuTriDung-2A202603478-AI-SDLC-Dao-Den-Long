# Đánh giá từng Phase & Retro Cuối Dự Án (Đảo Đèn Lồng v1.0.0)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Chu kỳ phát triển:** Checkpoint 0 → Phase 1 (PRD-0) → Phase 2 (Ticket-02) → Phase 3 (Ticket-03 CR) → Phase 4 (Ticket-04 Release `v1.0.0`)

---

## Phần 1 — Đánh giá nhanh từng Phase

### Checkpoint 0 — Chuẩn bị
- **Đạt:** Dựng repo public đúng chuẩn tên khóa, thiết lập TypeScript + Three.js + Vite + Node.js + Vitest, ép ranh giới headless bằng `tsconfig.headless.json` (loại trừ DOM), dựng chương trình thử Hello 3D + Hello Headless, harness (`AGENTS.md`, skill `verify-and-proof`, GitHub Actions CI) và xác nhận chạy sạch trên thư mục clone tạm.
- **Chưa xong / Thủ công:** Thao tác đăng nhập `claude.ai` và xác nhận hạn nộp thực hiện thủ công bằng tài khoản sinh viên.
- **Bài học:** Thiết lập ranh giới kiến trúc ở mức compiler ngay từ CP0 tiết kiệm rất nhiều thời gian tái cấu trúc ở các phase sau.

### Phase 1 (PRD-0 — Contract v1.0)
- **Đạt:** Triển khai đầy đủ Đêm 1 – Đảo Bến ở cả 3D WebGL lẫn headless CLI `60 tick/s`, đồng bộ tự động `game.contract.json` với `DEFAULT_TUNING`, 11/11 tests pass, kiểm chứng tất định byte-for-byte và kiểm chứng bản clone sạch.
- **Chưa đạt / Hạn chế:** Trình kiểm tra trình duyệt tự động gặp lỗi `DevToolsActivePort` do Chrome host không bật remote debugging, nên kiểm tra trực quan 3D phải chuyển sang sinh viên kiểm trực tiếp.
- **Điều chỉnh harness:** Bổ sung quy tắc bắt buộc dùng `withinRadiusXZ` (`BOUNDARY_EPS = 1e-6`) và cô lập phần sáng tạo trong `src/render/`.

### Phase 2 (Ticket-02 — "Ba hòn đảo", Contract v1.1)
- **Đạt:** Chuẩn hóa toàn bộ thông số sang Contract v1.1, mở rộng 3 bản đồ (Đảo Bến, Đảo Cau có cầu tre & bục nhảy, Đảo Chuông 3 tầng có dốc & tháp chuông), bổ sung Lướt (`dash`), Bùa Gió, Gió Lạc, Gió mạnh, Pause, Rơi & Hồi sinh, giao diện Menu/Ông Đăng/Cài đặt/HUD và âm thanh Web Audio. Bộ 19/19 tests pass, benchmark 21.600 tick trên Đêm 3 đạt `139 ms`.
- **Ảnh hưởng phase trước:** Cập nhật có chủ đích các test Phase 1 bị chuẩn hóa thông số (`carry_capacity` 5→10, `lantern_cost` 3→10, `per_mote` cộng khi nạp đèn, `fall_enabled` false→true) và ghi rõ lý do từng mục trong `docs/notes/assumptions.md`.

### Phase 3 (Ticket-03 — Change Request "Đèn cạn dầu", Contract v1.2)
- **Đạt:** Thực hiện thành công Change Request phá vỡ tương thích: thay đèn sáng vĩnh viễn bằng cơ chế nhiên liệu nguyên `fuelTicks` (`1/60`, max `6000`), thêm trạng thái Bóng Mực hút dầu (`drain`) khi đèn `< 30`, thay luật thắng sớm `all_lit` bằng sống sót tới Bình Minh (`dawn_survived`, giữ `>= 60%` đèn), thay toàn bộ bảng điểm và thêm sức chứa tăng dần `10..20`. Đồng thời bổ sung Minimap Radar 2D, cây cỏ đung đưa, thanh dầu 3D, vệt Lướt và chế độ Mù màu. Ghi đầy đủ `docs/notes/adr-phase-3.md` và `CHANGELOG.md`; 25/25 tests pass ngay lượt chạy đầu.
- **Ảnh hưởng phase trước:** Cập nhật các test giả định thắng sớm `all_lit` và điểm cũ kèm lý do; giữ nguyên 100% 8 test tính năng Phase 2 không bị hồi quy.

### Phase 4 (Ticket-04 — "Bình minh: phát hành v1.0.0", Contract v1.3)
- **Đạt:** Nâng cấp `game.contract.json` lên `v1.3`; xây dựng và chạy thực tế chế độ Benchmark 3D chuẩn hóa (`1280×720`, `200` Bóng Mực + `100` đom đóm qua `InstancedMesh`, tắt vsync), đạt **`286.5 FPS` trung bình, `115.1 FPS` 1% low, `frame_ms_p95: 6.1 ms`, `load_ms: 722 ms`** ngay trên GPU tích hợp Intel UHD Graphics; chạy thật Soak test 10 Đêm liên tiếp đạt **`0 crashes`, RAM ổn định `51.3 → 57.9 MB` (`1.13× <= 1.20×`)**; triển khai Bảng Xếp Hạng lưu ổ đĩa kèm `--export-leaderboard`; hoàn thiện bộ Trợ năng (đổi đủ 9 phím chống trùng + khôi phục mặc định, phụ đề trực quan + mũi tên hướng Bóng Mực, Giảm chuyển động, chữ nền `>= 18px` + Chữ lớn `×1.25`); nâng cấp cảnh quan làng đèn lồng cổ (Torii, nhà shoji, hoa anh đào rơi, tre, đèn đá *tōrō*, ao nước, nón sáng) cô lập hoàn toàn khỏi benchmark/headless; hoàn thiện `Dockerfile`, ảnh minh họa `README.md`, `CHANGELOG.md`, `CREDITS.md` và vượt qua 33/33 unit tests + kiểm tra clone sạch.
- **Chưa hoàn tất tự động (cần thao tác thủ công của sinh viên):** Push nhánh `main` và tag `phase-3`, `phase-4` lên GitHub, tạo GitHub Release `v1.0.0`, quay và đính kèm video demo `.mp4` dưới 5 phút.

---

## Phần 2 — Retro Tổng Kết Toàn Dự Án (4 Phase)

### 1. Điều gì hiệu quả và không hiệu quả khi làm việc với AI?

**Những cách làm rất hiệu quả:**
- **Tách ranh giới kiến trúc bằng công cụ biên dịch (Design for Verifiability):** Ngay từ Checkpoint 0, quyết định tách tuyệt đối `src/core/` và `src/headless/` khỏi `src/render/` và ép kiểm tra bằng `tsconfig.headless.json` (không có `DOM`) khiến AI không thể vô tình trộn code Three.js hay `window` vào logic game. Nhờ đó suốt 4 phase, chế độ headless CLI và soak test chạy ổn định trong dưới `0.2 giây` mà không cần sửa kiến trúc.
- **Viết tài liệu thiết kế ngắn (Assumptions / Spec / ADR) trước khi sinh code:** Khi bước vào Phase 2 (3 bản đồ phức tạp) và Phase 3 (Change Request đổi 4 luật lõi cùng lúc), việc buộc AI liệt kê rõ mọi hằng số, bảng đối chiếu luật cũ–mới và viết `adr-phase-3.md` trước khi chạm vào `simulation.ts` đã giúp toàn bộ 25/25 unit test Phase 3 pass ngay lần chạy đầu tiên mà không bị sót tương tác phụ nào.
- **Đồng bộ Contract bằng test tự động (`tests/contractSync.test.ts`):** Thay vì để AI tự nhớ cập nhật `game.contract.json` mỗi khi đổi hằng số, một bài test so sánh `deepEqual` trực tiếp giữa JSON và `DEFAULT_TUNING` giúp loại bỏ hoàn toàn nguy cơ lệch contract giữa các phiên làm việc.
- **Tối ưu GPU chủ động bằng `InstancedMesh` cho Benchmark:** Khi đọc yêu cầu vẽ `200` Bóng Mực + `100` đom đóm ở `>= 60 FPS`, chọn kiến trúc `THREE.InstancedMesh` thay vì tạo 300 `THREE.Mesh` rời giúp draw calls giảm xuống mức tối thiểu và đạt `286.5 FPS` (`115.1 FPS` 1% low) ngay trên iGPU Intel UHD.

**Những điểm chưa hiệu quả / cần lưu ý:**
- **Phụ thuộc công cụ browser subagent khi môi trường chưa cấu hình sẵn:** Việc thử mở trình duyệt qua DevTools ở Phase 1–3 thất bại do Chrome host không mở cổng debug, mất thời gian thử lại. Ở Phase 4, chuyển sang khởi chạy trực tiếp Chrome bằng `child_process.spawn` trong `scripts/bench.mjs` mới đo được WebGL thực tế.
- **Khác biệt shell Windows (PowerShell 5.1 vs Bash):** AI đôi lúc sinh lệnh dùng `&&` hoặc tạo file JSON có UTF-8 BOM trên Windows. Phải xử lý trực tiếp trong code (`strip BOM`) và chuẩn hóa script Node.js (`scripts/verify.mjs`, `scripts/bench.mjs`) thay vì dựa vào cú pháp shell đặc thù hệ điều hành.

---

### 2. Những lần AI sai thực tế và cách phát hiện

Trong suốt 4 phase, không có lỗi nào được bỏ qua — tất cả các lỗi đáng chú ý của AI đều bị bắt bởi **test tự động, biên dịch tĩnh hoặc rà soát chủ động trước khi chạy thật**:

1. **Lỗi sai số dấu phẩy động IEEE-754 tại biên bán kính (Phase 1):** Cộng dồn `0.1 m` qua 65 tick cho `6.499999999999994` thay vì `6.5`, làm thất bại kiểm tra `dist <= 2.5`. *Phát hiện nhờ:* unit test biên trong `tests/simulation.test.ts`. *Khắc phục:* Tạo hàm `withinRadiusXZ`/`withinRadius3D` với `BOUNDARY_EPS = 1e-6` và ghi thành luật cứng trong `AGENTS.md`.
2. **Lỗi làm tròn `round3` trên mép vùng an toàn (Phase 1):** Khoảng cách `5.000000000000007` không bị đẩy ra ngoài nhưng khi xuất JSONL bị `round3` làm tròn thành đúng `5.0`, vi phạm bất biến khoảng cách ngoài vùng an toàn. *Phát hiện nhờ:* kiểm tra snapshot thực tế từ test vùng an toàn. *Khắc phục:* Đẩy ra mép `safe_radius + 0.05` khi `dist <= safe_radius + 0.002`.
3. **Lỗi hình học va chạm Đảo Chuông nhốt nhân vật tại `(0,0,0)` (Phase 2):** Khi mô hình hóa đảo 3 tầng, AI coi trụ đỡ dưới Tầng 2 (`r <= 8`) là vật cản đặc ở `Y=0`, khiến Mây không bước ra được khỏi điểm xuất phát. *Phát hiện nhờ:* unit test Gió mạnh Đêm 3 thấy vị trí người chơi không hề nhúc nhích. *Khắc phục:* Mở thông thoáng Tầng 0 (`r <= 45`) và chỉ để Tháp Chuông ở `Y >= 5.5` chặn ngang.
4. **Kịch bản benchmark 21.600 tick dừng sớm ở tick 21.148 (Phase 2):** AI đặt `flames: 100` và nghĩ đủ sống 6 phút trên Đêm 3, nhưng thực tế 10 Bóng Mực + Gió mạnh tiêu hao hết trước tick 21.600. *Phát hiện nhờ:* assertion kiểm tra `last.ticks === 21600` trong `scripts/verify.mjs`. *Khắc phục:* Đặt `flames: 999` cho kịch bản đo hiệu năng thuần.
5. **Ký tự `<` chưa escape trong `index.html` làm hỏng build production (Phase 3):** Viết `(< 30)` trực tiếp trong thẻ HTML khiến `vite build` (`parse5`) báo lỗi cú pháp. *Phát hiện nhờ:* bước `npm run build` trong `npm run verify`. *Khắc phục:* Escape thành `(&lt; 30)`.
6. **Script đo bộ nhớ benchmark chỉ đo PID cha và rò rỉ thư mục tạm (Phase 4):** Bản viết đầu của `scripts/bench.mjs` chỉ lấy RAM của PID launcher Chrome (bỏ sót renderer/GPU) và gọi xóa `userDataDir` trong `setTimeout` ngay trước `process.exit(0)`. *Phát hiện nhờ:* đọc rà soát lại toàn bộ `scripts/bench.mjs` trước khi chạy đo thật. *Khắc phục:* Cộng tổng Working Set của toàn bộ cây tiến trình Chrome gắn với `userDataDir`, `taskkill /T /F`, đợi 350ms rồi mới xóa thư mục tạm.

---

### 3. Thành phần Harness nào giúp ích nhiều nhất?

Xếp hạng từ hữu ích nhất trở xuống theo trải nghiệm thực tế:
1. **`scripts/verify.mjs` (`npm run verify`) + `tests/contractSync.test.ts` (Hữu ích nhất):** Một lệnh duy nhất chạy đủ 6 tầng kiểm soát (33 unit tests → TypeScript/headless boundary → Vite bundle → kiểm tra tất định 3 Đêm → benchmark 21.600 tick → soak & `--export-leaderboard`). Mọi sai sót về kiểu, biên số học, hồi quy hay lệch contract đều lộ ra trong vòng ~10 giây.
2. **`tsconfig.headless.json` (`"lib": ["ES2022"]`, loại trừ DOM):** Rào chắn kiến trúc "không cần nhớ" — ngay cả khi chuyển ngữ cảnh giữa các phase, compiler vẫn tuyệt đối ngăn không cho code hiển thị lọt vào lõi mô phỏng.
3. **`AGENTS.md` (sống và cập nhật qua từng phase):** Ghi lại các quy tắc vừa học được từ lỗi thật (như `BOUNDARY_EPS`, quy ước góc `x = r*cosθ, z = r*sinθ`, tính `fuelTicks` nguyên `1/60`, cấm tự `git push`). Nhờ đó khi ngữ cảnh hội thoại bị rút gọn giữa Phase 3 và Phase 4, AI vẫn tuân thủ chính xác mọi ràng buộc mà không lặp lại bất kỳ lỗi cũ nào.
4. **Skill `.agents/skills/verify-and-proof/SKILL.md`:** Chuẩn hóa quy trình đối chiếu yêu cầu–bằng chứng trước khi gắn tag, tránh thói quen "code xong là chốt" thiếu đo đạc thật.

---

### 4. Tổng kết Token / Chi phí & Bài học tiết kiệm

- **Tổng ước tính 4 phase:** khoảng **`~250k` input tokens + `~106k` output tokens (`~356k` tokens)** cộng 2 lượt sinh ảnh minh họa (chạy trong hạn mức IDE Antigravity; quy đổi tương đương khoảng **~$0.94** theo đơn giá API phổ thông).
- **Cách tiết kiệm token hiệu quả nhất đã áp dụng:**
  - **Đọc và chỉnh sửa song song theo lô (batching):** Đọc nhiều tài liệu/file liên quan trong cùng một lượt thay vì đọc từng file lẻ, giảm đáng kể số lượt gửi lại toàn bộ lịch sử hội thoại.
  - **Chốt thiết kế ngắn gọn trước khi code:** Tránh vòng lặp "viết đại → lỗi → sửa đi sửa lại" vốn đốt nhiều input token nhất.
  - **Viết script kiểm chứng gọn đầu ra (`npm run verify`):** Chỉ in dòng tóm tắt khi pass và in chi tiết khi fail, tránh đổ hàng nghìn dòng log JSONL vào cửa sổ ngữ cảnh của AI.
  - **Cô lập các module nhỏ theo trách nhiệm (`maps.ts`, `simulation.ts`, `leaderboard.ts`, `benchSim.ts`, `worldDecor.ts`):** Khi sửa một tính năng chỉ cần đọc đúng 1 file 100–300 dòng thay vì một file đơn khối hàng nghìn dòng.

---

### 5. Nếu làm lại từ đầu, tôi sẽ thay đổi gì?

1. **Dựng ngay kiểm thử E2E giao diện 3D tự động (Playwright / Puppeteer) từ Phase 1:** Thay vì chờ đến Phase 4 mới viết launcher mở Chrome cho benchmark, có một smoke test mở WebGL và chụp screenshot ngay từ Phase 1 sẽ giúp vừa kiểm chứng hình ảnh tự động sớm, vừa phát hiện ngay các lỗi hiển thị (như chữ bị đè hay camera lệch góc).
2. **Thiết kế dữ liệu cấu hình và trạng thái game hướng dữ liệu hơn nữa (Data-driven):** Tách bảng luật/hệ số điểm thành cấu hình gọn để khi gặp Change Request kiểu Ticket-03 có thể đối chiếu nhanh hơn và sinh sẵn test ma trận cho mọi trạng thái Bóng Mực.
3. **Chuẩn bị sẵn một kịch bản chơi mẫu tự động (demo script / scripted inputs) chạy qua cả 3 Đêm:** Vừa giúp quay video demo mượt mà, vừa là bài test hồi quy end-to-end cho luồng chiến thắng trọn vẹn từ Đêm 1 đến Bình Minh Đêm 3.
4. **Tách chunk Vite (`manualChunks` riêng cho `three`) ngay từ đầu:** Hiện bundle `dist/assets/index-*.js` nặng `576 kB` (`150 kB` gzip) nên Vite in cảnh báo chunk > 500 kB; tách `three` thành vendor chunk riêng sẽ tối ưu cache trình duyệt khi cập nhật logic game.
