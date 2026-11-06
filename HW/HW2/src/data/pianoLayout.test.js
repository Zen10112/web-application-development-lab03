import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PIANO_LAYOUT } from './pianoLayout.js';
import { PIANO_KEYS } from './pianoKeys.js';

test('layout preserves all 88 keys in MIDI order and assigns 52 white slots', () => {
  assert.deepEqual(PIANO_LAYOUT.keys.map((key) => key.midi), PIANO_KEYS.map((key) => key.midi));
  assert.equal(PIANO_LAYOUT.whiteKeyCount, 52);
  assert.deepEqual(PIANO_LAYOUT.keys.filter((key) => !key.isBlackKey).map((key) => key.whiteIndex),
    Array.from({ length: 52 }, (_, index) => index));
});

test('every black key is centered between its neighboring white keys', () => {
  const keys = PIANO_LAYOUT.keys;
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i].isBlackKey) continue;
    assert.equal(keys[i - 1].isBlackKey, false);
    assert.equal(keys[i + 1].isBlackKey, false);
    assert.equal(keys[i].whiteIndex, keys[i - 1].whiteIndex + 1);
    assert.equal(keys[i].whiteIndex, keys[i + 1].whiteIndex);
  }
  assert.equal(keys[0].whiteIndex, 0);
  assert.equal(keys.at(-1).whiteIndex, 51);
});
