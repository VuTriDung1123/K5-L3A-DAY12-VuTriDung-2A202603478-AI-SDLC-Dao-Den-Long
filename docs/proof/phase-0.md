# Bằng chứng Checkpoint 0 (Chuẩn bị môi trường)

- **Sinh viên:** Vũ Trí Dũng — **MSSV:** `2A202603478` — **Lớp:** `K5-L3A`
- **Commit kiểm chứng:** `2ba935b` (`docs(cp0): add README quickstart, legal files, and phase notes templates`)

## Bảng truy vết kiểm chứng Checkpoint 0

| Yêu cầu (CHECKPOINTS.md) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Repo cá nhân, public trên GitHub đúng quy ước đặt tên | Kiểm tra tên thư mục/remote và truy cập URL công khai không đăng nhập | URL `https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long` trả về HTTP 200 | Đạt |
| Chọn stack và chạy thử Hello 3D + Hello Headless | Chạy `npm run verify` (Vitest + `tsc` ranh giới headless + `vite build` 3D + 2 lần chạy headless so sánh output) | Xem mục Output thực tế bên dưới | Đạt |
| Tạo sẵn nơi ghi chép (giả định, AI log, retro, bằng chứng) | Kiểm tra cây thư mục `docs/notes/`, `docs/proof/`, `AGENTS.md`, `.agents/skills/` | File đã commit trong lịch sử git | Đạt |
| Tự kiểm: clone repo sang thư mục khác và chạy được chương trình thử | `git clone .` sang `%TEMP%\cp0-clean-clone-check`, chạy `npm ci && npm run verify && npm run headless -- --seed 42 --steps 5` | Toàn bộ pass với exit code `0`, đã xóa thư mục tạm sau khi kiểm | Đạt |
| Đăng nhập `claude.ai`, mở lab board Phase 1 và hỏi thử trợ giảng | Sinh viên tự thao tác bằng tài khoản cá nhân | Chưa xác nhận tự động | Chờ sinh viên tự kiểm |
| Kiểm tra hạn nộp từng phase theo thông báo Coach | Sinh viên kiểm tra thông báo lớp | Chưa xác nhận tự động | Chờ sinh viên tự kiểm |

---

## Output thực tế (verbatim)

### 1. Kiểm tra tính công khai của repo GitHub

```powershell
Invoke-WebRequest -Uri "https://github.com/VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long" -UseBasicParsing
```

Kết quả thực tế:

```text
HTTP Status: 200 Title: GitHub - VuTriDung1123/K5-L3A-DAY12-VuTriDung-2A202603478-AI-SDLC-Dao-Den-Long: Day 12 — AI SDLC lab: build the 3D game Đảo Đèn Lồng through 4 phases with AI · GitHub
```

### 2. Tự kiểm trên bản clone sạch ở thư mục khác

Lệnh chạy trong PowerShell:

```powershell
$tmp = Join-Path $env:TEMP "cp0-clean-clone-check"
git clone . $tmp
Push-Location $tmp
npm ci
npm run verify
npm run headless -- --seed 42 --steps 5
```

Output thực tế:

```text
Cloning into 'C:\Users\VUTRID~1\AppData\Local\Temp\cp0-clean-clone-check'...
done.

added 65 packages, and audited 66 packages in 3s

> k5-l3a-day12-vutridung-dao-den-long@0.0.0 verify
> node scripts/verify.mjs

[1/4] Running unit tests...

> k5-l3a-day12-vutridung-dao-den-long@0.0.0 test
> vitest run


 RUN  v3.2.7 C:/Users/VuTriDung/AppData/Local/Temp/cp0-clean-clone-check

 ✓ tests/hello.test.ts (3 tests) 2ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  14:34:19
   Duration  427ms (transform 40ms, setup 0ms, collect 42ms, tests 2ms, environment 0ms, prepare 149ms)

[2/4] Typechecking and building headless + 3D bundle...

> k5-l3a-day12-vutridung-dao-den-long@0.0.0 build
> tsc --noEmit && tsc -p tsconfig.headless.json && vite build

vite v6.4.6 building for production...
transforming...
✓ 8 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  1.24 kB │ gzip:   0.63 kB
dist/assets/index-dMmByzed.js  474.61 kB │ gzip: 119.99 kB
✓ built in 1.18s
[3/4] Running headless determinism check (two identical runs)...
[4/4] Verification PASSED. Headless output: {"mode":"hello-headless","status":"ok","result":{"seed":42,"step":10,"time":1,"angle":4.9768,"lanternPos":{"x":0.6534,"y":1.6273,"z":-2.4131},"glow":0.8712}}

> k5-l3a-day12-vutridung-dao-den-long@0.0.0 headless
> node dist-headless/headless/cli.js --seed 42 --steps 5

{"mode":"hello-headless","status":"ok","result":{"seed":42,"step":5,"time":0.5,"angle":4.3768,"lanternPos":{"x":-0.8233,"y":1.6104,"z":-2.3605},"glow":0.9996}}
```
