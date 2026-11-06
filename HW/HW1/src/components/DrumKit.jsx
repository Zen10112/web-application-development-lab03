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
        <p className="intro-copy">Seven sounds. One creative space.<br />Tap a pad and find your rhythm.</p>
      </header>
      <section className="pad-console" aria-label="Drum controls" aria-describedby={instructionsId}>
        <header className="console-header">
          <h2>DRUM BANK <span>01</span></h2>
          <span className="bank-count">{String(DRUM_PADS.length).padStart(2, '0')} PADS</span>
        </header>
        <label className="shortcut-control" htmlFor={shortcutsId}>
          <input id={shortcutsId} type="checkbox" checked={shortcutsEnabled}
            onChange={(event) => setShortcutsEnabled(event.target.checked)} />
          Enable W / A / S / D / J / K / L shortcuts
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
          <span>Tap to play · Let the sound ring</span>
        </footer>
      </section>
      {audioError && <p role="alert" className="audio-error">{audioError}</p>}
      <section className="visual-feedback" aria-label="Visual feedback">
        <AudioLevelMeter readLevel={readLevel} />
        <VisualHitLog hits={hits} announcement={announcement} />
      </section>
      <p id={instructionsId} className="kit-instructions">
        <span className="instruction-label">HOW TO PLAY</span>
        Use Tab or Shift + Tab to move between pads. Press Enter or Space to play the focused pad.
        <span className="preview-note">When shortcuts are enabled, press W, A, S, D, J, K or L to play a pad. Holding a key does not repeat hits.</span>
        <span className="preview-note">Disable shortcuts when using a screen reader or voice control. Shortcuts pause while typing or using an IME.</span>
      </p>
    </section>
  );
}
