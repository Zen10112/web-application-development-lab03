// Dev-only fixture: exercises the actual hook/cards under StrictMode with a controlled clock.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { usePubgAirdropTimer } from '../src/hooks/usePubgAirdropTimer';
import { DropCard } from '../src/components/DropCard';
import { MOCK_CRATE_DROPS } from '../src/data/mockArenaData';

function Probe({ target, offset = 0 }: { target: number; offset?: number }) {
  const result = usePubgAirdropTimer(target, offset);
  return <p id="probe" data-remaining={result.remainingMs} data-live={String(result.isLive)}>{result.remainingMs}</p>;
}

document.querySelector<HTMLButtonElement>('#run')!.onclick = () => {
  const results = document.querySelector('#results')!;
  const fixture = document.querySelector('#fixture')!;
  const log: string[] = [];
  const originalNow = Date.now;
  const originalSet = window.setTimeout;
  const originalClear = window.clearTimeout;
  const originalAdd = document.addEventListener.bind(document);
  const originalRemove = document.removeEventListener.bind(document);
  const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  const pending = new Map<number, () => void>();
  const listeners = new Set<EventListenerOrEventListenerObject>();
  let now = 1000; let nextId = 1000000; let visible = true;
  let root = createRoot(fixture);
  const check = (name: string, condition: boolean) => { if (!condition) throw new Error(name); log.push(`PASS: ${name}`); };
  const read = () => Number(fixture.querySelector('#probe')?.getAttribute('data-remaining'));
  const render = (target: number, offset = 0) => flushSync(() => root.render(<StrictMode><Probe target={target} offset={offset} /></StrictMode>));
  const fire = () => flushSync(() => {
    const next = pending.entries().next().value;
    if (!next) throw new Error('No scheduled callback');
    pending.delete(next[0]); next[1]();
  });
  const visibility = (value: boolean) => flushSync(() => { visible = value; document.dispatchEvent(new Event('visibilitychange')); });
  try {
    Date.now = () => now;
    window.setTimeout = ((callback: () => void) => { pending.set(++nextId, callback); return nextId; }) as typeof window.setTimeout;
    window.clearTimeout = (id) => { if (id !== undefined) pending.delete(id); };
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible ? 'visible' : 'hidden' });
    document.addEventListener = ((type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'visibilitychange' && callback) listeners.add(callback);
      originalAdd(type, callback, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      if (type === 'visibilitychange' && callback) listeners.delete(callback);
      originalRemove(type, callback, options);
    }) as typeof document.removeEventListener;
    render(6000);
    check('StrictMode mount has one timer and listener', read() === 5000 && pending.size === 1 && listeners.size === 1);
    now = 2000; fire();
    check('normal countdown', read() === 4000);
    now = 12000; fire();
    check('delayed callback reaches zero without drift', read() === 0 && pending.size === 0 && fixture.querySelector('#probe')?.getAttribute('data-live') === 'true');
    render(21000);
    check('changed target immediately replaces old completed state', read() === 9000 && pending.size === 1);
    render(21000, 1000);
    check('changed server offset uses new clock', read() === 8000 && pending.size === 1 && listeners.size === 1);
    visibility(false); now = 16000;
    check('background cancels pending timeout', pending.size === 0);
    visibility(true);
    check('foreground resync is immediate', read() === 4000 && pending.size === 1);
    visibility(false); now = 50000; visibility(true);
    check('foreground after opening clamps to zero', read() === 0 && pending.size === 0);
    render(60000);
    const stale = [...pending.values()][0];
    flushSync(() => root.unmount()); stale();
    check('unmount removes all work including stale callback', pending.size === 0 && listeners.size === 0);
    root = createRoot(fixture); render(60000);
    check('remount has no duplicate subscriptions', read() === 10000 && pending.size === 1 && listeners.size === 1);
    flushSync(() => root.unmount()); root = createRoot(fixture);
    flushSync(() => root.render(<StrictMode><DropCard drop={{ ...MOCK_CRATE_DROPS[0], dropEpochMs: 51000 }} onClaim={() => {}} /></StrictMode>));
    check('ticket uses countdown and warmup Claim lock', fixture.querySelector('article')?.getAttribute('data-phase') === 'WARMUP' && fixture.querySelector('button')?.disabled === true);
    now = 51000; fire();
    check('opening automatically enables live Claim without expiry', fixture.querySelector('article')?.getAttribute('data-phase') === 'AIRDROP_LIVE' && fixture.querySelector('button')?.disabled === false && fixture.querySelector('output')?.textContent === '00:00:00');
  } catch (error) {
    log.push(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSync(() => root.unmount());
    Date.now = originalNow; window.setTimeout = originalSet; window.clearTimeout = originalClear;
    document.addEventListener = originalAdd; document.removeEventListener = originalRemove;
    if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    else Reflect.deleteProperty(document, 'visibilityState');
    results.textContent = log.join('\n');
  }
};
