const FIRST_MIDI = 21;
const LAST_MIDI = 108;
const NOTE_NAMES = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

/**
 * @typedef {Readonly<{
 *   id: string,
 *   midi: number,
 *   noteName: string,
 *   octave: number,
 *   frequency: number,
 *   isBlackKey: boolean
 * }>} PianoKey
 */

/**
 * Generate A0–C8 in ascending MIDI order using scientific pitch notation.
 * noteName includes the octave (for example C#4); frequency is in Hz.
 * No React or browser dependency: UI, synth and sequencer can share this data.
 * @returns {readonly PianoKey[]}
 */
export function generatePianoKeys() {
  return Object.freeze(Array.from({ length: LAST_MIDI - FIRST_MIDI + 1 }, (_, index) => {
    const midi = FIRST_MIDI + index;
    const pitchClass = midi % 12;
    const octave = Math.floor(midi / 12) - 1;

    return Object.freeze({
      id: `piano-${midi}`,
      midi,
      noteName: `${NOTE_NAMES[pitchClass]}${octave}`,
      octave,
      frequency: 440 * 2 ** ((midi - 69) / 12),
      isBlackKey: BLACK_PITCH_CLASSES.has(pitchClass),
    });
  }));
}

export const PIANO_KEYS = generatePianoKeys();
