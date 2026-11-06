import { useCallback, useEffect, useRef, useState } from 'react';
import { createPianoAudioEngine } from '../services/audio/pianoAudioEngine.js';

export function usePianoAudio() {
  const engineRef = useRef(null);
  const errorRef = useRef(null);
  const [audioError, setAudioError] = useState(null);

  const reportError = useCallback((error) => {
    const message = error instanceof Error ? error.message : 'Could not play audio. Please try again.';
    if (errorRef.current !== message) {
      errorRef.current = message;
      setAudioError(message);
    }
  }, []);

  useEffect(() => {
    const engine = createPianoAudioEngine();
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      void engine.dispose().catch((error) => console.error('Piano audio cleanup failed:', error));
    };
  }, []);

  const noteOn = useCallback(async (midi) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await engine.noteOn(midi);
      if (engineRef.current === engine && errorRef.current !== null) {
        errorRef.current = null;
        setAudioError(null);
      }
    } catch (error) { if (engineRef.current === engine) reportError(error); }
  }, [reportError]);

  const noteOff = useCallback((midi) => {
    try { engineRef.current?.noteOff(midi); } catch (error) { reportError(error); }
  }, [reportError]);

  const stopAll = useCallback(() => {
    try { engineRef.current?.stopAll(); } catch (error) { reportError(error); }
  }, [reportError]);

  return { noteOn, noteOff, stopAll, audioError };
}
