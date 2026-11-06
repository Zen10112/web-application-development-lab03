import { useCallback, useEffect, useRef, useState } from 'react';
import { createDrumAudioEngine } from '../services/audio/drumAudioEngine.js';

export function useDrumAudio() {
  const engineRef = useRef(null);
  const [audioError, setAudioError] = useState(null);

  useEffect(() => {
    const engine = createDrumAudioEngine();
    engineRef.current = engine;
    return () => {
      engineRef.current = null;
      void engine.dispose().catch((error) => console.error('Audio cleanup failed:', error));
    };
  }, []);

  const triggerPad = useCallback(async (id) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await engine.triggerPad(id);
      if (audioError && engineRef.current === engine) setAudioError(null);
    } catch (error) {
      if (engineRef.current === engine) {
        setAudioError(error instanceof Error ? error.message : 'Could not play audio. Please try again.');
      }
    }
  }, [audioError]);

  const readLevel = useCallback(() => engineRef.current?.readLevel() ?? 0, []);

  return { triggerPad, readLevel, audioError };
}
