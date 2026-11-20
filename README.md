# Đảo Đèn Lồng — Đèn Cạn Dầu (Day 12 AI SDLC)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Repository:** [K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long](https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long)
- **Contract:** Test Contract `v1.2` ([game.contract.json](game.contract.json))
- **Công nghệ:** TypeScript + Three.js + Vite (3D WebGL) + Node.js `>=20` (Headless CLI) + Vitest

> Điều khiển **Mây** giữ cho các Đèn Lồng Lớn trên **3 Hòn Đảo** (*Đảo Bến*, *Đảo Cau*, *Đảo Chuông*) cháy sáng tới tận **Bình Minh**! Đèn đã thắp sẽ hao dầu theo thời gian và bị Bóng Mực hút dầu khi yếu (`fuel < 30`) — hãy quan sát **Minimap**, dùng **Lướt**, **Tỏa Sáng**, châm thêm dầu và thắp lại đèn kịp thời.

---

## Cài đặt và chạy (tối đa 3 lệnh)

```bash
npm ci
npm run build
npm run dev
```

Mở URL Vite hiển thị (mặc định `http://localhost:5173`) để vào Menu chính và chơi đủ 3 Đêm.

---

## Điều khiển (3D)

| Phím / Thao tác | Hành động |
|---|---|
| `W A S D` hoặc `↑ ↓ ← →` | Di chuyển theo hướng camera (`6.0 m/s`, `7.2 m/s` khi có Bùa Gió) |
| `Space` | Nhảy (`7.0 m/s`) |
| `Shift` | **Lướt (Dash)** `14 m/s` trong `0.2 s` (hồi chiêu `1.5 s`, có vệt bóng mờ & giữ nguyên độ cao trên không) |
| `E` hoặc `F` | **Thắp mới (`10`) / Thắp lại (`5`) / Châm dầu (`+10 dầu/đom đóm`)** cho Đèn Lồng ở gần (`<= 2.0 m`) |
| `Q` | **Tỏa Sáng** (tốn `3` đom đóm, bán kính 3D `5 m`, choáng `2 s` + đẩy lùi `4 m`, hồi chiêu `3 s`) |
| Kéo chuột hoặc `J` / `L` (`C`: đưa về sau) | Xoay góc nhìn camera 3D |
| `Esc` hoặc `P` | Tạm dừng / Mở menu tạm dừng & Cài đặt (Âm lượng, Độ nhạy chuột, **Chế độ Mù màu**) |

---

## Luật chơi Phase 3 ("Đèn cạn dầu" — Contract v1.2)

- **Nhiên liệu Đèn Lồng (`fuel`):**
  - Khi vừa thắp mới (`10` đom đóm) hoặc thắp lại (`5` đom đóm với đèn `ever_lit: true`), đèn có `fuel = 100` và tự hao `1.0/giây` (`1/60` mỗi tick, tính bằng số nguyên `1/60`).
  - Nhấn `E` ở đèn đang sáng chưa đầy dầu để **châm dầu** (`used = min(carried, ceil((100 - fuel) / 10))`).
  - Khi `fuel <= 0`, đèn tắt (`lantern_out`) và ghi nhớ `ever_lit = true` (thắp lại chỉ cần `5` đom đóm).
- **Bóng Mực hút dầu (`drain`):**
  - Đèn có `fuel < 30` **mất vùng an toàn `6 m`** (nhấp nháy `1 Hz`). Bóng Mực ở `wander` ưu tiên tìm đèn sáng có `fuel < 30` gần nhất; khi vào `<= 2 m` chuyển sang `drain` hút `5 fuel/giây`.
  - Khi châm dầu lên `>= 30`, vùng an toàn phục hồi và đẩy mọi Bóng Mực trong `6 m` ra mép trong `<= 30` tick.
- **Sức chứa tăng dần (`capacity`):** `10 + 2 * successful_lights` (tối đa `20`), tăng mỗi lần thắp mới hoặc thắp lại thành công trong Đêm.
- **Điều kiện thắng Bình Minh (`dawn_survived`):** Không còn thắng sớm. Sống sót tới hết giờ (`240 s / 270 s / 300 s`) và giữ số đèn đang sáng `>= ceil(0.6 * tổng đèn)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
- **Cách tính điểm mới (Mục 5 Ticket-03):**
  - Mỗi đom đóm nạp vào đèn (thắp mới, thắp lại hoặc châm dầu): `+5` điểm
  - Thắp đèn lần đầu: `+100` điểm · Thắp lại đèn đã từng sáng: `+40` điểm
  - Bóng Mực trúng Tỏa Sáng: `+5` điểm (`+15` điểm nếu ngay trước đó đang `drain` hút dầu)
  - Thưởng Bình Minh (chỉ khi thắng): mỗi đèn đang sáng `+50 + floor(fuel)` · mỗi Ngọn Lửa còn lại `+50`.

---

## Kiểm thử & Chế độ Headless (Test Contract v1.2)

```bash
# Chạy toàn bộ unit, contract sync, regression và Phase 2-3 feature tests
npm test

# Chạy chế độ headless (nhận --night 1 | 2 | 3)
node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 300 --out out.jsonl --snapshot-every 10

# Chạy kiểm chứng tổng hợp (test + build + tất định 3 Đêm + benchmark 21.600 tick)
npm run verify
```

---

## Sáng tạo của tôi & Nâng cấp Đồ họa / UI Phase 3

1. **Minimap Radar 2D trực quan (`#minimap-canvas`):** Hiển thị địa hình từng đảo (kể cả cầu tre Đêm 2 và 3 tầng Đêm 3), hướng nhìn của Mây, vị trí đom đóm, Bùa Gió, Bóng Mực, Gió Lạc và vòng cung lượng dầu của từng Đèn Lồng (nhấp nháy cảnh báo khi `fuel < 30`).
2. **Thảm thực vật chuyển động, Bầu trời sao & Hiệu ứng động 3D (`src/render/worldDecor.ts`, `gameScene.ts`):** Hàng chục bụi cỏ đung đưa theo gió, cây liễu đèn lồng, rặng cau, cổng gỗ bến tàu, đường đá lát tới từng đèn, bầu trời 180 ngôi sao lấp lánh, vệt bóng mờ vàng kim khi Mây **Lướt (`Shift`)**, tia hút năng lượng tím/xanh khi Bóng Mực đang `drain` đèn, và thanh dầu 3D nổi phía trên mái đèn.
3. **Chế độ Mù màu & Phân biệt không cần màu:** Cài đặt *"Bảng màu dễ phân biệt"* đổi viền/mắt Bóng Mực sang `#00B3FF`, cảnh báo UI sang `#FFFFFF` kèm `⚠`. Đèn tắt tự xẹp `20%` và có vết giấy rách chéo để nhận biết ngay cả khi không nhìn màu.
4. **Cô lập tuyệt đối khỏi Test Contract:** Mọi nâng cấp đồ họa, minimap, cây cỏ và âm thanh đều nằm trong `src/render/`, không làm thay đổi bất kỳ dòng nào của đầu ra headless v1.2.

---

## Tài liệu & Ghi chép SDLC

- [game.contract.json](game.contract.json): Test Contract `v1.2` đồng bộ tự động với `DEFAULT_TUNING`.
- [docs/notes/adr-phase-3.md](docs/notes/adr-phase-3.md): Quyết định kiến trúc (ADR) về máy trạng thái nhiên liệu đèn, Bóng Mực hút dầu và luật thắng Bình Minh.
- [CHANGELOG.md](CHANGELOG.md): Liệt kê đầy đủ các thay đổi và **Breaking Changes** của Phase 3.
- [AGENTS.md](AGENTS.md) & [.agents/skills/verify-and-proof/SKILL.md](.agents/skills/verify-and-proof/SKILL.md): Harness AI của dự án.
- [docs/notes/spec-phase-2.md](docs/notes/spec-phase-2.md), [docs/notes/assumptions.md](docs/notes/assumptions.md), [docs/notes/ai-log.md](docs/notes/ai-log.md), [docs/notes/retro.md](docs/notes/retro.md).
- [docs/proof/phase-0.md](docs/proof/phase-0.md), [docs/proof/phase-1.md](docs/proof/phase-1.md), [docs/proof/phase-2.md](docs/proof/phase-2.md), [docs/proof/phase-3.md](docs/proof/phase-3.md).
- [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE)
