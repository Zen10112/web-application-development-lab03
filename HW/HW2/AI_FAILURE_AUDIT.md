# HW2 — AI failure audit

Baseline: **4da5ad4**, verified November 6, 2026. The findings below are reproduced from actual AI-generated source with browser assertions. They were not intentionally inserted. Before/after logs are in reports/verification-before.txt and reports/verification-after.txt.

**Counting honestly:** two interaction bugs are confirmed. A third measured finding is an unmet full-HW2 performance requirement that had been explicitly deferred in the narrower UI step; it is not presented as a violation of that earlier scoped instruction. No additional independent bug is invented to manufacture three defects.

All fixes are in the commit titled **test(hw2): verify piano concurrency and performance**, which contains this document. The commit hash is only known after Git creates it; use `git log -1 --format="%h %s" -- src/components/PianoKey.jsx` to retrieve the actual hash.

## 1. Verified performance gap — all 88 key bodies rerender

- **Requirement:** full HW2 expects React.memo isolation so changing one note does not rerender all 88 keys.
- **Original behavior/code:** PianoKey was an ordinary exported function. Its data and callbacks were already stable, but each parent state change still rerendered every key.
- **Origin:** ce3c60f; memo was deliberately left for a later optimization step and was still absent in baseline 4da5ad4.
- **Detection:** a test-only source transform injects a render-body counter into the actual Git/source component. The production file is never modified by the transform. Twenty C4 press/release transitions under StrictMode caused **88 distinct key bodies** to render; C4 was invoked 40 times.
- **Original result:** `FAIL: one key update isolates renders: Rendered key bodies: 88; target calls: 40`.
- **Fix:** wrap PianoKey in React.memo, preserve module-level note objects and stable callbacks, and memoize derived held-note names. Sequencer callbacks remain stable across recording updates.
- **Retest:** only MIDI 60 rendered across the same transitions: **1/88 key bodies, 40 development StrictMode calls**. A separate instrumented copy of the real production keyboard measured the same result while recording and audio updates ran.
- **Measurement limit:** outer React Profiler boundaries also run on bailouts and had nonzero overhead for unrelated notes. Those callbacks/durations were not treated as component render counts. React DevTools Profiler UI was not used.

## 2. Interaction bug — semantic click produces no note

- **Requirement:** semantic piano buttons must be activatable by users who do not generate physical pointer/key events.
- **Original code:** PianoKey only connected onPointerDown/onPointerUp and native key handlers. It had no onClick path for an assistive activation that sends a click alone.
- **Origin:** ce3c60f, still present in 4da5ad4.
- **Detection:** call click on the real rendered button without first dispatching pointerdown or keydown. The fixture observes the note callbacks, not a guessed sound outcome.
- **Original result:** `FAIL: semantic click activates and releases exactly one note: semantic click: 0 callbacks`.
- **Fix:** a detail=0 click produces a 120ms note pulse, with its release timer cancelled on unmount. Keyboard keydown/keyup prevent the browser's additional synthesized click so native Enter/Space are not double-triggered. Pointer clicks retain their existing sustained press/release path.
- **Retest:** exactly one note-on and one note-off callback; browser case passes. Audio/recording integration and console regression checks also pass.
- **Limit:** this verifies semantic DOM activation, not every real screen-reader or voice-control product.

## 3. Interaction bug — changing focus releases an active pointer

- **Requirement:** concurrent inputs must not stop another still-held note just because focus moves.
- **Original code:** `onBlur={() => onNoteOff(midi)}` cleared every source of that MIDI. The parent interprets an omitted source as release-all for that key.
- **Origin:** ce3c60f, still present in 4da5ad4.
- **Detection:** dispatch a pointerdown on the key, then move focus to another key. Pointer capture is stubbed in this isolated component fixture because the generated PointerEvent is not a physical active pointer.
- **Original result:** `FAIL: focus change preserves a held pointer source: blur released the held pointer`.
- **Fix:** blur releases Enter/NumpadEnter/Space sources only. Pointerup, pointercancel and lost capture release their own pointer IDs; window blur and hidden-document handling still release all notes safely.
- **Retest:** focus change no longer emits a pointer/all-source release; the case passes. Real Web Audio FIFO and unmount integration remain green.
- **Limit:** physical multi-touch behavior across devices remains Not Tested.

## Additional verified work, not fabricated failure history

Recording/replay was absent and was added only after the user explicitly expanded final scope. Its absence is not counted as a hidden prior bug. New tests cover speed scaling, overlapping notes, zero durations, recording limits, aborted waits, Stop, delayed resume, replacement runs and unmount disposal.

The final build and 42 Node cases pass; four interaction/render cases and two real-Web-Audio integration scenarios pass. No Lighthouse scores, DevTools screenshots, heap measurements or Git hashes have been invented.
