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

The eight-voice FIFO pool is implemented. Recording and replay are not implemented yet. React.memo is not applied in this step; the component props are prepared for it. No additional library is required; tests use Node's built-in test runner.

## Basic Audio Engine

`src/services/audio/pianoAudioEngine.js` exports `createPianoAudioEngine()` with `noteOn(midi)`, `noteOff(midi)`, `stopAll()` and `dispose()`. It is independent of React and reads unrounded frequencies from the shared MIDI data. The first press creates one AudioContext, master gain and compressor; later notes reuse that context and share an in-flight resume request when necessary.

Each note uses a triangle oscillator with an 8ms linear attack and 80ms release. A held key sustains until its last input source releases. Rapid re-presses can overlap the old release tail; ending the old voice cannot remove the newer voice. Releasing a key during a pending resume cancels that request so a late note cannot sound. Oscillators stop after the release and disconnect on ended; unmount immediately disposes held/releasing nodes and closes the context.

`src/hooks/usePianoAudio.js` connects the service to the UI and reports failures through an accessible alert. Pointer up/cancel/lost capture, native keyup/blur and window blur/hidden-tab handling release the relevant notes. Tests cover A0 (27.5Hz), A4 (440Hz), C8, hold/release envelopes, rapid off/on, resume races, invalid MIDI, unsupported audio, failures and disposal. Use `/tests/audio.html` in the dev server to inspect actual context/node cleanup across mount/unmount; its instrumentation is not included in production.

Limitations: this is a simple sustained oscillator tone, not a sampled acoustic piano. It does not yet model hammer transients, velocity, natural piano decay, pedals or resonance. Subjective sound quality and device-specific autoplay behavior require further manual checks.

## Eight-voice polyphony

The engine owns a FIFO Map keyed by unique voice ID. Every voice stores its MIDI note, creation order/time, oscillator, gain and lifecycle state. A separate MIDI Map identifies only the currently held or pending voice for noteOff. The pool includes pending resume reservations and release tails; its size never exceeds `MAX_VOICES = 8`.

When the pool is full, the oldest voice is immediately stopped and disconnected before a replacement allocates audio nodes. This strict limit also applies to release tails. Normal noteOff retains its 80ms release; a capacity-driven FIFO eviction cuts the old voice immediately and may be more abrupt. Repeating noteOn for an already held MIDI is ignored. Re-pressing after noteOff creates a new ID, and an old ended callback cannot remove the new voice.

`getVoiceCount()` reports all reserved/held/releasing slots. `getVoiceSnapshot()` returns detached, frozen metadata in FIFO order (ID, MIDI, creation order/time and state); it does not expose mutable audio nodes. Voice bookkeeping stays outside React state, and no piano UI or note-generation changes are required.

Polyphony verification: 24 Node tests passed (9 data/layout and 15 engine), along with production build. Tests cover one note, a three-note chord, eight notes, a ninth FIFO replacement, partial noteOff/re-press, late callbacks, 12 pending resume requests and 100 rapid same-note re-presses. Instrumented mocks recorded a peak of eight connected oscillators, including release tails; after ending all voices the pool was empty and only two shared output nodes remained until dispose. These are deterministic resource/lifecycle tests, not a new real-device audio or heap-profile measurement.

Audio verification: 19 Node tests (9 data/layout + 10 engine) and production build passed. Chromium pointer hold/release, repeated A4 clicks, A0 and C8 native Space controls produced no console errors. The real Web Audio lifecycle fixture reported frequencies 27.500, 440.000 and 4186.009Hz in one context. After release only two shared output nodes remained; after unmount the context was closed and the tracked node count was zero. This verifies the tested resource lifecycle, not long-duration heap usage or subjective sound quality.

UI verification: 9 Node tests and production build passed. Chromium rendered 88 buttons (52 white / 36 black); every black-key center matched the shared boundary of its neighboring white keys. Held Space updated aria-pressed and released cleanly. Desktop 1440px and mobile 375px were inspected. On mobile, page scrollWidth equaled clientWidth while the piano region scrolled independently; Tab to C8 revealed the final key. No console errors or React key warnings were observed. Audio and render-isolation profiling are outside this step.
