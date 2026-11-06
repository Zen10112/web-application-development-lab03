# HW2 — Task decomposition

Verified on November 6, 2026. The parent project-rules.md was read and left unchanged. English documentation follows the user's established preference. This record is derived from actual source and Git history, not a reconstructed imaginary plan.

Completed means implemented with the evidence summarized in README.md. Failed denotes an observed failing assertion before a fix. Not Tested means there is no measurement to support a claim.

| Group / objective | Files | Actual commit | Status |
| --- | --- | --- | --- |
| Generate A0–C8, MIDI 21–108, 52 white/36 black, standard tuning, immutable reusable data | src/data/pianoKeys.js, its tests, initial Vite/React configuration | eee2b31 — feat(hw2): generate 88 piano keys | Completed |
| Position black keys at white-key boundaries; reusable semantic keys and isolated horizontal scrolling | App.jsx, PianoKeyboard.jsx, PianoKey.jsx, styles.css, pianoLayout.js/tests | ce3c60f — feat(hw2): build piano keyboard UI | Completed; performance optimization was explicitly deferred at this stage |
| Add lazy/resumable AudioContext, per-note oscillators, attack/release, cleanup and React integration | pianoAudioEngine.js/tests, usePianoAudio.js, keyboard integration, tests/audio.* | 2782f69 — feat(hw2): implement piano audio engine | Completed |
| Bound all pending/held/releasing voice slots to eight; FIFO allocation metadata outside React state | pianoAudioEngine.js/tests, README.md | 678a386 — feat(hw2): support eight voice polyphony | Completed |
| Verify ninth/tenth FIFO replacement, voice identity, idempotent cleanup, late callbacks and real unmount | pianoAudioEngine.js/tests, tests/audio.*, README.md | 4da5ad4 — feat(hw2): implement FIFO voice stealing | Completed; baseline for final verification |
| Finish full HW2: memo isolation, semantic activation, pointer/focus fix, recording, variable-speed concurrent replay, cancellation, final tests/docs | PianoKey.jsx, PianoKeyboard.jsx, usePianoAudio.js, usePianoSequencer.js, pianoSequencer.js/tests, engine immediate Stop/test, tests/verification.*, test instrumentation, README/docs/reports | Commit titled test(hw2): verify piano concurrency and performance (contains this record) | Completed in the working tree and verified before commit; obtain the real hash from git log after commit |

## Final scope expansion

The user's initial final-verification list covered data/UI, audio/concurrency and performance. The user explicitly selected **also add the sequencer** when asked about missing recording/replay. The final step therefore implements recording of `{midi, freqHz, durationMs, deltaMs}`, 0.5×/1×/2× replay, overlap-aware FIFO timing, AbortController Stop/unmount cancellation, bounded recording storage and playback key highlights.

## Failed baseline and resolved results

The first three verification cases were run on source extracted from Git commit 4da5ad4: 0 passed / 3 failed. After fixes they pass. A fourth case verifies the actual production keyboard while recording/audio updates run: all four final cases pass. Evidence is stored in reports/verification-before.txt and reports/verification-after.txt. The audit distinguishes two interaction bugs from the previously deferred memo requirement.

## Completed checks

- 42 Node tests: 9 data/layout, 22 Audio Engine and 11 sequencer.
- Four browser interaction/render cases and two real-Web-Audio lifecycle integration scenarios.
- Production build, 88-key geometry/counts, 375px mobile and 1440px desktop page-width metrics, end-key navigation, focus indicators and console checks.
- No new dependency, legacy React API, unrelated project rewrite, or modification of HW1/EX.

## Not Tested

- React DevTools Profiler UI, physical multi-touch across devices, actual screen readers/speech-control software, extended heap profiling and all OS/browser combinations.
- Full WCAG certification or Lighthouse scores for HW2.
- Subjective acoustic-piano realism and sample-accurate playback under heavy browser throttling. The instrument is a basic triangle synth; replay uses abortable browser timers with absolute targets, not an AudioWorklet/offline sequencer.

No unresolved failing case remains in the suites actually executed. Not Tested items are not marked Completed on the basis of other passing tests.
