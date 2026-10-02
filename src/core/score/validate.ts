import type { Score, ScoreNote } from '../types';

export interface KeyboardRange {
  low: number;
  high: number;
}

export const DEFAULT_RANGE: KeyboardRange = { low: 36, high: 96 }; // C2-C7, 61 keys (Casio CT-S1)

export interface RangeReport {
  low: number;
  high: number;
  outOfRange: ScoreNote[];
  /** Semitone shift (multiple of 12) that fits the whole piece, if any. */
  suggestedTranspose: number | null;
}

export function noteRange(notes: readonly ScoreNote[]): { low: number; high: number } {
  let low = 127;
  let high = 0;
  for (const n of notes) {
    low = Math.min(low, n.midi);
    high = Math.max(high, n.midi);
  }
  return notes.length ? { low, high } : { low: 60, high: 60 };
}

export function checkRange(score: Score, range: KeyboardRange): RangeReport {
  const { low, high } = noteRange(score.notes);
  const outOfRange = score.notes.filter((n) => n.midi < range.low || n.midi > range.high);
  let suggestedTranspose: number | null = null;
  if (outOfRange.length && high - low <= range.high - range.low) {
    for (const shift of [12, -12, 24, -24, 36, -36]) {
      if (low + shift >= range.low && high + shift <= range.high) {
        suggestedTranspose = shift;
        break;
      }
    }
  }
  return { low, high, outOfRange, suggestedTranspose };
}

/** Moves out-of-range notes by octaves into range (duplicates that collide are dropped). */
export function octaveFold(score: Score, range: KeyboardRange): Score {
  const seen = new Set<string>();
  const notes: ScoreNote[] = [];
  for (const n of score.notes) {
    let midi = n.midi;
    while (midi < range.low) midi += 12;
    while (midi > range.high) midi -= 12;
    const key = `${n.startBeat.toFixed(4)}:${midi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push(midi === n.midi ? n : { ...n, midi });
  }
  return { ...score, notes };
}

export function transposeScore(score: Score, semitones: number): Score {
  return {
    ...score,
    notes: score.notes.map((n) => ({ ...n, midi: n.midi + semitones })),
    // Key signature moves by the circle of fifths: +1 semitone = +7 fifths (mod 12).
    keySignatures: score.keySignatures.map((k) => {
      let f = k.fifths + ((semitones * 7) % 12);
      while (f > 6) f -= 12;
      while (f < -6) f += 12;
      return { ...k, fifths: f };
    }),
    // The written layout no longer matches; the sheet view regenerates from notes.
    musicxml: semitones % 12 === 0 && score.musicxml ? score.musicxml : undefined,
  };
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

/** Structural validation of an internal Score. */
export function validateScore(score: Score): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!score.id) issues.push({ level: 'error', message: 'Score has no id.' });
  if (!score.title) issues.push({ level: 'warning', message: 'Score has no title.' });
  if (score.notes.length === 0) issues.push({ level: 'error', message: 'Score contains no notes.' });
  if (score.tempoMap.length === 0) issues.push({ level: 'warning', message: 'No tempo; assuming 120 bpm.' });
  if (score.measures.length === 0) issues.push({ level: 'error', message: 'Score has no measures.' });
  const ids = new Set<string>();
  for (const n of score.notes) {
    if (ids.has(n.id)) issues.push({ level: 'error', message: `Duplicate note id ${n.id}.` });
    ids.add(n.id);
    if (!(n.midi >= 0 && n.midi <= 127)) issues.push({ level: 'error', message: `Invalid pitch ${n.midi}.` });
    if (!(n.durationBeats > 0)) issues.push({ level: 'error', message: `Note ${n.id} has no duration.` });
    if (!(n.startBeat >= 0)) issues.push({ level: 'error', message: `Note ${n.id} starts before 0.` });
  }
  return issues;
}
