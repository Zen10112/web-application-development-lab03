import { PianoKeyboard } from './components/PianoKeyboard.jsx';

export function App() {
  return (
    <main className="studio">
      <header className="studio-header">
        <span className="studio-brand"><span className="brand-mark" aria-hidden="true">III</span> STUDIO / 03</span>
        <span className="series-label">INSTRUMENT SERIES / 02</span>
      </header>
      <header className="page-intro">
        <p className="eyebrow">88 NOTES. ENDLESS POSSIBILITIES.</p>
        <h1>Your space.<br /><span>Your melody.</span></h1>
        <p>A full-range digital piano, from the warmth of A0 to the brilliance of C8.</p>
      </header>
      <PianoKeyboard />
      <footer className="studio-footer"><span>HW 02 / 88-KEY PIANO</span><span>React 19 · Lab 03</span></footer>
    </main>
  );
}
