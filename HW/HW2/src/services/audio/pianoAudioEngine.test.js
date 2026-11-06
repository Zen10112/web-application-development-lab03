import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createPianoAudioEngine } from './pianoAudioEngine.js';

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
      const node = { connected: false, connect() { this.connected = true; }, disconnect() { this.connected = false; } };
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
