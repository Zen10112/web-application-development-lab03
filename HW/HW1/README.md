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
- `src/services/audio/drumAudioEngine.js`: Audio Engine với `triggerPad(id)` và `dispose()`.

Mỗi pad có ID, label, physicalCode và sound preset bất biến. Âm thanh sẽ được tổng hợp bằng Web Audio API, không cần file âm thanh hoặc dependency bổ sung. Dùng `event.code` đối chiếu với `physicalCode`; tra pad bằng ID khi gọi Audio Engine.

Click/chạm pad hoặc dùng Enter/Space khi focus để phát âm thanh. Mỗi hit tạo source riêng để phát chồng, kể cả cùng pad. Một AudioContext được tạo khi tương tác đầu tiên, tự resume nếu suspended. Gain tổng và compressor giảm đỉnh âm khi nhiều pad cùng phát.

Kick và hai tom dùng sine oscillator trượt cao độ xuống; snare dùng noise bandpass kèm triangle tạo thân âm; hi-hat/crash dùng noise highpass với thời gian ngân khác nhau; clap dùng ba burst noise. Các source kết thúc sẽ disconnect; buffer noise dùng chung được bỏ khi dispose, context đóng khi unmount. Không cần audio assets/dependency mới.

Chạy kiểm tra service bằng `node --test src/services/audio/drumAudioEngine.test.js`.

Chưa có phím tắt W–L toàn trang, hit log hay decibel meter. Âm thanh là tổng hợp, chưa phải sample trống thu âm. Chưa đánh giá WCAG hoặc Lighthouse.
