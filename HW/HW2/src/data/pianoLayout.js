import { PIANO_KEYS } from './pianoKeys.js';

/** White keys occupy slots; black keys are centered on the following boundary. */
export function createKeyboardLayout(keys = PIANO_KEYS) {
  let whiteKeyCount = 0;
  const positionedKeys = keys.map((key) => {
    const whiteIndex = whiteKeyCount;
    if (!key.isBlackKey) whiteKeyCount++;
    return Object.freeze({ ...key, whiteIndex });
  });
  return Object.freeze({ keys: Object.freeze(positionedKeys), whiteKeyCount });
}

export const PIANO_LAYOUT = createKeyboardLayout();
