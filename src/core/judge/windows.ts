import type { TimingPreset } from '../settings';
import type { InputSource } from '../types';
import type { TimingVerdict } from './types';

export interface TimingWindows {
  perfect: number; // seconds, +/-
  good: number;
  ok: number;
}

export const TIMING_PRESETS: Record<TimingPreset, TimingWindows> = {
  relaxed: { perfect: 0.06, good: 0.13, ok: 0.22 },
  standard: { perfect: 0.04, good: 0.09, ok: 0.15 },
  strict: { perfect: 0.025, good: 0.06, ok: 0.1 },
};

export interface WindowContext {
  preset: TimingPreset;
  /** Practice tempo factor (0.25-1.5). Slower tempo widens windows proportionally. */
  tempoFactor: number;
  source: InputSource;
  grace?: boolean;
  arpeggiate?: boolean;
}

/**
 * Effective windows: widened proportionally at slower practice tempos (never narrowed above
 * 100%), +20 ms in mic mode, and extra tolerance for grace notes and arpeggiated chords.
 */
export function windowsFor(ctx: WindowContext): TimingWindows {
  const base = TIMING_PRESETS[ctx.preset];
  const scale = 1 / Math.min(1, Math.max(0.25, ctx.tempoFactor));
  const mic = ctx.source === 'mic' ? 0.02 : 0;
  let extra = 0;
  if (ctx.grace) extra += 0.12;
  if (ctx.arpeggiate) extra += 0.1;
  return {
    perfect: base.perfect * scale + mic + extra * 0.5,
    good: base.good * scale + mic + extra,
    ok: base.ok * scale + mic + extra,
  };
}

/** Classifies a timing offset (played - expected, seconds). */
export function classifyOffset(offset: number, w: TimingWindows): TimingVerdict {
  const a = Math.abs(offset);
  if (a <= w.perfect) return 'perfect';
  if (a <= w.good) return 'good';
  if (a <= w.ok) return 'ok';
  return offset < 0 ? 'early' : 'late';
}

/** Window in which a played note can still be matched to an expected note (beyond OK it is early/late). */
export function matchWindow(w: TimingWindows): number {
  return w.ok * 2;
}

export const HIT_VERDICTS: ReadonlySet<TimingVerdict> = new Set(['perfect', 'good', 'ok', 'early', 'late']);

export const TIMING_WEIGHT: Record<TimingVerdict, number> = {
  perfect: 1,
  good: 0.8,
  ok: 0.55,
  early: 0.2,
  late: 0.2,
  wrong: 0,
  missed: 0,
  extra: 0,
  uncertain: 0,
};
