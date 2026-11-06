import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { DRUM_PADS } from '../../data/drumPads.js';
import { createDrumAudioEngine } from './drumAudioEngine.js';

const originalContext = globalThis.AudioContext;
const originalWebkit = globalThis.webkitAudioContext;

afterEach(() => {
  globalThis.AudioContext = originalContext;
  globalThis.webkitAudioContext = originalWebkit;
});

function installContext({ state = 'running', resumeError = false, startError = false } = {}) {
  const instances = [];
  class Context {
    constructor() {
      this.state = state;
      this.currentTime = 10;
      this.sampleRate = 48000;
      this.destination = {};
      this.nodes = [];
      this.sources = [];
      this.buffers = [];
      this.resumeCalls = 0;
      this.closeCalls = 0;
      instances.push(this);
    }
    node(source = false) {
      const parameter = () => ({
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      });
      const node = {
        gain: parameter(), frequency: parameter(),
        connected: false, started: false, stopped: false, onended: null,
        connect() { this.connected = true; },
        disconnect() { this.connected = false; },
        start() {
          if (startError) throw new Error('Source start failed');
          this.started = true;
        },
        stop() { this.stopped = true; },
      };
      this.nodes.push(node);
      if (source) this.sources.push(node);
      return node;
    }
    createGain() { return this.node(); }
    createDynamicsCompressor() { return this.node(); }
    createAnalyser() {
      const node = this.node();
      node.getFloatTimeDomainData = (samples) => samples.fill(0.25);
      return node;
    }
    createBiquadFilter() { return this.node(); }
    createOscillator() { return this.node(true); }
    createBufferSource() { return Object.assign(this.node(true), { buffer: null }); }
    createBuffer(channels, length) {
      const samples = new Float32Array(length);
      const buffer = { getChannelData: () => samples };
      this.buffers.push(buffer);
      return buffer;
    }
    async resume() {
      this.resumeCalls++;
      if (resumeError) throw new Error('Resume blocked');
      this.state = 'running';
    }
    async close() { this.closeCalls++; this.state = 'closed'; }
  }
  globalThis.AudioContext = Context;
  return instances;
}

test('all seven pads, rapid repeated hits and overlapping hits retain independent sources', async () => {
  const contexts = installContext();
  const engine = createDrumAudioEngine();
  assert.equal(contexts.length, 0, 'context is lazy');
  await Promise.all([
    ...DRUM_PADS.map((pad) => engine.triggerPad(pad.id)),
    ...Array.from({ length: 15 }, () => engine.triggerPad('kick')),
  ]);
  assert.equal(contexts.length, 1);
  const context = contexts[0];
  assert.equal(context.buffers.length, 1, 'noise buffer is shared');
  assert.equal(context.sources.length, 23, '22 hits plus snare body');
  assert.ok(context.sources.every((source) => source.started && source.stopped && source.connected));
  assert.equal(new Set(context.sources).size, 23);
  for (const source of context.sources) source.onended?.();
  assert.ok(context.sources.every((source) => !source.connected && source.onended === null));
  assert.ok(context.nodes.slice(3).every((node) => !node.connected));
  assert.ok(context.sources.filter((source) => 'buffer' in source).every((source) => source.buffer === null));
  await engine.dispose();
  assert.ok(context.nodes.every((node) => !node.connected));
});

test('first gesture resumes one suspended context and preserves concurrent requests', async () => {
  const contexts = installContext({ state: 'suspended' });
  const engine = createDrumAudioEngine();
  await Promise.all([engine.triggerPad('kick'), engine.triggerPad('clap')]);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumeCalls, 1);
  assert.equal(contexts[0].sources.length, 2);
  contexts[0].state = 'suspended';
  await engine.triggerPad('crash');
  assert.equal(contexts[0].resumeCalls, 2);
  await engine.dispose();
});

test('dispose stops active voices, disconnects all nodes and closes only once', async () => {
  const contexts = installContext();
  const engine = createDrumAudioEngine();
  await engine.triggerPad('snare');
  await engine.dispose();
  await engine.dispose();
  assert.equal(contexts[0].closeCalls, 1);
  assert.ok(contexts[0].nodes.every((node) => !node.connected));
  assert.ok(contexts[0].sources.every((source) => source.onended === null && source.stopped));
  await assert.rejects(engine.triggerPad('kick'), /đã đóng/);
});

test('dispose during resume prevents a late sound', async () => {
  const contexts = installContext({ state: 'suspended' });
  const engine = createDrumAudioEngine();
  const hit = engine.triggerPad('kick');
  await engine.dispose();
  await hit;
  assert.equal(contexts[0].sources.length, 0);
});

test('unsupported browser and unknown pad reject with useful errors', async () => {
  globalThis.AudioContext = undefined;
  globalThis.webkitAudioContext = undefined;
  const engine = createDrumAudioEngine();
  await assert.rejects(engine.triggerPad('unknown'), /Không tìm thấy/);
  await assert.rejects(engine.triggerPad('kick'), /không hỗ trợ Web Audio API/);
  await engine.dispose();
});

test('resume failure rejects without starting a source', async () => {
  const contexts = installContext({ state: 'suspended', resumeError: true });
  const engine = createDrumAudioEngine();
  await assert.rejects(engine.triggerPad('kick'), /Resume blocked/);
  assert.equal(contexts[0].sources.length, 0);
  await engine.dispose();
});

test('source failure cleans partial voice resources', async () => {
  const contexts = installContext({ startError: true });
  const engine = createDrumAudioEngine();
  await assert.rejects(engine.triggerPad('snare'), /Source start failed/);
  assert.ok(contexts[0].nodes.slice(3).every((node) => !node.connected));
  assert.ok(contexts[0].sources.every((source) => source.onended === null));
  await engine.dispose();
});

test('RMS meter reads the shared analyser without creating a context at rest', async () => {
  const contexts = installContext();
  const engine = createDrumAudioEngine();
  assert.equal(engine.readLevel(), 0);
  assert.equal(contexts.length, 0);
  await engine.triggerPad('kick');
  assert.equal(engine.readLevel(), 0.25);
  contexts[0].state = 'suspended';
  assert.equal(engine.readLevel(), 0);
  contexts[0].state = 'running';
  await engine.dispose();
  assert.equal(engine.readLevel(), 0);
  assert.ok(contexts[0].nodes.every((node) => !node.connected));
});
