import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = process.argv.includes('--baseline');
const source = baseline
  ? execFileSync('git', ['show', '4da5ad4:HW/HW2/src/components/PianoKey.jsx'], { cwd: root, encoding: 'utf8' })
  : readFileSync(new URL('../src/components/PianoKey.jsx', import.meta.url), 'utf8');
const marker = '  const { midi, noteName, octave, isBlackKey } = pianoKey;';
if (!source.includes(marker)) throw new Error('PianoKey render marker changed; update this test transform.');
// Test-only source instrumentation, similar to coverage transforms. Production source
// and React's memo behavior are preserved; the counter never updates React state.
const instrumented = "import { recordRender } from '../renderMetrics.js';\n" + source.replace(marker, '  recordRender(pianoKey.midi);\n' + marker);
mkdirSync(new URL('./.generated/', import.meta.url), { recursive: true });
writeFileSync(new URL('./.generated/buildInfo.js', import.meta.url), `export const IS_BASELINE = ${baseline};\n`);
writeFileSync(new URL('./.generated/PianoKey.jsx', import.meta.url), instrumented);
const keyboardSource = baseline
  ? execFileSync('git', ['show', '4da5ad4:HW/HW2/src/components/PianoKeyboard.jsx'], { cwd: root, encoding: 'utf8' })
  : readFileSync(new URL('../src/components/PianoKeyboard.jsx', import.meta.url), 'utf8');
writeFileSync(new URL('./.generated/PianoKeyboard.jsx', import.meta.url), keyboardSource
  .replaceAll("'../data/", "'/src/data/").replaceAll("'../hooks/", "'/src/hooks/"));
console.log(`Prepared ${baseline ? '4da5ad4 baseline' : 'current source'} render instrumentation.`);
