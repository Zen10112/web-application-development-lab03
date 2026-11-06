import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PIANO_KEYS } from './data/pianoKeys.js';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount container');

const blackKeyCount = PIANO_KEYS.filter((key) => key.isBlackKey).length;

createRoot(root).render(
  <StrictMode>
    <main>
      <h1>88-Key Piano</h1>
      <p>Piano key data is ready. The playable keyboard will be added later.</p>
      <dl>
        <dt>Range</dt><dd>{PIANO_KEYS[0].noteName}–{PIANO_KEYS.at(-1).noteName}</dd>
        <dt>Total keys</dt><dd>{PIANO_KEYS.length}</dd>
        <dt>White keys</dt><dd>{PIANO_KEYS.length - blackKeyCount}</dd>
        <dt>Black keys</dt><dd>{blackKeyCount}</dd>
      </dl>
    </main>
  </StrictMode>,
);
