# HW3 — PVS Arena domain foundation

React 19, TypeScript (strict) and Vite. The HW3 directory was empty before this step; HW1/HW2 and the existing parent project-rules.md are unchanged.

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

UI, countdown, claim, leaderboard and kill-feed modules can import the same contracts/data. Future stock updates should create new objects rather than mutate these fixtures. Countdown/claim logic, phase transitions and live data integration are outside this step; no runtime validation of external API payloads is claimed.

Verification on November 6, 2026: `npm test` passed all 6 tests; `npm run build` passed TypeScript strict checking and the Vite production build. No browser interaction test was needed for this domain-data step.
