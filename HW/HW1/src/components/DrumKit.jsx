import { useId, useState } from 'react';
import { DRUM_PADS } from '../data/drumPads.js';
import { DrumPad } from './DrumPad.jsx';
import { useDrumAudio } from '../hooks/useDrumAudio.js';
import { useDrumKeyboard } from '../hooks/useDrumKeyboard.js';

const PAD_MAP = new Map(DRUM_PADS.map((pad) => [pad.physicalCode, pad]));

export function DrumKit() {
  const headingId = useId();
  const instructionsId = useId();
  const [activePadIds, setActivePadIds] = useState(() => new Set());
  const { triggerPad, audioError } = useDrumAudio();
  const keyboardPadIds = useDrumKeyboard(PAD_MAP, triggerPad);
  const hasActivePad = activePadIds.size > 0 || keyboardPadIds.size > 0;

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
                isActive={activePadIds.has(pad.id) || keyboardPadIds.has(pad.id)}
                onPress={pressPad} onRelease={releasePad}
                onTrigger={triggerPad} />
            </li>
          ))}
        </ul>
        <footer className="console-footer">
          <span className={`activity${hasActivePad ? ' is-active' : ''}`}>
            <span aria-hidden="true" />{hasActivePad ? 'PAD ACTIVE' : 'STANDBY'}
          </span>
          <span>Nhấn để đánh · Âm thanh tự ngân</span>
        </footer>
      </section>
      {audioError && <p role="alert" className="audio-error">{audioError}</p>}
      <p id={instructionsId} className="kit-instructions">
        <span className="instruction-label">CÁCH SỬ DỤNG</span>
        Nhấn W, A, S, D, J, K, L hoặc chạm vào pad. Dùng Tab để chọn, Enter hoặc Space để nhấn.
        <span className="preview-note">Âm thanh tổng hợp trực tiếp · Phím tắt tạm ngưng khi nhập liệu hoặc dùng IME.</span>
      </p>
    </section>
  );
}
