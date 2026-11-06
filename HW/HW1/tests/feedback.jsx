import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useHitFeedback } from '../src/hooks/useHitFeedback.js';
import { useDrumAudio } from '../src/hooks/useDrumAudio.js';
import { VisualHitLog } from '../src/components/VisualHitLog.jsx';
import { AudioLevelMeter } from '../src/components/AudioLevelMeter.jsx';
import { DRUM_PADS } from '../src/data/drumPads.js';
import '../src/styles.css';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let controls;
function Probe() {
  const feedback = useHitFeedback();
  const audio = useDrumAudio();
  useEffect(() => { controls = { ...feedback, ...audio }; });
  return <><AudioLevelMeter readLevel={audio.readLevel} />
    <VisualHitLog hits={feedback.hits} announcement={feedback.announcement} />
    <p>Flash count: {feedback.flashingIds.size}</p></>;
}

document.querySelector('#run').addEventListener('click', async () => {
  const button = document.querySelector('#run');
  button.disabled = true;
  document.querySelector('#results').replaceChildren();
  let root;
  let passed = 0;
  let failed = 0;
  const frames = new Set();
  const timers = new Set();
  let maxFrames = 0;
  let maxTimers = 0;
  const raf = window.requestAnimationFrame;
  const caf = window.cancelAnimationFrame;
  const timeout = window.setTimeout;
  const clear = window.clearTimeout;
  const nativeContext = window.AudioContext;
  const nativeWebkitContext = window.webkitAudioContext;
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  let observer;
  let peak = 0;
  let announcements = 0;

  window.requestAnimationFrame = (callback) => {
    const id = raf.call(window, (now) => { frames.delete(id); callback(now); });
    frames.add(id);
    maxFrames = Math.max(maxFrames, frames.size);
    return id;
  };
  window.cancelAnimationFrame = (id) => { frames.delete(id); caf.call(window, id); };
  window.setTimeout = (callback, delay, ...args) => {
    const tracked = delay === 180 || delay === 2000;
    const id = timeout.call(window, () => { timers.delete(id); callback(...args); }, delay);
    if (tracked) timers.add(id);
    maxTimers = Math.max(maxTimers, timers.size);
    return id;
  };
  window.clearTimeout = (id) => { timers.delete(id); clear.call(window, id); };

  function mount() {
    root = createRoot(document.querySelector('#fixture'));
    root.render(<StrictMode><Probe /></StrictMode>);
  }
  async function check(name, verify) {
    const item = document.createElement('li');
    try { await verify(); passed++; item.textContent = `PASS: ${name}`; }
    catch (error) { failed++; item.textContent = `FAIL: ${name}: ${error.message}`; }
    document.querySelector('#results').append(item);
  }

  try {
    mount();
    await wait(60);
    observer = new MutationObserver((mutations) => {
      peak = Math.max(peak, Number(document.querySelector('meter')?.value ?? 0));
      if (mutations.some((mutation) => mutation.target.closest?.('.hit-summary') || mutation.target.parentElement?.closest('.hit-summary'))) announcements++;
    });
    observer.observe(document.querySelector('#fixture'), { subtree: true, childList: true, characterData: true, attributes: true });

    await check('50 silent hits keep only 12 ordered entries and bounded timers', async () => {
      for (let i = 0; i < 50; i++) controls.recordHit(DRUM_PADS[i % 7]);
      await wait(60);
      const rows = [...document.querySelectorAll('.hit-log li')];
      assert(rows.length === 12, 'History is not bounded');
      assert(rows[0].textContent.includes('#50') && rows[11].textContent.includes('#39'), 'Wrong sequence');
      assert(controls.flashingIds.size === 7, 'Missing visual flashes');
      assert(maxTimers <= 8, 'More than seven flash timers and one announcement timer');
      assert(announcements === 0, 'Announcements are not batched');
      assert(Number(document.querySelector('meter').value) === 0, 'Silent meter not zero');
    });
    await check('one polite summary for the burst; transient effects clear', async () => {
      await wait(2100);
      assert(document.querySelector('output').textContent.includes('50 lượt đánh mới'), 'Wrong summary');
      assert(announcements === 1, 'Too many live summaries');
      assert(controls.flashingIds.size === 0 && timers.size === 0, 'Timers or flashes retained');
    });
    await check('real AudioContext signal drives the RMS meter then returns to zero', async () => {
      controls.recordHit(DRUM_PADS[0]);
      await controls.triggerPad('kick');
      for (let i = 0; i < 20 && peak === 0; i++) await wait(50);
      assert(peak > 0, 'Meter never reacted to audio');
      await wait(1000);
      assert(Number(document.querySelector('meter').value) === 0, 'Meter did not return to silence');
    });
    await check('rerenders and StrictMode never create duplicate animation loops', async () => {
      for (let i = 0; i < 15; i++) controls.recordHit(DRUM_PADS[0]);
      await wait(60);
      assert(maxFrames === 1 && frames.size === 1, 'Duplicate animation frames');
    });
    await check('hidden tab pauses the loop; returning resumes exactly one loop', async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      assert(frames.size === 0 && Number(document.querySelector('meter').value) === 0, 'Hidden loop not paused');
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
      await wait(60);
      assert(frames.size === 1 && maxFrames === 1, 'Duplicate loop on tab wake');
      delete document.hidden;
      if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    });
    await check('unmount cancels all frames/timers; remount creates exactly one loop', async () => {
      observer.disconnect();
      root.unmount();
      assert(frames.size === 0 && timers.size === 0, 'Resources leaked on unmount');
      mount();
      await wait(60);
      assert(frames.size === 1 && maxFrames === 1, 'Duplicate loop after remount');
    });
    await check('visual history works when Web Audio is unavailable', async () => {
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      controls.recordHit(DRUM_PADS[1]);
      await controls.triggerPad('snare');
      await wait(60);
      assert(document.querySelector('.hit-log').textContent.includes('Snare'), 'Silent feedback missing');
      assert(controls.audioError && Number(document.querySelector('meter').value) === 0, 'Unsupported audio not handled');
    });
  } finally {
    observer?.disconnect();
    root?.unmount();
    window.requestAnimationFrame = raf;
    window.cancelAnimationFrame = caf;
    window.setTimeout = timeout;
    window.clearTimeout = clear;
    window.AudioContext = nativeContext;
    window.webkitAudioContext = nativeWebkitContext;
    delete document.hidden;
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    document.querySelector('#summary').textContent = `${passed} passed, ${failed} failed; peak ${peak}%; max frames ${maxFrames}; max timers ${maxTimers}`;
    button.disabled = false;
  }
});
