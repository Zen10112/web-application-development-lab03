import { PIANO_KEYS } from '../../data/pianoKeys.js';

const keys = new Map(PIANO_KEYS.map((key) => [key.midi, key]));
export const MAX_RECORDING_NOTES = 1000;
const abortError = () => new DOMException('Playback stopped', 'AbortError');

export function waitForPlayback(ms, signal) {
  if (signal.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = () => { signal.removeEventListener('abort', cancel); resolve(); };
    const timer = setTimeout(finish, ms);
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(abortError());
    };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

/** Timing and recording remain independent of React and Web Audio node ownership. */
export function createPianoSequencer({ noteOn, noteOff, stopAll,
  now = () => performance.now(), wait = waitForPlayback,
  onChange = () => {}, onPlaybackNote = () => {} }) {
  let entries = [];
  const held = new Map();
  const playbackNotes = new Map();
  let recording = false;
  let controller = null;
  let lastStart = null;
  let disposed = false;
  const emit = () => onChange({ isRecording: recording, isPlaying: controller !== null, count: entries.length });

  function recordNoteOff(midi) {
    const pending = held.get(midi);
    if (!pending) return;
    held.delete(midi);
    entries[pending.index] = { ...entries[pending.index], durationMs: Math.max(0, now() - pending.start) };
  }

  function stopRecording() {
    if (!recording) return;
    for (const midi of [...held.keys()]) recordNoteOff(midi);
    recording = false;
    emit();
  }

  function stop() {
    if (!controller) return;
    controller.abort();
    controller = null;
    stopAll(true);
    for (const { midi } of playbackNotes.values()) onPlaybackNote(midi, false);
    playbackNotes.clear();
    emit();
  }

  function startRecording() {
    if (disposed) throw new Error('The sequencer has been disposed.');
    stop(); stopRecording();
    entries = []; held.clear(); lastStart = null;
    recording = true; emit();
  }

  function recordNoteOn(midi) {
    if (!recording || held.has(midi)) return;
    const key = keys.get(midi);
    if (!key) throw new RangeError('Invalid piano MIDI note.');
    if (entries.length >= MAX_RECORDING_NOTES) {
      stopRecording();
      throw new Error('Recording stopped at the 1000-note limit.');
    }
    const start = now();
    held.set(midi, { index: entries.length, start });
    entries.push({ midi, freqHz: key.frequency, durationMs: 0,
      deltaMs: lastStart === null ? 0 : Math.max(0, start - lastStart) });
    lastStart = start;
    emit();
  }

  async function play(speed = 1) {
    if (disposed) throw new Error('The sequencer has been disposed.');
    if (![0.5, 1, 2].includes(speed)) throw new RangeError('Playback speed must be 0.5, 1 or 2.');
    stopRecording(); stop();
    if (!entries.length) throw new Error('Record some notes before playback.');
    const signalController = new AbortController();
    controller = signalController;
    const { signal } = signalController;
    const timeline = [];
    let onset = 0;
    entries.forEach((entry, index) => {
      onset += entry.deltaMs / speed;
      timeline.push({ at: onset, order: index * 2, index, midi: entry.midi, isOn: true });
      timeline.push({ at: onset + entry.durationMs / speed, order: index * 2 + 1, index, midi: entry.midi, isOn: false });
    });
    timeline.sort((a, b) => a.at - b.at || a.order - b.order);
    const startedAt = now();
    emit();
    try {
      for (const event of timeline) {
        await wait(Math.max(0, startedAt + event.at - now()), signal);
        if (signal.aborted) throw abortError();
        if (event.isOn) {
          const id = await noteOn(event.midi);
          if (signal.aborted) { if (id !== undefined) noteOff(event.midi, id); throw abortError(); }
          if (id === undefined) throw new Error('Could not start a playback note.');
          playbackNotes.set(event.index, { midi: event.midi, id });
          onPlaybackNote(event.midi, true);
        } else {
          const voice = playbackNotes.get(event.index);
          if (voice) noteOff(voice.midi, voice.id);
          playbackNotes.delete(event.index);
          onPlaybackNote(event.midi, false);
        }
      }
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
      return false;
    } finally {
      // An older cancelled run must not clear notes belonging to a replacement run.
      if (controller === signalController) {
        for (const voice of playbackNotes.values()) { noteOff(voice.midi, voice.id); onPlaybackNote(voice.midi, false); }
        playbackNotes.clear();
        controller = null; emit();
      }
    }
  }

  function clear() {
    if (recording || controller) throw new Error('Stop recording or playback before clearing.');
    entries = []; held.clear(); lastStart = null; emit();
  }

  function dispose() {
    if (disposed) return;
    disposed = true; stop(); recording = false; held.clear(); entries = [];
  }

  return { startRecording, stopRecording, recordNoteOn, recordNoteOff, play, stop, clear, dispose,
    getRecording: () => Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))) };
}
