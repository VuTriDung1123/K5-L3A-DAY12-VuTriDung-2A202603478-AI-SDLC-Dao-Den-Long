# Đảo Đèn Lồng — v1.0.0 Bình Minh (Day 12 AI SDLC)

> **Video Demo (< 5 phút):** Đính kèm tại [GitHub Release `v1.0.0`](https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long/releases/tag/v1.0.0) (`demo.mp4` — xem trực tiếp không cần đăng nhập sau khi phát hành Release).

![Minh họa Đảo Đèn Lồng — Ngôi làng đèn lồng đêm](docs/images/dao-den-long-showcase.jpg)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Repository:** [K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long](https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long)
- **Phiên bản:** `v1.0.0` · **Test Contract:** `v1.3` ([game.contract.json](game.contract.json))
- **Công nghệ:** TypeScript + Three.js (WebGL2) + Vite + Node.js `>=20` (Headless CLI, Soak, Benchmark, Leaderboard Server) + Vitest

> Điều khiển **Mây** giữ cho các Đèn Lồng Lớn trên **3 Hòn Đảo** (*Đảo Bến*, *Đảo Cau*, *Đảo Chuông*) cháy sáng tới tận **Bình Minh**! Thu thập đom đóm, châm dầu trước khi đèn xuống dưới `30` (mất vùng an toàn và bị Bóng Mực hút dầu), né Gió Lạc, vượt cầu tre & gió mạnh, và ghi tên lên **Bảng Xếp Hạng**!

---

## Yêu cầu hệ thống

- **Node.js:** `>= 20.0.0` (kèm `npm`)
- **Trình duyệt (chơi 3D & benchmark):** Chrome / Chromium / Edge / Firefox hỗ trợ WebGL2
- **Docker (tùy chọn):** Docker Engine / Docker Desktop nếu muốn chạy đóng gói bằng container

---

## Cài đặt và chạy (đúng 3 lệnh)

```bash
npm ci
npm run build
npm start
```

Mở trình duyệt tại **`http://localhost:4173`** để chơi ngay **Đảo Đèn Lồng v1.0.0** (có lưu Bảng Xếp Hạng cục bộ ra ổ đĩa `data/leaderboard.json`).

### Hoặc chạy nhanh bằng Docker

```bash
docker build -t dao-den-long:1.0.0 .
docker run --rm -p 4173:4173 dao-den-long:1.0.0
```

---

## Điều khiển & Khả năng tiếp cận (Accessibility)

Toàn bộ 9 phím điều khiển có thể **đổi tùy ý** trong **Cài đặt & Trợ năng** (có phát hiện trùng phím, tự động lưu và nút **Khôi phục mặc định**):

| Hành động | Phím mặc định | Mô tả |
|---|---|---|
| Di chuyển | `W A S D` (hoặc `↑ ↓ ← →`) | Chạy theo góc nhìn camera (`6.0 m/s`, `7.2 m/s` khi có Bùa Gió) |
| Nhảy | `Space` | Nhảy (`7.0 m/s`, trọng lực `-20 m/s²`) |
| Lướt (Dash) | `Shift` | Lướt nhanh `14 m/s` trong `0.2 s` (hồi chiêu `1.5 s`, giữ độ cao trên không) |
| Thắp / Châm dầu | `E` (hoặc `F`) | Nạp đom đóm thắp mới (`10`), thắp lại (`5`) hoặc châm dầu (`+10/đom đóm`) trong bán kính `2.0 m` |
| Tỏa Sáng (Pulse) | `Q` | Tốn `3` đom đóm, bán kính 3D `5 m`, choáng `2 s` + đẩy lùi `4 m`, hồi chiêu `3 s` |
| Xoay camera | Kéo chuột hoặc `J` / `L` (`C`: về sau) | Xoay camera 3D linh hoạt (kéo dọc để ngước/cúi ở góc nhìn thứ 1) |
| Đổi góc nhìn | `V` (hoặc Menu / Cài đặt) | Chuyển mượt giữa **Góc nhìn thứ 3** và **Góc nhìn thứ 1** (cầm đèn lồng trên tay) |
| Tạm dừng | `Esc` (hoặc `P`) | Tạm dừng / mở cài đặt |

**Tính năng Trợ năng tích hợp:**
- **Phụ đề trực quan & Mũi tên hướng:** Hiển thị thông báo chữ rõ ràng cho Bóng Mực xuất hiện (kèm mũi tên hướng tím/xanh ở rìa màn hình), Gió Lạc, Gió mạnh Đêm 3, 10 giây cuối và cảnh báo đèn dầu `< 30`.
- **Giảm chuyển động (Reduced Motion):** Tắt rung camera, chớp sáng, nhấp nháy HUD và hiệu ứng cánh hoa rơi.
- **Chữ lớn (`×1.25`):** Cỡ chữ nền chuẩn tối thiểu `18px` ở `1280×720`, mở rộng lên `22.5px` khi bật Chữ lớn.
- **Bảng màu dễ phân biệt (Mù màu):** Đổi viền/mắt Bóng Mực sang `#00B3FF`, cảnh báo sang `#FFFFFF` kèm biểu tượng `⚠`; đèn tắt xẹp `20%` kèm vết giấy rách để phân biệt không phụ thuộc màu sắc.

---

## Kiểm thử, Headless, Benchmark, Soak & Xuất Bảng Xếp Hạng (Contract v1.3)

```bash
# 1. Chạy toàn bộ 33 unit tests, contract v1.3 sync, regression và Phase 1–4 tests
npm test

# 2. Kiểm chứng tổng hợp (test + build + ranh giới headless + tất định 3 Đêm + 21.600 tick + soak + export-leaderboard)
npm run verify

# 3. Chạy chế độ headless (Đêm 1 | 2 | 3)
node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 300 --out out.jsonl --snapshot-every 10

# 4. Chạy Benchmark 3D chuẩn hóa (cửa sổ 1280×720, tắt vsync, 200 Bóng Mực, 100 đom đóm, L1–L3 sáng, 30 s đo)
node scripts/bench.mjs --seed 42 --duration 30 --out bench.json

# 5. Chạy Soak test 10 Đêm liên tiếp trong 1 tiến trình
node dist-headless/headless/soak.js --seed 7 --nights 10 --out soak.json

# 6. Xuất Bảng Xếp Hạng cục bộ ra JSON
node scripts/run-game.mjs --export-leaderboard leaderboard-export.json
```

> **Lưu ý tắt VSync cho Benchmark:** `scripts/bench.mjs` khởi chạy Chrome/Chromium/Edge với cờ `--disable-frame-rate-limit --disable-gpu-vsync` ở chế độ cửa sổ `1280×720` (`vsync_off: true`). Nếu chạy trên môi trường có đường dẫn trình duyệt tùy biến, đặt biến môi trường `CHROME_PATH`.

### Kết quả đo thực tế (đã commit tại `bench.json` & `soak.json`)

| Bài đo | Chỉ số chính | Ngưỡng đạt | Kết quả thực tế |
|---|---|---|---|
| **3D Benchmark (`bench.json`, 30 s, `1280×720`)** | `avg_fps` / `p1_low_fps` / `load_ms` | `>= 60` / `>= 30` / `<= 10000 ms` | **`286.5 FPS` / `115.1 FPS` / `722 ms`** (`frame_ms_p95: 6.1 ms`, `8,595` frames, Intel UHD Graphics) |
| **10-Night Soak (`soak.json`)** | `crashes` / `mem_end_mb / mem_start_mb` | `0` / `<= 1.20×` | **`0 crashes` / `51.3 → 57.9 MB` (`1.13×`)** |
| **Headless 21,600 ticks (Đêm 3)** | Tổng thời gian mô phỏng | `<= 30,000 ms` | **`184 ms`** |

---

## Sáng tạo của tôi (Cô lập hoàn toàn khỏi Test Contract)

1. **Ngôi làng đèn lồng cổ Nhật Bản & Bầu trời sao (`src/render/worldDecor.ts`):** Toàn cảnh quần đảo Nhật Bản cổ đại với núi Phú Sĩ phủ tuyết, 18 dãy núi, 6 đảo chùa 5 tầng (*Gojū-no-tō*), cổng *Torii* sơn son, nhà *machiya* / trà quán cửa *shoji* phát sáng, rừng hoa anh đào (*Sakura*), phong lá đỏ (*Momiji*), thông đen, rặng tre, đèn đá *tōrō*, hồ sen; bầu trời shader có `1.350` vì sao + Ngân Hà (*Amanogawa*), Trăng rằm (*Tsuki*), Mặt Trời Bình Minh (*Asahi*) và sao băng (*Nagareboshi*).
2. **Nhân vật Mây có tay chân sinh động, NPC dân làng & Góc nhìn Thứ 1 / Thứ 3 (`src/render/gameScene.ts`, `worldDecor.ts`):**
   - Nhân vật Mây dựng đầy đủ tay áo kimono, chân, guốc gỗ *geta*, đai *obi*, khăn quàng bay, mắt sáng, nón lá và gậy cầm đèn lồng đung đưa theo bước chạy/nhảy.
   - Dân làng NPC (Ông Đăng, vu nữ *Miko*, người làng, trẻ cầm đèn) dạo bước sinh động quanh các lối đá và nhà đền trên cả 3 Đêm.
   - Phím `V` (hoặc nút trên Menu/Cài đặt) chuyển tức thì giữa **Góc nhìn thứ 3** và **Góc nhìn thứ 1** (có đèn lồng cầm tay đung đưa); Menu chính hiển thị trực tiếp nền 3D ngôi làng quay chậm.
3. **Minimap Radar 2D & Trực quan hóa nhiên liệu:** Radar góc trái hiển thị hình dáng đảo/cầu tre/tầng bậc & 2 đường dốc Đêm 3, hướng nhìn Mây, đom đóm, Bùa Gió, Bóng Mực, Gió Lạc và vòng cung dầu từng đèn.
4. **Âm thanh ngũ cung tổng hợp thời gian thực (`src/render/audio.ts`):** Toàn bộ nhạc nền và hiệu ứng âm thanh sinh trực tiếp bằng Web Audio API, không phụ thuộc file media bên ngoài.
5. **Đảm bảo tính công bằng & tất định:** Mọi cảnh vật sáng tạo và NPC chỉ sống trong `src/render/`, **tắt hoàn toàn trong chế độ Benchmark** (`src/render/benchScene.ts`) và không tồn tại trong `src/core/` hay `src/headless/` (ép bằng `tsconfig.headless.json` không có DOM).

---

## Tài liệu SDLC & Bằng chứng

- [game.contract.json](game.contract.json) · [bench.json](bench.json) · [soak.json](soak.json)
- [CHANGELOG.md](CHANGELOG.md) · [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE) · [Dockerfile](Dockerfile)
- **Harness AI:** [AGENTS.md](AGENTS.md) · [.agents/skills/verify-and-proof/SKILL.md](.agents/skills/verify-and-proof/SKILL.md) · [.github/workflows/ci.yml](.github/workflows/ci.yml)
- **Ghi chép:** [docs/notes/assumptions.md](docs/notes/assumptions.md) · [docs/notes/spec-phase-2.md](docs/notes/spec-phase-2.md) · [docs/notes/adr-phase-3.md](docs/notes/adr-phase-3.md) · [docs/notes/ai-log.md](docs/notes/ai-log.md) · [docs/notes/retro.md](docs/notes/retro.md)
- **Bằng chứng từng phase:** [phase-0.md](docs/proof/phase-0.md) · [phase-1.md](docs/proof/phase-1.md) · [phase-2.md](docs/proof/phase-2.md) · [phase-3.md](docs/proof/phase-3.md) · [phase-4.md](docs/proof/phase-4.md)
