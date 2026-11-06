import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PIANO_LAYOUT } from '../data/pianoLayout.js';
import { PianoKey } from './PianoKey.jsx';
import { usePianoAudio } from '../hooks/usePianoAudio.js';
import { usePianoSequencer } from '../hooks/usePianoSequencer.js';

export function PianoKeyboard() {
  const headingId = useId();
  const instructionsId = useId();
  const heldSources = useRef(new Map());
  const [pressedMidi, setPressedMidi] = useState(() => new Set());
  const [playbackMidi, setPlaybackMidi] = useState(() => new Set());
  const [speed, setSpeed] = useState(1);
  const speedId = useId();
  const { noteOn, noteOff, stopAll, audioError } = usePianoAudio();
  const onPlaybackNote = useCallback((midi, isOn) => {
    setPlaybackMidi((previous) => {
      if (previous.has(midi) === isOn) return previous;
      const next = new Set(previous);
      if (isOn) next.add(midi); else next.delete(midi);
      return next;
    });
  }, []);
  const sequencer = usePianoSequencer(noteOn, noteOff, stopAll, onPlaybackNote);
  const { recordNoteOn, recordNoteOff, stop: stopPlayback } = sequencer;

  const onNoteOn = useCallback((midi, source) => {
    stopPlayback();
    const wasHeld = heldSources.current.has(midi);
    const sources = heldSources.current.get(midi) ?? new Set();
    sources.add(source);
    heldSources.current.set(midi, sources);
    setPressedMidi((previous) => previous.has(midi) ? previous : new Set(previous).add(midi));
    if (!wasHeld) { recordNoteOn(midi); void noteOn(midi); }
  }, [noteOn, recordNoteOn, stopPlayback]);

  const onNoteOff = useCallback((midi, source) => {
    const sources = heldSources.current.get(midi);
    if (!sources) return;
    if (source !== undefined) sources.delete(source);
    if (source !== undefined && sources.size > 0) return;
    heldSources.current.delete(midi);
    recordNoteOff(midi);
    noteOff(midi);
    setPressedMidi((previous) => {
      if (!previous.has(midi)) return previous;
      const next = new Set(previous);
      next.delete(midi);
      return next;
    });
  }, [noteOff, recordNoteOff]);

  useEffect(() => {
    const releaseAll = () => {
      if (heldSources.current.size === 0) return;
      for (const midi of heldSources.current.keys()) recordNoteOff(midi);
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
  }, [stopAll, recordNoteOff]);

  const activeMidi = useMemo(() => new Set([...pressedMidi, ...playbackMidi]), [pressedMidi, playbackMidi]);
  const heldNames = useMemo(() => PIANO_LAYOUT.keys.filter((key) => activeMidi.has(key.midi)).map((key) => key.noteName), [activeMidi]);

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
      <section className="sequencer" aria-label="FIFO recorder and playback">
        <button type="button" aria-pressed={sequencer.isRecording} disabled={sequencer.isPlaying}
          onClick={sequencer.isRecording ? sequencer.stopRecording : sequencer.startRecording}>
          {sequencer.isRecording ? 'Finish recording' : 'Record'}
        </button>
        <button type="button" disabled={sequencer.isRecording || sequencer.isPlaying || !sequencer.count || pressedMidi.size > 0}
          onClick={() => { void sequencer.play(speed); }}>Play sequence</button>
        <button type="button" disabled={!sequencer.isPlaying} onClick={sequencer.stop}>Stop sequence</button>
        <button type="button" disabled={sequencer.isRecording || sequencer.isPlaying || !sequencer.count} onClick={sequencer.clear}>Clear</button>
        <label htmlFor={speedId}>Speed</label>
        <select id={speedId} value={speed} disabled={sequencer.isPlaying} onChange={(event) => setSpeed(Number(event.target.value))}>
          <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option>
        </select>
        <output aria-live="polite">{sequencer.isRecording ? 'Recording' : sequencer.isPlaying ? 'Playing' : 'Ready'}</output>
        <span>{sequencer.count} recorded notes</span>
      </section>
      <p className="keyboard-instructions">Record a phrase, release held keys, then replay at your chosen speed. Playing a key manually stops the sequence. Record stores up to 1000 notes.</p>
      <section className="keyboard-scroll" tabIndex={0} aria-label="Scrollable piano keyboard, A0 to C8"
        aria-describedby={instructionsId}>
        <ol className="keyboard-keys" style={{ '--white-count': PIANO_LAYOUT.whiteKeyCount }}>
          {PIANO_LAYOUT.keys.map((key) => (
            <li key={key.id} className={key.isBlackKey ? 'key-slot key-slot--black' : 'key-slot key-slot--white'}
              style={{ '--white-index': key.whiteIndex }}>
              <PianoKey pianoKey={key} isPressed={activeMidi.has(key.midi)} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />
            </li>
          ))}
        </ol>
      </section>
      {audioError && <p role="alert" className="audio-error">{audioError}</p>}
      {sequencer.error && <p role="alert" className="audio-error">{sequencer.error}</p>}
      <footer className="keyboard-status">
        <span className={heldNames.length ? 'held-note' : ''}>{heldNames.length ? `HELD / ${heldNames.join(' · ')}` : 'STANDBY / No keys held'}</span>
        <span>52 WHITE <span aria-hidden="true">/</span> 36 BLACK</span>
      </footer>
    </section>
  );
}
