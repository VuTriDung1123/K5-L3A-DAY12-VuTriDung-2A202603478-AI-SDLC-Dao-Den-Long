# Đảo Đèn Lồng — Ba Hòn Đảo (Day 12 AI SDLC)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Repository:** [K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long](https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long)
- **Contract:** Test Contract `v1.1` ([game.contract.json](game.contract.json))
- **Công nghệ:** TypeScript + Three.js + Vite (3D WebGL) + Node.js `>=20` (Headless CLI) + Vitest

> Điều khiển **Mây** vượt qua **3 Đêm** (*Đảo Bến*, *Đảo Cau*, *Đảo Chuông*), gom đom đóm thắp sáng các Đèn Lồng Lớn, tận dụng bục nhảy, Bùa Gió, dùng **Lướt** và **Tỏa Sáng** để đối phó Bóng Mực, Gió Lạc và gió bão trước bình minh.

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
| `Shift` | **Lướt (Dash)** `14 m/s` trong `0.2 s` (hồi chiêu `1.5 s`, giữ nguyên độ cao trên không) |
| `E` hoặc `F` | Nạp đom đóm vào Đèn Lồng Lớn ở gần (`<= 2.0 m`, cần `10` đom đóm/đèn) |
| `Q` | **Tỏa Sáng** (tốn `3` đom đóm, bán kính 3D `5 m`, choáng `2 s` + đẩy lùi `4 m`, hồi chiêu `3 s`) |
| Kéo chuột hoặc `J` / `L` (`C`: đưa về sau) | Xoay góc nhìn camera 3D |
| `Esc` hoặc `P` | Tạm dừng / Mở menu tạm dừng |

---

## Luật chơi chuẩn hóa & Tính điểm (v1.1)

- **3 Đêm liên hoàn:**
  - **Đêm 1 — Đảo Bến** (`300 s`): Đảo tròn bán kính `40 m`, `5` Đèn Lồng Lớn.
  - **Đêm 2 — Đảo Cau** (`330 s`): 2 đảo nối bằng cầu tre & `2` bục nhảy, `6` Đèn Lồng, Bùa Gió ở giữa cầu, xuất hiện **Gió Lạc**.
  - **Đêm 3 — Đảo Chuông** (`360 s`): Đảo `3` tầng, `2` dốc thẳng `30°`/`150°`, bục nhảy lên tầng 2, tháp chuông trung tâm, `7` Đèn Lồng, `2` Bùa Gió và **Gió mạnh** định kỳ mỗi `30 s`.
- **Rơi khỏi đảo (`fall_enabled: true`, `Y < -10`):** Mất `1` Ngọn Lửa, mất toàn bộ đom đóm đang mang, chờ `60` tick rồi hồi sinh tại `(0,0,0)` với `90` tick bất tử (thua ngay nếu hết Ngọn Lửa).
- **Cách tính điểm:**
  - Nạp `1` đom đóm vào đèn: `+10` điểm (`per_mote`)
  - Thắp sáng `1` Đèn Lồng Lớn: `+100` điểm (`per_lantern`)
  - Bóng Mực trúng Tỏa Sáng: `+5` điểm (`per_stun`, tính mỗi con mỗi lần kể cả đang choáng)
  - Khi **thắng** Đêm: `+ floor(giây còn lại) * 2` (`per_second_left`) `+ Ngọn Lửa còn lại * 50` (`per_flame_left`).

---

## Kiểm thử & Chế độ Headless (Test Contract v1.1)

```bash
# Chạy toàn bộ unit, contract sync, regression và feature tests
npm test

# Chạy chế độ headless (nhận --night 1 | 2 | 3)
node dist-headless/headless/cli.js --seed 42 --night 3 --ticks 300 --out out.jsonl --snapshot-every 10

# Chạy kiểm chứng tổng hợp (test + build + tất định 3 Đêm + benchmark 21.600 tick)
npm run verify
```

---

## Sáng tạo của tôi

1. **Âm thanh cổ tích tổng hợp hoàn toàn bằng Web Audio (`src/render/audio.ts`):** Nhạc nền ngũ cung ban đêm và bộ hiệu ứng cho tất cả các sự kiện (nhặt, nạp/thắp đèn, nhảy, lướt, tỏa sáng, bị đánh, Bóng Mực xuất hiện, đếm ngược `10 s` cuối, cảnh báo gió, thắng/thua) điều chỉnh âm lượng qua menu Cài đặt (`localStorage`), không dùng file âm thanh ngoài.
2. **Chi tiết cảnh quan 3 Đảo (`src/render/worldDecor.ts`):** Bến tàu Đảo Bến, rặng cau và cầu tre Đảo Cau, trụ đỡ đá thanh mảnh và chuông vàng trên tháp Đảo Chuông cùng hoa đăng trôi trên biển mây và hạt lá bay theo hướng gió.
3. **Cô lập tuyệt đối khỏi Test Contract:** Toàn bộ sáng tạo chỉ nằm trong `src/render/`, không ảnh hưởng đầu ra headless theo Contract v1.1 (đã kiểm tra ranh giới biên dịch qua `tsconfig.headless.json` và regression test tại [docs/proof/phase-2.md](docs/proof/phase-2.md)).

---

## Tài liệu & Ghi chép SDLC

- [game.contract.json](game.contract.json): Test Contract `v1.1` đồng bộ tự động với `DEFAULT_TUNING`.
- [AGENTS.md](AGENTS.md) & [.agents/skills/verify-and-proof/SKILL.md](.agents/skills/verify-and-proof/SKILL.md): Harness AI của dự án.
- [docs/notes/spec-phase-2.md](docs/notes/spec-phase-2.md), [docs/notes/assumptions.md](docs/notes/assumptions.md), [docs/notes/ai-log.md](docs/notes/ai-log.md), [docs/notes/retro.md](docs/notes/retro.md).
- [docs/proof/phase-0.md](docs/proof/phase-0.md), [docs/proof/phase-1.md](docs/proof/phase-1.md), [docs/proof/phase-2.md](docs/proof/phase-2.md).
- [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE) · [CHANGELOG.md](CHANGELOG.md)

---

## Tài liệu gốc của Lab

Xem chi tiết quy định và rubric tại [GUIDE.md](GUIDE.md), [CHECKPOINTS.md](CHECKPOINTS.md), [SUBMISSION.md](SUBMISSION.md), [RULES.md](RULES.md), [RUBRIC.md](RUBRIC.md).
