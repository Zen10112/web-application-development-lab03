# HW1 — AI failure audit

Ngày 06/11/2026. Ba lỗi dưới đây được xác minh trên code AI đã tạo ở các commit HW1; không phải lỗi cố tình chèn vào. Baseline: aa1757a. Bằng chứng trước sửa: reports/regression-before.txt; fixture có thể chạy bằng Vite tại /tests/reliability.html. Sau sửa: 3 passed / 0 failed.

Commit sửa cả ba lỗi: commit chứa báo cáo này, message `test(hw1): verify accessibility and reliability`. Không ghi hash giả trước khi Git tạo commit; lấy hash thật bằng `git log -1 --format="%h %s" -- src/components/DrumPad.jsx`.

## 01 — Native pad bị kẹt active khi mất focus cửa sổ

- Task: giao diện/native accessibility; active phải trở về inactive khi mất focus/chuyển tab. Code xuất phát từ 3d7c1ae, còn trong aa1757a.
- Code lỗi: DrumPad chỉ có `onKeyUp={...release}` và `onBlur={release}`; không theo dõi window blur/visibility cho nguồn native Enter/Space. Hook shortcut chỉ xóa Set riêng của W–L, không xóa Set native trong DrumKit.
- Tái hiện: dispatch keydown Enter lên button; xác nhận aria-pressed=true; dispatch window blur mà button không phát keyup.
- Bằng chứng: `FAIL: native Enter clears on window blur: aria-pressed stuck true after window blur`.
- Sửa: theo dõi nguồn input đang giữ trong ref; nghe window blur và document visibilitychange, clear nguồn native; cleanup listener khi unmount. Callback release mới nhất nằm trong ref để listener ổn định, không stale closure.
- Sau sửa: `PASS: native Enter clears on window blur`.

## 02 — Thả Enter tắt nhầm Space vẫn đang giữ

- Task: đồng bộ aria-pressed với trạng thái active thực tế; hỗ trợ native Enter/Space. Code xuất phát từ 3d7c1ae, còn trong aa1757a.
- Code lỗi: `onKeyUp` gọi `release()` vô điều kiện cho cả Enter và Space. Một boolean/Set theo pad ID không phân biệt hai nguồn nhấn native của cùng pad.
- Tái hiện: keydown Space, keydown Enter, keyup Enter; Space chưa được thả nhưng aria-pressed=false.
- Bằng chứng: `FAIL: native Space remains active until its own release: releasing Enter incorrectly clears held Space`.
- Sửa: Set nguồn theo mã phím/pointer ID. Keyup chỉ xóa nguồn tương ứng; chỉ release pad khi Set rỗng. Giữ onClick là nơi duy nhất gọi audio cho native button, không thêm trigger ở keydown.
- Sau sửa: `PASS: native Space remains active until its own release`. Native keyboard fixture thêm xác minh Enter, Space và giữ mỗi phím: đúng 4 hit cho 4 lần nhấn, không double trigger.

## 03 — Contrast đường biên pad không đủ

- Task: WCAG 2.2 AA, khả năng nhận biết vùng điều khiển. CSS nguồn từ 3d7c1ae; còn tồn tại sau 60ca8b1 vì đợt đó mới đo contrast văn bản.
- Code lỗi: `border: 1px solid #606168` trên console có đầu gradient sáng nhất #25262b.
- Cách phát hiện: fixture đọc computed border color của button thật, tính relative luminance sRGB và contrast với nền console. Đây là phép đo đường biên, không nhầm với ngưỡng text 4.5:1.
- Bằng chứng: `FAIL: pad boundary contrast against console is at least 3:1: boundary contrast 2.45:1`.
- Sửa: border #8b8d98, bottom border #9b9da6, giữ text/preset/audio không đổi.
- Sau sửa: `PASS: pad boundary contrast against console is at least 3:1`.

## Bằng chứng bổ sung, không dùng để thổi số lượng lỗi

- Lighthouse baseline: favicon.ico 404 làm Best Practices 96; đã khai báo icon data URI. Robots fallback HTML làm SEO 91; đã thêm public/robots.txt. Raw audit trước/sau trong reports/.
- Kiểm thử meter ở đợt trước từng chờ tín hiệu quá sớm; đã sửa cách chờ và giữ peak. Không gọi đây là bằng chứng một lỗi audio khác nếu chưa tái hiện trên baseline lưu trong Git.
- Không có bằng chứng DevTools heap snapshot/NVDA/UniKey thực tế; không bịa các loại bằng chứng đó.
