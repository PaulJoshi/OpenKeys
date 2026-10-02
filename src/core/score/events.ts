import type { Hand, HandSelection, Score, ScoreEvent, ScoreNote } from '../types';

const EPS = 1e-4;

/**
 * Groups notes that share a startBeat and hand into score events (single note or chord),
 * in performance order. Tied continuations are excluded: they never need re-striking.
 * Events of different hands at the same beat stay separate events but share a startBeat.
 */
export function buildScoreEvents(notes: readonly ScoreNote[], hands: HandSelection = 'both'): ScoreEvent[] {
  const playable = notes
    .filter((n) => !n.tiedFromPrevious)
    .filter((n) => hands === 'both' || n.hand === hands || (n.hand === 'unknown' && hands === 'R'))
    .sort((a, b) => a.startBeat - b.startBeat || handOrder(a.hand) - handOrder(b.hand) || a.midi - b.midi);
  const events: ScoreEvent[] = [];
  for (const n of playable) {
    const last = events[events.length - 1];
    if (last && Math.abs(last.startBeat - n.startBeat) < EPS && last.hand === n.hand) {
      if (!last.notes.some((x) => x.midi === n.midi)) last.notes.push(n);
      continue;
    }
    events.push({ index: events.length, startBeat: n.startBeat, hand: n.hand, notes: [n], measure: n.measure });
  }
  return events;
}

function handOrder(h: Hand): number {
  return h === 'L' ? 0 : h === 'R' ? 1 : 2;
}

/**
 * Merges events of all hands that start together into "moments" (what wait mode waits for:
 * with both hands selected, both hands' notes at the same beat must be played).
 */
export function buildMoments(events: readonly ScoreEvent[]): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.startBeat - e.startBeat) < EPS) {
      for (const n of e.notes) if (!last.notes.some((x) => x.midi === n.midi)) last.notes.push(n);
      if (last.hand !== e.hand) last.hand = 'unknown';
      continue;
    }
    out.push({ ...e, index: out.length, notes: [...e.notes] });
  }
  return out;
}

export function notesForHands(score: Score, hands: HandSelection): ScoreNote[] {
  if (hands === 'both') return score.notes;
  return score.notes.filter((n) => n.hand === hands || (n.hand === 'unknown' && hands === 'R'));
}

export function otherHandNotes(score: Score, hands: HandSelection): ScoreNote[] {
  if (hands === 'both') return [];
  return score.notes.filter((n) => !(n.hand === hands || (n.hand === 'unknown' && hands === 'R')));
}

/** Notes (incl. tied continuations) whose sounding span covers `beat`. */
export function notesSoundingAt(notes: readonly ScoreNote[], beat: number): ScoreNote[] {
  return notes.filter((n) => n.startBeat <= beat + EPS && n.startBeat + n.durationBeats > beat + EPS);
}

export function notesInMeasures(notes: readonly ScoreNote[], from: number, to: number): ScoreNote[] {
  return notes.filter((n) => n.measure >= from && n.measure <= to);
}

/** Returns the full held length of a note including tied continuations that follow it. */
export function tiedLengthBeats(notes: readonly ScoreNote[], note: ScoreNote): number {
  let end = note.startBeat + note.durationBeats;
  let found = true;
  while (found) {
    found = false;
    for (const n of notes) {
      if (n.tiedFromPrevious && n.midi === note.midi && Math.abs(n.startBeat - end) < EPS) {
        end = n.startBeat + n.durationBeats;
        found = true;
        break;
      }
    }
  }
  return end - note.startBeat;
}
