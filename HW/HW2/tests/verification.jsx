import { Profiler, StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PianoKey } from './.generated/PianoKey.jsx';
import { PianoKeyboard } from './.generated/PianoKeyboard.jsx';
import { renderCounts } from './renderMetrics.js';
import { IS_BASELINE } from './.generated/buildInfo.js';
import { PIANO_LAYOUT } from '../src/data/pianoLayout.js';
import '../src/styles.css';

const calls = [], durations = new Map();
const wait = () => new Promise((resolve) => setTimeout(resolve, 50));
function measure(id, phase, actualDuration) {
  if (phase !== 'mount') durations.set(Number(id), (durations.get(Number(id)) ?? 0) + actualDuration);
}
function Probe() {
  const [pressed, setPressed] = useState(() => new Set());
  const on = useCallback((midi, source) => { calls.push(['on', midi, source]); setPressed((prev) => new Set(prev).add(midi)); }, []);
  const off = useCallback((midi, source) => { calls.push(['off', midi, source]); setPressed((prev) => { const next = new Set(prev); next.delete(midi); return next; }); }, []);
  return <section className="keyboard-scroll"><ol className="keyboard-keys" style={{ '--white-count': 52 }}>
    {PIANO_LAYOUT.keys.map((key) => <li key={key.id} className={key.isBlackKey ? 'key-slot key-slot--black' : 'key-slot key-slot--white'} style={{ '--white-index': key.whiteIndex }}>
      <Profiler id={String(key.midi)} onRender={measure}><PianoKey pianoKey={key} isPressed={pressed.has(key.midi)} onNoteOn={on} onNoteOff={off} /></Profiler>
    </li>)}
  </ol></section>;
}
document.querySelector('#run').addEventListener('click', async () => {
  const run = document.querySelector('#run'); run.disabled = true;
  document.querySelector('#results').replaceChildren();
  let passed = 0, failed = 0;
  for (const [name, verify] of [
    ['one key update isolates renders', async (keys) => {
      durations.clear();
      renderCounts.clear();
      for (let i = 0; i < 20; i++) {
        keys[39].dispatchEvent(new KeyboardEvent(i % 2 ? 'keyup' : 'keydown', { code: 'Enter', bubbles: true, cancelable: true }));
        await wait();
      }
      const updated = [...renderCounts.keys()];
      if (updated.length !== 1 || updated[0] !== 60) throw new Error(`Rendered key bodies: ${updated.length}; target calls: ${renderCounts.get(60) ?? 0}`);
      const metric = document.createElement('p');
      metric.textContent = `Render-body measurement: ${updated.length}/88 keys; MIDI ${updated[0]}; ${renderCounts.get(60)} calls across 20 transitions in StrictMode. Profiler boundaries: ${durations.size} (includes bailout overhead).`;
      document.querySelector('#results').before(metric);
    }],
    ['semantic click activates and releases exactly one note', async (keys) => {
      keys[39].click(); await new Promise((resolve) => setTimeout(resolve, 180));
      if (calls.filter(([type]) => type === 'on').length !== 1 || calls.filter(([type]) => type === 'off').length !== 1) throw new Error(`semantic click: ${calls.length} callbacks`);
    }],
    ['focus change preserves a held pointer source', async (keys) => {
      const button = keys[39]; button.setPointerCapture = () => {};
      button.focus();
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, bubbles: true }));
      keys[41].focus(); await wait();
      if (calls.some(([type, , source]) => type === 'off' && (source === undefined || source === 'pointer:1'))) throw new Error('blur released the held pointer');
    }],
    ['production keyboard isolates C4 during recording and audio updates', async (keys) => {
      document.querySelector('.sequencer button').click(); await wait(); renderCounts.clear();
      for (let i = 0; i < 20; i++) {
        keys[39].dispatchEvent(new KeyboardEvent(i % 2 ? 'keyup' : 'keydown', { code: 'Enter', bubbles: true, cancelable: true }));
        await wait();
      }
      const updated = [...renderCounts.keys()];
      if (updated.length !== 1 || updated[0] !== 60) throw new Error(`Production rendered key bodies: ${updated.length}`);
      const evidence = document.createElement('p');
      evidence.textContent = `Production recording/audio render bodies: ${updated.length}/88 keys; MIDI 60; ${renderCounts.get(60)} calls in StrictMode.`;
      document.querySelector('#results').before(evidence);
    }],
  ].filter(([name]) => !IS_BASELINE || !name.startsWith('production'))) {
    const root = createRoot(document.querySelector('#fixture'));
    root.render(<StrictMode>{name.startsWith('production') ? <PianoKeyboard /> : <Probe />}</StrictMode>); await wait(); calls.length = 0;
    const li = document.createElement('li');
    try { await verify([...document.querySelectorAll('.piano-key')]); passed++; li.textContent = `PASS: ${name}`; }
    catch (error) { failed++; li.textContent = `FAIL: ${name}: ${error.message}`; }
    root.unmount(); document.querySelector('#results').append(li);
  }
  document.querySelector('#summary').textContent = `${passed} passed, ${failed} failed`;
  run.disabled = false;
});
