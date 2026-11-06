import { memo, useEffect, useRef } from 'react';

export const PianoKey = memo(function PianoKey({ pianoKey, isPressed, onNoteOn, onNoteOff }) {
  const { midi, noteName, octave, isBlackKey } = pianoKey;
  const clickRelease = useRef(null);
  useEffect(() => () => { clearTimeout(clickRelease.current); }, []);
  const isActivationKey = (code) => ['Enter', 'NumpadEnter', 'Space'].includes(code);

  return (
    <button type="button"
      className={`piano-key ${isBlackKey ? 'piano-key--black' : 'piano-key--white'}${isPressed ? ' is-pressed' : ''}`}
      aria-label={`${noteName}, octave ${octave}, MIDI ${midi}`}
      aria-pressed={isPressed}
      onClick={(event) => {
        // Pointer/native key paths already have noteOn/noteOff. Assistive activation
        // can send a click without either, so give it one complete short note.
        if (event.detail === 0) {
          if (clickRelease.current !== null) {
            clearTimeout(clickRelease.current);
            onNoteOff(midi, 'semantic');
          }
          onNoteOn(midi, 'semantic');
          clickRelease.current = setTimeout(() => {
            clickRelease.current = null;
            onNoteOff(midi, 'semantic');
          }, 120);
        }
      }}
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
        event.preventDefault();
        if (event.repeat) return;
        onNoteOn(midi, event.code);
      }}
      onKeyUp={(event) => {
        if (isActivationKey(event.code)) { event.preventDefault(); onNoteOff(midi, event.code); }
      }}
      onBlur={() => {
        // Moving focus must release keyboard input, not a still-held touch/pointer.
        for (const code of ['Enter', 'NumpadEnter', 'Space']) onNoteOff(midi, code);
      }}
    >
      <span className="key-note">{noteName}</span>
    </button>
  );
});
