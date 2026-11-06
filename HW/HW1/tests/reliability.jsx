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
  async function check(name, test) {
    const li = document.createElement('li');
    try { await test(); li.textContent = `PASS: ${name}`; passed++; }
    catch (error) { li.textContent = `FAIL: ${name}: ${error.message}`; failed++; }
    document.querySelector('#results').append(li);
    key(pad, 'keyup', 'Enter'); key(pad, 'keyup', 'Space');
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
    await check('pad boundary contrast against console is at least 3:1', async () => {
      const rgb = getComputedStyle(pad).borderTopColor.match(/\d+/g).slice(0, 3).map(Number);
      const luminance = (values) => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      const ratio = (luminance(rgb) + .05) / (luminance([37, 38, 43]) + .05);
      assert(ratio >= 3, `boundary contrast ${ratio.toFixed(2)}:1`);
    });
  } finally {
    root.unmount();
    document.querySelector('#summary').textContent = `${passed} passed, ${failed} failed`;
    run.disabled = false;
  }
});
