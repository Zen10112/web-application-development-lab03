# HW3 — PVS Arena

React 19, TypeScript (strict) and Vite. HW3 started from an empty directory in the domain-foundation step; HW1/HW2 and the existing parent project-rules.md are unchanged.

```sh
npm install
npm run dev
npm test
npm run build
```

Tests use Node's built-in TypeScript support (Node 22.18+ or a newer supported version); no test framework is required. Build runs TypeScript checking before Vite bundling.

- `src/domain/pubg-vn-arena-contract.ts`: readonly Lab 3 contracts and the four drop phases.
- `src/data/mockArenaData.ts`: frozen squads, ticket and crate fixtures, with an explicit mock-data disclaimer.
- `src/domain/formatVnd.ts`: reusable vi-VN/VND currency formatting.
- `tests/domain.test.ts`: phase values, squad identity/statistics, product validity, epoch units, mock provenance, immutability and currency formatting.

All names, scores, stock, prices and fixed 2030 timestamps are coursework fixtures, not official live PUBG/PVS information. Roy Esports uses the stable ID `roy`; the slide's squadId field is a string, and its illustrative `ge` ID is not treated as Roy's identity.

UI, countdown, claim, leaderboard and kill-feed modules import the same contracts/data. Stock changes create new UI snapshots rather than mutate these fixtures. Claims use an in-memory mock authority; a real backend and live data integration are not implemented. No runtime validation of external API payloads is claimed.

Verification on November 6, 2026: `npm test` passed all 6 tests; `npm run build` passed TypeScript strict checking and the Vite production build. No browser interaction test was needed for this domain-data step.

## Arena UI

- `src/components/ArenaHeader.tsx`: branding and in-page navigation.
- `src/components/DropCard.tsx`: semantic reusable card, shared VND formatter, opening time explicitly shown in UTC+7, phase messaging and optional `onClaim(id)` callback.
- `src/components/DropList.tsx`: renders immutable domain data as cards.
- `src/components/Arena.tsx`: dashboard composition, mock standings, offline kill-feed placeholder and state preview controls.
- `src/styles.css`, `src/main.tsx`, `index.html`: responsive dark esports theme, visible keyboard focus, skip link, page metadata and entry point.

The labeled Mock scenario select defaults to AUTOMATIC, which follows the scheduled opening. The other four options explicitly simulate server phases while the countdown continues showing the fixed mock schedule. LOOTED_OUT exposes zero availability without consuming the underlying inventory; switching scenarios preserves prior successful allocations. Only live, in-stock drops enable Claim. Claims now update shared mock stock, never a real purchase or currency balance. The standings preserve fixture order; no ranking/filter or telemetry logic is implemented yet. Decorative ticket/crate artwork uses CSS only, with no external images, fonts or asset requests.

UI verification on November 6, 2026:

- PASS: TypeScript strict and production build; all 6 existing domain tests.
- PASS: Chromium UI at 1440px, 768px and 375px. Page scrollWidth equals clientWidth (1425, 753 and 360px respectively, accounting for the scrollbar); cards stack on mobile. The standings table has an intentional scroll container.
- PASS: both cards show names, VND prices, stock, phase, UTC+7 opening dates and semantic Claim buttons. All four preview states were exercised; disabled states and live Claim feedback behaved as intended.
- PASS: Tab to the live Claim button, visible solid focus outline, Enter activation, in-page navigation and empty console warning/error logs. Mobile Claim targets measured approximately 291 × 45px.
- NOT TESTED: screen-reader products, exhaustive WCAG audit, Lighthouse or cross-browser/device behavior. These checks do not claim full accessibility certification.

## Anti-drift opening countdown

`usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0)` returns `{ remainingMs, isLive }`. It evolves the absolute-target approach from Lab 2 HW3's `createAntiDriftTimer` / `useCountdown`, inspected in the supplied hw-lab02.zip. Every tick calculates `Math.max(0, targetEpochMs - (Date.now() + serverOffsetMs))`; no state is decremented. Positive server offsets mean the server clock is ahead.

`src/timers/airdropTimer.ts` owns a single timeout per subscription, scheduled at the next displayed second boundary. It pauses pending work when hidden and immediately recalculates on visible. Delayed callbacks skip missed ticks by reading the clock again. Completion stops scheduling; cleanup cancels the timeout and visibility listener and guards queued callbacks. No interval or animation frame is allocated. The hook replaces the subscription on target/offset changes, including StrictMode cleanup/remount, and does not publish identical state values.

`Countdown.tsx` renders `[days] HH:MM:SS`, rounding a positive remainder upward for display only. Its output has aria-live off so seconds are not announced continuously. Both tickets and crates already use DropCard, so there is no redundant TicketCard. Each card owns its hook and uses automatic WARMUP before opening, AIRDROP_LIVE after opening with stock, or LOOTED_OUT after opening with no stock. DropList forwards an optional serverOffsetMs. The domain has no expiry field: reaching zero means **opened**, never expired. EXPIRED remains an explicit mock server scenario only.

Timer verification on November 6, 2026:

- `npm test`: **14 passed, 0 failed** (6 domain + 8 timer/format cases). Controlled clocks cover normal ticks, signed offsets, completion, delayed callbacks, target/offset subscription replacement, visibility resync and disposal.
- `npm run build`: **PASS**, including strict TypeScript checking of production source and the browser test fixture.
- Open `/tests/timer.html` on the Vite dev server and click **Run timer verification**: **12 assertions passed** using the actual hook and DropCard in React StrictMode. Covers normal countdown, completion after delay, changed target/offset, background/foreground, opening reached while hidden, unmount/stale callback, remount and automatic ticket warmup-to-live Claim enablement. The fixture controls Date.now, timer delivery and visibility events and restores them afterwards; this is deterministic simulation, not a measurement of browser background-throttling policy.
- Normal UI inspection: both mock drops display a running countdown, AUTOMATIC is selected by default, 375px page scrollWidth=clientWidth=360px and no console warnings/errors were observed. Fixed mock drop dates remain in 2030 rather than being silently replaced with a moving schedule.
- NOT TESTED: prolonged real background throttling across browsers, real server clock synchronization (the offset is caller-supplied), screen-reader products and system-clock changes while a completed timer remains continuously visible. Browser timers can deliver late; zero drift means no accumulated tick-count error, not guaranteed execution while the browser suspends the page.

## Optimistic mock claims

- `src/services/claims/claimContracts.ts`: request IDs, versioned authoritative snapshots, HTTP-style response status and client UI state.
- `src/services/claims/mockClaimApi.ts`: one shared in-memory inventory for simulated clients within a loaded JS session. Requests wait 700ms by default, then atomically validate phase/revision/stock and decrement once. Distinct requests for the final item produce one allocation and a 409 Conflict. Successful claim IDs are idempotent; duplicate in-flight IDs share the same promise. Success records are bounded by the finite stock; failed requests do not accumulate a history cache.
- `src/services/claims/claimClient.ts`: synchronous per-item locks, optimistic deduction, revision guards, latest-authority reconciliation, 5s timeout, explicit cancellation and dispose. UI stock is clamped at zero. 409, forbidden phases and network errors restore from the latest authority rather than a captured pre-request count. A response lost after a server commit therefore does not invent stock. Late responses cannot overwrite newer revisions or update a disposed client.
- `src/hooks/useDropClaims.ts`: owns a client per mounted hook, publishes immutable replacement snapshots and disposes outstanding requests. Authoritative inventory survives component remounts; it is not React state. Stable callbacks connect Arena/DropList/DropCard. Each card disables its own pending button, exposes aria-busy and announces results via a status region; the other item remains usable.
- `tests/claims.test.ts`, `tests/claims.html`, `tests/claims.tsx`: concurrency/failure tests and a StrictMode integration fixture. The browser fixture is included in strict typechecking, not the production bundle.

Use the Mock scenario select to choose AIRDROP LIVE before testing claims against the fixed future fixtures. The selector is disabled while any local claim is pending. WARMUP, EXPIRED and LOOTED OUT prohibit claims in both UI and authority. AUTOMATIC follows actual opening times; no expiry timestamp is invented. The mock server scenario is read from the service on remount rather than kept as a conflicting second source of truth in React.

Claim verification on November 6, 2026:

- **PASS: 32 Node tests**, comprising 6 domain, 8 timer and 18 claim cases. Claim coverage includes success, zero/final stock, concurrent clients, idempotency/double click, non-live phases, 409 rollback/retry, network failure before and after commit, stale success/409 delivery, timeout with an uncooperative transport, explicit cancellation and dispose. Also verifies that an early rejection publishes inventory exhausted by another client instead of leaving stale stock visible.
- **PASS: production build and TypeScript strict**, including both browser fixtures; no new dependencies.
- **PASS: 9 browser claim assertions** at `/tests/claims.html`: StrictMode mount, one request for a double click, immediate deduction, disabled/busy pending button, independent crate claim, authoritative reconciliation/success messages, abort on unmount and clean remount. The fixture uses the actual hook/cards and mock authority with real asynchronous waits.
- **PASS: all 12 browser timer assertions** at `/tests/timer.html` after claim integration. Countdown behavior remains intact.
- **PASS: normal arena UI**: immediate ticket stock 40→39, pending/scenario locks, confirmed result, and phase guards in all four scenarios. At 375px, page scrollWidth=clientWidth=360px. Browser warning/error logs were empty.

This is a simulated API returning `status: 200/403/409`, not an HTTP server. Network failures and reordered deliveries are controlled test transports, not actual network captures. The authority is shared by clients given the same service instance; it is not shared across browser tabs/devices, has no persistence/authentication/payment integration and resets on reload. Its synchronous `read` is a mock-only reconciliation facility; a future remote backend must provide a corresponding versioned inventory/idempotency endpoint. Real network infrastructure, cross-tab synchronization, assistive technology products and prolonged memory profiling remain NOT TESTED. No real tickets or G-Coin are issued.
