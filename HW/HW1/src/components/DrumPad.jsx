/**
 * @param {{ pad: import('../data/drumPads.js').DrumPad, number: number,
 *   isActive: boolean, onPress: (id: string) => void,
 *   onRelease: (id: string) => void }} props
 */
export function DrumPad({ pad, number, isActive, onPress, onRelease }) {
  const release = () => onRelease(pad.id);

  return (
    <button
      type="button"
      className={`drum-pad${isActive ? ' is-active' : ''}`}
      aria-label={`${pad.label}, phím ${pad.physicalCode.slice(3)}`}
      aria-pressed={isActive}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(pad.id);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        if (event.repeat) return;
        if (event.key === ' ' || event.key === 'Enter') onPress(pad.id);
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') release();
      }}
      onBlur={release}
    >
      <span className="pad-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <kbd className="pad-key" aria-hidden="true">{pad.physicalCode.slice(3)}</kbd>
      <span className="pad-name">{pad.label}</span>
      <span className="pad-indicator" aria-hidden="true" />
    </button>
  );
}
