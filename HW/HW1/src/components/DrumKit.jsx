import { useId, useState } from 'react';
import { DRUM_PADS } from '../data/drumPads.js';
import { DrumPad } from './DrumPad.jsx';

export function DrumKit() {
  const headingId = useId();
  const instructionsId = useId();
  const [activePadIds, setActivePadIds] = useState(() => new Set());

  function pressPad(id) {
    setActivePadIds((previous) => new Set(previous).add(id));
  }

  function releasePad(id) {
    setActivePadIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }

  return (
    <section id="drum-kit" className="drum-kit" aria-labelledby={headingId}>
      <header className="kit-intro">
        <p className="eyebrow"><span aria-hidden="true" /> YOUR RHYTHM STARTS HERE</p>
        <h1 id={headingId}>Production Studio<br /><span>Drum Kit.</span></h1>
        <p className="intro-copy">Bảy âm sắc. Một không gian sáng tạo.<br />Chạm vào pad để cảm nhận nhịp điệu của bạn.</p>
      </header>
      <section className="pad-console" aria-label="Bộ điều khiển trống" aria-describedby={instructionsId}>
        <header className="console-header">
          <h2>DRUM BANK <span>01</span></h2>
          <span className="bank-count">{String(DRUM_PADS.length).padStart(2, '0')} PADS</span>
        </header>
        <ul className="pad-grid">
          {DRUM_PADS.map((pad, index) => (
            <li key={pad.id}>
              <DrumPad pad={pad} number={index + 1}
                isActive={activePadIds.has(pad.id)} onPress={pressPad} onRelease={releasePad} />
            </li>
          ))}
        </ul>
        <footer className="console-footer">
          <span className={`activity${activePadIds.size ? ' is-active' : ''}`}>
            <span aria-hidden="true" />{activePadIds.size ? 'PAD ACTIVE' : 'STANDBY'}
          </span>
          <span>Giữ để nhấn · Thả để dừng</span>
        </footer>
      </section>
      <p id={instructionsId} className="kit-instructions">
        <span className="instruction-label">CÁCH SỬ DỤNG</span>
        Nhấn hoặc chạm vào pad. Dùng Tab để chọn, Enter hoặc Space để nhấn.
        <span className="preview-note">Bản giao diện · Âm thanh và phím tắt W–L sẽ được tích hợp ở bước tiếp theo.</span>
      </p>
    </section>
  );
}
