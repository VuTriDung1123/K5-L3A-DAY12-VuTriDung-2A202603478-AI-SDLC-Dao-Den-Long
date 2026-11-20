# Đảo Đèn Lồng — Day 12 AI SDLC

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Repository:** [K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long](https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long)
- **Công nghệ:** TypeScript + Three.js + Vite (3D WebGL) + Node.js `>=20` (Headless CLI) + Vitest

> Điều khiển **Mây**, người giữ đèn nhỏ tuổi đội nón lá có treo đèn lồng mini, thu thập **đom đóm** quanh Đảo Bến để thắp sáng **5 Đèn Lồng Lớn** trước bình minh, né hoặc dùng **Tỏa sáng** để xua **Bóng Mực** trong sương đêm.

---

## Cài đặt và chạy (tối đa 3 lệnh)

```bash
npm ci
npm run build
npm run dev
```

Mở URL Vite hiển thị (mặc định `http://localhost:5173`) để chơi **Đêm 1 – Đảo Bến** trên trình duyệt.

---

## Điều khiển (3D)

| Phím / Thao tác | Hành động |
|---|---|
| `W A S D` hoặc `↑ ↓ ← →` | Di chuyển theo hướng camera |
| `Space` | Nhảy |
| `E` hoặc `F` | Nạp đom đóm vào Đèn Lồng Lớn ở gần (`<= 2.5 m`) |
| `Q` hoặc `Shift` | **Tỏa sáng** (tốn `1` đom đóm, đẩy lùi và làm choáng Bóng Mực trong `6 m`) |
| Kéo chuột hoặc `J` / `L` (`C`: đưa về sau) | Xoay góc nhìn camera 3D |
| `M` | Bật / tắt âm thanh |
| `R` | Chơi lại Đêm 1 |

---

## Luật chơi, Tính điểm & Giải thích `game.contract.json`

- **Mục tiêu:** Thắp đủ `5` Đèn Lồng Lớn (`3` đom đóm mỗi đèn, hỗ trợ nạp từng phần). Giữ tối đa `5` đom đóm cùng lúc (`carry_capacity = 5`).
- **Máu & An toàn:** Mây có `3` ngọn lửa (`flames = 3`). Bóng Mực không thể vào vùng bán kính `safe_radius = 5 m` quanh Đèn Lồng đã thắp sáng. Khi bị Bóng Mực chạm, mất `1` ngọn lửa, rơi `floor(carried * 0.5)` đom đóm (`hit_drop_ratio = 0.5`), và bất tử tạm thời `1.5 s`.
- **`fall_enabled: false`:** Đảo Bến có giới hạn biên vô hình tròn bán kính `35 m` để giữ người chơi trên đảo, không có cơ chế rơi xuống vực nên không phát sinh sự kiện `"fall"`.
- **Cách tính điểm:**
  - Nhặt `1` đom đóm: `+10` điểm (`per_mote`)
  - Thắp sáng `1` Đèn Lồng Lớn: `+100` điểm (`per_lantern`)
  - Làm choáng `1` Bóng Mực bằng Tỏa sáng: `+25` điểm (`per_stun`)
  - Khi **thắng** (`all_lit`): cộng thêm `floor(time_left_s) * 5` (`per_second_left`) + `flames * 50` (`per_flame_left`).

---

## Kiểm thử & Chế độ Headless (Test Contract v1.0)

```bash
# Chạy unit test & contract sync test
npm test

# Chạy chế độ headless trực tiếp theo Test Contract v1.0
node dist-headless/headless/cli.js --seed 42 --night 1 --ticks 300 --out out.jsonl --snapshot-every 10

# Chạy kiểm chứng tổng hợp (test + typecheck boundary + build 3D/headless + kiểm tra tất định)
npm run verify
```

---

## Sáng tạo của tôi

1. **Âm thanh cổ tích tổng hợp hoàn toàn bằng Web Audio (`src/render/audio.ts`):** Không dùng file âm thanh ngoài; tự tổng hợp tiếng chuông nhặt đom đóm, hợp âm thắp sáng đèn, sóng âm Tỏa sáng, và nhạc thắng/thua (tắt/bật bằng `M`).
2. **Không khí Đảo Bến & Bầu trời chuyển sắc (`src/render/worldDecor.ts`, `src/render/gameScene.ts`):** Cổng bến tàu gỗ với 2 đèn lồng đón khách, vòng hoa đăng trôi trên biển mây ngoài đảo, vòng sáng vùng an toàn quanh đèn đã thắp, và bầu trời/sương đêm ấm dần lên theo số đèn đã thắp (`0/5` -> `5/5`).
3. **Cách ly tuyệt đối khỏi Test Contract:** Toàn bộ phần sáng tạo chỉ nằm trong `src/render/` và **không được import** từ `src/core/` hoặc `src/headless/` (ép ở mức compile bằng `tsconfig.headless.json`). Đã kiểm chứng tính tất định và giữ nguyên output headless theo contract tại [docs/proof/phase-1.md](docs/proof/phase-1.md).

---

## Tài liệu & Ghi chép SDLC

- [game.contract.json](game.contract.json): Khai báo Test Contract v1.0 và thông số `tuning` đồng bộ tự động với `src/core/config.ts`.
- [AGENTS.md](AGENTS.md) & [.agents/skills/verify-and-proof/SKILL.md](.agents/skills/verify-and-proof/SKILL.md): Harness AI của dự án.
- [docs/notes/assumptions.md](docs/notes/assumptions.md): Yêu cầu bắt buộc, giả định, và kế hoạch kiểm chứng từng phase.
- [docs/notes/ai-log.md](docs/notes/ai-log.md): Nhật ký dùng AI, lỗi AI phát hiện được & token ước tính.
- [docs/proof/phase-0.md](docs/proof/phase-0.md), [docs/proof/phase-1.md](docs/proof/phase-1.md): Bằng chứng kiểm chứng từng phase.
- [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE) · [CHANGELOG.md](CHANGELOG.md)

---

## Tài liệu gốc của Lab

Xem chi tiết quy định và rubric tại [GUIDE.md](GUIDE.md), [CHECKPOINTS.md](CHECKPOINTS.md), [SUBMISSION.md](SUBMISSION.md), [RULES.md](RULES.md), [RUBRIC.md](RUBRIC.md).
