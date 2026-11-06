import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePianoKeys, PIANO_KEYS } from './pianoKeys.js';

test('generates exactly 88 keys with 52 white and 36 black keys', () => {
  assert.equal(PIANO_KEYS.length, 88);
  assert.equal(PIANO_KEYS.filter((key) => !key.isBlackKey).length, 52);
  assert.equal(PIANO_KEYS.filter((key) => key.isBlackKey).length, 36);
});

test('MIDI values cover 21–108 without gaps or duplicate IDs', () => {
  assert.equal(PIANO_KEYS[0].midi, 21);
  assert.equal(PIANO_KEYS.at(-1).midi, 108);
  assert.equal(new Set(PIANO_KEYS.map((key) => key.id)).size, 88);
  for (let i = 0; i < PIANO_KEYS.length; i++) {
    assert.equal(PIANO_KEYS[i].midi, i + 21);
    assert.equal(PIANO_KEYS[i].id, `piano-${i + 21}`);
  }
});

test('note names and octave boundaries follow scientific pitch notation', () => {
  const byMidi = new Map(PIANO_KEYS.map((key) => [key.midi, key]));
  const anchors = [
    [21, 'A0', 0], [22, 'A#0', 0], [23, 'B0', 0], [24, 'C1', 1],
    [59, 'B3', 3], [60, 'C4', 4], [61, 'C#4', 4], [69, 'A4', 4],
    [107, 'B7', 7], [108, 'C8', 8],
  ];
  for (const [midi, noteName, octave] of anchors) {
    assert.equal(byMidi.get(midi).noteName, noteName);
    assert.equal(byMidi.get(midi).octave, octave);
  }
  assert.equal(new Set(PIANO_KEYS.map((key) => key.noteName)).size, 88);
});

test('each complete octave has the correct chromatic order and black-key pattern', () => {
  const expectedNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const expectedBlack = [false, true, false, true, false, false, true, false, true, false, true, false];
  for (let octave = 1; octave <= 7; octave++) {
    const keys = PIANO_KEYS.filter((key) => key.octave === octave);
    assert.deepEqual(keys.map((key) => key.noteName), expectedNames.map((name) => `${name}${octave}`));
    assert.deepEqual(keys.map((key) => key.isBlackKey), expectedBlack);
  }
  assert.deepEqual(PIANO_KEYS.slice(0, 3).map((key) => key.isBlackKey), [false, true, false]);
  assert.equal(PIANO_KEYS.at(-1).isBlackKey, false);
});

test('frequencies match standard tuning reference points without rounding', () => {
  const references = [[21, 27.5], [60, 261.6255653005986], [69, 440], [81, 880], [108, 4186.009044809578]];
  for (const [midi, expected] of references) {
    const key = PIANO_KEYS.find((item) => item.midi === midi);
    assert.ok(Math.abs(key.frequency - expected) < 1e-9, `${key.noteName} frequency`);
  }
});

test('all frequencies are finite, positive, increasing and double across an octave', () => {
  for (let i = 0; i < PIANO_KEYS.length; i++) {
    const key = PIANO_KEYS[i];
    assert.ok(Number.isFinite(key.frequency) && key.frequency > 0);
    if (i > 0) assert.ok(key.frequency > PIANO_KEYS[i - 1].frequency);
    if (i >= 12) assert.ok(Math.abs(key.frequency / PIANO_KEYS[i - 12].frequency - 2) < 1e-12);
  }
});

test('generated data is deterministic, reusable and immutable', () => {
  const generated = generatePianoKeys();
  assert.deepEqual(generated, PIANO_KEYS);
  assert.notEqual(generated, PIANO_KEYS);
  assert.ok(Object.isFrozen(generated) && generated.every(Object.isFrozen));
  assert.throws(() => { generated[0].midi = 0; }, TypeError);
  assert.throws(() => { generated.pop(); }, TypeError);
});
