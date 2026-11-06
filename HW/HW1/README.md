# HW1: Production Studio Drum Kit

React 19 + Vite + JavaScript JSX. Rules: `../project-rules.md`.

```sh
npm install
npm run dev
npm run build
```

## Cấu trúc

- `src/components/DrumKit.jsx`: bố cục bộ trống và trạng thái nhấn của từng pad.
- `src/components/DrumPad.jsx`: button pad tái sử dụng, nhận trạng thái và callback.
- `src/data/drumPads.js`: nguồn dữ liệu chung cho giao diện, Keyboard Hook và Audio Engine.
- `src/hooks/useDrumAudio.js`: kết nối service với React, báo lỗi và cleanup khi unmount.
- `src/hooks/useDrumKeyboard.js`: contract `useDrumKeyboard(padMap, onTriggerPad, isEnabled = true)`, trả về Set ID pad đang giữ bằng phím tắt.
- `src/services/audio/drumAudioEngine.js`: Audio Engine với `triggerPad(id)` và `dispose()`.

Mỗi pad có ID, label, physicalCode và sound preset bất biến. Âm thanh sẽ được tổng hợp bằng Web Audio API, không cần file âm thanh hoặc dependency bổ sung. Dùng `event.code` đối chiếu với `physicalCode`; tra pad bằng ID khi gọi Audio Engine.

Click/chạm pad hoặc dùng Enter/Space khi focus để phát âm thanh. Mỗi hit tạo source riêng để phát chồng, kể cả cùng pad. Một AudioContext được tạo khi tương tác đầu tiên, tự resume nếu suspended. Gain tổng và compressor giảm đỉnh âm khi nhiều pad cùng phát.

Kick và hai tom dùng sine oscillator trượt cao độ xuống; snare dùng noise bandpass kèm triangle tạo thân âm; hi-hat/crash dùng noise highpass với thời gian ngân khác nhau; clap dùng ba burst noise. Các source kết thúc sẽ disconnect; buffer noise dùng chung được bỏ khi dispose, context đóng khi unmount. Không cần audio assets/dependency mới.

Chạy kiểm tra service bằng `node --test src/services/audio/drumAudioEngine.test.js`.

Phím tắt vật lý W/A/S/D/J/K/L dùng `event.code`, bỏ qua auto-repeat, sự kiện đã xử lý, Ctrl/Alt/Meta, vùng nhập liệu và IME composition. Keyup, blur, tab ẩn, disable hoặc cleanup đều giải phóng trạng thái phím. Trạng thái chuột/button và shortcut được giữ riêng để không vô tình tắt nhau; cùng gọi `triggerPad(id)` để phát âm thanh.

Kiểm tra hook trên trình duyệt: chạy `npm run dev`, mở `/tests/keyboard.html`, nhấn “Chạy kiểm thử”. Fixture sử dụng React StrictMode và kiểm tra events mô phỏng, không phát âm thanh. UniKey thực tế cần kiểm tra thủ công trên máy bật bộ gõ.

Chưa có hit log hay decibel meter. Âm thanh là tổng hợp, chưa phải sample trống thu âm. Chưa đánh giá WCAG hoặc Lighthouse.

## Accessibility: phạm vi đã kiểm tra

- Button native giữ Tab/Shift+Tab, Enter/Space; tên chứa label và phím tắt, `aria-pressed` dùng cùng boolean với giao diện. `aria-describedby` nối hướng dẫn; `aria-keyshortcuts` chỉ khai báo khi bật shortcut.
- Trạng thái active có chữ “Đang nhấn”, không chỉ đổi màu. Focus outline rõ ràng, hỗ trợ reduced-motion và forced-colors.
- Có checkbox tắt shortcut một ký tự theo [WCAG 2.1.4](https://www.w3.org/TR/WCAG22/#character-key-shortcuts); click và Enter/Space vẫn dùng được khi tắt.
- Keyboard-only qua đủ 7 pad; fixture `/tests/accessibility.html` dùng component thật với bộ đếm trigger: mỗi Enter/Space, kể cả giữ phím, tăng đúng 1 hit.
- Contrast các nhóm chữ được đo ở trạng thái thường/hover/active và lỗi: tối thiểu 5.02:1 trong các cặp đã kiểm tra. Ngưỡng chữ thường: [4.5:1](https://www.w3.org/TR/WCAG22/#contrast-minimum).
- Ở viewport 375px: scrollWidth = clientWidth = 375; pad nhỏ nhất 146 × 135 CSS px, gap 10px; checkbox 24 × 24px trong label cao ít nhất 44px. Đối chiếu [WCAG 2.5.8](https://www.w3.org/TR/WCAG22/#target-size-minimum).
- Hồi quy: 13 kiểm thử keyboard trong React StrictMode và 7 kiểm thử Audio Engine đạt; production build đạt. Audio Engine và hook keyboard không thay đổi.

Chưa xác minh trực tiếp bằng NVDA/JAWS/VoiceOver hoặc speech control; mới rà soát semantic/accessible name/state/description trong accessibility tree. Chưa có axe/Lighthouse trong project, chưa chạy audit tự động toàn trang; chưa kiểm chứng đầy đủ mọi tiêu chí WCAG 2.2 AA hoặc zoom/text spacing. Không coi các kiểm tra trên là chứng nhận WCAG hay Lighthouse 100.
