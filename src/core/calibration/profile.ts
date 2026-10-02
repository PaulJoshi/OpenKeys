import type { InstrumentProfile } from './types';
import { LOG_BIN_COUNT, LOG_BINS_PER_SEMITONE, freqToLogBin } from '../input/mic/spectrum';

/** Keys to record for the instrument profile: every minor third across the range. */
export function profileKeys(low: number, high: number): number[] {
  const keys: number[] = [];
  // Start on the first C/D#/F#/A at or above `low` so keys match the sample grid of most pianos.
  let m = low;
  while (![0, 3, 6, 9].includes(m % 12)) m++;
  for (; m <= high; m += 3) keys.push(m);
  return keys;
}

/**
 * Measures one key's spectral template: average log spectrum 80-400 ms after the attack;
 * for each partial, the strongest peak within +/-60 cents of the stretched-harmonic position.
 * Returns partial levels in dB relative to the strongest partial (<= 0).
 */
export function measureKeyTemplate(spectra: Float32Array[], heardMidi: number, partials: number, inharmonicity: number, a4 = 440): number[] {
  if (!spectra.length) return [];
  const avg = new Float32Array(LOG_BIN_COUNT);
  for (const s of spectra) for (let i = 0; i < LOG_BIN_COUNT; i++) avg[i] += s[i] / spectra.length;
  const f0 = a4 * Math.pow(2, (heardMidi - 69) / 12);
  const B = inharmonicity * Math.pow(2, (heardMidi - 60) / 12);
  const levels: number[] = [];
  for (let k = 1; k <= partials; k++) {
    const f = k * f0 * Math.sqrt(1 + B * k * k);
    if (f > 9000) break;
    const b = freqToLogBin(f);
    const tol = 0.6 * LOG_BINS_PER_SEMITONE;
    let v = -200;
    for (let j = Math.max(0, Math.round(b - tol)); j <= Math.min(LOG_BIN_COUNT - 1, Math.round(b + tol)); j++) v = Math.max(v, avg[j]);
    levels.push(v);
  }
  const max = Math.max(...levels);
  return levels.map((v) => Math.max(-60, v - max));
}

export function buildProfile(keys: { midi: number; partialsDb: number[] }[], partials: number): InstrumentProfile {
  return { keys: keys.filter((k) => k.partialsDb.length > 0), partials, createdAt: Date.now() };
}
