# HW1 — Production Studio Drum Kit

React 19, Vite and JavaScript JSX. Follow `../project-rules.md`.

## Run and test

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open the following development fixtures and click **Run tests**:

- `/tests/keyboard.html`: 13 keyboard, composition, editor isolation and lifecycle cases.
- `/tests/feedback.html`: 7 history, audio meter, notification batching and cleanup cases.
- `/tests/reliability.html`: 3 regression cases.
- `/tests/accessibility.html`: use Tab, Enter and Space; each press should add one hit, including held keys.

The browser fixtures are launched manually and run their assertions automatically. `npm test` runs 8 Node tests with a mocked Web Audio API.

## Project structure

- `src/data/drumPads.js`: immutable IDs, labels, physical key codes and synthesis presets shared by the UI, keyboard hook and Audio Engine.
- `src/components/DrumKit.jsx`: layout and shared activation handler.
- `src/components/DrumPad.jsx`: reusable native button, independent held-input tracking and accessible state.
- `src/hooks/useDrumKeyboard.js`: `useDrumKeyboard(padMap, onTriggerPad, isEnabled = true)` returns the IDs held through physical shortcuts.
- `src/hooks/useDrumAudio.js`: React integration, error handling and disposal.
- `src/services/audio/drumAudioEngine.js`: `triggerPad(id)`, `readLevel()` and `dispose()`.
- `src/hooks/useHitFeedback.js`: bounded history and transient feedback timers.
- `src/components/VisualHitLog.jsx`: numbered hit history and batched polite announcements.
- `src/components/AudioLevelMeter.jsx`: native RMS meter updated without React state changes per frame.

## Controls and sound

Click or tap a pad, or use Enter/Space when it is focused. Global W/A/S/D/J/K/L shortcuts use `event.code`. Repeated keydowns, handled events, Ctrl/Alt/Meta combinations, editable fields and composition events are ignored. Keyup, window blur, a hidden tab, disabling shortcuts and unmounting release shortcut state. Native keys and pointer IDs are tracked independently. A checkbox disables letter shortcuts for assistive technology users.

Each hit creates independent sources, including repeated hits on the same pad. A single AudioContext is created on the first interaction and resumed when suspended. Master gain and a compressor control overlapping signals. Kick and tom sounds use descending sine oscillators; snare combines filtered noise with a triangle-wave body; hi-hat/crash use high-pass noise with different decays; clap uses three noise bursts. Sources disconnect after playback, the noise buffer is shared, and unmount closes the context. No audio assets or additional runtime dependencies are required.

## Visual feedback

All activation paths record a hit before requesting audio, so history and the visible Hit indicator remain useful when speakers are muted or Web Audio is unavailable. History retains the latest 12 entries. A polite, atomic output summarizes new hits at most once every 2 seconds; the list does not announce every change. At most seven highlight timers and one summary timer are retained.

The meter reads an AnalyserNode after the compressor and displays digital RMS amplitude multiplied by 100%. This is neither dBFS nor dB SPL and does not measure environmental sound. Display updates retain the maximum sampled RMS between updates so short hits remain visible. Low values may round to 0%. If the AudioContext is suspended or unavailable, the meter reads zero while history continues to work.

One requestAnimationFrame loop samples the signal and writes changed DOM values at most 10 times per second, or 2.5 times per second with reduced motion. It pauses while the document is hidden. Unmount cancels frames and timers and disconnects audio resources.

## Verified results and limits

The verification commit `5442d3f` passed the build, 8 Node tests and 23 browser cases. Native Enter/Space testing produced exactly 4 hits for 4 presses. At a 375px viewport there was no horizontal overflow, with pad heights of at least 135px and 10px grid gaps. Tested text contrast was at least 5.02:1. Three verified bugs were fixed: stuck native active state on window blur, incorrect release of a simultaneously held native key, and insufficient pad-border contrast.

Lighthouse 13.6.0 on the previous production build measured Performance 100, Accessibility 100, Best Practices 100 and SEO 100. The original JSON reports in `reports/` are preserved unchanged as historical evidence, including captured Vietnamese labels. Those scores have not been remeasured for this English translation. Lighthouse scores do not certify full WCAG 2.2 AA compliance.

Actual UniKey/Telex/VNI operation, NVDA/JAWS/VoiceOver, speech control, long-duration heap profiling, React DevTools profiling and comprehensive zoom/text-spacing/cross-browser testing remain unverified.

## Development records

- [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md): completed work and actual commits.
- [AI_FAILURE_AUDIT.md](AI_FAILURE_AUDIT.md): three verified bugs and before/after evidence.
- `reports/`: original Lighthouse reports and regression logs.
