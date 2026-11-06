# HW2 — 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

Current scope: piano key data and keyboard UI. Follow `../project-rules.md`.

```sh
npm install
npm test
npm run build
npm run dev
```

`src/data/pianoKeys.js` exports `generatePianoKeys()` and the shared immutable `PIANO_KEYS` array. It has no React or browser dependencies. A loop generates MIDI 21–108 (A0–C8) in order: 52 white and 36 black keys. Pitch classes 1, 3, 6, 8 and 10 are black keys.

Each key contains `id`, `midi`, `noteName` (including octave, using sharps), `octave`, `frequency` (unrounded Hz, A4 = 440 Hz), and `isBlackKey`. Frequency uses `440 * 2 ** ((midi - 69) / 12)`. Keep interaction/voice state outside this data.

`src/data/pianoLayout.js` assigns white-key slots and centers each black key at its neighboring white-key boundary. `PianoKeyboard` renders all keys in MIDI order; reusable `PianoKey` buttons receive stable note data, a pressed boolean and shared callbacks. Native Enter/Space and pointer input update visual state; blur/hidden-document events clear held inputs. The scrollable keyboard region intentionally exceeds small screens while the page stays within the viewport. Tab focuses and reveals each note, including the final C8 key.

No audio, eight-voice pool, recording or FIFO replay is implemented yet. React.memo is not applied in this step; the component props are prepared for it. No additional library is required; tests use Node's built-in test runner.

UI verification: 9 Node tests and production build passed. Chromium rendered 88 buttons (52 white / 36 black); every black-key center matched the shared boundary of its neighboring white keys. Held Space updated aria-pressed and released cleanly. Desktop 1440px and mobile 375px were inspected. On mobile, page scrollWidth equaled clientWidth while the piano region scrolled independently; Tab to C8 revealed the final key. No console errors or React key warnings were observed. Audio and render-isolation profiling are outside this step.
