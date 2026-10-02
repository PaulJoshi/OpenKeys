import type { Score } from '../../core/types';

/** One OSMD cursor position, in visit order. */
export interface OsmdStep {
  /** Written (source) measure index. */
  measureIndex: number;
  /** Beat inside the measure (quarter notes). */
  relBeat: number;
}

export interface StepMapping {
  /** Sorted performance beats of note onsets (moments). */
  beats: number[];
  /** Step index for each moment. */
  steps: number[];
}

/**
 * Maps performance-order moments (after repeat unrolling) to OSMD cursor steps (which follow
 * the written layout and may or may not unroll repeats themselves). The n-th performance
 * occurrence of a written measure uses the n-th cursor visit of that measure when available,
 * otherwise the last visit.
 */
export function mapMomentsToSteps(score: Pick<Score, 'measures' | 'notes'>, steps: readonly OsmdStep[]): StepMapping {
  // Visits per written measure.
  const visits = new Map<number, { rel: number; step: number }[][]>();
  let prevMeasure = -1;
  steps.forEach((s, i) => {
    let list = visits.get(s.measureIndex);
    if (!list) visits.set(s.measureIndex, (list = []));
    if (s.measureIndex !== prevMeasure || list.length === 0) list.push([]);
    list[list.length - 1].push({ rel: s.relBeat, step: i });
    prevMeasure = s.measureIndex;
  });
  const occurrences = new Map<number, number>();
  const occOf: number[] = score.measures.map((m) => {
    const w = m.sourceIndex ?? m.index;
    const k = occurrences.get(w) ?? 0;
    occurrences.set(w, k + 1);
    return k;
  });
  const beats = Array.from(new Set(score.notes.map((n) => round(n.startBeat)))).sort((a, b) => a - b);
  const out: StepMapping = { beats: [], steps: [] };
  for (const b of beats) {
    const p = measureIndexAt(score.measures, b);
    const m = score.measures[p];
    if (!m) continue;
    const w = m.sourceIndex ?? m.index;
    const v = visits.get(w);
    if (!v || !v.length) continue;
    const visit = v[Math.min(occOf[p], v.length - 1)];
    const rel = b - m.startBeat;
    let pick = visit[0];
    for (const s of visit) if (s.rel <= rel + 0.02) pick = s;
    out.beats.push(b);
    out.steps.push(pick.step);
  }
  return out;
}

function measureIndexAt(measures: Score['measures'], beat: number): number {
  let lo = 0;
  let hi = measures.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measures[mid].startBeat <= beat + 1e-6) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Index of the last moment at or before `beat` (-1 if none). */
export function momentAt(mapping: StepMapping, beat: number): number {
  const b = mapping.beats;
  let lo = 0;
  let hi = b.length - 1;
  if (hi < 0 || b[0] > beat + 1e-4) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (b[mid] <= beat + 1e-4) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function round(x: number) {
  return Math.round(x * 1e4) / 1e4;
}
