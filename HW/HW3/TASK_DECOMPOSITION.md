# HW3 — Task decomposition

Verified November 6, 2026. All production source files, configuration, existing tests and the six HW3 implementation commits were reviewed. The parent project-rules.md was read and left unchanged. Documentation is English, following the established project preference.

Completed means implemented and checked within the evidence scope below. Failed identifies a reproduced assertion before correction. Not Tested means there is no measurement supporting completion. This record does not equate a mock backend with a deployed official service.

| Group | Objective and work completed | Related files | Actual implementation commit | Status |
| --- | --- | --- | --- | --- |
| Domain Models | Define readonly drop phases, crate/ticket and squad contracts; frozen four-squad and product mock data; VND formatting; validate fixtures | src/domain/pubg-vn-arena-contract.ts, formatVnd.ts, src/data/mockArenaData.ts, tests/domain.test.ts, initial React/TypeScript/Vite files | 6468ede — feat(hw3): define PUBG arena domain models | Completed |
| PUBG Arena UI | Compose semantic esports dashboard, reusable drop cards/list/header, phase scenarios, keyboard focus and contained mobile scrolling | Arena.tsx, ArenaHeader.tsx, DropCard.tsx, DropList.tsx, styles.css, main.tsx, index.html | 624ac3d — feat(hw3): build PUBG airdrop arena UI | Completed |
| Anti-Drift Countdown | Absolute epoch + signed server offset, visibility resync, target changes, second-boundary scheduling and cleanup; distinguish opening from expiry | hooks/usePubgAirdropTimer.ts, timers/airdropTimer.ts, Countdown.tsx, DropCard/DropList, tests/airdropTimer.test.ts, tests/timer.* | d3c12a2 — feat(hw3): implement anti-drift airdrop timer | Completed in controlled-clock tests; prolonged real background throttling Not Tested |
| Optimistic Claim | Shared authoritative mock stock, claim IDs, per-item locks, optimistic deduction, 409 rollback/reconciliation, revisions, timeout/cancellation and disposal | services/claims/*, hooks/useDropClaims.ts, Arena/DropCard/DropList, tests/claims.* | bac8213 — feat(hw3): implement optimistic drop claims | Completed; final QA found and corrected inventory-read failure paths |
| Leaderboard & Kill-Feed | Four-squad table, derived total, all sort criteria/directions, name/squad filters, readonly kill events and explicit local live simulation | PubgLeaderboard.tsx, KillFeed.tsx, PubgMatchPanel.tsx, domain/matchSelectors.ts, data/mockMatchData.ts, services/mockMatchSource.ts, tests/match.* | 853441d — feat(hw3): add leaderboard and kill feed | Completed |
| Virtual Scroller & Live Updates | Bounded rendered rows and retained history, eventId anchors, filter reset, RAF/observer/listener cleanup, generation tokens for stale simulation callbacks; 100/1,000/10,000 stress cases | VirtualKillFeed.tsx, domain/virtualFeed.ts, KillFeed.tsx, mockMatchData/mockMatchSource, tests/virtual*, tests/match.test.ts | 07f8c18 — feat(hw3): optimize live arena data rendering | Completed within measured DOM/lifecycle scope; DevTools Profiler/heap/FPS Not Tested |
| Testing & Quality Assurance | Reproduce failures before fixing; protect preflight/completion/rollback inventory reads, fix brand label-in-name, verify concurrency, build, browser fixtures, production UI and Lighthouse; write this WBS and failure audit | services/claims/claimClient.ts, ArenaHeader.tsx, tests/reliability.test.ts, reports/*, README.md, TASK_DECOMPOSITION.md, AI_FAILURE_AUDIT.md | Commit containing this file, titled test(hw3): verify PUBG arena reliability | Completed and verified before commit |

The final commit cannot embed its own hash without changing that hash. Retrieve the real identity with `git log -1 --format="%h %s" -- TASK_DECOMPOSITION.md` from HW3. The six original hashes are recorded verbatim in reports/git-history-before.txt; no hash was invented.

## Failed checks and corrections

Baseline 07f8c18 passed its existing 53 Node tests and production build. Three newly added inventory-read fault cases then failed: unhandled preflight read, stuck pending state after a confirmed claim, and failed rollback reconciliation throwing again. The first run is preserved in reports/reliability-before.txt. These are two related claim-handling defects covering three failure paths, not three unrelated production incidents.

Lighthouse 13.6.0 measured Accessibility 100 on the baseline, but its zero-weight hidden `label-content-name-mismatch` diagnostic failed for the brand link. After using the visible brand text as the native link name, that diagnostic passed. The score remained 100; the audit does not claim a fabricated score improvement. Complete JSON reports are preserved before and after.

## Final verification evidence

- Node suites and strict production build: reports/tests-final.txt and reports/build-final.txt. Final counts are summarized in README.md.
- Actual hook/component tests: reports/browser-timer.txt (12 assertions), browser-claims.txt (9), browser-match.txt (8), browser-virtual.txt (24), all passing in Chromium.
- The virtual stress fixture uses a controlled RAF scheduler and real DOM geometry. It measured peak nine mounted rows for each dataset; its timings are not FPS or DevTools Profiler results.
- Production checks: reports/browser-ui.json records four phases, VND prices, totals, optimistic/pending state, native Enter activation, filtering/updates, desktop 1440px and mobile 375px dimensions, labels, focus and target sizes. reports/browser-console.json contains the inspected warning/error logs.
- Production default AUTO state Lighthouse: reports/lighthouse-after.json, Accessibility 100, no failing binary audits. This is an automated subset of accessibility, not full WCAG certification.

## Not Tested / not implemented as external services

- Actual NVDA/JAWS/VoiceOver or speech-control products; full manual WCAG 2.2 AA certification; exhaustive cross-browser/device testing.
- Prolonged real browser background throttling, real server clock synchronization and device time changes after a completed timer remains visible. Timer delays/visibility were exercised with controlled clocks/events.
- Official PUBG API, remote HTTP inventory, persistence, authentication, payment, cross-tab/device stock consistency. The mock returns HTTP-style status codes; it is not an HTTP server.
- React DevTools Profiler UI, production frame rate/CPU traces and long-duration heap profiling. Scoped resource counters/retention tests passed; they do not prove all possible memory behavior.
- Lint: no lint script, configuration or linter dependency exists. TypeScript strict/noUnused checks and the legacy API scan passed; no lint pass is invented.

No executed final assertion remains Failed. HW1, HW2, EX and unrelated untracked user files were not changed.
