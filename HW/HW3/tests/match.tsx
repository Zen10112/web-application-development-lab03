import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { PubgMatchPanel } from '../src/components/PubgMatchPanel';
import { createMockMatchSource } from '../src/services/mockMatchSource';
import { MOCK_SQUAD_STANDINGS } from '../src/data/mockArenaData';
import { MOCK_KILL_FEED } from '../src/data/mockMatchData';

document.querySelector<HTMLButtonElement>('#run')!.onclick = () => {
  const fixture = document.querySelector('#fixture')!;
  const results = document.querySelector('#results')!;
  const pending = new Map<number, () => void>();
  const log: string[] = [];
  const originalData = JSON.stringify({ squads: MOCK_SQUAD_STANDINGS, events: MOCK_KILL_FEED });
  let nextId = 1000000;
  const source = createMockMatchSource({ schedule(callback) { pending.set(++nextId, callback); return nextId; }, cancel(id) { pending.delete(id); } });
  let root = createRoot(fixture);
  const check = (name: string, condition: boolean) => { if (!condition) throw new Error(name); log.push(`PASS: ${name}`); };
  const button = (text: string) => [...fixture.querySelectorAll('button')].find((item) => item.textContent === text)!;
  try {
    flushSync(() => root.render(<StrictMode><PubgMatchPanel source={source} /></StrictMode>));
    check('StrictMode mounts four squads and four mock events', fixture.querySelectorAll('tbody tr').length === 4 && fixture.querySelectorAll('.kill-feed-list li').length === 4 && pending.size === 0);
    flushSync(() => button('Next mock update').click());
    check('manual update changes both scores and feed', fixture.querySelector('.total-points')?.textContent === '113' && fixture.querySelectorAll('.kill-feed-list li').length === 5);
    flushSync(() => { button('Start simulation').click(); source.start(); });
    check('start creates exactly one interval', pending.size === 1);
    const tick = [...pending.values()][0];
    flushSync(() => tick());
    check('one scheduled tick creates exactly one new event', fixture.querySelectorAll('.kill-feed-list li').length === 6 && source.getSnapshot().revision === 2);
    flushSync(() => button('Pause simulation').click());
    check('pause clears the loop', pending.size === 0);
    flushSync(() => button('Start simulation').click());
    const stale = [...pending.values()][0];
    flushSync(() => root.unmount()); stale();
    check('unmount removes the last subscription and blocks queued ticks', pending.size === 0 && !source.getSnapshot().isRunning && source.getSnapshot().revision === 2);
    root = createRoot(fixture);
    flushSync(() => root.render(<StrictMode><PubgMatchPanel source={source} /></StrictMode>));
    check('remount preserves snapshot without restarting a loop', fixture.querySelectorAll('tbody tr').length === 4 && fixture.querySelectorAll('.kill-feed-list li').length === 6 && pending.size === 0);
    check('fixtures remain unchanged', JSON.stringify({ squads: MOCK_SQUAD_STANDINGS, events: MOCK_KILL_FEED }) === originalData);
  } catch (error) {
    log.push(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSync(() => root.unmount());
    results.textContent = log.join('\n');
  }
};
