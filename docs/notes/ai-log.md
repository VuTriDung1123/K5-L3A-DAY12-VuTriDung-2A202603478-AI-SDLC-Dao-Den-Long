# Nhật ký sử dụng AI (AI Log)

- **Sinh viên:** Vũ Trí Dũng — MSSV: `2A202603478` — Lớp: `K5-L3A`

Ghi lại công cụ AI đã dùng, ước tính token/chi phí qua đủ 4 phase, các lần AI sai hoặc gặp lỗi thực tế và cách chỉnh harness để không lặp lại.

---

## Bảng theo dõi token & chi phí ước tính (Toàn dự án)

| Giai đoạn | Công cụ / Model | Công việc chính | Token ước tính (In / Out) | Chi phí ước tính | Cách tiết kiệm token |
|---|---|---|---|---|---|
| CP0 (Chuẩn bị) | Antigravity AI | Đọc 6 tài liệu lab, dựng skeleton dự án, hello 3D + headless, harness, CI | ~15k in / ~6k out | Free / quota IDE (~$0.05 quy đổi) | Đọc song song toàn bộ 6 file `.md` một lượt; viết code hello tối giản, không tạo asset thừa. |
| Phase 1 | Antigravity AI | Phân tích PRD-0 + Test Contract v1.0, viết `src/core/`, CLI headless, game 3D Three.js, audio, bộ 11 unit/CLI test, verify bản clone sạch | ~45k in / ~18k out | Free / quota IDE (~$0.16 quy đổi) | Thiết kế tách `src/core/` và `game.contract.json` một lượt; viết kế hoạch test trước khi code để bắt lỗi sớm trong 1 lần sửa. |
| Phase 2 | Antigravity AI | Chuẩn hóa Contract v1.1, bản đồ 3 Đảo, Gió Lạc, Bùa Gió, Lướt, Pause, UI/HUD đầy đủ, 19 tests & benchmark 21.600 tick | ~70k in / ~28k out | Free / quota IDE (~$0.25 quy đổi) | Lập spec + acceptance criteria trước; chia nhỏ `maps.ts` riêng khỏi `simulation.ts`; gộp chạy kiểm chứng qua `npm run verify`. |
| Phase 3 | Antigravity AI | Xử lý Change Request Ticket-03 (Contract v1.2: nhiên liệu đèn, Bóng hút dầu `drain`, luật thắng `dawn_survived`, sức chứa tăng dần, mù màu) + nâng cấp Minimap/cây cỏ/hiệu ứng 3D | ~55k in / ~24k out | Free / quota IDE (~$0.20 quy đổi) | Viết ADR-001 và dùng đơn vị nguyên `fuelTicks` (`1/60`) ngay từ thiết kế nên 25/25 unit tests pass ngay lần chạy đầu tiên. |
| Phase 4 | Antigravity AI + `image-generator` | Phát hành `v1.0.0` (Contract v1.3): benchmark 3D (`InstancedMesh` + `scripts/bench.mjs`), soak test 10 Đêm, Bảng xếp hạng cục bộ + `--export-leaderboard`, Trợ năng (đổi 9 phím, phụ đề, giảm chuyển động, chữ lớn), nâng cấp đồ họa làng đèn lồng cổ + ảnh minh họa, `Dockerfile`, tài liệu & retro | ~65k in / ~30k out + 2 lượt sinh ảnh | Free / quota IDE (~$0.28 quy đổi) | Tách riêng `benchSim.ts`/`benchScene.ts` gọn nhẹ, chạy benchmark 30s song song trong lúc cập nhật tài liệu, gom chỉnh sửa song song theo batch. |
| **Tổng cộng** | **Antigravity AI** | **Toàn bộ CP0 → Phase 4 (`v1.0.0`)** | **~250k in / ~106k out (~356k tokens)** | **Free / quota IDE (~$0.94 quy đổi theo mức giá API tham chiếu)** | **Gom đọc/sửa file song song, tái sử dụng `npm run verify`, tự động tóm tắt ngữ cảnh khi phiên dài.** |

---

## Nhật ký lời nhắc chính & lỗi của AI

### Checkpoint 0
- **Lời nhắc chính:** Đọc 6 file `.md` hướng dẫn lab và hoàn thành Checkpoint 0 (điền thông tin sinh viên, tạo cấu trúc dự án, chương trình thử 3D + headless, nơi ghi chép).
- **Lỗi AI gặp phải:** Chưa ghi nhận ở bước khởi tạo.
- **Cập nhật harness:** Tạo mới `AGENTS.md`, skill `.agents/skills/verify-and-proof/SKILL.md`, script `scripts/verify.mjs` và `.github/workflows/ci.yml` để ép tách logic headless khỏi 3D ngay từ đầu.

### Phase 1 (PRD-0 + Test Contract v1.0)
- **Lời nhắc chính:** Triển khai toàn bộ Phase 1 theo PRD-0 và Test Contract v1.0, tạo `game.contract.json`, tách sáng tạo ra `src/render/`, kiểm chứng đầy đủ và lưu bằng chứng.
- **Lỗi / Bất cập phát hiện khi chạy test thật:**
  1. **Lệch số thực dấu phẩy động IEEE-754 tại biên bán kính:** Cộng `6 * (1/60)` 65 lần cho `6.499999999999994`, khiến khoảng cách `9 - 6.499999999999994 = 2.500000000000006 > 2.5` bị trượt điều kiện `<= interact_radius`. **Cách sửa:** Tạo `withinRadiusXZ` với `BOUNDARY_EPS = 1e-6`.
  2. **Làm tròn `round3` quanh biên `safe_radius`:** Bóng Mực di chuyển chạm `5.000000000000007` không kích hoạt đẩy ra ngoài và khi làm tròn `round3` bị thành đúng `5.0` (trên biên). **Cách sửa:** Đẩy ra ngoài khi `dist <= safe_radius + 0.002` tới `safe_radius + 0.05`.
  3. **UTF-8 BOM khi tạo file JSON trên Windows PowerShell:** `JSON.parse` lỗi khi file `scenario.json` có BOM `\uFEFF`. **Cách sửa:** Strip BOM đầu chuỗi trước `JSON.parse` trong `src/headless/cli.ts`.
  4. **Lỗi cú pháp `&&` trong PowerShell 5.1:** Sửa sang lệnh tương thích Windows `cmd /c` hoặc kiểm tra `$LASTEXITCODE`.
- **Cập nhật harness:** Cập nhật `AGENTS.md` bổ sung quy tắc đồng bộ `game.contract.json` (`tests/contractSync.test.ts`), bắt buộc dùng `withinRadiusXZ`, và cô lập sáng tạo trong `src/render/`.

### Phase 2 (Ticket-02 — Contract v1.1)
- **Lời nhắc chính:** Triển khai Ticket-02 ("Ba hòn đảo"), chuẩn hóa toàn bộ thông số sang Contract v1.1, không tự push lên GitHub.
- **Lỗi / Bất cập phát hiện khi chạy test thật:**
  1. **Va chạm Đảo Chuông (Đêm 3) nhốt người chơi tại `(0,0,0)`:** Ban đầu coi phần dưới Tầng 2 (`r <= 8, Y < 6`) là khối đặc khiến nhân vật xuất phát tại `(0,0,0)` bị kẹt; phát hiện nhờ test Gió mạnh Đêm 3. **Cách sửa:** Tầng 0 thông thoáng toàn đảo (`r <= 45`), chỉ Tháp Chuông (`r < 2, Y >= 5.5`) chặn ngang.
  2. **TypeScript `TS2367` control-flow narrowing trong `headlessRunner.ts`:** Kiểm tra `sim.state === "won" || "lost"` sau `sim.step()` báo lỗi kiểu -> thêm phương thức `sim.isFinished()`.
  3. **Benchmark `21,600` tick dừng sớm ở tick `21,148` với `flames: 100`:** Do Gió + 10 Bóng Mực đánh hết lửa -> tăng `flames: 999` trong kịch bản benchmark để đo trọn vẹn 21.600 tick.
- **Cập nhật harness:** Cập nhật `AGENTS.md` (Contract v1.1, quy ước góc `x=r*cosθ, z=r*sinθ`, trạng thái chuẩn, không tự push) và `verify-and-proof` skill (thêm benchmark 21.600 tick và tất định 3 Đêm).

### Phase 3 (Ticket-03 — Change Request "Đèn cạn dầu" / Contract v1.2)
- **Lời nhắc chính:** Triển khai Ticket-03 thay thế luật đèn/vùng an toàn/luật thắng/điểm số sang Contract v1.2, đồng thời nâng cấp đồ họa 3D (Minimap, cây cỏ đung đưa, thanh dầu 3D, hiệu ứng Lướt, chế độ Mù màu).
- **Lỗi / Bất cập phát hiện khi chạy build:**
  1. **Ký tự `<` chưa escape trong `index.html` (`(< 30)`):** Khi chạy `vite build`, bộ phân tích HTML `parse5` báo lỗi `invalid-first-character-of-tag-name`. **Cách sửa:** Đổi sang `(&lt; 30)`, build pass ngay.
- **Cập nhật harness:** Cập nhật `AGENTS.md` và `verify-and-proof` skill sang Contract v1.2 (bắt buộc tính `fuelTicks` nguyên `1/60`, trạng thái `drain`, luật thắng `dawn_survived`, ghi ADR khi có Change Request).

### Phase 4 (Ticket-04 — Phát hành `v1.0.0` / Contract v1.3)
- **Lời nhắc chính:** Hoàn thành toàn bộ Ticket-04 (Benchmark 3D chuẩn hóa, Soak test 10 Đêm, Bảng xếp hạng + `--export-leaderboard`, Trợ năng, đóng gói `<= 3` lệnh + Docker, nâng cấp giao diện/đồ họa làng cổ Nhật Bản & sinh ảnh minh họa `README.md`, retro 1–2 trang, tag `phase-4`, không tự push).
- **Lỗi / Bất cập tự phát hiện khi rà soát code trước khi chạy benchmark:**
  1. **Đo bộ nhớ Chrome chưa đủ tiến trình con và rò rỉ thư mục tạm trong `scripts/bench.mjs`:** Bản nháp đầu của `sampleChromeRssMb` chỉ lấy Working Set của PID cha Chrome (bỏ sót tiến trình GPU/renderer) và gọi `rmSync(userDataDir)` trong `setTimeout(..., 400)` ngay trước `process.exit(0)` nên timer bị hủy trước khi xóa. **Cách sửa:** Tổng hợp Working Set của toàn bộ tiến trình có dòng lệnh chứa `userDataDir` (qua `Get-CimInstance Win32_Process` trên Windows / `ps` trên Linux/macOS), đóng cây tiến trình bằng `taskkill /T /F`, `await` `350 ms` rồi mới xóa `userDataDir` trước khi thoát.
  2. **Ảnh sinh lần đầu thiếu Mây đội nón lá cầm đèn:** Ảnh minh họa tạo lần 1 đã đẹp phong cách làng cổ nhưng cần rõ nhân vật Mây đội nón lá treo đèn lồng và các Bóng Mực trong sương theo đúng bối cảnh game -> tạo lại lần 2 chi tiết và rõ nét hơn (`docs/images/dao-den-long-showcase.jpg`).
- **Cập nhật harness:** Cập nhật `AGENTS.md`, `.agents/skills/verify-and-proof/SKILL.md` và `scripts/verify.mjs` lên Contract `v1.3` (tự động kiểm tra thêm soak CLI và `--export-leaderboard`).
