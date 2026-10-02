import type { Score, TempoPoint, TimeSignature } from '../types';

/**
 * Converts between score beats (quarter notes) and seconds using a tempo map and a
 * practice-tempo factor (1 = written tempo, 0.5 = half speed). Score time is ALWAYS
 * in beats; this is the only place that converts to seconds.
 */
export class TempoMap {
  private readonly points: { beat: number; bpm: number; sec: number }[];

  constructor(tempoMap: readonly TempoPoint[], readonly factor = 1) {
    const sorted = [...tempoMap].filter((p) => p.bpm > 0).sort((a, b) => a.beat - b.beat);
    if (sorted.length === 0 || sorted[0].beat > 0) sorted.unshift({ beat: 0, bpm: sorted[0]?.bpm ?? 120 });
    const pts: { beat: number; bpm: number; sec: number }[] = [];
    let sec = 0;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i > 0) {
        const prev = pts[pts.length - 1];
        sec += ((p.beat - prev.beat) * 60) / (prev.bpm * factor);
        if (p.beat === prev.beat) {
          pts[pts.length - 1] = { beat: p.beat, bpm: p.bpm, sec: prev.sec };
          continue;
        }
      }
      pts.push({ beat: p.beat, bpm: p.bpm, sec });
    }
    this.points = pts;
  }

  withFactor(factor: number): TempoMap {
    return new TempoMap(
      this.points.map((p) => ({ beat: p.beat, bpm: p.bpm })),
      factor,
    );
  }

  private segmentForBeat(beat: number) {
    const pts = this.points;
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (pts[mid].beat <= beat) lo = mid;
      else hi = mid - 1;
    }
    return pts[lo];
  }

  private segmentForSec(sec: number) {
    const pts = this.points;
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (pts[mid].sec <= sec) lo = mid;
      else hi = mid - 1;
    }
    return pts[lo];
  }

  /** Seconds from beat 0 (at practice tempo). Negative beats extrapolate the first tempo. */
  beatToSec(beat: number): number {
    const p = this.segmentForBeat(beat);
    return p.sec + ((beat - p.beat) * 60) / (p.bpm * this.factor);
  }

  secToBeat(sec: number): number {
    const p = this.segmentForSec(sec);
    return p.beat + ((sec - p.sec) * p.bpm * this.factor) / 60;
  }

  /** Written bpm at a beat (not scaled by the factor). */
  bpmAt(beat: number): number {
    return this.segmentForBeat(beat).bpm;
  }

  /** Seconds per beat at a beat, at practice tempo. */
  secPerBeatAt(beat: number): number {
    return 60 / (this.bpmAt(beat) * this.factor);
  }

  durationSec(startBeat: number, durationBeats: number): number {
    return this.beatToSec(startBeat + durationBeats) - this.beatToSec(startBeat);
  }
}

export function timeSignatureAt(sigs: readonly TimeSignature[], beat: number): TimeSignature {
  let cur: TimeSignature = sigs[0] ?? { beat: 0, numerator: 4, denominator: 4 };
  for (const s of sigs) if (s.beat <= beat + 1e-9) cur = s;
  return cur;
}

/** Length of a measure in quarter-note beats. */
export function measureLengthBeats(ts: Pick<TimeSignature, 'numerator' | 'denominator'>): number {
  return (ts.numerator * 4) / ts.denominator;
}

/** Click positions (beats) for the metronome inside [fromBeat, toBeat). */
export function metronomeBeats(
  score: Pick<Score, 'timeSignatures' | 'measures'>,
  fromBeat: number,
  toBeat: number,
  subdivision = 1,
): { beat: number; accent: boolean; sub: boolean }[] {
  const out: { beat: number; accent: boolean; sub: boolean }[] = [];
  for (const m of score.measures) {
    if (m.startBeat + m.lengthBeats <= fromBeat || m.startBeat >= toBeat) continue;
    const ts = timeSignatureAt(score.timeSignatures, m.startBeat);
    // Compound meters (6/8, 9/8, 12/8) count in dotted quarters.
    const compound = ts.denominator === 8 && ts.numerator % 3 === 0 && ts.numerator > 3;
    const pulse = compound ? 1.5 : 4 / ts.denominator;
    const step = pulse / subdivision;
    for (let b = 0; b < m.lengthBeats - 1e-6; b += step) {
      const beat = m.startBeat + b;
      if (beat < fromBeat - 1e-6 || beat >= toBeat - 1e-6) continue;
      const onPulse = Math.abs(b / pulse - Math.round(b / pulse)) < 1e-6;
      out.push({ beat, accent: b < 1e-6, sub: !onPulse });
    }
  }
  return out;
}

export function scoreEndBeat(score: Pick<Score, 'measures' | 'notes'>): number {
  const lastMeasure = score.measures[score.measures.length - 1];
  let end = lastMeasure ? lastMeasure.startBeat + lastMeasure.lengthBeats : 0;
  for (const n of score.notes) end = Math.max(end, n.startBeat + n.durationBeats);
  return end;
}

export function measureAtBeat(score: Pick<Score, 'measures'>, beat: number): number {
  const ms = score.measures;
  let lo = 0;
  let hi = ms.length - 1;
  if (hi < 0) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ms[mid].startBeat <= beat + 1e-9) lo = mid;
    else hi = mid - 1;
  }
  return ms[lo].index;
}

/** Builds measures for a timeline given time signatures and total length. */
export function buildMeasures(sigs: readonly TimeSignature[], endBeat: number) {
  const measures: { index: number; startBeat: number; lengthBeats: number; number: number }[] = [];
  let beat = 0;
  let i = 0;
  const sorted = [...sigs].sort((a, b) => a.beat - b.beat);
  if (sorted.length === 0) sorted.push({ beat: 0, numerator: 4, denominator: 4 });
  while (beat < endBeat - 1e-6 || measures.length === 0) {
    const ts = timeSignatureAt(sorted, beat);
    const len = measureLengthBeats(ts);
    measures.push({ index: i, startBeat: beat, lengthBeats: len, number: i + 1 });
    beat += len;
    i++;
    if (i > 100000) break;
  }
  return measures;
}
