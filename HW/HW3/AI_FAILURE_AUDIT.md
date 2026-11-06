# HW3 — AI failure audit

Baseline: 07f8c18. Verified November 6, 2026. Three findings are documented: two related claim error-handling defects (covering three failing test paths) and one accessibility defect. They were discovered by adding fault coverage/auditing existing AI-assisted code, not by inserting bad code. The stock/transport failures below are injected test conditions, not claimed real production outages.

The fixes are in the commit titled **test(hw3): verify PUBG arena reliability**, containing this file. Retrieve its actual hash with `git log -1 --format="%h %s" -- AI_FAILURE_AUDIT.md`; a self-referential commit hash is deliberately not invented.

## 1. Preflight inventory read escapes the claim error boundary

- **Task/requirement:** optimistic Claim must handle network/read failures through UI, avoid unhandled rejection and prevent duplicate or invalid requests.
- **Origin:** bac8213, still present in baseline 07f8c18.
- **Faulty code:** `merge(id, api.read(id));` executed at the beginning of `claim`, before its try/catch.
- **Behavior:** when an injected inventory outage starts after client initialization, claim rejects with `Error: Inventory unavailable`. It neither returns the documented handled-failure outcome nor publishes an error status. The hook calls this Promise with `void`, so a rejected preflight could become an unhandled rejection.
- **Technical cause:** only the asynchronous claim/response portion was protected; synchronous preflight authority reads were outside the error boundary.
- **Detection/evidence:** the first case in tests/reliability.test.ts failed before the fix. reports/reliability-before.txt records the exception at baseline claimClient.ts:34. No claim request was needed to trigger it.
- **Fix:** use guarded `readLatest`; if it fails, publish an unavailable status and return false before sending a request. A later attempt rechecks authority rather than relying on stale UI counts.
- **Retest:** the case passes, reports/reliability-after.txt. It checks handled false, non-pending error state and zero transport calls.

## 2. Completion/rollback reconciliation failure leaves incorrect terminal state

- **Task/requirement:** success must commit the allocation and unlock the button; rollback must report failures safely, avoid false stock synchronization and clean up request resources.
- **Origin:** bac8213, still present in baseline 07f8c18.
- **Faulty code:** after a response, `pending.delete(id)` ran before `merge(id, api.read(id))`. If that read threw, catch checked `pending.get(id)?.claimId !== claimId` and returned without finalizing UI state. The rejection path also called `api.read` from catch without another guard.
- **Behavior:** a server-confirmed success returned false and left `isPending === true`, keeping the Claim button stuck. Separately, a rejected request followed by a failed inventory read threw from the recovery path instead of returning a handled error. These are two verified manifestations of the same unsafe reconciliation/finalization defect, counted as one finding.
- **Technical cause:** terminal UI cleanup depended on reconciliation succeeding and on a lock already removed by the success path. The catch fallback assumed the same authority read could not fail.
- **Detection/evidence:** the second and third new tests failed on the unchanged baseline. reports/reliability-before.txt shows `true !== false` for pending state and another `Inventory unavailable` exception at baseline claimClient.ts:76.
- **Fix:** reconciliation returns a success flag instead of throwing. Always finalize pending state once the request outcome is known; preserve a confirmed success even if the latest refresh fails. Warn that stock is last-confirmed rather than claiming fresh synchronization. Guard explicit refresh, retain revision checks and clear timeout/abort handlers in finally.
- **Retest:** both tests pass. The confirmed allocation remains stock 2, pending is false and refresh failure is reported. Network failure plus unavailable authority is handled, and explicit refresh/recovery does not throw. Existing cancellation, late response, 409, idempotency and unmount tests remain green.

## 3. Brand link accessible name does not contain its visible label

- **Task/requirement:** semantic/keyboard/assistive compatibility and WCAG 2.2 AA, including Label in Name (2.5.3).
- **Origin:** 624ac3d, still present in baseline 07f8c18.
- **Faulty code:** `<a className="brand" ... aria-label="PVS Arena home">` visually displayed `PVS / VIETNAM SERIES / CHAMPIONSHIP ARENA`; the PVS span was also aria-hidden. The custom label replaced rather than matched the visible brand wording.
- **Behavior/technical cause:** the name exposed to assistive/voice tools omitted visible label words, weakening matching between the screen label and accessible link name.
- **Detection/evidence:** reports/lighthouse-before.json, Lighthouse 13.6.0, audit `label-content-name-mismatch`: score 0, selector `body > div#root > header.arena-header > a.brand`. The explanation states that text inside the element is not included in its accessible name.
- **Scoring caveat:** this diagnostic has weight 0 and group hidden in that Lighthouse version. Baseline Accessibility was already 100. A score of 100 therefore did not establish that this defect was absent.
- **Fix:** remove the overriding aria-label and aria-hidden from the brand text, allowing the semantic link to derive its accessible name directly from all visible words.
- **Retest:** reports/lighthouse-after.json records diagnostic score 1 and Accessibility 100, with no failing binary audits. Production browser accessibility state exposes `PVS VIETNAM SERIES CHAMPIONSHIP ARENA`. No score improvement or actual screen-reader test is invented.

## Evidence scope and remaining limits

- reports/reliability-before.txt is the actual pre-fix run of the three regression cases. A fourth final test stresses 50 concurrent requests for the last item: exactly one success, 49 conflicts and zero remaining stock. It is additional coverage, not a manufactured baseline failure.
- reports/tests-final.txt, build-final.txt and the four browser result files record the final suites; report counts are summarized in README.md.
- The before/after Lighthouse files audit the production default AUTO page at localhost:4173. They do not certify all dynamic states, all WCAG success criteria or every device.
- No timer-drift, overselling, stale-closure, old-response overwrite or virtual over-rendering bug was found in the executed existing coverage. Those categories are not falsely listed as defects merely to increase the count.
- Actual assistive products, long-duration heap traces, real remote APIs, real background throttling policy and React DevTools Profiler remain Not Tested. Controlled tests and resource counters are identified as such.
