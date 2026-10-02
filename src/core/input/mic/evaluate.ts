import type { NoteEvent } from '../../types';
import { median, quantile } from '../../music';

export interface ReferenceNote {
  midi: number;
  start: number;
  dur?: number;
}

export interface TranscriptionMetrics {
  reference: number;
  detected: number;
  matched: number;
  precision: number;
  recall: number;
  f1: number;
  octaveErrors: number;
  octaveErrorRate: number;
  onsetErrorMedianMs: number;
  onsetErrorP95Ms: number;
  /** Correctly played notes that were reported with the wrong pitch (would be marked wrong). */
  falseWrongRate: number;
}

/**
 * Standard transcription matching: a detection matches a reference note if the pitch is right
 * and the onset is within 50 ms (each reference used once, nearest first).
 */
export function evaluate(ref: ReferenceNote[], det: NoteEvent[], tolerance = 0.05, minConfidence = 0): TranscriptionMetrics {
  const ons = det.filter((e) => e.kind === 'noteOn' && e.confidence >= minConfidence);
  const used = new Set<number>();
  const errors: number[] = [];
  let matched = 0;
  let octave = 0;
  let falseWrong = 0;
  const sortedRef = [...ref].sort((a, b) => a.start - b.start);
  for (const r of sortedRef) {
    let best = -1;
    let bd = Infinity;
    ons.forEach((e, i) => {
      if (used.has(i) || e.midi !== r.midi) return;
      const d = Math.abs(e.time - r.start);
      if (d <= tolerance && d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      used.add(best);
      matched++;
      errors.push((ons[best].time - r.start) * 1000);
      continue;
    }
    // Not matched: was something with another pitch reported at that time?
    const other = ons.findIndex((e, i) => !used.has(i) && Math.abs(e.time - r.start) <= tolerance);
    if (other >= 0) {
      falseWrong++;
      if (Math.abs(ons[other].midi - r.midi) % 12 === 0) octave++;
      used.add(other);
    }
  }
  const precision = ons.length ? matched / ons.length : 0;
  const recall = ref.length ? matched / ref.length : 0;
  const abs = errors.map(Math.abs);
  return {
    reference: ref.length,
    detected: ons.length,
    matched,
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    octaveErrors: octave,
    octaveErrorRate: ref.length ? octave / ref.length : 0,
    onsetErrorMedianMs: abs.length ? median(abs) : NaN,
    onsetErrorP95Ms: abs.length ? quantile(abs, 0.95) : NaN,
    falseWrongRate: ref.length ? falseWrong / ref.length : 0,
  };
}
