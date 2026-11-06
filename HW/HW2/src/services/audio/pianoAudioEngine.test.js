import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createPianoAudioEngine, MAX_VOICES } from './pianoAudioEngine.js';

const originalContext = globalThis.AudioContext;
const originalWebkit = globalThis.webkitAudioContext;
afterEach(() => {
  globalThis.AudioContext = originalContext;
  globalThis.webkitAudioContext = originalWebkit;
});

function installContext({ suspended = false, deferred = false, resumeError = false, startError = false, fallback = false } = {}) {
  const instances = [];
  globalThis.AudioContext = class {
    constructor() {
      this.state = suspended ? 'suspended' : 'running';
      this.currentTime = 5;
      this.destination = {};
      this.nodes = [];
      this.oscillators = [];
      this.resumeCalls = 0;
      this.closeCalls = 0;
      this.maxConnectedOscillators = 0;
      instances.push(this);
    }
    parameter() {
      const events = [];
      return {
        events,
        setValueAtTime(value, at) { events.push(['set', value, at]); },
        linearRampToValueAtTime(value, at) { events.push(['ramp', value, at]); },
        cancelScheduledValues(at) { events.push(['cancel', at]); },
        ...(!fallback && { cancelAndHoldAtTime(at) { events.push(['hold', at]); } }),
      };
    }
    node() {
      const context = this;
      const node = { connected: false, disconnectCalls: 0, connect() {
        this.connected = true;
        context.maxConnectedOscillators = Math.max(context.maxConnectedOscillators,
          context.oscillators.filter((osc) => osc.connected).length);
      }, disconnect() { this.connected = false; this.disconnectCalls++; } };
      this.nodes.push(node);
      return node;
    }
    createGain() { return Object.assign(this.node(), { gain: this.parameter() }); }
    createDynamicsCompressor() { return this.node(); }
    createOscillator() {
      const node = Object.assign(this.node(), {
        frequency: this.parameter(), starts: [], stops: [], onended: null,
        start(at) { if (startError) throw new Error('Start failed'); this.starts.push(at); },
        stop(at) { this.stops.push(at); },
      });
      this.oscillators.push(node);
      return node;
    }
    async resume() {
      this.resumeCalls++;
      if (resumeError) throw new Error('Resume failed');
      if (deferred) await new Promise((resolve) => { this.finishResume = resolve; });
      this.state = 'running';
    }
    async close() { this.closeCalls++; this.state = 'closed'; }
  };
  return instances;
}

test('lazy shared context and correct A0, A4 and C8 oscillator frequencies', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  assert.equal(instances.length, 0);
  for (const midi of [21, 69, 108]) await engine.noteOn(midi);
  assert.equal(instances.length, 1);
  const frequencies = instances[0].oscillators.map((osc) => osc.frequency.events[0][1]);
  for (const [index, expected] of [27.5, 440, 4186.009044809578].entries()) {
    assert.ok(Math.abs(frequencies[index] - expected) < 1e-9);
  }
  await engine.dispose();
});

test('a held note sustains until release, then stops and disconnects on ended', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  await engine.noteOn(69);
  const ctx = instances[0], osc = ctx.oscillators[0], envelope = ctx.nodes[3];
  assert.deepEqual(osc.starts, [5]);
  assert.deepEqual(osc.stops, []);
  assert.deepEqual(envelope.gain.events, [['set', 0, 5], ['ramp', 0.16, 5.008]]);
  ctx.currentTime = 6;
  engine.noteOff(69);
  assert.ok(Math.abs(osc.stops[0] - 6.09) < 1e-9);
  assert.deepEqual(envelope.gain.events.slice(-2), [['hold', 6], ['ramp', 0, 6.08]]);
  osc.onended();
  assert.equal(osc.connected, false);
  assert.equal(envelope.connected, false);
  assert.equal(osc.onended, null);
  await engine.dispose();
});

test('duplicate noteOn is ignored but re-press during release creates an independent voice', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  await engine.noteOn(69);
  await engine.noteOn(69);
  assert.equal(instances[0].oscillators.length, 1);
  engine.noteOff(69);
  await engine.noteOn(69);
  const [oldVoice, newVoice] = instances[0].oscillators;
  oldVoice.onended();
  engine.noteOff(69);
  assert.equal(newVoice.stops.length, 1, 'old voice cleanup must not remove the new note');
  await engine.dispose();
});

test('keyup during suspended resume cancels the pending note', async () => {
  const instances = installContext({ suspended: true, deferred: true });
  const engine = createPianoAudioEngine();
  const pending = engine.noteOn(69);
  engine.noteOff(69);
  instances[0].finishResume();
  await pending;
  assert.equal(instances[0].oscillators.length, 0);
  await engine.dispose();
});

test('rapid off/on during resume preserves the latest press and shares resume', async () => {
  const instances = installContext({ suspended: true, deferred: true });
  const engine = createPianoAudioEngine();
  const first = engine.noteOn(69);
  engine.noteOff(69);
  const second = engine.noteOn(69);
  const third = engine.noteOn(72);
  instances[0].finishResume();
  await Promise.all([first, second, third]);
  assert.equal(instances[0].resumeCalls, 1);
  assert.equal(instances[0].oscillators.length, 2);
  await engine.dispose();
});

test('attack release fallback starts from the current attack amplitude', async () => {
  const instances = installContext({ fallback: true });
  const engine = createPianoAudioEngine();
  await engine.noteOn(69);
  instances[0].currentTime = 5.004;
  engine.noteOff(69);
  const events = instances[0].nodes[3].gain.events;
  assert.equal(events[2][0], 'cancel');
  assert.ok(Math.abs(events[3][1] - 0.08) < 1e-9);
  await engine.dispose();
});

test('stopAll releases every held note and dispose cleans held/releasing voices once', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  await engine.noteOn(60); await engine.noteOn(64); await engine.noteOn(67);
  engine.stopAll();
  assert.ok(instances[0].oscillators.every((osc) => osc.stops.length === 1));
  await engine.noteOn(69);
  await engine.dispose(); await engine.dispose();
  assert.equal(instances[0].closeCalls, 1);
  assert.ok(instances[0].nodes.every((node) => !node.connected));
  assert.ok(instances[0].oscillators.every((osc) => osc.onended === null && osc.stops.length > 0));
  await assert.rejects(engine.noteOn(69), /disposed/);
});

test('dispose during resume prevents a late oscillator', async () => {
  const instances = installContext({ suspended: true, deferred: true });
  const engine = createPianoAudioEngine();
  const pending = engine.noteOn(69);
  await engine.dispose();
  instances[0].finishResume(); await pending;
  assert.equal(instances[0].oscillators.length, 0);
});

test('resume and source errors reject safely and clean partial voices', async () => {
  let instances = installContext({ suspended: true, resumeError: true });
  let engine = createPianoAudioEngine();
  await assert.rejects(engine.noteOn(69), /Resume failed/);
  assert.equal(instances[0].oscillators.length, 0);
  await engine.dispose();
  instances = installContext({ startError: true }); engine = createPianoAudioEngine();
  await assert.rejects(engine.noteOn(69), /Start failed/);
  assert.ok(instances[0].nodes.slice(2).every((node) => !node.connected));
  await engine.dispose();
});

test('unsupported browsers and invalid MIDI receive explicit errors', async () => {
  globalThis.AudioContext = undefined; globalThis.webkitAudioContext = undefined;
  const engine = createPianoAudioEngine();
  for (const midi of [20, 109, 69.5, '69', NaN]) await assert.rejects(engine.noteOn(midi), RangeError);
  await assert.rejects(engine.noteOn(69), /does not support/);
  engine.noteOff(69);
  await engine.dispose();
});

test('one note and a three-note chord own distinct identified voices outside React', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  await engine.noteOn(60);
  assert.equal(engine.getVoiceCount(), 1);
  await engine.noteOn(64); await engine.noteOn(67);
  const snapshot = engine.getVoiceSnapshot();
  assert.deepEqual(snapshot.map((voice) => voice.midi), [60, 64, 67]);
  assert.equal(new Set(snapshot.map((voice) => voice.id)).size, 3);
  assert.deepEqual(snapshot.map((voice) => voice.createdOrder), [1, 2, 3]);
  assert.ok(snapshot.every((voice) => voice.state === 'held' && voice.createdAt === 5));
  assert.equal(instances[0].oscillators.filter((osc) => osc.connected).length, 3);
  assert.ok(Object.isFrozen(snapshot) && snapshot.every(Object.isFrozen));
  await engine.dispose();
  assert.equal(engine.getVoiceCount(), 0);
});

test('eight simultaneous notes are supported; the ninth replaces only the oldest voice', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let midi = 60; midi < 68; midi++) await engine.noteOn(midi);
  assert.equal(MAX_VOICES, 8);
  assert.equal(engine.getVoiceCount(), 8);
  const oldest = instances[0].oscillators[0];
  await engine.noteOn(72);
  assert.equal(engine.getVoiceCount(), 8);
  assert.deepEqual(engine.getVoiceSnapshot().map((voice) => voice.midi), [61, 62, 63, 64, 65, 66, 67, 72]);
  assert.equal(oldest.connected, false);
  assert.equal(oldest.stops.length, 1);
  assert.equal(instances[0].oscillators.filter((osc) => osc.connected).length, 8);
  assert.equal(instances[0].maxConnectedOscillators, 8, 'no transient ninth oscillator connection');
  engine.noteOff(60); // The stolen note's later keyup must not stop another voice.
  assert.equal(engine.getVoiceCount(), 8);
  await engine.dispose();
});

test('release tails occupy slots and re-presses do not lose or stop the new voice', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let midi = 60; midi < 68; midi++) await engine.noteOn(midi);
  engine.noteOff(60); engine.noteOff(64);
  assert.equal(engine.getVoiceCount(), 8, 'release tails still count');
  assert.equal(engine.getVoiceSnapshot().filter((voice) => voice.state === 'releasing').length, 2);
  const lateEnded = instances[0].oscillators[0].onended;
  await engine.noteOn(60);
  lateEnded();
  assert.equal(engine.getVoiceCount(), 8);
  assert.equal(engine.getVoiceSnapshot().at(-1).midi, 60);
  engine.noteOff(60);
  assert.equal(instances[0].oscillators.at(-1).stops.length, 1);
  instances[0].oscillators[4].onended();
  assert.equal(engine.getVoiceCount(), 7);
  assert.equal(instances[0].oscillators.filter((osc) => osc.connected).length, 7);
  await engine.dispose();
});

test('pending resume reservations are bounded and stolen requests never start later', async () => {
  const instances = installContext({ suspended: true, deferred: true });
  const engine = createPianoAudioEngine();
  const pending = [];
  for (let midi = 60; midi < 72; midi++) {
    pending.push(engine.noteOn(midi));
    assert.ok(engine.getVoiceCount() <= 8);
  }
  assert.deepEqual(engine.getVoiceSnapshot().map((voice) => voice.midi), [64, 65, 66, 67, 68, 69, 70, 71]);
  instances[0].finishResume();
  await Promise.all(pending);
  assert.equal(instances[0].oscillators.length, 8);
  assert.equal(engine.getVoiceCount(), 8);
  assert.equal(instances[0].resumeCalls, 1);
  await engine.dispose();
});

test('100 rapid same-note re-presses never retain more than eight voice node pairs', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let i = 0; i < 100; i++) {
    await engine.noteOn(69);
    engine.noteOff(69);
    assert.ok(engine.getVoiceCount() <= 8);
    assert.ok(instances[0].oscillators.filter((osc) => osc.connected).length <= 8);
    assert.ok(instances[0].nodes.filter((node) => node.connected).length <= 18);
  }
  for (const osc of instances[0].oscillators) osc.onended?.();
  assert.equal(instances[0].maxConnectedOscillators, 8);
  assert.equal(engine.getVoiceCount(), 0);
  assert.equal(instances[0].nodes.filter((node) => node.connected).length, 2);
  await engine.dispose();
  assert.ok(instances[0].nodes.every((node) => !node.connected));
});

test('ninth and tenth notes steal FIFO rather than LIFO; duplicates do not refresh age', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let midi = 60; midi < 68; midi++) await engine.noteOn(midi);
  const original = engine.getVoiceSnapshot();
  assert.equal(await engine.noteOn(60), original[0].id);
  await engine.noteOn(72); await engine.noteOn(74);
  assert.deepEqual(engine.getVoiceSnapshot().map((voice) => voice.midi), [62, 63, 64, 65, 66, 67, 72, 74]);
  assert.deepEqual(instances[0].oscillators.slice(0, 2).map((osc) => osc.stops.length), [1, 1]);
  assert.ok(instances[0].oscillators.slice(2).every((osc) => osc.stops.length === 0));
  engine.noteOff(60); engine.noteOff(61);
  assert.equal(engine.getVoiceCount(), 8);
  assert.equal(instances[0].maxConnectedOscillators, 8);
  await engine.dispose();
});

test('a completed release frees a slot without leaving a stale FIFO entry', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let midi = 60; midi < 68; midi++) await engine.noteOn(midi);
  engine.noteOff(64);
  instances[0].oscillators[4].onended();
  await engine.noteOn(72);
  assert.deepEqual(engine.getVoiceSnapshot().map((voice) => voice.midi), [60, 61, 62, 63, 65, 66, 67, 72]);
  assert.equal(instances[0].oscillators[0].stops.length, 0);
  await engine.noteOn(74);
  assert.deepEqual(engine.getVoiceSnapshot().map((voice) => voice.midi), [61, 62, 63, 65, 66, 67, 72, 74]);
  assert.equal(instances[0].oscillators[4].disconnectCalls, 1);
  await engine.dispose();
});

test('token-based noteOff from a stolen voice cannot release a newer voice at the same MIDI', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  const oldId = await engine.noteOn(60);
  for (let midi = 61; midi < 69; midi++) await engine.noteOn(midi);
  const newId = await engine.noteOn(60);
  assert.notEqual(oldId, newId);
  const replacement = instances[0].oscillators.at(-1);
  engine.noteOff(60, oldId);
  assert.equal(replacement.stops.length, 0);
  assert.equal(engine.getVoiceSnapshot().at(-1).state, 'held');
  engine.noteOff(60, newId);
  assert.equal(replacement.stops.length, 1);
  await engine.dispose();
});

test('repeated noteOff and ended callbacks stop/disconnect a natural release only once', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  const id = await engine.noteOn(60);
  const osc = instances[0].oscillators[0], gain = instances[0].nodes[3];
  const ended = osc.onended;
  engine.noteOff(60, id); engine.noteOff(60, id);
  ended(); ended(); engine.noteOff(60, id);
  await engine.dispose(); await engine.dispose();
  assert.equal(osc.stops.length, 1);
  assert.equal(osc.disconnectCalls, 1);
  assert.equal(gain.disconnectCalls, 1);
  assert.equal(engine.getVoiceCount(), 0);
});

test('mixed fast noteOn/noteOff and completion preserve sorted unique FIFO entries', async () => {
  const instances = installContext();
  const engine = createPianoAudioEngine();
  for (let i = 0; i < 160; i++) {
    const midi = 48 + i % 24;
    const id = await engine.noteOn(midi);
    if (i % 2 === 0) engine.noteOff(midi, id);
    if (i % 3 === 0) {
      const releasing = engine.getVoiceSnapshot().find((voice) => voice.state === 'releasing');
      if (releasing) instances[0].oscillators[releasing.createdOrder - 1].onended?.();
    }
    const voices = engine.getVoiceSnapshot();
    assert.ok(voices.length <= 8);
    assert.equal(new Set(voices.map((voice) => voice.id)).size, voices.length);
    assert.deepEqual(voices.map((voice) => voice.createdOrder), voices.map((voice) => voice.createdOrder).toSorted((a, b) => a - b));
  }
  assert.ok(instances[0].maxConnectedOscillators <= 8);
  await engine.dispose();
  assert.equal(engine.getVoiceCount(), 0);
  assert.ok(instances[0].nodes.every((node) => !node.connected));
});

test('unmount disposal clears mixed held/releasing/pending voices without late starts', async () => {
  const instances = installContext({ deferred: true });
  const engine = createPianoAudioEngine();
  for (let midi = 60; midi < 66; midi++) await engine.noteOn(midi);
  engine.noteOff(62);
  instances[0].state = 'suspended';
  const pending = [engine.noteOn(72), engine.noteOn(74), engine.noteOn(76)];
  assert.equal(engine.getVoiceCount(), 8);
  const sourceCount = instances[0].oscillators.length;
  await engine.dispose();
  instances[0].finishResume(); await Promise.all(pending);
  assert.equal(instances[0].oscillators.length, sourceCount);
  assert.equal(engine.getVoiceCount(), 0);
  assert.ok(instances[0].nodes.every((node) => !node.connected));
  assert.ok(instances[0].nodes.every((node) => node.disconnectCalls === 1));
});
