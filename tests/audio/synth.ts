import { RealFFT } from '../../src/core/input/mic/fft';

/** Test audio: synthetic piano-like tones, Salamander renders, noise, reverb, gain. */

export const SR = 48000;

export interface RenderNote {
  midi: number;
  start: number; // s
  dur: number; // s (key held)
  velocity?: number; // 0-1
}

/** Deterministic PRNG for reproducible fixtures. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1e9) / 1e9;
  };
}

/** Additive piano-like tone: inharmonic partials, per-partial decay, hammer noise, damper release. */
export function synthPiano(notes: RenderNote[], totalSec: number, seed = 7): Float32Array {
  const out = new Float32Array(Math.ceil(totalSec * SR));
  const rand = rng(seed);
  for (const n of notes) {
    const f0 = 440 * Math.pow(2, (n.midi - 69) / 12);
    const B = 0.00008 * Math.pow(2, (n.midi - 60) / 14); // more inharmonic in the treble
    const vel = n.velocity ?? 0.6;
    const amp = 0.25 * Math.pow(vel, 1.6);
    const start = Math.floor(n.start * SR);
    const ring = n.dur + 0.25;
    const len = Math.min(out.length - start, Math.floor(ring * SR));
    const partials: { f: number; a: number; d: number; ph: number }[] = [];
    for (let k = 1; k <= 16; k++) {
      const f = k * f0 * Math.sqrt(1 + B * k * k);
      if (f > SR / 2.2) break;
      let a = 1 / Math.pow(k, 1.15);
      if (n.midi < 48 && k === 1) a *= 0.35; // weak bass fundamental (small speakers)
      a *= 0.7 + 0.6 * rand();
      const d = 1.2 + 0.8 * k + (f0 > 500 ? 3 : 0); // decay rate 1/s
      partials.push({ f, a, d, ph: rand() * Math.PI * 2 });
    }
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const att = Math.min(1, t / 0.002);
      const damp = t > n.dur ? Math.exp(-(t - n.dur) * 40) : 1;
      let s = 0;
      for (const p of partials) s += p.a * Math.exp(-p.d * t) * Math.sin(2 * Math.PI * p.f * t + p.ph);
      // hammer noise burst
      if (t < 0.006) s += (rand() * 2 - 1) * 0.3 * (1 - t / 0.006);
      out[start + i] += amp * att * damp * s;
    }
  }
  return out;
}

export function addNoise(x: Float32Array, snrDb: number, seed = 3): Float32Array {
  const rand = rng(seed);
  let p = 0;
  for (const v of x) p += v * v;
  p /= x.length;
  const noiseRms = Math.sqrt(p / Math.pow(10, snrDb / 10));
  const out = new Float32Array(x.length);
  // pinkish noise: one-pole lowpassed white + white
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const w = (rand() * 2 - 1) * 1.7;
    lp = 0.97 * lp + 0.03 * w;
    out[i] = x[i] + noiseRms * (0.6 * w + 2.5 * lp);
  }
  return out;
}

/** Simple room: exponentially decaying noise impulse response (RT60 in s), mixed wet/dry (FFT convolution). */
export function addReverb(x: Float32Array, rt60 = 0.5, wet = 0.25, seed = 5): Float32Array {
  const rand = rng(seed);
  const pre = Math.floor(0.012 * SR);
  const len = Math.floor(rt60 * SR) + pre;
  const ir = new Float64Array(len);
  const k = 6.9 / rt60;
  let e = 0;
  for (let i = pre; i < len; i++) {
    ir[i] = (rand() * 2 - 1) * Math.exp((-k * (i - pre)) / SR);
    e += ir[i] * ir[i];
  }
  const norm = (wet * 2) / Math.sqrt(e);
  for (let i = 0; i < len; i++) ir[i] *= norm;
  let n = 1;
  while (n < len * 2) n <<= 1;
  const fft = new RealFFT(n);
  const block = n - len + 1;
  const irRe = new Float64Array(n / 2 + 1);
  const irIm = new Float64Array(n / 2 + 1);
  fft.forward(ir, irRe, irIm);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * (1 - wet);
  const buf = new Float64Array(n);
  const re = new Float64Array(n / 2 + 1);
  const im = new Float64Array(n / 2 + 1);
  const y = new Float64Array(n);
  for (let s0 = 0; s0 < x.length; s0 += block) {
    buf.fill(0);
    for (let i = 0; i < block && s0 + i < x.length; i++) buf[i] = x[s0 + i];
    fft.forward(buf, re, im);
    for (let b = 0; b < re.length; b++) {
      const r = re[b] * irRe[b] - im[b] * irIm[b];
      const ii = re[b] * irIm[b] + im[b] * irRe[b];
      re[b] = r;
      im[b] = ii;
    }
    fft.inverse(re, im, y);
    for (let i = 0; i < n && s0 + i < x.length; i++) out[s0 + i] += y[i];
  }
  return out;
}

export function gain(x: Float32Array, db: number): Float32Array {
  const g = Math.pow(10, db / 20);
  return x.map((v) => v * g);
}

/** Simulates small-speaker colouring: high-pass around 150 Hz and a gentle presence boost. */
export function laptopSpeaker(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length);
  const fc = 150;
  const rc = 1 / (2 * Math.PI * fc);
  const dt = 1 / SR;
  const a = rc / (rc + dt);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < x.length; i++) {
    const y = a * (prevY + x[i] - prevX);
    prevX = x[i];
    prevY = y;
    out[i] = y;
  }
  return out;
}

/** Feeds audio through the analyzer in 128-sample quanta, as the AudioWorklet does. */
export function* quanta(x: Float32Array, size = 128): Generator<{ block: Float32Array; endTime: number }> {
  for (let i = 0; i + size <= x.length; i += size) yield { block: x.subarray(i, i + size), endTime: (i + size - 1) / SR };
}
