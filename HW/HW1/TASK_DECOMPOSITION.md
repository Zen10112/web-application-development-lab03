# HW1 — Task decomposition (đối chiếu lịch sử thực tế)

Ngày kiểm tra: 06/11/2026. Chỉ áp dụng HW1, không kết luận thay cho các bài EX/HW khác.

Completed = đã triển khai và có kiểm tra ghi trong FINAL_REPORT.md. Failed = kiểm tra phát hiện lỗi, phải phân biệt trước/sau sửa. Not Tested = chưa có bằng chứng kiểm chứng, không đồng nghĩa tính năng đã hỏng.

| Nhóm / mục tiêu và task | File chính | Commit thực tế | Trạng thái |
| --- | --- | --- | --- |
| Khởi tạo React 19/Vite/JSX; contract 7 pad W/A/S/D/J/K/L, ID và preset âm thanh dùng chung | package.json, vite.config.js, src/data/drumPads.js, src/main.jsx | c3be1e9 `feat(hw1): initialize drum kit project` | Completed |
| Dark theme, button pad tái sử dụng, active state, bố cục 4/3/2 cột | src/components/DrumKit.jsx, DrumPad.jsx, src/styles.css | 3d7c1ae `feat(hw1): build drum pad interface` | Completed; lỗi biên active native được phát hiện và sửa trong đợt cuối |
| AudioContext lazy/resume, nguồn âm độc lập mỗi hit, polyphony, cleanup/error handling | src/services/audio/drumAudioEngine.js, .test.js, src/hooks/useDrumAudio.js | ed1c576 `feat(hw1): implement drum audio engine` | Completed |
| Hook contract, physical code, anti-repeat, editor/IME isolation, blur/visibility cleanup, stale-closure/lifecycle tests | src/hooks/useDrumKeyboard.js, tests/keyboard.* | 33248f5 `feat(hw1): implement keyboard controls` | Completed cho events mô phỏng và phím trên trình duyệt; UniKey thực tế Not Tested |
| aria-pressed/name/description, native Tab/Enter/Space, toggle shortcut, visible status, focus/reduced motion | DrumKit.jsx, DrumPad.jsx, styles.css, tests/accessibility.* | 60ca8b1 `feat(hw1): improve drum accessibility` | Completed trong phạm vi kiểm tra; toàn bộ WCAG/AT thực tế Not Tested |
| Log 12 hit, thông báo gộp 2s, flash, Analyser/RMS, rAF/timer cleanup | AudioLevelMeter.jsx, VisualHitLog.jsx, useHitFeedback.js, useDrumAudio.js, drumAudioEngine.js, tests/feedback.* | aa1757a `feat(hw1): add visual audio feedback` | Completed |
| Tổng kiểm thử, sửa 3 lỗi regression, đo Lighthouse, sửa favicon/robots/label; hoàn thiện tài liệu và bằng chứng | tests/reliability.*, DrumPad.jsx, DrumKit.jsx, App.jsx, styles.css, index.html, public/robots.txt, reports/, ba tài liệu kiểm thử | Commit chứa tài liệu này, message `test(hw1): verify accessibility and reliability` | Completed sau khi commit; hash tra trực tiếp bằng git log, không đoán trước hash |

## Failed trước sửa

Fixture reliability trên baseline aa1757a: 0 passed / 3 failed. Chi tiết trong reports/regression-before.txt và AI_FAILURE_AUDIT.md. Sau sửa: 3 passed / 0 failed. Không giữ trạng thái Failed cho những lỗi đã có kiểm thử sau sửa đạt.

## Not Tested / công việc chưa được xác minh

- UniKey native (Telex/VNI), NVDA/JAWS/VoiceOver, speech control và nhiều tổ hợp hệ điều hành/trình duyệt.
- Heap profiling dài hạn, React DevTools Profiler và đánh giá chất âm trực tiếp bởi người nghe.
- Toàn bộ WCAG 2.2 AA, text spacing/zoom và live defense của giảng viên.
- Không suy ra những hạng mục này là Completed từ điểm Lighthouse.
