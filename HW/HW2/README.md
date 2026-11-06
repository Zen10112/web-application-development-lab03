# HW2 — 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

Current scope: piano data, memoized keyboard UI, eight-voice FIFO synthesis, recording and replay. Follow `../project-rules.md`.

```sh
npm install
npm test
npm run build
npm run dev
```

`src/data/pianoKeys.js` exports `generatePianoKeys()` and the shared immutable `PIANO_KEYS` array. It has no React or browser dependencies. A loop generates MIDI 21–108 (A0–C8) in order: 52 white and 36 black keys. Pitch classes 1, 3, 6, 8 and 10 are black keys.

Each key contains `id`, `midi`, `noteName` (including octave, using sharps), `octave`, `frequency` (unrounded Hz, A4 = 440 Hz), and `isBlackKey`. Frequency uses `440 * 2 ** ((midi - 69) / 12)`. Keep interaction/voice state outside this data.

`src/data/pianoLayout.js` assigns white-key slots and centers each black key at its neighboring white-key boundary. `PianoKeyboard` renders all keys in MIDI order; reusable `PianoKey` buttons receive stable note data, a pressed boolean and shared callbacks. Native Enter/Space and pointer input update visual state; blur/hidden-document events clear held inputs. The scrollable keyboard region intentionally exceeds small screens while the page stays within the viewport. Tab focuses and reveals each note, including the final C8 key.

The eight-voice FIFO pool, recording/replay and React.memo key isolation are implemented. No additional library is required; tests use Node's built-in test runner.

## Basic Audio Engine

`src/services/audio/pianoAudioEngine.js` exports `createPianoAudioEngine()` with `noteOn(midi)`, `noteOff(midi)`, `stopAll()` and `dispose()`. It is independent of React and reads unrounded frequencies from the shared MIDI data. The first press creates one AudioContext, master gain and compressor; later notes reuse that context and share an in-flight resume request when necessary.

Each note uses a triangle oscillator with an 8ms linear attack and 80ms release. A held key sustains until its last input source releases. Rapid re-presses can overlap the old release tail; ending the old voice cannot remove the newer voice. Releasing a key during a pending resume cancels that request so a late note cannot sound. Oscillators stop after the release and disconnect on ended; unmount immediately disposes held/releasing nodes and closes the context.

`src/hooks/usePianoAudio.js` connects the service to the UI and reports failures through an accessible alert. Pointer up/cancel/lost capture, native keyup/blur and window blur/hidden-tab handling release the relevant notes. Tests cover A0 (27.5Hz), A4 (440Hz), C8, hold/release envelopes, rapid off/on, resume races, invalid MIDI, unsupported audio, failures and disposal. Use `/tests/audio.html` in the dev server to inspect actual context/node cleanup across mount/unmount; its instrumentation is not included in production.

Limitations: this is a simple sustained oscillator tone, not a sampled acoustic piano. It does not yet model hammer transients, velocity, natural piano decay, pedals or resonance. Subjective sound quality and device-specific autoplay behavior require further manual checks.

## Eight-voice polyphony

The engine owns a FIFO Map keyed by unique voice ID. Every voice stores its MIDI note, creation order/time, oscillator, gain and lifecycle state. A separate MIDI Map identifies only the currently held or pending voice for noteOff. The pool includes pending resume reservations and release tails; its size never exceeds `MAX_VOICES = 8`.

When the pool is full, the oldest voice is immediately stopped and disconnected before a replacement allocates audio nodes. This strict limit also applies to release tails. Normal noteOff retains its 80ms release; a capacity-driven FIFO eviction cuts the old voice immediately and may be more abrupt. Repeating noteOn for an already held MIDI is ignored. Re-pressing after noteOff creates a new ID, and an old ended callback cannot remove the new voice.

`getVoiceCount()` reports all reserved/held/releasing slots. `getVoiceSnapshot()` returns detached, frozen metadata in FIFO order (ID, MIDI, creation order/time and state); it does not expose mutable audio nodes. Voice bookkeeping stays outside React state, and no piano UI or note-generation changes are required.

## FIFO voice stealing

Admission removes the first Map entry before reserving a replacement, with no await between eviction and insertion. Duplicate noteOn calls do not change FIFO age. Ended voices are removed rather than left as stale queue entries. Pending resume requests are also reserved in creation order, so evicted requests cannot start late after the context resumes.

`noteOn(midi)` resolves to the voice ID when accepted (or undefined when cancelled before starting). `noteOff(midi)` remains compatible and releases the current voice for that MIDI. For independent owners or a future sequencer, use the returned ID with `noteOff(midi, voiceId)`; an outdated ID cannot release a newer voice with the same MIDI. MIDI alone cannot identify an old owner after the note has been retriggered.

Natural ended callbacks disconnect nodes without issuing another stop. Repeated cleanup is idempotent, clears node references and cannot remove a newer voice. Stealing or disposal can replace an already scheduled release stop with an immediate stop; that deliberate rescheduling enforces the strict eight-voice limit. Normal noteOff still fades over 80ms, while forced stealing can sound more abrupt.

FIFO verification: 30 Node tests passed (9 data/layout, 21 engine), with a successful production build. Added cases check the ninth and tenth replacements, completed release slots, stale same-MIDI identity, repeated noteOff/ended callbacks, 160 interleaved fast operations and disposal with held/releasing/pending voices. Existing 100 repeated-hit and suspended-resume tests also pass.

For the real-browser integration test, open a fresh `/tests/audio.html` and click **Run FIFO integration test**. It mounts the actual React keyboard in StrictMode, plays eight notes, adds the ninth/tenth, releases stolen notes and unmounts. Observed result: PASS, peak connected oscillators 8, retained nodes 0, closed contexts 1; no console errors. The test uses generated keyboard events inside a user-initiated test run. This does not replace physical multi-touch testing, long-duration heap profiling or subjective listening checks. The production piano UI is unchanged.

Polyphony verification: 24 Node tests passed (9 data/layout and 15 engine), along with production build. Tests cover one note, a three-note chord, eight notes, a ninth FIFO replacement, partial noteOff/re-press, late callbacks, 12 pending resume requests and 100 rapid same-note re-presses. Instrumented mocks recorded a peak of eight connected oscillators, including release tails; after ending all voices the pool was empty and only two shared output nodes remained until dispose. These are deterministic resource/lifecycle tests, not a new real-device audio or heap-profile measurement.

Audio verification: 19 Node tests (9 data/layout + 10 engine) and production build passed. Chromium pointer hold/release, repeated A4 clicks, A0 and C8 native Space controls produced no console errors. The real Web Audio lifecycle fixture reported frequencies 27.500, 440.000 and 4186.009Hz in one context. After release only two shared output nodes remained; after unmount the context was closed and the tracked node count was zero. This verifies the tested resource lifecycle, not long-duration heap usage or subjective sound quality.

Earlier UI verification passed 9 data/layout tests and the production build. The final verification below supersedes the earlier scope limits.

## Recording and concurrent FIFO replay

Use Record, play a phrase, then Finish recording. Recording stores `{ midi, freqHz, durationMs, deltaMs }` in onset order, including overlapping notes. The first note starts immediately during replay; later onset deltas and durations are scaled at 0.5×, 1× or 2×. A single ordered event timeline handles concurrent note-on/note-off events without waiting for each note to end before starting another. Timing uses absolute performance-clock targets and abortable waits; it is browser-timer scheduling, not sample-accurate offline rendering.

Stop sequence aborts the run, cancels pending waits and immediately silences held/releasing audio resources. Unmount does the same and closes the context through the audio hook. Late callbacks from a cancelled run cannot clear a replacement run. Live playing stops replay before starting a manual note; playback is disabled while live keys remain held to avoid competing ownership of the same MIDI. Recording is limited to 1000 notes and kept in memory only. No export, persistence, pedal or velocity editing is implemented.

## Final verification (November 6, 2026)

- **PASS:** 42 Node tests: 9 data/layout, 22 Audio Engine and 11 sequencer cases; production build passes.
- **PASS:** 4 browser interaction/render cases, one real Web Audio FIFO/unmount integration test and one real recording/replay/Stop/unmount integration test. Node tests mock AudioContext or the clock where stated; browser tests use Chromium and real Web Audio.
- **PASS:** 88 native buttons, MIDI 21–108, 52 white/36 black, zero measured black-key boundary-position errors. At 375px, page scrollWidth=clientWidth=360px (15px scrollbar); only the piano region overflows horizontally. Desktop 1440px page metrics also show no outer overflow. Tab to C8 scrolls it into view with a solid focus indicator. No console warnings/errors were observed.
- **PASS:** frozen module-level key data and useCallback handlers provide stable key props. PianoKey uses React.memo; derived held-note names use useMemo. An instrumented copy of the actual production key/keyboard source measured only C4 rendering over 20 press/release transitions, including recording/audio updates: 1/88 key bodies, 40 C4 render calls under development StrictMode. Baseline 4da5ad4 rendered all 88 key bodies.
- **PASS:** React's Profiler API was also mounted, but its outer per-key boundaries include bailout overhead. Their callback count/duration was not used as a component render count.
- **NOT TESTED:** React DevTools Profiler UI, real screen-reader/voice-control combinations, physical multi-touch, long-duration heap growth, exhaustive cross-browser/OS testing and full WCAG certification. No Lighthouse score is claimed for HW2.
- **FAIL before fixes, PASS after:** semantic click without pointer/key events did nothing; focus loss incorrectly released a held pointer; missing memo isolation did not satisfy the full HW2 performance target. See the audit for the distinction between bugs and a previously deferred performance requirement.

### Reproduce browser measurements

```sh
npm run test:prepare-browser
npm run dev
```

Open `/tests/verification.html` and run verification. The preparation script generates ignored test-only copies of the actual source with render-body counters; it does not alter production source or React.memo behavior. Use `node tests/prepare-render-check.mjs --baseline` to reproduce the three original findings against Git commit 4da5ad4, then regenerate current source before testing the final version.

Open a fresh `/tests/audio.html` separately for each integration button: **Run FIFO integration test** and **Run sequencer lifecycle test**. The first measured peak oscillators=8, retained nodes=0 and closed contexts=1. The second verified Stop and unmount during replay with retained nodes=0 and closed contexts=1.

Development history and evidence: [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md), [AI_FAILURE_AUDIT.md](AI_FAILURE_AUDIT.md), and `reports/verification-before.txt` / `reports/verification-after.txt`. The existing parent project-rules.md is unchanged.

| Requested group | Result | Scope |
| --- | --- | --- |
| A — Piano data and UI | PASS | Counts, MIDI/frequency, key geometry, accessible names, focus and isolated mobile scrolling checked |
| B — Audio and concurrency | PASS | Eight-voice/FIFO/race/cleanup assertions and real AudioContext lifecycle; long-duration heap profiling NOT TESTED |
| C — React performance | PASS within measured scope | Actual-source render-body isolation measured; React DevTools Profiler UI NOT TESTED |
| D — Build and automated tests | PASS | 42 Node cases, four interaction/render cases, two real-browser lifecycle scenarios and production build |
| Sequencer scope extension | PASS | Recording, overlapping FIFO timeline, all three speeds, immediate Stop and abort/unmount tested |
| E/F — Task decomposition and AI audit | Completed | Real Git history and baseline evidence; audit explicitly counts two interaction bugs and a deferred performance gap |

No executed final assertion remains FAIL. Full WCAG, native assistive technology and all device-specific behavior remain NOT TESTED rather than being inferred from other passing results.
