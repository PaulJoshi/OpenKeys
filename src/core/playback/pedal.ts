import type { PedalMark, ScoreNote } from '../types';

/**
 * Sounding end (in beats) of each note when the sustain pedal is honoured:
 * a note released while the pedal is down keeps sounding until the pedal is lifted.
 */
export function soundingEndBeat(note: Pick<ScoreNote, 'startBeat' | 'durationBeats'>, pedal: readonly PedalMark[] | undefined): number {
  const end = note.startBeat + note.durationBeats;
  if (!pedal || pedal.length === 0) return end;
  let down = false;
  for (const p of pedal) {
    if (p.beat > end + 1e-6) break;
    down = p.down;
  }
  if (!down) return end;
  for (const p of pedal) if (p.beat > end + 1e-6 && !p.down) return p.beat;
  return end + 4;
}
