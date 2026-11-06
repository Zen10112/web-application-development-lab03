import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useDropClaims } from '../src/hooks/useDropClaims';
import { MOCK_CRATE_DROPS } from '../src/data/mockArenaData';
import { mockClaimApi } from '../src/services/claims/mockClaimApi';
import { DropList } from '../src/components/DropList';

function Probe() {
  const claims = useDropClaims();
  const drops = MOCK_CRATE_DROPS.map((drop) => ({ ...drop, remainingStock: claims.states[drop.id].displayedStock }));
  return <DropList drops={drops} previewPhase="AIRDROP_LIVE" onClaim={claims.claim} claimStates={claims.states} />;
}

document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
  const runButton = document.querySelector<HTMLButtonElement>('#run')!;
  runButton.disabled = true;
  const fixture = document.querySelector('#fixture')!;
  const results = document.querySelector('#results')!;
  const log: string[] = [];
  const check = (name: string, condition: boolean) => { if (!condition) throw new Error(name); log.push(`PASS: ${name}`); };
  const wait = () => new Promise((resolve) => setTimeout(resolve, 850));
  const originalClaim = mockClaimApi.claim;
  let requests = 0; let aborted = 0;
  let root = createRoot(fixture);
  const buttons = () => [...fixture.querySelectorAll<HTMLButtonElement>('.claim-button')];
  const stock = (index: number) => Number(fixture.querySelectorAll('.drop-details')[index].querySelector('dd')?.childNodes[0].textContent);
  mockClaimApi.setPhaseOverride('AIRDROP_LIVE');
  const initial = MOCK_CRATE_DROPS.map((drop) => mockClaimApi.read(drop.id).remainingStock);
  mockClaimApi.claim = (request, signal) => {
    requests++;
    const onAbort = () => { aborted++; };
    signal.addEventListener('abort', onAbort, { once: true });
    return originalClaim(request, signal).finally(() => signal.removeEventListener('abort', onAbort));
  };
  try {
    flushSync(() => root.render(<StrictMode><Probe /></StrictMode>));
    check('StrictMode mount submits no requests', requests === 0);
    flushSync(() => { buttons()[0].click(); buttons()[0].click(); });
    check('double click has one request and immediate optimistic deduction', requests === 1 && stock(0) === initial[0] - 1);
    check('pending item button is disabled and busy', buttons()[0].disabled && buttons()[0].getAttribute('aria-busy') === 'true');
    check('other item remains independently usable', !buttons()[1].disabled);
    flushSync(() => buttons()[1].click());
    check('crate also deducts optimistically', requests === 2 && stock(1) === initial[1] - 1);
    await wait();
    check('both results reconcile to shared authoritative stock', MOCK_CRATE_DROPS.every((drop, index) => mockClaimApi.read(drop.id).remainingStock === stock(index)));
    check('success messages appear and locks release', [...fixture.querySelectorAll('.claim-result')].every((result) => result.textContent?.includes('confirmed')) && buttons().every((button) => !button.disabled));
    const beforeUnmount = mockClaimApi.read(MOCK_CRATE_DROPS[0].id).remainingStock;
    flushSync(() => buttons()[0].click());
    flushSync(() => root.unmount());
    await wait();
    check('unmount aborts pending mock operation without allocating', aborted === 1 && mockClaimApi.read(MOCK_CRATE_DROPS[0].id).remainingStock === beforeUnmount);
    root = createRoot(fixture);
    flushSync(() => root.render(<StrictMode><Probe /></StrictMode>));
    check('remount reads authority without submitting duplicate requests', requests === 3 && stock(0) === beforeUnmount && !buttons()[0].disabled);
  } catch (error) {
    log.push(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSync(() => root.unmount());
    mockClaimApi.claim = originalClaim;
    mockClaimApi.setPhaseOverride(undefined);
    results.textContent = log.join('\n');
    runButton.disabled = false;
  }
};
