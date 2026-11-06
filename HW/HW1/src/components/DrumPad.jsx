import { useEffect, useRef } from 'react';

/**
 * @param {{ pad: import('../data/drumPads.js').DrumPad, number: number,
 *   isActive: boolean, onPress: (id: string) => void,
 *   onRelease: (id: string) => void, onTrigger: (id: string) => Promise<void>,
 *   instructionsId?: string, shortcutsEnabled?: boolean, isFlashing?: boolean }} props
 */
export function DrumPad({ pad, number, isActive, onPress, onRelease, onTrigger,
  instructionsId, shortcutsEnabled = true, isFlashing = false }) {
  const heldInputs = useRef(new Set());
  const releaseRef = useRef(onRelease);
  useEffect(() => { releaseRef.current = onRelease; }, [onRelease]);
  const press = (input) => {
    heldInputs.current.add(input);
    onPress(pad.id);
  };
  const release = (input) => {
    heldInputs.current.delete(input);
    if (heldInputs.current.size === 0) onRelease(pad.id);
  };
  const reset = () => {
    heldInputs.current.clear();
    onRelease(pad.id);
  };
  useEffect(() => {
    const clear = () => {
      if (heldInputs.current.size === 0) return;
      heldInputs.current.clear();
      releaseRef.current(pad.id);
    };
    const onVisibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibility);
      heldInputs.current.clear();
    };
  }, [pad.id]);

  return (
    <button
      type="button"
      className={`drum-pad${isActive ? ' is-active' : ''}${isFlashing ? ' has-hit' : ''}`}
      aria-label={`${String(number).padStart(2, '0')} ${pad.physicalCode.slice(3)} ${pad.label} ${isActive ? 'Đang nhấn' : isFlashing ? 'Đã đánh' : 'Sẵn sàng'}, phím tắt ${pad.physicalCode.slice(3)}${shortcutsEnabled ? '' : ' (đã tắt)'}`}
      aria-pressed={isActive}
      aria-keyshortcuts={shortcutsEnabled ? pad.physicalCode.slice(3) : undefined}
      aria-describedby={instructionsId}
      onClick={() => { void onTrigger(pad.id); }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        press(`pointer:${event.pointerId}`);
      }}
      onPointerUp={(event) => release(`pointer:${event.pointerId}`)}
      onPointerCancel={(event) => release(`pointer:${event.pointerId}`)}
      onLostPointerCapture={(event) => release(`pointer:${event.pointerId}`)}
      onKeyDown={(event) => {
        if (event.repeat) {
          if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') event.preventDefault();
          return;
        }
        if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') press(event.code);
      }}
      onKeyUp={(event) => {
        if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') release(event.code);
      }}
      onBlur={reset}
    >
      <span className="pad-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>{' '}
      <kbd className="pad-key" aria-hidden="true">{pad.physicalCode.slice(3)}</kbd>{' '}
      <span className="pad-name">{pad.label}</span>{' '}
      <span className="pad-status" aria-hidden="true">{isActive ? 'Đang nhấn' : isFlashing ? 'Đã đánh' : 'Sẵn sàng'}</span>
    </button>
  );
}
