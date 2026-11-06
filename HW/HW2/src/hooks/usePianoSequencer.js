import { useCallback, useEffect, useRef, useState } from 'react';
import { createPianoSequencer } from '../services/audio/pianoSequencer.js';

export function usePianoSequencer(noteOn, noteOff, stopAll, onPlaybackNote) {
  const ref = useRef(null);
  const [state, setState] = useState({ isRecording: false, isPlaying: false, count: 0 });
  const [error, setError] = useState(null);
  useEffect(() => {
    const sequencer = createPianoSequencer({ noteOn, noteOff, stopAll, onPlaybackNote,
      onChange: (next) => { if (ref.current === sequencer) setState(next); } });
    ref.current = sequencer;
    return () => { ref.current = null; sequencer.dispose(); };
  }, [noteOn, noteOff, stopAll, onPlaybackNote]);

  const invoke = useCallback((method, ...args) => {
    try { ref.current?.[method](...args); }
    catch (failure) { setError(failure.message); }
  }, []);
  const startRecording = useCallback(() => { setError(null); invoke('startRecording'); }, [invoke]);
  const stopRecording = useCallback(() => invoke('stopRecording'), [invoke]);
  const recordNoteOn = useCallback((midi) => invoke('recordNoteOn', midi), [invoke]);
  const recordNoteOff = useCallback((midi) => invoke('recordNoteOff', midi), [invoke]);
  const stop = useCallback(() => invoke('stop'), [invoke]);
  const clear = useCallback(() => { setError(null); invoke('clear'); }, [invoke]);
  const play = useCallback(async (speed) => {
    const current = ref.current;
    if (!current) return;
    setError(null);
    try { await current.play(speed); }
    catch (failure) { if (ref.current === current) setError(failure.message); }
  }, []);
  return { ...state, error, startRecording, stopRecording, recordNoteOn, recordNoteOff, play, stop, clear };
}
