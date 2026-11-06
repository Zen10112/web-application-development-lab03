import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DRUM_PADS } from '../src/data/drumPads.js';
import { useDrumKeyboard } from '../src/hooks/useDrumKeyboard.js';

const padMap = new Map(DRUM_PADS.map((pad) => [pad.physicalCode, pad]));
const flush = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const assert = (value, message) => { if (!value) throw new Error(message); };
const active = () => document.querySelector('#active')?.textContent ?? '';
const key = (type, code, options = {}, target = document.body) => {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
};

function Probe({ onTrigger, enabled }) {
  const ids = useDrumKeyboard(padMap, onTrigger, enabled);
  return <output id="active">{[...ids].sort().join(',')}</output>;
}

document.querySelector('#run').addEventListener('click', async () => {
  const runButton = document.querySelector('#run');
  runButton.disabled = true;
  const results = document.querySelector('#results');
  results.replaceChildren();
  let passed = 0;
  let failed = 0;
  let root;
  const hits = [];
  const onTrigger = (id) => { hits.push(id); };
  const types = new Set(['keydown', 'keyup', 'blur', 'compositionstart', 'compositionend']);
  const listeners = new Map([...types].map((type) => [type, new Set()]));
  const visibilityListeners = new Set();
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;
  const originalDocAdd = document.addEventListener;
  const originalDocRemove = document.removeEventListener;
  const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  // Count actual live listener identities, including StrictMode setup/cleanup.
  window.addEventListener = function (type, listener, options) {
    if (types.has(type)) listeners.get(type).add(listener);
    return originalAdd.call(this, type, listener, options);
  };
  window.removeEventListener = function (type, listener, options) {
    if (types.has(type)) listeners.get(type).delete(listener);
    return originalRemove.call(this, type, listener, options);
  };
  document.addEventListener = function (type, listener, options) {
    if (type === 'visibilitychange') visibilityListeners.add(listener);
    return originalDocAdd.call(this, type, listener, options);
  };
  document.removeEventListener = function (type, listener, options) {
    if (type === 'visibilitychange') visibilityListeners.delete(listener);
    return originalDocRemove.call(this, type, listener, options);
  };

  function render(callback = onTrigger, enabled = true) {
    root.render(<StrictMode><Probe onTrigger={callback} enabled={enabled} /></StrictMode>);
  }
  async function check(name, verify) {
    try {
      window.dispatchEvent(new Event('blur'));
      hits.length = 0;
      await flush();
      await verify();
      passed++;
      const item = document.createElement('li');
      item.textContent = `PASS: ${name}`;
      results.append(item);
    } catch (error) {
      failed++;
      const item = document.createElement('li');
      item.textContent = `FAIL: ${name}: ${error.message}`;
      results.append(item);
    }
  }

  try {
    root = createRoot(document.querySelector('#fixture'));
    render();
    await flush();
    await check('7 physical codes, translated key values and keyup', async () => {
      for (const pad of DRUM_PADS) {
        const event = key('keydown', pad.physicalCode, { key: 'ư' });
        await flush();
        assert(event.defaultPrevented && active() === pad.id, `Active ${pad.id}`);
        key('keyup', pad.physicalCode);
        await flush();
        assert(active() === '', `Release ${pad.id}`);
      }
      assert(hits.join() === DRUM_PADS.map((pad) => pad.id).join(), 'Physical mapping');
    });
    await check('repeat and duplicate keydowns trigger exactly once per press', async () => {
      key('keydown', 'KeyW');
      for (let i = 0; i < 10; i++) key('keydown', 'KeyW', { repeat: true });
      key('keydown', 'KeyW');
      assert(hits.length === 1, 'Repeated sound');
      key('keyup', 'KeyW');
      key('keydown', 'KeyW');
      assert(hits.length === 2, 'Valid second press lost');
    });
    await check('chords release independently', async () => {
      for (const code of ['KeyW', 'KeyA', 'KeyS']) key('keydown', code);
      await flush();
      assert(active() === 'closed-hat,kick,snare', 'Chord active');
      key('keyup', 'KeyA');
      await flush();
      assert(active() === 'closed-hat,kick' && hits.length === 3, 'Independent release');
    });
    await check('input, textarea, select and nested contenteditable ignore shortcuts', async () => {
      for (const id of ['input', 'textarea', 'select', 'editor-child']) {
        key('keydown', 'KeyW', {}, document.getElementById(id));
        key('keyup', 'KeyW', {}, document.getElementById(id));
      }
      await flush();
      assert(hits.length === 0 && active() === '', 'Editor triggered a hit');
    });
    await check('keyup releases after focus enters an input', async () => {
      key('keydown', 'KeyW');
      key('keyup', 'KeyW', {}, document.querySelector('#input'));
      await flush();
      assert(active() === '' && hits.length === 1, 'Stuck after focus change');
    });
    await check('IME flag and composition lifecycle suppress hits and clear held keys', async () => {
      key('keydown', 'KeyW', { isComposing: true });
      assert(hits.length === 0, 'Composition flag ignored');
      key('keydown', 'KeyA');
      window.dispatchEvent(new CompositionEvent('compositionstart'));
      key('keydown', 'KeyW');
      await flush();
      assert(hits.length === 1 && active() === '', 'Composition start not handled');
      window.dispatchEvent(new CompositionEvent('compositionend'));
      key('keydown', 'KeyW');
      assert(hits.length === 2, 'Composition end not handled');
    });
    await check('modifiers, unrelated and already handled events are ignored', async () => {
      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) key('keydown', 'KeyW', { [modifier]: true });
      key('keydown', 'KeyQ');
      const event = new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true, cancelable: true });
      event.preventDefault();
      document.body.dispatchEvent(event);
      assert(hits.length === 0, 'Shortcut hijacked another action');
    });
    await check('window blur clears held keys; a new press works', async () => {
      key('keydown', 'KeyW');
      window.dispatchEvent(new Event('blur'));
      await flush();
      assert(active() === '', 'Stuck after blur');
      key('keydown', 'KeyW');
      assert(hits.length === 2, 'New press blocked');
    });
    await check('hidden tab clears held keys', async () => {
      key('keydown', 'KeyW');
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();
      assert(active() === '', 'Stuck after hidden');
      delete document.visibilityState;
      if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    });
    await check('rerenders retain exactly one set of listeners', async () => {
      for (let i = 0; i < 3; i++) { render(); await flush(); }
      assert([...listeners.values()].every((set) => set.size === 1), 'Duplicate window listeners');
      assert(visibilityListeners.size === 1, 'Duplicate visibility listener');
      key('keydown', 'KeyW');
      assert(hits.length === 1, 'Duplicate callback');
    });
    await check('callback updates do not retain a stale closure', async () => {
      render((id) => hits.push(`new:${id}`));
      await flush();
      key('keydown', 'KeyW');
      assert(hits.join() === 'new:kick', 'Stale callback');
    });
    await check('disable clears held keys and removes listeners; enable restores controls', async () => {
      render(onTrigger, false);
      await flush();
      assert(active() === '', 'Stuck after disable');
      assert([...listeners.values()].every((set) => set.size === 0) && visibilityListeners.size === 0, 'Listeners remain while disabled');
      key('keydown', 'KeyW');
      assert(hits.length === 0, 'Disabled callback fired');
      render();
      await flush();
      key('keydown', 'KeyW');
      assert(hits.length === 1, 'Enable failed');
    });
    await check('unmount/remount under StrictMode fully cleans and restores controls', async () => {
      root.unmount();
      assert([...listeners.values()].every((set) => set.size === 0) && visibilityListeners.size === 0, 'Leaked listeners');
      key('keydown', 'KeyW');
      assert(hits.length === 0, 'Unmounted callback fired');
      root = createRoot(document.querySelector('#fixture'));
      render();
      await flush();
      key('keydown', 'KeyW');
      await flush();
      assert(hits.length === 1 && active() === 'kick', 'Remount failed');
    });
  } finally {
    root?.unmount();
    window.addEventListener = originalAdd;
    window.removeEventListener = originalRemove;
    document.addEventListener = originalDocAdd;
    document.removeEventListener = originalDocRemove;
    delete document.visibilityState;
    if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    document.querySelector('#summary').textContent = `${passed} passed, ${failed} failed`;
    runButton.disabled = false;
  }
});
