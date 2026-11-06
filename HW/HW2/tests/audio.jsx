import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PianoKeyboard } from '../src/components/PianoKeyboard.jsx';
import '../src/styles.css';

// Development-only instrumentation of actual Web Audio nodes; never imported by the app.
const NativeContext = window.AudioContext ?? window.webkitAudioContext;
const contexts = [];
const nodes = new Set();
const oscillators = [];
let root = null;
let peakOscillators = 0;

function track(node) {
  nodes.add(node);
  const disconnect = node.disconnect.bind(node);
  const connect = node.connect.bind(node);
  node.connect = (...args) => {
    const result = connect(...args);
    peakOscillators = Math.max(peakOscillators, oscillators.filter((osc) => nodes.has(osc)).length);
    return result;
  };
  node.disconnect = (...args) => { nodes.delete(node); return disconnect(...args); };
  return node;
}

if (NativeContext) {
  window.AudioContext = class extends NativeContext {
    constructor(...args) { super(...args); contexts.push(this); }
    createGain() { return track(super.createGain()); }
    createDynamicsCompressor() { return track(super.createDynamicsCompressor()); }
    createOscillator() {
      const oscillator = track(super.createOscillator());
      oscillators.push(oscillator);
      return oscillator;
    }
  };
}

function inspect() {
  document.querySelector('#diagnostics').textContent =
    `Contexts: ${contexts.length}; closed: ${contexts.filter((ctx) => ctx.state === 'closed').length}; retained nodes: ${nodes.size}; oscillator frequencies: ${oscillators.map((osc) => osc.frequency.value.toFixed(3)).join(', ') || 'none'}`;
}

document.querySelector('#mount').addEventListener('click', () => {
  if (root) return;
  root = createRoot(document.querySelector('#fixture'));
  root.render(<StrictMode><PianoKeyboard /></StrictMode>);
});
document.querySelector('#unmount').addEventListener('click', async () => {
  root?.unmount();
  root = null;
  await new Promise((resolve) => setTimeout(resolve, 100));
  inspect();
});
document.querySelector('#inspect').addEventListener('click', inspect);

document.querySelector('#fifo-test').addEventListener('click', async () => {
  const status = document.querySelector('#diagnostics');
  if (root || contexts.length) { status.textContent = 'Reload this page before running the integration test.'; return; }
  const buttons = [...document.querySelectorAll('main > button')];
  buttons.forEach((button) => { button.disabled = true; });
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  let failure;
  try {
    assert(NativeContext, 'Web Audio is unavailable');
    root = createRoot(document.querySelector('#fixture'));
    root.render(<StrictMode><PianoKeyboard /></StrictMode>);
    await wait(60);
    const keys = [...document.querySelectorAll('.piano-key')];
    const dispatch = (midi, type) => keys[midi - 21].dispatchEvent(new KeyboardEvent(type,
      { code: 'Enter', bubbles: true, cancelable: true }));
    for (let midi = 60; midi < 68; midi++) dispatch(midi, 'keydown');
    for (let i = 0; i < 20 && oscillators.length < 8; i++) await wait(50);
    assert(oscillators.length === 8, 'Eight-note chord did not start');
    dispatch(72, 'keydown'); await wait(40);
    assert(oscillators.length === 9 && !nodes.has(oscillators[0]), 'Ninth note did not steal the first');
    dispatch(74, 'keydown'); await wait(40);
    assert(oscillators.length === 10 && !nodes.has(oscillators[1]), 'Tenth note did not steal the second');
    dispatch(60, 'keyup'); dispatch(61, 'keyup'); await wait(40);
    assert(oscillators.filter((osc) => nodes.has(osc)).length === 8, 'Stolen-note keyup affected a replacement');
    assert(peakOscillators === 8, 'Voice cap exceeded during allocation');
  } catch (error) { failure = error.message; }
  finally {
    root?.unmount(); root = null;
    await wait(100);
    if (nodes.size !== 0 || contexts.some((ctx) => ctx.state !== 'closed')) failure ??= 'Unmount leaked audio resources';
    status.textContent = `${failure ? `FAIL: ${failure}` : 'PASS: FIFO chord, ninth/tenth note, stale keyup and React unmount'}; peak oscillators: ${peakOscillators}; retained nodes: ${nodes.size}; closed contexts: ${contexts.filter((ctx) => ctx.state === 'closed').length}`;
    buttons.forEach((button) => { button.disabled = false; });
  }
});
