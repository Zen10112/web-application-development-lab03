import { DRUM_PADS } from '../../data/drumPads.js';

/** One lazily created context per engine; each hit owns independent sources. */
export function createDrumAudioEngine(pads = DRUM_PADS) {
  const padsById = new Map(pads.map((pad) => [pad.id, pad]));
  const voices = new Set();
  let context = null;
  let master = null;
  let compressor = null;
  let noiseBuffer = null;
  let resumePromise = null;
  let disposed = false;

  function initialize() {
    if (context) return;
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Trình duyệt không hỗ trợ Web Audio API.');

    context = new AudioContextClass();
    try {
      master = context.createGain();
      master.gain.value = 0.35;
      compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      compressor.connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    } catch (error) {
      master?.disconnect();
      compressor?.disconnect();
      void context.close().catch(() => {});
      context = master = compressor = noiseBuffer = null;
      throw error;
    }
  }

  async function triggerPad(id) {
    if (disposed) throw new Error('Audio Engine đã đóng.');
    const pad = padsById.get(id);
    if (!pad) throw new Error(`Không tìm thấy drum pad: ${id}`);
    initialize();

    // Called directly from the click gesture, before awaiting anything else.
    if (context.state !== 'running') {
      if (context.state === 'closed') throw new Error('AudioContext đã đóng. Hãy tải lại trang.');
      if (!resumePromise) {
        resumePromise = context.resume().finally(() => { resumePromise = null; });
      }
      await resumePromise;
    }
    if (disposed) return;
    if (context.state !== 'running') throw new Error('Không thể bật âm thanh. Hãy thử nhấn pad lần nữa.');

    const { sound } = pad;
    const now = context.currentTime;
    const duration = sound.durationMs / 1000;
    const sources = [];
    const nodes = [];
    let remainingSources = 0;
    let cleaned = false;

    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      for (const source of sources) {
        source.onended = null;
        try { source.stop(); } catch { /* Already ended or not started. */ }
        source.disconnect();
        if ('buffer' in source) source.buffer = null;
      }
      for (const node of nodes) node.disconnect();
      voices.delete(cleanup);
    }

    function addSource(source) {
      sources.push(source);
      remainingSources++;
      source.onended = () => {
        remainingSources--;
        if (remainingSources === 0) cleanup();
      };
      return source;
    }

    voices.add(cleanup);
    try {
      const envelope = context.createGain();
      nodes.push(envelope);
      envelope.connect(master);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.linearRampToValueAtTime(sound.gain, now + 0.003);

      // Short noise bursts create a hand-clap attack before the decay tail.
      for (let burst = 1; burst < (sound.bursts ?? 1); burst++) {
        const time = now + burst * 0.018;
        envelope.gain.exponentialRampToValueAtTime(0.0001, time - 0.002);
        envelope.gain.linearRampToValueAtTime(sound.gain, time);
      }
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      if (sound.type === 'oscillator') {
        const oscillator = addSource(context.createOscillator());
        oscillator.type = sound.waveform;
        oscillator.frequency.setValueAtTime(sound.frequencyHz, now);
        oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequencyHz, now + duration);
        oscillator.connect(envelope);
      } else {
        const noise = addSource(context.createBufferSource());
        noise.buffer = noiseBuffer;
        const filter = context.createBiquadFilter();
        nodes.push(filter);
        filter.type = sound.filterType;
        filter.frequency.setValueAtTime(sound.filterFrequencyHz, now);
        noise.connect(filter);
        filter.connect(envelope);

        // A quiet tonal body distinguishes the snare from clap and cymbals.
        if (sound.bodyFrequencyHz) {
          const body = addSource(context.createOscillator());
          const bodyGain = context.createGain();
          nodes.push(bodyGain);
          body.type = 'triangle';
          body.frequency.setValueAtTime(sound.bodyFrequencyHz, now);
          bodyGain.gain.value = 0.25;
          body.connect(bodyGain);
          bodyGain.connect(envelope);
        }
      }

      for (const source of sources) {
        source.start(now);
        source.stop(now + duration + 0.01);
      }
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    for (const cleanup of [...voices]) cleanup();
    master?.disconnect();
    compressor?.disconnect();
    noiseBuffer = null;
    if (context && context.state !== 'closed') await context.close();
  }

  return { triggerPad, dispose };
}
