import { DRUM_PADS } from '../data/drumPads.js';

export function DrumPadList() {
  return (
    <section aria-labelledby="drum-pads-heading">
      <h2 id="drum-pads-heading">7 drum pads</h2>
      <ul className="pad-list">
        {DRUM_PADS.map((pad) => (
          <li key={pad.id}>
            <kbd>{pad.physicalCode.slice(3)}</kbd>
            <span>{pad.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
