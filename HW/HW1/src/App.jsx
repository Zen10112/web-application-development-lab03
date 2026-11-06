import { DrumKit } from './components/DrumKit.jsx';

export function App() {
  return (
    <main className="studio">
      <header className="studio-header">
        <a className="studio-brand" href="#drum-kit" aria-label="Studio 03, đến bộ trống">
          <span className="brand-mark" aria-hidden="true">III</span>
          STUDIO / 03
        </a>
        <span className="edition">PRODUCTION SERIES</span>
      </header>
      <DrumKit />
      <footer className="studio-footer">
        <span>HW 01 <span aria-hidden="true">/</span> PRODUCTION STUDIO DRUM KIT</span>
        <span>React 19 · Lab 03</span>
      </footer>
    </main>
  );
}
