/**
 * Synth presets use Hz for frequency, milliseconds for duration,
 * and linear gain (0–1). The audio engine converts ms to seconds.
 *
 * @typedef {Readonly<{
 *   type: 'oscillator',
 *   waveform: 'sine' | 'triangle',
 *   frequencyHz: number,
 *   endFrequencyHz: number,
 *   durationMs: number,
 *   gain: number
 * } | {
 *   type: 'noise',
 *   filterType: 'highpass' | 'bandpass',
 *   filterFrequencyHz: number,
 *   durationMs: number,
 *   gain: number
 * }>} DrumSound
 *
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   physicalCode: string,
 *   sound: DrumSound
 * }>} DrumPad
 */

/** @type {readonly DrumPad[]} */
export const DRUM_PADS = Object.freeze([
  { id: 'kick', label: 'Kick', physicalCode: 'KeyW',
    sound: { type: 'oscillator', waveform: 'sine', frequencyHz: 150, endFrequencyHz: 45, durationMs: 450, gain: 0.8 } },
  { id: 'snare', label: 'Snare', physicalCode: 'KeyA',
    sound: { type: 'noise', filterType: 'bandpass', filterFrequencyHz: 1800, durationMs: 180, gain: 0.5 } },
  { id: 'closed-hat', label: 'Closed Hi-Hat', physicalCode: 'KeyS',
    sound: { type: 'noise', filterType: 'highpass', filterFrequencyHz: 7000, durationMs: 70, gain: 0.25 } },
  { id: 'high-tom', label: 'High Tom', physicalCode: 'KeyD',
    sound: { type: 'oscillator', waveform: 'sine', frequencyHz: 280, endFrequencyHz: 140, durationMs: 240, gain: 0.6 } },
  { id: 'low-tom', label: 'Low Tom', physicalCode: 'KeyJ',
    sound: { type: 'oscillator', waveform: 'sine', frequencyHz: 180, endFrequencyHz: 75, durationMs: 320, gain: 0.6 } },
  { id: 'clap', label: 'Clap', physicalCode: 'KeyK',
    sound: { type: 'noise', filterType: 'bandpass', filterFrequencyHz: 1400, durationMs: 130, gain: 0.45 } },
  { id: 'crash', label: 'Crash', physicalCode: 'KeyL',
    sound: { type: 'noise', filterType: 'highpass', filterFrequencyHz: 4500, durationMs: 900, gain: 0.3 } },
].map((pad) => Object.freeze({ ...pad, sound: Object.freeze(pad.sound) })));
