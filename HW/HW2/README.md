# HW2 — 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

Current scope: piano key data, keyboard UI and basic synthesized audio. Follow `../project-rules.md`.

```sh
npm install
npm test
npm run build
npm run dev
```

`src/data/pianoKeys.js` exports `generatePianoKeys()` and the shared immutable `PIANO_KEYS` array. It has no React or browser dependencies. A loop generates MIDI 21–108 (A0–C8) in order: 52 white and 36 black keys. Pitch classes 1, 3, 6, 8 and 10 are black keys.

Each key contains `id`, `midi`, `noteName` (including octave, using sharps), `octave`, `frequency` (unrounded Hz, A4 = 440 Hz), and `isBlackKey`. Frequency uses `440 * 2 ** ((midi - 69) / 12)`. Keep interaction/voice state outside this data.

`src/data/pianoLayout.js` assigns white-key slots and centers each black key at its neighboring white-key boundary. `PianoKeyboard` renders all keys in MIDI order; reusable `PianoKey` buttons receive stable note data, a pressed boolean and shared callbacks. Native Enter/Space and pointer input update visual state; blur/hidden-document events clear held inputs. The scrollable keyboard region intentionally exceeds small screens while the page stays within the viewport. Tab focuses and reveals each note, including the final C8 key.

The eight-voice FIFO pool, recording and replay are not implemented yet. React.memo is not applied in this step; the component props are prepared for it. No additional library is required; tests use Node's built-in test runner.

## Basic Audio Engine

`src/services/audio/pianoAudioEngine.js` exports `createPianoAudioEngine()` with `noteOn(midi)`, `noteOff(midi)`, `stopAll()` and `dispose()`. It is independent of React and reads unrounded frequencies from the shared MIDI data. The first press creates one AudioContext, master gain and compressor; later notes reuse that context and share an in-flight resume request when necessary.

Each note uses a triangle oscillator with an 8ms linear attack and 80ms release. A held key sustains until its last input source releases. Rapid re-presses can overlap the old release tail; ending the old voice cannot remove the newer voice. Releasing a key during a pending resume cancels that request so a late note cannot sound. Oscillators stop after the release and disconnect on ended; unmount immediately disposes held/releasing nodes and closes the context.

`src/hooks/usePianoAudio.js` connects the service to the UI and reports failures through an accessible alert. Pointer up/cancel/lost capture, native keyup/blur and window blur/hidden-tab handling release the relevant notes. Tests cover A0 (27.5Hz), A4 (440Hz), C8, hold/release envelopes, rapid off/on, resume races, invalid MIDI, unsupported audio, failures and disposal. Use `/tests/audio.html` in the dev server to inspect actual context/node cleanup across mount/unmount; its instrumentation is not included in production.

Limitations: this is a simple sustained oscillator tone, not a sampled acoustic piano. It does not yet model hammer transients, velocity, natural piano decay, pedals or resonance. Multiple notes can sound, but the eight-voice cap and FIFO stealing belong to the next step. Subjective sound quality and device-specific autoplay behavior require further manual checks.

Audio verification: 19 Node tests (9 data/layout + 10 engine) and production build passed. Chromium pointer hold/release, repeated A4 clicks, A0 and C8 native Space controls produced no console errors. The real Web Audio lifecycle fixture reported frequencies 27.500, 440.000 and 4186.009Hz in one context. After release only two shared output nodes remained; after unmount the context was closed and the tracked node count was zero. This verifies the tested resource lifecycle, not long-duration heap usage or subjective sound quality.

UI verification: 9 Node tests and production build passed. Chromium rendered 88 buttons (52 white / 36 black); every black-key center matched the shared boundary of its neighboring white keys. Held Space updated aria-pressed and released cleanly. Desktop 1440px and mobile 375px were inspected. On mobile, page scrollWidth equaled clientWidth while the piano region scrolled independently; Tab to C8 revealed the final key. No console errors or React key warnings were observed. Audio and render-isolation profiling are outside this step.
