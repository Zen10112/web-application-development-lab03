import { useCallback, useId, useState } from 'react';
import { DRUM_PADS } from '../data/drumPads.js';
import { DrumPad } from './DrumPad.jsx';
import { useDrumAudio } from '../hooks/useDrumAudio.js';
import { useDrumKeyboard } from '../hooks/useDrumKeyboard.js';
import { useHitFeedback } from '../hooks/useHitFeedback.js';
import { VisualHitLog } from './VisualHitLog.jsx';
import { AudioLevelMeter } from './AudioLevelMeter.jsx';

const PAD_MAP = new Map(DRUM_PADS.map((pad) => [pad.physicalCode, pad]));

export function DrumKit() {
  const headingId = useId();
  const instructionsId = useId();
  const shortcutsId = useId();
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [activePadIds, setActivePadIds] = useState(() => new Set());
  const { triggerPad: playPad, readLevel, audioError } = useDrumAudio();
  const { hits, flashingIds, announcement, recordHit } = useHitFeedback();
  const triggerPad = useCallback((id) => {
    const pad = DRUM_PADS.find((item) => item.id === id);
    if (!pad) return;
    recordHit(pad);
    return playPad(id);
  }, [recordHit, playPad]);
  const keyboardPadIds = useDrumKeyboard(PAD_MAP, triggerPad, shortcutsEnabled);
  const hasActivePad = activePadIds.size > 0 || keyboardPadIds.size > 0;

  const pressPad = useCallback((id) => {
    setActivePadIds((previous) => previous.has(id) ? previous : new Set(previous).add(id));
  }, []);

  const releasePad = useCallback((id) => {
    setActivePadIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }, []);

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
        <label className="shortcut-control" htmlFor={shortcutsId}>
          <input id={shortcutsId} type="checkbox" checked={shortcutsEnabled}
            onChange={(event) => setShortcutsEnabled(event.target.checked)} />
          Bật phím tắt W / A / S / D / J / K / L
        </label>
        <ul className="pad-grid">
          {DRUM_PADS.map((pad, index) => (
            <li key={pad.id}>
              <DrumPad pad={pad} number={index + 1}
                isActive={activePadIds.has(pad.id) || keyboardPadIds.has(pad.id)}
                onPress={pressPad} onRelease={releasePad}
                onTrigger={triggerPad} instructionsId={instructionsId}
                isFlashing={flashingIds.has(pad.id)}
                shortcutsEnabled={shortcutsEnabled} />
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
      <section className="visual-feedback" aria-label="Phản hồi trực quan">
        <AudioLevelMeter readLevel={readLevel} />
        <VisualHitLog hits={hits} announcement={announcement} />
      </section>
      <p id={instructionsId} className="kit-instructions">
        <span className="instruction-label">CÁCH SỬ DỤNG</span>
        Dùng Tab hoặc Shift + Tab để chuyển giữa các pad; nhấn Enter hoặc Space để đánh pad đang chọn.
        <span className="preview-note">Khi bật phím tắt, nhấn W, A, S, D, J, K, L để đánh pad tương ứng. Giữ phím không đánh lặp.</span>
        <span className="preview-note">Có thể tắt phím tắt khi dùng trình đọc màn hình hoặc điều khiển bằng giọng nói. Phím tắt tạm ngưng khi nhập liệu hoặc dùng IME.</span>
      </p>
    </section>
  );
}
