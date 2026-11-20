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

## Phase 1 (PRD-0)
*(Chờ phát hành PRD-0 trên lab board để điền yêu cầu bắt buộc, chỗ mơ hồ và giả định chi tiết.)*

## Phase 2 (Ticket-02)
*(Chờ phát hành Ticket-02.)*

## Phase 3 (Ticket-03)
*(Chờ phát hành Ticket-03.)*

## Phase 4 (Ticket-04)
*(Chờ phát hành Ticket-04.)*
