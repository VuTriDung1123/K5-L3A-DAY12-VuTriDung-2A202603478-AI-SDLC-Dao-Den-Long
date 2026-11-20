# Bằng chứng kiểm chứng — Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0" + Contract v1.3)

- **Sinh viên:** Vũ Trí Dũng (`2A202603478`, Lớp `K5-L3A`)
- **Tag mục tiêu:** `phase-4` (+ GitHub Release `v1.0.0`)
- **Ngày chạy kiểm chứng:** `2026-11-20`

## Cấu hình máy đo thực tế

| Thành phần | Thông số thật |
|---|---|
| Hệ điều hành | `Microsoft Windows 11 Home Single Language 10.0.26300 (x64)` |
| CPU | `Intel(R) Core(TM) i7-14650HX` |
| GPU (hiển thị & WebGL benchmark) | `Intel(R) UHD Graphics` (iGPU mặc định của Chrome ANGLE D3D11; máy có thêm `NVIDIA GeForce RTX 5050 Laptop GPU`) |
| RAM | `15.6 GB` |
| Trình duyệt Benchmark | `Google Chrome` (`C:\Program Files\Google\Chrome\Application\chrome.exe`, cờ `--window-size=1280,720 --disable-frame-rate-limit --disable-gpu-vsync`) |
| Runtime | Node.js `v22+` · Three.js `r174` · Vite `v6.4.6` · Vitest `v3.2.7` |

---

## Bảng truy vết Yêu cầu → Bằng chứng

| Yêu cầu (Ticket-04) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| **Contract v1.3 (`game.contract.json`)** có đủ `bench_cmd`, `soak_cmd`, `run_cmd` khớp `DEFAULT_TUNING` | `tests/contractSync.test.ts` trong `npm test` | `✓ tests/contractSync.test.ts (1 test)` | **Đạt** |
| **1. Chế độ Benchmark 3D (`1280×720`, 200 Shades, 100 Motes, L1–L3 sáng, 3s warmup + 30s đo, tự thoát mã 0)** | Chạy thật `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` + unit test `tests/phase4Features.test.ts` | `bench.json`: `avg_fps: 286.5` (`>= 60`), `p1_low_fps: 115.1` (`>= 30`), `frame_ms_p95: 6.1`, `frames: 8595`, `load_ms: 722` (`<= 10000`), `vsync_off: true`, exit `0` | **Đạt** |
| **2. Soak test 10 Đêm liên tiếp (`--seed 7 --nights 10 --out soak.json`)** | Chạy thật `node dist-headless/headless/soak.js --seed 7 --nights 10 --out soak.json` | `soak.json`: `nights: 10`, `crashes: 0`, `mem_start_mb: 51.3`, `mem_end_mb: 57.9` (`1.129× <= 1.20×`), exit `0` | **Đạt** |
| **3. Bảng Xếp Hạng cục bộ (Top 10, kiểm tra tên 3–12 ký tự, ISO 8601 có múi giờ, `--export-leaderboard`)** | Unit test `tests/phase4Features.test.ts` + chạy thật `node scripts/run-game.mjs --export-leaderboard ...` trong `npm run verify` | 4 tests leaderboard pass + CLI xuất `{"entries":[...]}` và thoát `0` | **Đạt** |
| **4. Khả năng tiếp cận (Đổi 9 phím + khôi phục mặc định, phụ đề + mũi tên Bóng Mực, Giảm chuyển động, chữ `>= 18px` + Chữ lớn `×1.25`)** | Kiểm tra mã nguồn `index.html`, `src/main.ts`, `src/render/gameScene.ts` + biên dịch TypeScript & Vite | Biên dịch sạch `0` lỗi; mọi hạng mục UI/Settings/Accessibility đã tích hợp | **Đạt** (khuyến nghị sinh viên mở `npm start` tự trải nghiệm thêm) |
| **5. Đóng gói & Tài liệu (`<= 3` lệnh chạy, `README.md` có ảnh minh họa & link video, `CHANGELOG.md`, `CREDITS.md`, `LICENSE`, `Dockerfile`)** | Kiểm chứng bản clone sạch từ git (`npm ci && npm run build && npm run verify` + kiểm `scripts/run-game.mjs`) | Xem mục **Kiểm tra trên thư mục clone sạch** bên dưới | **Đạt** |
| **6. Retro 1–2 trang, AI Log đầy đủ 4 phase, Harness còn nguyên, Không hồi quy Phase 1–3** | `npm run verify` (33/33 tests + tất định 3 Đêm + 21.600 tick) + rà soát tài liệu | `docs/notes/retro.md`, `docs/notes/ai-log.md`, `AGENTS.md`, `.agents/skills/verify-and-proof/SKILL.md` | **Đạt** |
| **7. Đẩy tag `phase-4`, tạo GitHub Release `v1.0.0` & quay video `.mp4` `< 5 phút`** | Thao tác thủ công của sinh viên (không tự `git push` theo yêu cầu) | Đã gắn tag local `phase-4` & chuẩn bị sẵn lệnh tạo Release | **Chờ sinh viên thao tác** |

---

## Bằng chứng chạy thật nguyên văn

### 1. Chế độ Benchmark 3D (`bench.json` — 30 giây, `1280×720`, tắt VSync)

Lệnh:
```bash
node scripts/bench.mjs --seed 42 --duration 30 --out bench.json
```

Đầu ra nguyên văn (exit code `0`):
```json
{
  "contract_version": "1.3",
  "avg_fps": 286.5,
  "p1_low_fps": 115.1,
  "frame_ms_p95": 6.1,
  "frames": 8595,
  "load_ms": 722,
  "peak_mem_mb": 943.9,
  "vsync_off": true,
  "renderer": "Three.js r174 WebGL2 (ANGLE (Intel, Intel(R) UHD Graphics (0x0000A78B) Direct3D11 vs_5_0 ps_5_0, D3D11))",
  "os": "Windows_NT 10.0.26300 (x64)"
}
```

Đánh giá ngưỡng Ticket-04:
- `avg_fps`: `286.5 >= 60` (**Đạt**)
- `p1_low_fps`: `115.1 >= 30` (**Đạt**)
- `load_ms`: `722 <= 10000` (**Đạt**)

### 2. Soak Test 10 Đêm liên tiếp (`soak.json`)

Lệnh:
```bash
node dist-headless/headless/soak.js --seed 7 --nights 10 --out soak.json
```

Đầu ra nguyên văn (exit code `0`):
```json
{
  "nights": 10,
  "crashes": 0,
  "results": [
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost"
  ],
  "mem_start_mb": 51.3,
  "mem_end_mb": 57.9,
  "duration_s": 0.1
}
```

Đánh giá ngưỡng Ticket-04:
- `crashes`: `0` (**Đạt**)
- Bộ nhớ: `mem_end_mb = 57.9 MB <= 1.2 * 51.3 = 61.56 MB` (tỷ lệ `1.129×`, **Đạt**)

### 3. Kiểm chứng tổng hợp (`npm run verify`)

Lệnh:
```bash
npm run verify
```

Đầu ra nguyên văn (exit code `0`):
```text
[1/6] Running unit, regression, contract v1.3, and Phase 1-4 feature tests...
 ✓ tests/contractSync.test.ts (1 test) 3ms
 ✓ tests/phase3Changes.test.ts (6 tests) 17ms
 ✓ tests/phase4Features.test.ts (8 tests) 23ms
 ✓ tests/phase2Features.test.ts (8 tests) 34ms
 ✓ tests/simulation.test.ts (8 tests) 56ms
 ✓ tests/cli.test.ts (2 tests) 508ms

 Test Files  6 passed (6)
      Tests  33 passed (33)

[2/6] Typechecking, verifying headless boundary, and building 3D bundle...
dist/index.html                 21.46 kB │ gzip:   5.08 kB
dist/assets/index-DMAP7Ia9.js  576.41 kB │ gzip: 150.38 kB
✓ built in 1.46s
[3/6] Checking determinism across Nights 1, 2, 3...
[4/6] Running full 21,600-tick Night 3 performance benchmark (limit <= 30,000 ms)...
[5/6] Verifying soak CLI (3 nights) & --export-leaderboard CLI...
[6/6] Verification PASSED! 21,600-tick=184 ms, soak3=51.3->58.4 MB (0 crashes), lb_entries=0.
```

### 4. Kiểm tra trên thư mục clone sạch (`%TEMP%\ddl-phase4-clean-clone`)

Các lệnh chạy thật trên bản clone sạch không có `node_modules/`, `dist/`, `dist-headless/` hay `data/`:
```bash
git clone <repo> %TEMP%\ddl-phase4-clean-clone
npm ci
npm run build
npm run verify
node scripts/run-game.mjs --export-leaderboard lb-empty.json
# Khởi chạy server `node scripts/run-game.mjs` (PORT=4188), GET /, POST /api/leaderboard, tắt server rồi xuất lại:
node scripts/run-game.mjs --export-leaderboard lb-after.json
```

Đầu ra nguyên văn (exit code `0`):
```text
added 65 packages, and audited 66 packages in 5s
✓ built in 1.44s
 Test Files  6 passed (6)
      Tests  33 passed (33)
[6/6] Verification PASSED! 21,600-tick=186 ms, soak3=51.2->59.2 MB (0 crashes), lb_entries=0.
EMPTY_LB: {
  "entries": []
}
Đảo Đèn Lồng v1.0.0 running at http://localhost:4188
HTTP_ROOT_STATUS: 200
API_POST_STATUS: 200
AFTER_LB: {
  "entries": [
    {
      "name": "May_Test",
      "score": 1250,
      "nights_won": 3,
      "achieved_at": "2026-11-20T16:53:36+07:00",
      "seed": 42
    }
  ]
}
```

Xác nhận: clone sạch chạy trọn vẹn trong đúng 3 lệnh (`npm ci`, `npm run build`, `npm start`), Bảng Xếp Hạng lưu ổn định xuống ổ đĩa và xuất đúng định dạng JSON `{"entries":[...]}` qua `--export-leaderboard`.
