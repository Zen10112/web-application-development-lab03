import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { PIANO_LAYOUT } from '../data/pianoLayout.js';
import { PianoKey } from './PianoKey.jsx';
import { usePianoAudio } from '../hooks/usePianoAudio.js';

export function PianoKeyboard() {
  const headingId = useId();
  const instructionsId = useId();
  const heldSources = useRef(new Map());
  const [pressedMidi, setPressedMidi] = useState(() => new Set());
  const { noteOn, noteOff, stopAll, audioError } = usePianoAudio();

  const onNoteOn = useCallback((midi, source) => {
    const wasHeld = heldSources.current.has(midi);
    const sources = heldSources.current.get(midi) ?? new Set();
    sources.add(source);
    heldSources.current.set(midi, sources);
    setPressedMidi((previous) => previous.has(midi) ? previous : new Set(previous).add(midi));
    if (!wasHeld) void noteOn(midi);
  }, [noteOn]);

  const onNoteOff = useCallback((midi, source) => {
    const sources = heldSources.current.get(midi);
    if (!sources) return;
    if (source !== undefined) sources.delete(source);
    if (source !== undefined && sources.size > 0) return;
    heldSources.current.delete(midi);
    noteOff(midi);
    setPressedMidi((previous) => {
      if (!previous.has(midi)) return previous;
      const next = new Set(previous);
      next.delete(midi);
      return next;
    });
  }, [noteOff]);

  useEffect(() => {
    const releaseAll = () => {
      if (heldSources.current.size === 0) return;
      heldSources.current.clear();
      stopAll();
      setPressedMidi(new Set());
    };
    const onVisibility = () => { if (document.hidden) releaseAll(); };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      heldSources.current.clear();
    };
  }, [stopAll]);

  const heldNames = PIANO_LAYOUT.keys.filter((key) => pressedMidi.has(key.midi)).map((key) => key.noteName);

  return (
    <section className="piano-console" aria-labelledby={headingId}>
      <header className="console-header">
        <h2 id={headingId}>GRAND PIANO <span>01</span></h2>
        <span className="preview-badge">SYNTHESIZED PIANO</span>
      </header>
      <p className="keyboard-instructions" id={instructionsId}>
        Press and hold a key to sustain a note. Release to let it fade. Use Tab to move between notes and Enter or Space to play.
        Scroll sideways to explore all 88 keys.
      </p>
      <section className="keyboard-scroll" tabIndex={0} aria-label="Scrollable piano keyboard, A0 to C8"
        aria-describedby={instructionsId}>
        <ol className="keyboard-keys" style={{ '--white-count': PIANO_LAYOUT.whiteKeyCount }}>
          {PIANO_LAYOUT.keys.map((key) => (
            <li key={key.id} className={key.isBlackKey ? 'key-slot key-slot--black' : 'key-slot key-slot--white'}
              style={{ '--white-index': key.whiteIndex }}>
              <PianoKey pianoKey={key} isPressed={pressedMidi.has(key.midi)} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />
            </li>
          ))}
        </ol>
      </section>
      {audioError && <p role="alert" className="audio-error">{audioError}</p>}
      <footer className="keyboard-status">
        <span className={heldNames.length ? 'held-note' : ''}>{heldNames.length ? `HELD / ${heldNames.join(' · ')}` : 'STANDBY / No keys held'}</span>
        <span>52 WHITE <span aria-hidden="true">/</span> 36 BLACK</span>
      </footer>
    </section>
  );
}
