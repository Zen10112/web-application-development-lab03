import { PIANO_KEYS } from '../../data/pianoKeys.js';

const ATTACK = 0.008;
const RELEASE = 0.08;
const SUSTAIN = 0.16;
const STEAL_RELEASE = 0.04;
export const MAX_VOICES = 8;

/** React-independent synth. Each MIDI note owns a pending or sounding voice. */
export function createPianoAudioEngine() {
  const keys = new Map(PIANO_KEYS.map((key) => [key.midi, key]));
  const active = new Map();
  // Map insertion order is the FIFO queue, including pending/releasing voices.
  const voices = new Map();
  // A slot can fade an old oscillator while its replacement waits, never both sounding.
  const slots = Array.from({ length: MAX_VOICES }, () => ({ voice: null, ready: null }));
  const retiring = new Set();
  let nextVoiceId = 0;
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

  function cleanup(voice, shouldStop = true) {
    if (voice.state === 'ended') return;
    voice.state = 'ended';
    voice.cancelled = true;
    if (voice.oscillator) {
      voice.oscillator.onended = null;
      if (shouldStop) {
        try { voice.oscillator.stop(); } catch { /* Already ended or not started. */ }
      }
      voice.oscillator.disconnect();
    }
    voice.gain?.disconnect();
    voice.oscillator = null;
    voice.gain = null;
    voices.delete(voice.id);
    if (active.get(voice.midi) === voice) active.delete(voice.midi);
    if (voice.slot.voice === voice) voice.slot.voice = null;
    if (voice.slot.ready === voice.finished) voice.slot.ready = null;
    retiring.delete(voice);
    voice.resolveEnded();
  }

  function fade(voice, duration, stopPadding) {
    const now = context.currentTime;
    const gain = voice.gain.gain;
    const amplitude = voice.releaseAt === null
      ? SUSTAIN * Math.min(1, Math.max(0, (now - voice.startedAt) / ATTACK))
      : voice.releaseFrom * Math.max(0, 1 - (now - voice.releaseAt) / voice.releaseDuration);
    if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
    else { gain.cancelScheduledValues(now); gain.setValueAtTime(amplitude, now); }
    gain.linearRampToValueAtTime(0, now + duration);
    voice.releaseAt = now;
    voice.releaseFrom = amplitude;
    voice.releaseDuration = duration;
    voice.oscillator.stop(now + duration + stopPadding);
  }

  function retire(voice) {
    if (!voice.oscillator) { cleanup(voice); return; }
    voices.delete(voice.id);
    if (active.get(voice.midi) === voice) active.delete(voice.midi);
    voice.slot.voice = null;
    voice.cancelled = true;
    voice.state = 'stealing';
    retiring.add(voice);
    const finished = voice.finished;
    voice.slot.ready = finished;
    try { fade(voice, STEAL_RELEASE, 0.005); }
    catch (error) { cleanup(voice); throw error; }
  }

  function reserveVoice(midi) {
    // Logical FIFO admission is atomic; physical slot reuse waits for ended cleanup.
    const slot = voices.size >= MAX_VOICES ? voices.values().next().value.slot
      : slots.find((item) => item.voice === null && item.ready === null) ?? slots.find((item) => item.voice === null);
    if (slot.voice) retire(slot.voice);
    const order = ++nextVoiceId;
    let resolveEnded;
    const finished = new Promise((resolve) => { resolveEnded = resolve; });
    const voice = { id: `voice-${order}`, midi, createdOrder: order, createdAt: context.currentTime,
      state: 'pending', cancelled: false, oscillator: null, gain: null, startedAt: 0,
      slot, finished, resolveEnded, releaseAt: null, releaseFrom: 0, releaseDuration: 0 };
    slot.voice = voice;
    voices.set(voice.id, voice);
    active.set(midi, voice);
    return voice;
  }

  async function noteOn(midi) {
    if (disposed) throw new Error('The Piano Audio Engine has been disposed.');
    const key = keys.get(midi);
    if (!key) throw new RangeError('MIDI must be an integer from 21 to 108.');
    if (active.has(midi)) return active.get(midi).id;
    initialize();
    const voice = reserveVoice(midi);
    try {
      // Resume inside the original user gesture. Concurrent presses share the promise.
      if (context.state !== 'running') {
        if (context.state === 'closed') throw new Error('The AudioContext is closed. Reload the page.');
        if (!resumePromise) resumePromise = context.resume().finally(() => { resumePromise = null; });
        await resumePromise;
      }
      if (voice.slot.ready) await voice.slot.ready;
      // A keyup/dispose may have happened while resume was pending.
      if (disposed || voice.cancelled || active.get(midi) !== voice) return;
      if (context.state !== 'running') throw new Error('Could not enable audio. Try pressing a key again.');
      voice.state = 'held';
      voice.oscillator = context.createOscillator();
      voice.gain = context.createGain();
      voice.startedAt = context.currentTime;
      voice.oscillator.type = 'triangle';
      voice.oscillator.frequency.setValueAtTime(key.frequency, voice.startedAt);
      voice.gain.gain.setValueAtTime(0, voice.startedAt);
      voice.gain.gain.linearRampToValueAtTime(SUSTAIN, voice.startedAt + ATTACK);
      voice.oscillator.connect(voice.gain);
      voice.gain.connect(master);
      voice.oscillator.onended = () => cleanup(voice, false);
      voice.oscillator.start(voice.startedAt);
      return voice.id;
    } catch (error) {
      const cancelled = voice.cancelled || disposed;
      cleanup(voice);
      if (!cancelled) throw error;
    }
  }

  // Optional identity protects sequencer/other owners from a stale same-MIDI release.
  function noteOff(midi, voiceId) {
    const voice = active.get(midi);
    if (!voice || (voiceId !== undefined && voice.id !== voiceId)) return;
    active.delete(midi);
    voice.cancelled = true;
    if (!voice.oscillator) { cleanup(voice); return; }
    voice.state = 'releasing';
    try {
      fade(voice, RELEASE, 0.01);
    } catch (error) {
      cleanup(voice);
      throw error;
    }
  }

  function stopAll(immediate = false) {
    if (immediate) {
      for (const voice of [...voices.values(), ...retiring]) cleanup(voice);
      return;
    }
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
    for (const voice of [...voices.values(), ...retiring]) cleanup(voice);
    master?.disconnect();
    compressor?.disconnect();
    if (context && context.state !== 'closed') await context.close();
  }

  // Detached metadata for tests/diagnostics; audio nodes stay private to the engine.
  function getVoiceSnapshot() {
    return Object.freeze([...voices.values()].map(({ id, midi, createdOrder, createdAt, state }) =>
      Object.freeze({ id, midi, createdOrder, createdAt, state })));
  }

  return { noteOn, noteOff, stopAll, dispose,
    getVoiceCount: () => slots.filter((slot) => slot.voice !== null || slot.ready !== null).length, getVoiceSnapshot };
}
