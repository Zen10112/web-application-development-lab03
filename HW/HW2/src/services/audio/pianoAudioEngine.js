import { PIANO_KEYS } from '../../data/pianoKeys.js';

const ATTACK = 0.008;
const RELEASE = 0.08;
const SUSTAIN = 0.16;

/** React-independent synth. Each MIDI note owns a pending or sounding voice. */
export function createPianoAudioEngine() {
  const keys = new Map(PIANO_KEYS.map((key) => [key.midi, key]));
  const active = new Map();
  const sounding = new Set();
  let context = null;
  let master = null;
  let compressor = null;
  let resumePromise = null;
  let disposed = false;

  function initialize() {
    if (context) return;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support the Web Audio API.');
    context = new Context();
    try {
      master = context.createGain();
      master.gain.value = 0.5;
      compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      compressor.connect(context.destination);
    } catch (error) {
      master?.disconnect();
      compressor?.disconnect();
      void context.close().catch(() => {});
      context = master = compressor = null;
      throw error;
    }
  }

  function cleanup(voice) {
    voice.cancelled = true;
    if (voice.oscillator) {
      voice.oscillator.onended = null;
      try { voice.oscillator.stop(); } catch { /* Already ended or not started. */ }
      voice.oscillator.disconnect();
    }
    voice.gain?.disconnect();
    sounding.delete(voice);
    if (active.get(voice.midi) === voice) active.delete(voice.midi);
  }

  async function noteOn(midi) {
    if (disposed) throw new Error('The Piano Audio Engine has been disposed.');
    const key = keys.get(midi);
    if (!key) throw new RangeError('MIDI must be an integer from 21 to 108.');
    if (active.has(midi)) return;
    initialize();
    const voice = { midi, cancelled: false, oscillator: null, gain: null, startedAt: 0 };
    active.set(midi, voice);
    try {
      // Resume inside the original user gesture. Concurrent presses share the promise.
      if (context.state !== 'running') {
        if (context.state === 'closed') throw new Error('The AudioContext is closed. Reload the page.');
        if (!resumePromise) resumePromise = context.resume().finally(() => { resumePromise = null; });
        await resumePromise;
      }
      // A keyup/dispose may have happened while resume was pending.
      if (disposed || voice.cancelled || active.get(midi) !== voice) return;
      if (context.state !== 'running') throw new Error('Could not enable audio. Try pressing a key again.');
      sounding.add(voice);
      voice.oscillator = context.createOscillator();
      voice.gain = context.createGain();
      voice.startedAt = context.currentTime;
      voice.oscillator.type = 'triangle';
      voice.oscillator.frequency.setValueAtTime(key.frequency, voice.startedAt);
      voice.gain.gain.setValueAtTime(0, voice.startedAt);
      voice.gain.gain.linearRampToValueAtTime(SUSTAIN, voice.startedAt + ATTACK);
      voice.oscillator.connect(voice.gain);
      voice.gain.connect(master);
      voice.oscillator.onended = () => cleanup(voice);
      voice.oscillator.start(voice.startedAt);
    } catch (error) {
      const cancelled = voice.cancelled || disposed;
      cleanup(voice);
      if (!cancelled) throw error;
    }
  }

  function noteOff(midi) {
    const voice = active.get(midi);
    if (!voice) return;
    active.delete(midi);
    voice.cancelled = true;
    if (!voice.oscillator) return;
    try {
      const now = context.currentTime;
      const gain = voice.gain.gain;
      if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
      else {
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(SUSTAIN * Math.min(1, Math.max(0, (now - voice.startedAt) / ATTACK)), now);
      }
      gain.linearRampToValueAtTime(0, now + RELEASE);
      voice.oscillator.stop(now + RELEASE + 0.01);
    } catch (error) {
      cleanup(voice);
      throw error;
    }
  }

  function stopAll() {
    let firstError;
    for (const midi of [...active.keys()]) {
      try { noteOff(midi); } catch (error) { firstError ??= error; }
    }
    if (firstError) throw firstError;
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    for (const voice of active.values()) voice.cancelled = true;
    active.clear();
    for (const voice of [...sounding]) cleanup(voice);
    master?.disconnect();
    compressor?.disconnect();
    if (context && context.state !== 'closed') await context.close();
  }

  return { noteOn, noteOff, stopAll, dispose };
}
