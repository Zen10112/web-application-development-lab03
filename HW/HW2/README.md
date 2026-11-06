# HW2 — 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

Current scope: piano key data only. Follow `../project-rules.md`.

```sh
npm install
npm test
npm run build
npm run dev
```

`src/data/pianoKeys.js` exports `generatePianoKeys()` and the shared immutable `PIANO_KEYS` array. It has no React or browser dependencies. A loop generates MIDI 21–108 (A0–C8) in order: 52 white and 36 black keys. Pitch classes 1, 3, 6, 8 and 10 are black keys.

Each key contains `id`, `midi`, `noteName` (including octave, using sharps), `octave`, `frequency` (unrounded Hz, A4 = 440 Hz), and `isBlackKey`. Frequency uses `440 * 2 ** ((midi - 69) / 12)`. Keep interaction/voice state outside this data.

The React entry displays a small data summary so the module is included in the production build. The playable piano UI, Audio Engine, eight-voice pool, recording and FIFO replay are not implemented in this step. No additional test library is required: tests use Node's built-in test runner.
