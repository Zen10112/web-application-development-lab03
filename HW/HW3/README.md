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

UI, countdown, claim, leaderboard and kill-feed modules can import the same contracts/data. Future stock updates should create new objects rather than mutate these fixtures. Countdown/claim logic, automatic phase transitions and live data integration are not implemented; no runtime validation of external API payloads is claimed.

Verification on November 6, 2026: `npm test` passed all 6 tests; `npm run build` passed TypeScript strict checking and the Vite production build. No browser interaction test was needed for this domain-data step.

## Arena UI

- `src/components/ArenaHeader.tsx`: branding and in-page navigation.
- `src/components/DropCard.tsx`: semantic reusable card, shared VND formatter, opening time explicitly shown in UTC+7, phase messaging and optional `onClaim(id)` callback.
- `src/components/DropList.tsx`: renders immutable domain data as cards.
- `src/components/Arena.tsx`: dashboard composition, mock standings, offline kill-feed placeholder and state preview controls.
- `src/styles.css`, `src/main.tsx`, `index.html`: responsive dark esports theme, visible keyboard focus, skip link, page metadata and entry point.

The labeled preview select exercises WARMUP, AIRDROP_LIVE, LOOTED_OUT and EXPIRED. These are visual scenarios, not phases calculated from the fixed mock dates. Looted-out preview derives zero-stock copies without mutating fixtures. Only the live preview enables Claim; clicking announces that no purchase or stock change was made. A future claim service can supply DropCard/DropList's callback. The standings preserve fixture order; no ranking/filter or telemetry logic is implemented yet. Decorative ticket/crate artwork uses CSS only, with no external images, fonts or asset requests.

UI verification on November 6, 2026:

- PASS: TypeScript strict and production build; all 6 existing domain tests.
- PASS: Chromium UI at 1440px, 768px and 375px. Page scrollWidth equals clientWidth (1425, 753 and 360px respectively, accounting for the scrollbar); cards stack on mobile. The standings table has an intentional scroll container.
- PASS: both cards show names, VND prices, stock, phase, UTC+7 opening dates and semantic Claim buttons. All four preview states were exercised; disabled states and live Claim feedback behaved as intended.
- PASS: Tab to the live Claim button, visible solid focus outline, Enter activation, in-page navigation and empty console warning/error logs. Mobile Claim targets measured approximately 291 × 45px.
- NOT TESTED: screen-reader products, exhaustive WCAG audit, Lighthouse or cross-browser/device behavior. These checks do not claim full accessibility certification.
