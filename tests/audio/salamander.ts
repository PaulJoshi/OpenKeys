import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { SR, type RenderNote } from './synth';

const require = createRequire(import.meta.url);
const CACHE = join(process.cwd(), 'tests', 'fixtures', 'generated', 'salamander');
const SAMPLE_NOTES = ['A', 'C', 'D#', 'F#'];
const PC: Record<string, number> = { C: 0, 'D#': 3, 'F#': 6, A: 9 };

export function ffmpegAvailable(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function samplePath(layer: number, name: string): string | null {
  try {
    const dir = join(dirname(require.resolve(`@audio-samples/piano-mp3-velocity${layer}/package.json`)), 'audio');
    const p = join(dir, `${name}v${layer}.mp3`);
    return existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

const decoded = new Map<string, Float32Array>();

/** Decodes a Salamander sample to mono float32 at 48 kHz (cached on disk). */
export function loadSample(layer: number, name: string): Float32Array | null {
  const key = `${name}v${layer}`;
  const hit = decoded.get(key);
  if (hit) return hit;
  mkdirSync(CACHE, { recursive: true });
  const cached = join(CACHE, `${key.replace('#', 's')}.f32`);
  if (!existsSync(cached)) {
    const src = samplePath(layer, name);
    if (!src) return null;
    const buf = execFileSync('ffmpeg', ['-v', 'quiet', '-i', src, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 64 * 1024 * 1024 });
    writeFileSync(cached, buf);
  }
  const b = readFileSync(cached);
  let arr = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  // Trim the MP3 encoder delay / leading silence so reference onsets are exact.
  let peak = 0;
  for (const v of arr) peak = Math.max(peak, Math.abs(v));
  let first = 0;
  while (first < arr.length && Math.abs(arr[first]) < peak * 0.02) first++;
  arr = arr.slice(Math.max(0, first - 24));
  decoded.set(key, arr);
  return arr;
}

/** Nearest sampled note (every minor third) for a MIDI pitch. */
function nearestSample(midi: number): { name: string; midi: number } {
  let best = { name: 'C4', midi: 60 };
  let bd = 1e9;
  for (let oct = 0; oct <= 8; oct++) {
    for (const n of SAMPLE_NOTES) {
      const m = (oct + 1) * 12 + PC[n];
      if (m < 21 || m > 108) continue;
      const d = Math.abs(m - midi);
      if (d < bd) {
        bd = d;
        best = { name: `${n}${oct}`, midi: m };
      }
    }
  }
  return best;
}

/** Renders notes with the real Salamander samples (resampled like the app's sampler). */
export function renderSalamander(notes: RenderNote[], totalSec: number): Float32Array | null {
  const out = new Float32Array(Math.ceil(totalSec * SR));
  for (const n of notes) {
    const v = n.velocity ?? 0.6;
    const layer = v < 0.3 ? 4 : v < 0.55 ? 8 : v < 0.8 ? 12 : 16;
    const s = nearestSample(n.midi);
    const smp = loadSample(layer, s.name);
    if (!smp) return null;
    const rate = Math.pow(2, (n.midi - s.midi) / 12);
    const start = Math.floor(n.start * SR);
    const releaseLen = 0.12;
    const len = Math.min(out.length - start, Math.floor((n.dur + releaseLen) * SR), Math.floor(smp.length / rate) - 2);
    const g = 0.9;
    for (let i = 0; i < len; i++) {
      const pos = i * rate;
      const k = Math.floor(pos);
      const fr = pos - k;
      const val = smp[k] * (1 - fr) + smp[k + 1] * fr;
      const t = i / SR;
      const env = t > n.dur ? Math.exp(-(t - n.dur) * 35) : 1;
      out[start + i] += g * val * env;
    }
  }
  return out;
}
