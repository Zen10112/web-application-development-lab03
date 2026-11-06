import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DrumPad } from '../src/components/DrumPad.jsx';
import { DRUM_PADS } from '../src/data/drumPads.js';
import '../src/styles.css';

// Real component, native browser key/click events, silent trigger counter.
function NativeButtonCheck() {
  const [active, setActive] = useState(false);
  const [hits, setHits] = useState(0);
  return (
    <section className="studio">
      <h1>Native keyboard check</h1>
      <p id="instructions">Tab to Kick. Each Enter or Space press must add exactly one hit. Holding a key must not repeat hits.</p>
      <DrumPad pad={DRUM_PADS[0]} number={1} isActive={active}
        onPress={() => setActive(true)} onRelease={() => setActive(false)}
        onTrigger={async () => setHits((previous) => previous + 1)}
        instructionsId="instructions" shortcutsEnabled={false} />
      <output aria-live="polite">Hits: {hits}</output>
    </section>
  );
}

createRoot(document.querySelector('#fixture')).render(<StrictMode><NativeButtonCheck /></StrictMode>);
