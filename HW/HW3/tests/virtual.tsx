import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { PubgMatchPanel } from '../src/components/PubgMatchPanel';
import { createMockMatchSource } from '../src/services/mockMatchSource';
import { FEED_ROW_HEIGHT } from '../src/domain/virtualFeed';
import '../src/styles.css';

const fixture = document.querySelector('#fixture')!;
let previewRoot: Root | null = null;
document.querySelector<HTMLButtonElement>('#preview')!.onclick = () => {
  flushSync(() => previewRoot?.unmount());
  const source = createMockMatchSource(undefined, { initialEventCount: 10000, historyLimit: 10000 });
  previewRoot = createRoot(fixture);
  flushSync(() => previewRoot!.render(<StrictMode><PubgMatchPanel source={source} /></StrictMode>));
};

document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
  flushSync(() => previewRoot?.unmount()); previewRoot = null;
  const run = document.querySelector<HTMLButtonElement>('#run')!;
  const preview = document.querySelector<HTMLButtonElement>('#preview')!;
  run.disabled = true; preview.disabled = true;
  const results = document.querySelector('#results')!;
  const log: string[] = [];
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const OriginalObserver = window.ResizeObserver;
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1000000;
  const scrollListeners = new Set<EventListenerOrEventListenerObject>();
  let observers = 0;
  let root: Root | null = null;
  const check = (name: string, condition: boolean) => { if (!condition) throw new Error(name); log.push(`PASS: ${name}`); };
  const settle = async () => {
    // Drive the application's actual RAF callback deterministically; no FPS claim.
    flushSync(() => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(performance.now()); } });
    await Promise.resolve();
  };
  const feed = () => fixture.querySelector<HTMLDivElement>('.kill-feed-scroll')!;
  const rows = () => [...fixture.querySelectorAll<HTMLLIElement>('.kill-feed-list li')];
  const anchor = () => {
    const top = feed().getBoundingClientRect().top + feed().clientTop;
    const row = rows().find((item) => item.getBoundingClientRect().bottom > top)!;
    return { id: row.dataset.eventId, offset: row.getBoundingClientRect().top - top };
  };
  const scroll = async (top: number) => { feed().scrollTop = top; feed().dispatchEvent(new Event('scroll')); await settle(); };
  const filter = (value: string) => flushSync(() => {
    const select = fixture.querySelector<HTMLSelectElement>('#kill-feed select')!;
    select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  try {
    window.requestAnimationFrame = (callback) => {
      const id = ++nextFrame; frames.set(id, callback); return id;
    };
    window.cancelAnimationFrame = (id) => { frames.delete(id); };
    window.ResizeObserver = class extends OriginalObserver {
      private active = false;
      observe(target: Element, options?: ResizeObserverOptions) { if (!this.active) { observers++; this.active = true; } super.observe(target, options); }
      disconnect() { if (this.active) { observers--; this.active = false; } super.disconnect(); }
    };
    EventTarget.prototype.addEventListener = function(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === 'scroll' && this instanceof HTMLElement && this.classList.contains('kill-feed-scroll') && callback) scrollListeners.add(callback);
      originalAdd.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (type === 'scroll' && callback) scrollListeners.delete(callback);
      originalRemove.call(this, type, callback, options);
    };
    for (const count of [100, 1000, 10000]) {
      const timers = new Map<number, () => void>(); let nextTimer = 0;
      const source = createMockMatchSource({ schedule(callback) { timers.set(++nextTimer, callback); return nextTimer; }, cancel(id) { timers.delete(id); } },
        { initialEventCount: count, historyLimit: 10000 });
      root = createRoot(fixture);
      const started = performance.now();
      flushSync(() => root!.render(<StrictMode><PubgMatchPanel source={source} /></StrictMode>));
      const mountMs = performance.now() - started;
      await settle();
      check(`${count}: at most 10 rows mounted for full data`, rows().length <= 10 && Number(rows()[0].getAttribute('aria-setsize')) === count);
      check(`${count}: one scroll listener and one observer under StrictMode`, scrollListeners.size === 1 && observers === 1);
      check(`${count}: exact fixed row geometry`, rows().every((row) => Math.abs(row.getBoundingClientRect().height - FEED_ROW_HEIGHT) < 0.1));
      let peak = rows().length;
      const scrollStarted = performance.now();
      for (let index = 0; index < 20; index++) {
        await scroll(index % 2 ? 0 : Math.floor((index + 1) / 21 * count) * FEED_ROW_HEIGHT + 17);
        peak = Math.max(peak, rows().length);
      }
      check(`${count}: repeated scrolling keeps DOM bounded`, peak <= 10);
      await scroll(40 * FEED_ROW_HEIGHT + 23);
      const before = anchor();
      flushSync(() => source.step());
      check(`${count}: live prepend preserves historical event and pixel offset`, anchor().id === before.id && Math.abs(anchor().offset - before.offset) < 1 && feed().scrollTop > 0);
      filter('te'); await settle();
      check(`${count}: filtering while scrolled resets position and window`, feed().scrollTop === 0 && rows().every((row) => source.getSnapshot().events.find((event) => event.eventId === row.dataset.eventId)?.squadId === 'te'));
      flushSync(() => source.start());
      filter('ces'); flushSync(() => [...timers.values()][0]());
      check(`${count}: filter change during simulation uses current squad`, timers.size === 1 && rows().every((row) => source.getSnapshot().events.find((event) => event.eventId === row.dataset.eventId)?.squadId === 'ces'));
      feed().dispatchEvent(new Event('scroll'));
      flushSync(() => root!.unmount()); root = null;
      check(`${count}: unmount clears interval, scroll listener, observer and frame`, timers.size === 0 && scrollListeners.size === 0 && observers === 0 && frames.size === 0);
      log.push(`MEASURE: ${count} events; peak DOM rows ${peak}; StrictMode mount ${mountMs.toFixed(2)}ms; 20 controlled scroll checks plus live/filter/cleanup assertions ${(performance.now() - scrollStarted).toFixed(2)}ms (not FPS)`);
    }
  } catch (error) {
    log.push(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    flushSync(() => root?.unmount());
    window.requestAnimationFrame = originalRaf; window.cancelAnimationFrame = originalCancel;
    window.ResizeObserver = OriginalObserver;
    EventTarget.prototype.addEventListener = originalAdd; EventTarget.prototype.removeEventListener = originalRemove;
    results.textContent = log.join('\n'); run.disabled = false; preview.disabled = false;
  }
};
