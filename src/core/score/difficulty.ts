import type { Score } from '../types';
import { buildScoreEvents } from './events';
import { TempoMap, scoreEndBeat } from './tempo';
import { keySignatureAccidentals, pitchClass, clamp } from '../music';

export interface DifficultyFeatures {
  notesPerSecond: number;
  rangeSpan: number;
  largestLeap: number;
  chordDensity: number; // share of events with 2+ notes
  accidentalRate: number; // share of notes outside the key signature
  rhythmicComplexity: number; // distinct durations + off-grid onsets
  handIndependence: number; // share of time both hands move at different moments
}

export interface DifficultyEstimate {
  /** 1-10 */
  level: number;
  features: DifficultyFeatures;
}

/** Rates a piece 1-10 from measurable features. Weights are hand-tuned on the bundled songs. */
export function estimateDifficulty(score: Score): DifficultyEstimate {
  const notes = score.notes.filter((n) => !n.tiedFromPrevious);
  if (notes.length === 0) return { level: 1, features: zero() };
  const tm = new TempoMap(score.tempoMap);
  const seconds = Math.max(1, tm.beatToSec(scoreEndBeat(score)));
  const events = buildScoreEvents(notes);
  const notesPerSecond = notes.length / seconds;
  let lo = 127;
  let hi = 0;
  for (const n of notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  const rangeSpan = hi - lo;
  let largestLeap = 0;
  for (const hand of ['L', 'R', 'unknown'] as const) {
    const ev = events.filter((e) => e.hand === hand);
    for (let i = 1; i < ev.length; i++) {
      const a = ev[i - 1].notes[0].midi;
      const b = ev[i].notes[0].midi;
      largestLeap = Math.max(largestLeap, Math.abs(a - b));
    }
  }
  const chordDensity = events.filter((e) => e.notes.length > 1).length / Math.max(1, events.length);
  const ks = keySignatureAccidentals(score.keySignatures[0]?.fifths ?? 0);
  const fifths = score.keySignatures[0]?.fifths ?? 0;
  const scalePcs = new Set<number>();
  // Notes in key: natural notes adjusted by the key signature.
  for (const nat of [0, 2, 4, 5, 7, 9, 11]) scalePcs.add((nat + (ks.get(nat) ?? 0) + 12) % 12);
  void fifths;
  const accidentalRate = notes.filter((n) => !scalePcs.has(pitchClass(n.midi))).length / notes.length;
  const durations = new Set(notes.map((n) => Math.round(n.durationBeats * 12)));
  const offGrid = notes.filter((n) => Math.abs(n.startBeat * 2 - Math.round(n.startBeat * 2)) > 1e-3).length / notes.length;
  const rhythmicComplexity = clamp((durations.size - 1) / 6, 0, 1) * 0.6 + offGrid * 0.4;
  const lStarts = new Set(events.filter((e) => e.hand === 'L').map((e) => e.startBeat.toFixed(3)));
  const rStarts = new Set(events.filter((e) => e.hand === 'R').map((e) => e.startBeat.toFixed(3)));
  let independent = 0;
  let both = 0;
  if (lStarts.size && rStarts.size) {
    for (const s of lStarts) {
      both++;
      if (!rStarts.has(s)) independent++;
    }
    for (const s of rStarts) {
      both++;
      if (!lStarts.has(s)) independent++;
    }
  }
  const handIndependence = both ? independent / both : 0;
  const twoHands = lStarts.size > 0 && rStarts.size > 0 ? 1 : 0;

  const features = { notesPerSecond, rangeSpan, largestLeap, chordDensity, accidentalRate, rhythmicComplexity, handIndependence };
  const raw =
    1 +
    clamp(notesPerSecond / 6, 0, 1) * 3 +
    clamp((rangeSpan - 7) / 30, 0, 1) * 1.2 +
    clamp((largestLeap - 5) / 12, 0, 1) * 1 +
    chordDensity * 1.3 +
    clamp(accidentalRate * 4, 0, 1) * 0.8 +
    rhythmicComplexity * 1.2 +
    twoHands * 0.5 +
    handIndependence * 1;
  return { level: Math.round(clamp(raw, 1, 10)), features };
}

function zero(): DifficultyFeatures {
  return { notesPerSecond: 0, rangeSpan: 0, largestLeap: 0, chordDensity: 0, accidentalRate: 0, rhythmicComplexity: 0, handIndependence: 0 };
}
