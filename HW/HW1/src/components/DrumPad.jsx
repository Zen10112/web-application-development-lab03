/**
 * @param {{ pad: import('../data/drumPads.js').DrumPad, number: number,
 *   isActive: boolean, onPress: (id: string) => void,
 *   onRelease: (id: string) => void, onTrigger: (id: string) => Promise<void>,
 *   instructionsId?: string, shortcutsEnabled?: boolean, isFlashing?: boolean }} props
 */
export function DrumPad({ pad, number, isActive, onPress, onRelease, onTrigger,
  instructionsId, shortcutsEnabled = true, isFlashing = false }) {
  const release = () => onRelease(pad.id);

  return (
    <button
      type="button"
      className={`drum-pad${isActive ? ' is-active' : ''}${isFlashing ? ' has-hit' : ''}`}
      aria-label={`${pad.label}, phím tắt ${pad.physicalCode.slice(3)}${shortcutsEnabled ? '' : ' (đã tắt)'}`}
      aria-pressed={isActive}
      aria-keyshortcuts={shortcutsEnabled ? pad.physicalCode.slice(3) : undefined}
      aria-describedby={instructionsId}
      onClick={() => { void onTrigger(pad.id); }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(pad.id);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        if (event.repeat) {
          if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') event.preventDefault();
          return;
        }
        if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') onPress(pad.id);
      }}
      onKeyUp={(event) => {
        if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') release();
      }}
      onBlur={release}
    >
      <span className="pad-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <kbd className="pad-key" aria-hidden="true">{pad.physicalCode.slice(3)}</kbd>
      <span className="pad-name">{pad.label}</span>
      <span className="pad-status" aria-hidden="true">{isActive ? 'Đang nhấn' : isFlashing ? 'Đã đánh' : 'Sẵn sàng'}</span>
    </button>
  );
}
