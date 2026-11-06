# HW1 — Final verification report

Ngày: 06/11/2026. Baseline Git: aa1757a; phiên bản sau sửa được đóng gói trong commit `test(hw1): verify accessibility and reliability`. Nguồn đối chiếu: slide 26 (HW1) và 34 (rubric) của deck Lab 03 do người dùng cung cấp; code HW1 và git log thực tế. Không áp dụng kết luận này cho HW2/HW3.

## Kết quả tổng thể

- Production build PASS, React 19 + Vite + JavaScript JSX. Không có cấu hình TypeScript nên không tuyên bố đã chạy tsc.
- 31 automated assertions/test cases đạt: 8 Node Audio Engine tests; 13 keyboard, 7 feedback, 3 reliability regression cases trên Chromium. Ba suite browser được khởi chạy qua giao diện fixture, không phải pipeline CLI tự động hoàn toàn.
- Native Enter, Space, held Enter, held Space trong fixture component thật: đúng 4 hit, không double trigger. Đây là kiểm tra thao tác native riêng, không cộng vào 31 case.
- Lighthouse 13.6.0, Chrome headless, production preview http://127.0.0.1:4173/, mobile mặc định: Performance 100, Accessibility 100, Best Practices 100, SEO 100. Bằng chứng nguyên gốc: reports/lighthouse-final.json, gồm môi trường và thời gian của tool. Một lần đo local không bảo đảm cùng điểm trên mọi thiết bị/hosting và không chứng nhận toàn bộ WCAG.
- Baseline Lighthouse: 100/100/96/91 tương ứng; raw report reports/lighthouse-before.json. Đã sửa favicon 404, robots trả HTML và accessible-name mismatch.
- Lighthouse có category mở rộng agentic-browsing 50: chưa thêm llms.txt/ARD manifest vì ngoài yêu cầu HW1. Cảnh báo unused JavaScript/dependency/render-blocking còn trong raw report, không làm bốn điểm nêu trên thấp hơn 100.

## Checklist PASS / FAIL / NOT TESTED

| Nhóm / yêu cầu | Kết quả | Bằng chứng và phạm vi |
| --- | --- | --- |
| 7 pad, ID/config dùng chung, physical KeyW/A/S/D/J/K/L | PASS | Source data; 7 click và 7 phím trên production, sequence đạt 14 |
| keydown/keyup, anti-repeat, không trigger lặp | PASS | 13-case keyboard suite; native fixture giữ Enter/Space |
| INPUT/TEXTAREA/SELECT/nested contenteditable isolation | PASS | Browser dispatch events vào từng vùng nhập liệu |
| event.code độc lập ký tự đã dịch, IME flag/start/end | PASS | Keyboard suite dùng key khác code và CompositionEvent |
| UniKey thực tế, Telex/VNI native | NOT TESTED | Chưa bật và thao tác trực tiếp bộ gõ hệ điều hành |
| Active/inactive, shortcut blur/visibility/remount | PASS | Keyboard suite và kiểm tra sản phẩm |
| Native active khi window blur, Enter+Space đồng thời | PASS sau sửa | Baseline FAIL 2 case; regression sau sửa 3/3 |
| Nhiều voice, 15 hit kick nhanh, nguồn độc lập | PASS (mock) | Audio test 22 hit + snare body = 23 source; không rơi request |
| Suspended/resume, failure/unsupported/closed/dispose | PASS (mock) | Node suite; browser feedback còn kiểm tra Web Audio unavailable |
| Meter phản ứng với audio thật | PASS | Feedback suite AudioContext thật, peak quan sát 6%, rồi về 0% |
| Effect/listener cleanup và stale callbacks | PASS trong fixture | StrictMode, rerender, disable, callback update và remount; mỗi loại hook listener một bộ |
| rAF không trùng, hidden pause, unmount cleanup | PASS | Feedback: max pending frame=1, unmount=0 |
| History/timer giới hạn | PASS | 50 hit giữ 12 entry; max 7 flash timer + 1 announce timer; cleanup=0 |
| Heap memory growth dài hạn | NOT TESTED | Chưa heap snapshot/stress nhiều giờ; bounded refs không thay thế heap profiling |
| React updates | PASS (source review có giới hạn) | Không setState trong meter rAF; bỏ qua DOM value không đổi; callback native ổn định. Chưa React DevTools Profiler |
| Button semantic, name, aria-pressed/description | PASS trong Chromium/audit | Trạng thái dùng cùng boolean; không role button giả; Lighthouse checks |
| output aria-live polite, live announcements gộp | PASS trong DOM/fixture | 50 hit => 1 summary sau cửa sổ 2s; list aria-live off |
| Screen reader nghe trực tiếp/không quá tải thực tế | NOT TESTED | Chưa NVDA/JAWS/VoiceOver; không suy diễn từ DOM mutation count |
| Tab/Shift+Tab, native Enter/Space, focus-visible | PASS trong Chromium | Kiểm tra keyboard-only; trigger chỉ trong onClick native |
| Text contrast >=4.5:1 | PASS với palette đã kiểm tra | Worst text pair: #b7b7bf trên hover #414249 = 5.02:1; Lighthouse contrast audit |
| Pad boundary contrast >=3:1 | PASS sau sửa | Baseline #606168 trên #25262b = 2.45:1 (FAIL); border mới #8b8d98 đạt regression |
| Active không chỉ dựa màu; target spacing | PASS | Chữ Đang nhấn/Đã đánh, focus outline; pad >=135px cao, gap 10px ở mobile |
| Responsive 375px/no overflow | PASS | viewport 375; clientWidth=scrollWidth=360 (15px scrollbar); history dài 12 mục vẫn không tràn |
| Reduced-motion/forced-colors | PASS source review; NOT TESTED AT/OS thực tế | Nhánh meter 400ms thay 100ms, CSS bỏ transition/giữ outline system colors |
| Meter theo yêu cầu slide | PASS với Audio Level Meter theo yêu cầu người dùng | RMS % từ AnalyserNode, không tuyên bố dBFS/dB SPL hay đo môi trường |
| API lỗi thời/XSS | PASS static scan | Không match keyCode, ReactDOM.render, defaultProps, window.alert, dangerouslySetInnerHTML trong src |
| Full WCAG 2.2 AA, zoom/text spacing/cross-browser | NOT TESTED | Lighthouse A11y 100 không đủ kết luận chứng nhận |
| Rubric WBS, audit 3 lỗi, Git từng bước | PASS | TASK_DECOMPOSITION.md, AI_FAILURE_AUDIT.md và 6 commit feature trước commit này |
| Live defense AI đóng | NOT TESTED | Cần người học trình bày trước giảng viên |

Không còn case FAIL trong các suite đã chạy sau sửa. Các case từng FAIL được giữ nguyên bằng chứng trước sửa, không xóa lịch sử hoặc đổi thành Not Tested.

## Lệnh và cách chạy lại

```sh
npm test
npm run build
npm run dev
```

Mở /tests/keyboard.html, /tests/feedback.html, /tests/reliability.html và nhấn Chạy kiểm thử. Mở /tests/accessibility.html, Tab đến pad rồi thử Enter/Space, giữ mỗi phím và theo dõi Hits. Fixture audio thực yêu cầu trình duyệt hỗ trợ Web Audio.

Lighthouse được chạy qua `npm exec --yes --package=lighthouse -- lighthouse http://127.0.0.1:4173/ --chrome-flags=--headless --output=json --output-path=reports/lighthouse-final.json --quiet`, với CHROME_PATH trỏ Chrome cài trên máy; preview phục vụ dist. Không thêm dependency Lighthouse vào project.

## File thay đổi trong đợt cuối

- src/components/DrumPad.jsx: theo dõi nguồn native độc lập, clear khi blur/hidden, cleanup, ref callback; đồng bộ visible/accessibility labels.
- src/components/DrumKit.jsx: callback press/release ổn định, tránh state update nếu pad đã active.
- src/App.jsx: tên link chứa nhãn nhìn thấy.
- src/styles.css: tăng contrast đường biên pad.
- index.html, public/robots.txt: bỏ request favicon 404 và robots fallback HTML.
- package.json: lệnh npm test cho Node suite sẵn có, không thêm dependency.
- tests/reliability.html, tests/reliability.jsx: ba regression cases trước/sau sửa.
- reports/lighthouse-before.json, lighthouse-final.json, regression-before.txt, regression-after.txt: bằng chứng.
- TASK_DECOMPOSITION.md, AI_FAILURE_AUDIT.md, FINAL_REPORT.md, README.md: tài liệu và hướng dẫn.

## Tuân thủ rules

Đã đọc và giữ nguyên ../project-rules.md. Chỉ thay đổi HW1 liên quan; không đụng EX/demo hoặc rules chưa được track. Không thay engine/hook keyboard đang chạy trong đợt cuối. Không thêm dependency, refactor toàn project, push Git hoặc tạo bằng chứng/commit hash giả. Commit được người dùng yêu cầu rõ. Các giới hạn kiểm thử được công bố thay vì nhận đã hoàn tất mọi tiêu chí.
