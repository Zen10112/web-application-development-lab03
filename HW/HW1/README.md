# HW1: Production Studio Drum Kit

React 19 + Vite + JavaScript JSX. Rules: `../project-rules.md`.

```sh
npm install
npm run dev
npm run build
```

## Cấu trúc

- `src/components/`: giao diện đọc dữ liệu pad.
- `src/data/drumPads.js`: nguồn dữ liệu chung cho giao diện, Keyboard Hook và Audio Engine.
- `src/hooks/`: dành cho Keyboard Hook ở bước tiếp theo.
- `src/services/audio/`: dành cho Audio Engine ở bước tiếp theo.

Mỗi pad có ID, label, physicalCode và sound preset bất biến. Âm thanh sẽ được tổng hợp bằng Web Audio API, không cần file âm thanh hoặc dependency bổ sung. Dùng `event.code` đối chiếu với `physicalCode`; tra pad bằng ID khi gọi Audio Engine.

Hiện chỉ có dữ liệu và danh sách hiển thị. Chưa có phát âm thanh, keyboard hook, hit log hay decibel meter. Chưa đánh giá WCAG hoặc Lighthouse.
