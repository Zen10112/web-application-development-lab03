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

function track(node) {
  nodes.add(node);
  const disconnect = node.disconnect.bind(node);
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
