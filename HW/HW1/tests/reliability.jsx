import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/App.jsx';
import '../src/styles.css';

const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
const assert = (ok, text) => { if (!ok) throw new Error(text); };
const key = (button, type, code) => button.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
document.querySelector('#run').addEventListener('click', async () => {
  const run = document.querySelector('#run');
  run.disabled = true;
  document.querySelector('#results').replaceChildren();
  let passed = 0, failed = 0;
  const root = createRoot(document.querySelector('#fixture'));
  root.render(<StrictMode><App /></StrictMode>);
  await wait();
  const pad = document.querySelector('.drum-pad');
  const nextPad = document.querySelectorAll('.drum-pad')[1];
  // Synthetic pointer events are not physical active pointers. Stub capture only
  // in this fixture; the real component's state/event handlers are unchanged.
  const originalCapture = pad.setPointerCapture;
  pad.setPointerCapture = () => {};
  const pointer = (type, pointerId) => pad.dispatchEvent(new PointerEvent(type, {
    bubbles: true, button: 0, pointerId,
  }));
  async function check(name, test) {
    const li = document.createElement('li');
    try { await test(); li.textContent = `PASS: ${name}`; passed++; }
    catch (error) { li.textContent = `FAIL: ${name}: ${error.message}`; failed++; }
    document.querySelector('#results').append(li);
    key(pad, 'keyup', 'Enter'); key(pad, 'keyup', 'Space');
    window.dispatchEvent(new Event('blur'));
    await wait();
  }
  try {
    await check('native Enter clears on window blur', async () => {
      key(pad, 'keydown', 'Enter'); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'not pressed');
      window.dispatchEvent(new Event('blur')); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'aria-pressed stuck true after window blur');
    });
    await check('native Space remains active until its own release', async () => {
      key(pad, 'keydown', 'Space'); key(pad, 'keydown', 'Enter'); await wait();
      key(pad, 'keyup', 'Enter'); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'releasing Enter incorrectly clears held Space');
      key(pad, 'keyup', 'Space'); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'Space did not release');
    });
    await check('element blur preserves a held pointer until pointerup', async () => {
      pad.focus(); pointer('pointerdown', 7); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'pointer did not activate');
      nextPad.focus(); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'blur cleared a still-held pointer');
      pointer('pointerup', 7); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'pointerup did not release');
    });
    await check('blur releases native keys while preserving a pointer until cancel', async () => {
      pad.focus(); pointer('pointerdown', 8);
      key(pad, 'keydown', 'Space'); key(pad, 'keydown', 'Enter'); key(pad, 'keydown', 'NumpadEnter');
      await wait(); nextPad.focus(); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'blur cleared the pointer along with native keys');
      pointer('pointercancel', 8); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'blur left native keys stuck after pointercancel');
    });
    await check('lost capture releases a pointer after focus changes', async () => {
      pad.focus(); pointer('pointerdown', 9); await wait();
      nextPad.focus(); await wait();
      assert(pad.getAttribute('aria-pressed') === 'true', 'focus change released pointer prematurely');
      pointer('lostpointercapture', 9); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'lost capture did not release');
    });
    await check('keyboard-only element blur releases all native activation keys', async () => {
      pad.focus();
      key(pad, 'keydown', 'Space'); key(pad, 'keydown', 'Enter'); key(pad, 'keydown', 'NumpadEnter');
      await wait(); nextPad.focus(); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'native keys remained active after element blur');
    });
    await check('window blur still clears held pointer inputs', async () => {
      pad.focus(); pointer('pointerdown', 10); await wait();
      window.dispatchEvent(new Event('blur')); await wait();
      assert(pad.getAttribute('aria-pressed') === 'false', 'window blur left pointer stuck');
    });
    await check('pad boundary contrast against console is at least 3:1', async () => {
      const rgb = getComputedStyle(pad).borderTopColor.match(/\d+/g).slice(0, 3).map(Number);
      const luminance = (values) => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      const ratio = (luminance(rgb) + .05) / (luminance([37, 38, 43]) + .05);
      assert(ratio >= 3, `boundary contrast ${ratio.toFixed(2)}:1`);
    });
  } finally {
    pad.setPointerCapture = originalCapture;
    root.unmount();
    document.querySelector('#summary').textContent = `${passed} passed, ${failed} failed`;
    run.disabled = false;
  }
});
