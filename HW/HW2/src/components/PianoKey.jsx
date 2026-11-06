/** Stateless key: stable data and callbacks allow React.memo to be added later. */
export function PianoKey({ pianoKey, isPressed, onNoteOn, onNoteOff }) {
  const { midi, noteName, octave, isBlackKey } = pianoKey;
  const isActivationKey = (code) => ['Enter', 'NumpadEnter', 'Space'].includes(code);

  return (
    <button type="button"
      className={`piano-key ${isBlackKey ? 'piano-key--black' : 'piano-key--white'}${isPressed ? ' is-pressed' : ''}`}
      aria-label={`${noteName}, octave ${octave}, MIDI ${midi}`}
      aria-pressed={isPressed}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onNoteOn(midi, `pointer:${event.pointerId}`);
      }}
      onPointerUp={(event) => onNoteOff(midi, `pointer:${event.pointerId}`)}
      onPointerCancel={(event) => onNoteOff(midi, `pointer:${event.pointerId}`)}
      onLostPointerCapture={(event) => onNoteOff(midi, `pointer:${event.pointerId}`)}
      onKeyDown={(event) => {
        if (!isActivationKey(event.code)) return;
        if (event.repeat) { event.preventDefault(); return; }
        onNoteOn(midi, event.code);
      }}
      onKeyUp={(event) => { if (isActivationKey(event.code)) onNoteOff(midi, event.code); }}
      onBlur={() => onNoteOff(midi)}
    >
      <span className="key-note">{noteName}</span>
    </button>
  );
}
