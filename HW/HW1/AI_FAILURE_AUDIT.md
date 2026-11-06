# HW1 — AI failure audit

Verified on November 6, 2026. These three bugs were reproduced in AI-generated HW1 code, not deliberately introduced for this audit. Baseline: aa1757a. Original evidence: reports/regression-before.txt. Fix commit: **5442d3f**, `test(hw1): verify accessibility and reliability`. Browser fixture: `/tests/reliability.html`.

## 01 — Native pad remains active after window blur

- **Requirement:** return active state to inactive after losing focus or switching tabs.
- **Faulty code:** DrumPad relied on keyup and element blur. It did not clear native Enter/Space state on window blur or document visibility changes. The shortcut hook cleared only its separate W–L state. This behavior originated in 3d7c1ae and remained in aa1757a.
- **Reproduction:** dispatch Enter keydown on the button, confirm aria-pressed=true, then dispatch window blur without keyup.
- **Observed evidence:** `FAIL: native Enter clears on window blur: aria-pressed stuck true after window blur`.
- **Fix:** track held input sources in a ref; clear native sources on window blur/hidden document; remove listeners on unmount. Use a latest-callback ref to avoid stale closures and repeated listener registration.
- **Retest:** `PASS: native Enter clears on window blur`.

## 02 — Releasing Enter incorrectly clears held Space

- **Requirement:** aria-pressed must reflect the actual active state, including native Enter/Space controls.
- **Faulty code:** keyup unconditionally called release for either key. State indexed only by pad ID could not distinguish two native input sources on one pad. This originated in 3d7c1ae and remained in aa1757a.
- **Reproduction:** Space keydown, Enter keydown, Enter keyup. Space remained held but aria-pressed became false.
- **Observed evidence:** `FAIL: native Space remains active until its own release: releasing Enter incorrectly clears held Space`.
- **Fix:** track physical key codes and pointer IDs separately. Remove only the released source; release the pad when no source remains. Native audio still triggers only through onClick, not both click and keydown.
- **Retest:** `PASS: native Space remains active until its own release`. Native Enter, Space, held Enter and held Space also produced exactly four hits for four presses.

## 03 — Pad boundary contrast was insufficient

- **Requirement:** controls must remain visually distinguishable under WCAG 2.2 AA.
- **Faulty code:** border #606168 against the console's brightest gradient endpoint #25262b. The CSS originated in 3d7c1ae and remained after 60ca8b1 because that review measured text contrast only.
- **Detection:** the browser fixture read the real button's computed border color and calculated sRGB relative-luminance contrast against the console background. This boundary check uses a 3:1 threshold rather than the 4.5:1 ordinary-text threshold.
- **Observed evidence:** `FAIL: pad boundary contrast against console is at least 3:1: boundary contrast 2.45:1`.
- **Fix:** border #8b8d98 and bottom border #9b9da6; sound presets and text colors were preserved.
- **Retest:** `PASS: pad boundary contrast against console is at least 3:1`.

## Additional evidence and limits

Baseline Lighthouse found a favicon.ico 404 and robots.txt falling back to HTML. A data-URI icon declaration and public/robots.txt fixed those findings. Original before/after JSON reports remain unchanged in reports/; captured text may be Vietnamese because those audits predate the English translation.

An earlier meter test waited for audio too soon. Its wait strategy and peak capture were improved, but this is not counted as another independently reproduced baseline bug. No heap snapshot, real screen-reader test or native UniKey evidence is claimed.

The final reliability result was **3 passed, 0 failed**, alongside 8 Node audio tests, 13 keyboard cases and 7 feedback cases. No Git hashes, scores or DevTools evidence were invented.
