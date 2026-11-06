# HW1 — Task decomposition

Verified on November 6, 2026. This record covers HW1 only.

**Completed** means implemented with the verification described in README.md. **Failed** identifies a reproducible test failure and distinguishes the original result from the result after a fix. **Not Tested** means no verification evidence is available; it does not imply a broken feature.

| Goal and tasks | Main files | Actual commit | Status |
| --- | --- | --- | --- |
| Initialize React 19/Vite/JSX; define seven IDs, physical codes and shared sound presets | package.json, vite.config.js, src/data/drumPads.js, src/main.jsx | c3be1e9 — feat(hw1): initialize drum kit project | Completed |
| Build dark responsive studio layout and reusable semantic pads | src/components/DrumKit.jsx, DrumPad.jsx, src/styles.css | 3d7c1ae — feat(hw1): build drum pad interface | Completed; native-state edge cases corrected later |
| Add lazy AudioContext, resume, independent voices, errors and cleanup | src/services/audio/drumAudioEngine.js, its test, src/hooks/useDrumAudio.js | ed1c576 — feat(hw1): implement drum audio engine | Completed |
| Add physical shortcuts, anti-repeat, editor/composition isolation and lifecycle tests | src/hooks/useDrumKeyboard.js, tests/keyboard.* | 33248f5 — feat(hw1): implement keyboard controls | Completed for simulated events and browser keys; actual UniKey Not Tested |
| Add accessible names/state/descriptions, native keyboard behavior, shortcut toggle, focus and reduced motion | DrumKit.jsx, DrumPad.jsx, styles.css, tests/accessibility.* | 60ca8b1 — feat(hw1): improve drum accessibility | Completed within tested scope; full WCAG and real assistive technology Not Tested |
| Add 12-entry log, 2-second summary batching, highlights, Analyser/RMS and frame/timer cleanup | AudioLevelMeter.jsx, VisualHitLog.jsx, useHitFeedback.js, audio hook/engine, tests/feedback.* | aa1757a — feat(hw1): add visual audio feedback | Completed |
| Verify production, reproduce/fix three bugs, measure Lighthouse, fix favicon/robots/labels, save evidence | tests/reliability.*, pad/kit/App components, CSS, index.html, public/robots.txt, reports/, documentation | 5442d3f — test(hw1): verify accessibility and reliability | Completed |

## Original failures

The reliability fixture on baseline aa1757a returned **0 passed, 3 failed**. After fixes it returned **3 passed, 0 failed**. See reports/regression-before.txt, reports/regression-after.txt and AI_FAILURE_AUDIT.md. Resolved failures are not reported as current failures or relabeled Not Tested.

## Not Tested

- Native UniKey/Telex/VNI, real screen readers and speech control across operating systems.
- Long-duration heap profiling, React DevTools profiling and direct human assessment of sound quality.
- Every WCAG 2.2 AA criterion, zoom/text spacing and the instructor's live defense.

Lighthouse scores do not turn these items into Completed work. The English translation is a subsequent working-tree change; it is not attributed to one of the historical commits above.
