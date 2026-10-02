import { median, quantile } from '../music';

export interface NoiseResult {
  floorDb: number;
  /** Room too noisy for reliable mic detection. */
  tooNoisy: boolean;
  /** Something loud happened during the measurement (talking, a note). */
  unsteady: boolean;
}

/** Noise floor from ~3 s of level readings in silence. */
export function computeNoiseFloor(levelsDb: readonly number[]): NoiseResult {
  if (!levelsDb.length) return { floorDb: -80, tooNoisy: false, unsteady: true };
  const floorDb = quantile(levelsDb, 0.5);
  const p95 = quantile(levelsDb, 0.95);
  return { floorDb, tooNoisy: floorDb > -45, unsteady: p95 - floorDb > 12 };
}

export interface LatencyResult {
  /** Median offset (s) of the learner's notes after the clicks (positive = later). */
  offsetSec: number;
  /** Offsets used (after discarding outliers). */
  used: number[];
  discarded: number;
  /** Spread (s) of the used offsets: large spread = unreliable. */
  spreadSec: number;
  /** Total > ~100 ms: likely Bluetooth audio. */
  tooHigh: boolean;
  ok: boolean;
}

/**
 * Latency from tapping along with clicks: each click is paired with the nearest tap within half
 * a beat; outliers (beyond 2.5 MADs from the median) are discarded; the median offset is the
 * judging offset.
 */
export function computeLatency(clickTimes: readonly number[], tapTimes: readonly number[], beatSec: number): LatencyResult {
  const offsets: number[] = [];
  const usedTaps = new Set<number>();
  for (const c of clickTimes) {
    let best = -1;
    let bd = Infinity;
    tapTimes.forEach((t, i) => {
      if (usedTaps.has(i)) return;
      const d = t - c;
      if (Math.abs(d) < beatSec / 2 && Math.abs(d) < Math.abs(bd)) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      usedTaps.add(best);
      offsets.push(bd);
    }
  }
  if (offsets.length < 3) return { offsetSec: 0, used: offsets, discarded: 0, spreadSec: 0, tooHigh: false, ok: false };
  const med = median(offsets);
  const mad = median(offsets.map((o) => Math.abs(o - med))) || 0.005;
  const used = offsets.filter((o) => Math.abs(o - med) <= 2.5 * mad + 0.01);
  const offsetSec = median(used);
  const spreadSec = quantile(used, 0.9) - quantile(used, 0.1);
  return { offsetSec, used, discarded: offsets.length - used.length, spreadSec, tooHigh: offsetSec > 0.1, ok: used.length >= 4 && spreadSec < 0.12 };
}

export interface TuningResult {
  /** Global offset from equal temperament at A4 = 440 (cents, -50..50 after removing whole semitones). */
  cents: number;
  /** Whole-semitone offset (keyboard transpose on?). */
  semitones: number;
  ok: boolean;
}

/** Tuning from pitch readings (fractional MIDI) while the learner holds A4 (69). */
export function computeTuning(midiReadings: readonly number[], expected = 69): TuningResult {
  if (midiReadings.length < 10) return { cents: 0, semitones: 0, ok: false };
  const med = median(midiReadings);
  const dev = med - expected;
  const semitones = Math.round(dev);
  const cents = Math.round((dev - semitones) * 100);
  const spread = quantile(midiReadings, 0.9) - quantile(midiReadings, 0.1);
  return { cents, semitones, ok: spread < 0.3 };
}

const LAYOUTS = [
  { keys: 61, low: 36, high: 96 },
  { keys: 49, low: 36, high: 84 },
  { keys: 76, low: 28, high: 103 },
  { keys: 88, low: 21, high: 108 },
  { keys: 37, low: 48, high: 84 },
  { keys: 32, low: 53, high: 84 },
  { keys: 25, low: 48, high: 72 },
];

export interface RangeResult {
  low: number;
  high: number;
  keys: number;
  /** Octave shift relative to the standard layout with the same number of keys (mic). */
  octaveOffset: number;
}

/** Range from the lowest and highest keys played; detects a keyboard octave shift. */
export function computeRange(lowHeard: number, highHeard: number): RangeResult {
  const low = Math.min(lowHeard, highHeard);
  const high = Math.max(lowHeard, highHeard);
  const keys = high - low + 1;
  const layout = LAYOUTS.find((l) => l.keys === keys);
  if (layout) {
    const shift = (low - layout.low) / 12;
    if (Number.isInteger(shift) && Math.abs(shift) <= 2) return { low: layout.low, high: layout.high, keys, octaveOffset: shift };
  }
  return { low, high, keys, octaveOffset: 0 };
}

export interface DynamicsResult {
  soft: number;
  medium: number;
  loud: number;
  /** soft < medium < loud with useful separation */
  ok: boolean;
}

/** Dynamics from three soft, three medium and three loud strikes (mic: dB above floor; MIDI: velocity 0-1). */
export function computeDynamics(soft: readonly number[], mediumV: readonly number[], loud: readonly number[], minStep: number): DynamicsResult {
  const s = median(soft);
  const m = median(mediumV);
  const l = median(loud);
  return { soft: s, medium: m, loud: l, ok: m - s >= minStep && l - m >= minStep };
}

/**
 * Per-user MIDI velocity curve: maps raw velocity (0-1) so that the learner's own soft / medium /
 * loud land on 0.3 / 0.6 / 0.9 (piecewise linear, clamped).
 */
export function velocityCurve(cal: { soft: number; medium: number; loud: number } | undefined): (v: number) => number {
  if (!cal || !(cal.soft < cal.medium && cal.medium < cal.loud)) return (v) => v;
  const pts = [
    [0, 0],
    [cal.soft, 0.3],
    [cal.medium, 0.6],
    [cal.loud, 0.9],
    [1, 1],
  ];
  return (v: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      if (v <= x1 || i === pts.length - 1) {
        const t = x1 > x0 ? (v - x0) / (x1 - x0) : 0;
        return Math.max(0, Math.min(1, y0 + t * (y1 - y0)));
      }
    }
    return v;
  };
}

/** Loopback: mic onsets (raw, input clock) vs scheduled click times -> total round-trip latency. */
export function computeLoopback(clickTimes: readonly number[], onsetTimes: readonly number[]): { totalSec: number; matched: number } | null {
  const diffs: number[] = [];
  for (const c of clickTimes) {
    const cands = onsetTimes.map((o) => o - c).filter((d) => d > -0.005 && d < 0.4);
    if (cands.length) diffs.push(Math.min(...cands));
  }
  if (diffs.length < 3) return null;
  return { totalSec: median(diffs), matched: diffs.length };
}
