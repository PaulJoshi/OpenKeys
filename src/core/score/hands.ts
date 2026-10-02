import type { Hand, ScoreNote } from '../types';
import { mean } from '../music';

/**
 * Assigns hands for single-track input (MIDI files with one track, ABC without voices).
 *
 * 1. Split at `splitPoint` (default middle C = 60: notes >= split go to the right hand).
 * 2. Smooth with a hand-continuity heuristic: chord clusters are split at the largest gap,
 *    and a note close to the running position of one hand but just across the split point
 *    stays with that hand (a right-hand melody dipping to B3 stays in the right hand).
 */
export function assignHandsBySplit<T extends Pick<ScoreNote, 'midi' | 'startBeat' | 'hand'>>(
  notes: T[],
  splitPoint = 60,
): T[] {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  let lastR = splitPoint + 7; // G4-ish
  let lastL = splitPoint - 12; // C3-ish
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && Math.abs(sorted[j].startBeat - sorted[i].startBeat) < 1e-4) j++;
    const group = sorted.slice(i, j); // ascending pitch
    if (group.length > 1 && group[group.length - 1].midi - group[0].midi > 14) {
      // Wide cluster: split at the largest gap so each hand spans <= an octave+.
      let gapAt = 1;
      let gap = -1;
      for (let k = 1; k < group.length; k++) {
        const g = group[k].midi - group[k - 1].midi;
        // prefer gaps near the split point on ties
        const score = g * 10 - Math.abs((group[k].midi + group[k - 1].midi) / 2 - splitPoint) * 0.01;
        if (score > gap) {
          gap = score;
          gapAt = k;
        }
      }
      for (let k = 0; k < group.length; k++) group[k].hand = k < gapAt ? 'L' : 'R';
    } else {
      for (const n of group) {
        let hand: Hand = n.midi >= splitPoint ? 'R' : 'L';
        // Continuity: within 4 semitones of the split, follow the nearer running hand position.
        if (Math.abs(n.midi - splitPoint) <= 4) {
          hand = Math.abs(n.midi - lastR) <= Math.abs(n.midi - lastL) ? 'R' : 'L';
        }
        n.hand = hand;
      }
    }
    const rs = group.filter((n) => n.hand === 'R').map((n) => n.midi);
    const ls = group.filter((n) => n.hand === 'L').map((n) => n.midi);
    if (rs.length) lastR = 0.6 * lastR + 0.4 * mean(rs);
    if (ls.length) lastL = 0.6 * lastL + 0.4 * mean(ls);
    i = j;
  }
  return notes;
}

/** Two-track files: the track with the higher average pitch is the right hand. */
export function handsForTracks(trackAverages: number[]): Hand[] {
  if (trackAverages.length === 0) return [];
  if (trackAverages.length === 1) return ['unknown'];
  const order = trackAverages.map((avg, i) => ({ avg, i })).sort((a, b) => b.avg - a.avg);
  const out: Hand[] = trackAverages.map(() => 'unknown');
  out[order[0].i] = 'R';
  out[order[order.length - 1].i] = 'L';
  // Middle tracks (3+): nearest of the two.
  for (let k = 1; k < order.length - 1; k++) {
    const t = order[k];
    out[t.i] = Math.abs(t.avg - order[0].avg) < Math.abs(t.avg - order[order.length - 1].avg) ? 'R' : 'L';
  }
  return out;
}
