import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPianoSequencer, MAX_RECORDING_NOTES, waitForPlayback } from './pianoSequencer.js';

function fixture() {
  let clock = 0, id = 0;
  const events = [], states = [];
  const seq = createPianoSequencer({ now: () => clock,
    wait: async (ms, signal) => { signal.throwIfAborted(); clock += ms; },
    noteOn: async (midi) => { const token = `test-${++id}`; events.push(['on', midi, clock, token]); return token; },
    noteOff: (midi, token) => events.push(['off', midi, clock, token]),
    stopAll: (immediate) => events.push(['stop', immediate]), onChange: (state) => states.push(state) });
  return { seq, events, states, time: (ms) => { clock = ms; } };
}

test('recording preserves FIFO onset deltas, durations and source frequencies', () => {
  const { seq, time } = fixture();
  seq.startRecording(); seq.recordNoteOn(69); seq.recordNoteOn(69);
  time(100); seq.recordNoteOn(72);
  time(200); seq.recordNoteOff(69);
  time(300); seq.stopRecording();
  const entries = seq.getRecording();
  assert.deepEqual(entries.map(({ midi, deltaMs, durationMs }) => [midi, deltaMs, durationMs]), [[69, 0, 200], [72, 100, 200]]);
  assert.equal(entries[0].freqHz, 440);
  assert.ok(Object.isFrozen(entries) && entries.every(Object.isFrozen));
  seq.dispose();
});

for (const speed of [0.5, 1, 2]) test(`playback at ${speed}x preserves overlaps and scales onset/release timing`, async () => {
  const { seq, time, events } = fixture();
  seq.startRecording(); seq.recordNoteOn(60);
  time(100); seq.recordNoteOn(64);
  time(200); seq.recordNoteOff(60);
  time(300); seq.stopRecording(); time(0);
  assert.equal(await seq.play(speed), true);
  assert.deepEqual(events.map((event) => event.slice(0, 3)), [['on', 60, 0], ['on', 64, 100 / speed], ['off', 60, 200 / speed], ['off', 64, 300 / speed]]);
  assert.equal(events[0][3], events[2][3]);
  assert.equal(events[1][3], events[3][3]);
  seq.dispose();
});

test('zero-length notes and chords do not leave a hanging voice', async () => {
  const { seq, events } = fixture();
  seq.startRecording(); seq.recordNoteOn(60); seq.recordNoteOff(60);
  seq.recordNoteOn(64); seq.stopRecording();
  await seq.play();
  assert.deepEqual(events.map((event) => event.slice(0, 2)), [['on', 60], ['off', 60], ['on', 64], ['off', 64]]);
  seq.dispose();
});

test('recording has an explicit size limit and clear/reset removes old timing', () => {
  const { seq, time } = fixture();
  seq.startRecording();
  for (let i = 0; i < MAX_RECORDING_NOTES; i++) { time(i); seq.recordNoteOn(60); seq.recordNoteOff(60); }
  assert.throws(() => seq.recordNoteOn(60), /1000-note limit/);
  assert.equal(seq.getRecording().length, MAX_RECORDING_NOTES);
  seq.clear(); seq.startRecording(); time(5000); seq.recordNoteOn(69); seq.stopRecording();
  assert.equal(seq.getRecording()[0].deltaMs, 0);
  seq.dispose();
});

test('abortable waits reject immediately on Stop instead of retaining a long timer', async () => {
  const controller = new AbortController();
  const pending = waitForPlayback(100000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(waitForPlayback(0, controller.signal), { name: 'AbortError' });
});

test('Stop aborts a running sequence and silences nodes immediately', async () => {
  let clock = 0, stops = 0, started = 0;
  const seq = createPianoSequencer({ now: () => clock,
    noteOn: async () => { started++; return 'voice'; }, noteOff: () => {},
    stopAll: (immediate) => { assert.equal(immediate, true); stops++; } });
  seq.startRecording(); seq.recordNoteOn(60); clock = 10000; seq.stopRecording();
  const playing = seq.play();
  await new Promise(setImmediate);
  assert.equal(started, 1);
  seq.stop(); seq.stop();
  assert.equal(await playing, false);
  assert.equal(stops, 1);
  seq.dispose();
});

test('dispose during delayed noteOn cannot publish or sustain a late playback voice', async () => {
  let resolveNote, clock = 0;
  const released = [], visual = [];
  const seq = createPianoSequencer({ now: () => clock,
    noteOn: () => new Promise((resolve) => { resolveNote = resolve; }),
    noteOff: (...args) => released.push(args), stopAll: () => {},
    onPlaybackNote: (...args) => visual.push(args) });
  seq.startRecording(); seq.recordNoteOn(60); clock = 100; seq.stopRecording();
  const playing = seq.play(); await new Promise(setImmediate);
  seq.dispose(); resolveNote('old-voice');
  assert.equal(await playing, false);
  assert.deepEqual(released, [[60, 'old-voice']]);
  assert.deepEqual(visual, []);
});

test('invalid requests and failed note starts are reported without leaving playback active', async () => {
  const states = [];
  const seq = createPianoSequencer({ noteOn: async () => undefined, noteOff: () => {}, stopAll: () => {}, onChange: (s) => states.push(s) });
  await assert.rejects(seq.play(), /Record some notes/);
  await assert.rejects(seq.play(3), RangeError);
  seq.startRecording(); assert.throws(() => seq.recordNoteOn(999), RangeError);
  seq.recordNoteOn(60); seq.recordNoteOff(60); seq.stopRecording();
  await assert.rejects(seq.play(), /Could not start/);
  assert.equal(states.at(-1).isPlaying, false);
  seq.dispose(); await assert.rejects(seq.play(), /disposed/);
});

test('a cancelled older playback cannot clear a replacement run', async () => {
  let resolveOld, starts = 0, clock = 0;
  const changes = [], released = [];
  const seq = createPianoSequencer({ now: () => clock,
    noteOn: async () => { starts++; return starts === 1 ? new Promise((resolve) => { resolveOld = resolve; }) : 'new'; },
    noteOff: (...args) => released.push(args), stopAll: () => {}, onChange: (state) => changes.push(state) });
  seq.startRecording(); seq.recordNoteOn(60); clock = 10000; seq.stopRecording();
  const oldRun = seq.play(); await new Promise(setImmediate);
  seq.stop();
  const newRun = seq.play(); await new Promise(setImmediate);
  resolveOld('old');
  assert.equal(await oldRun, false);
  assert.equal(changes.at(-1).isPlaying, true);
  assert.deepEqual(released, [[60, 'old']]);
  seq.stop(); assert.equal(await newRun, false);
  seq.dispose();
});
