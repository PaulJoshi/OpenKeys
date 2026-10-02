import type { FollowerFeedback } from '../../core/follow/types';
import type { Score } from '../../core/types';
import { midiToName } from '../../core/music';

/** Short, specific, encouraging copy for live feedback. Never just "Wrong!". */
export function feedbackText(fb: FollowerFeedback, score: Score, streak: number): string | null {
  const flats = (score.keySignatures[0]?.fifths ?? 0) < 0;
  const name = (m: number) => midiToName(m, flats);
  switch (fb.type) {
    case 'hit':
      if (streak > 0 && streak % 10 === 0) return `${streak} in a row!`;
      switch (fb.verdict) {
        case 'perfect':
          return 'Perfect';
        case 'good':
          return 'Good';
        case 'ok':
          return 'Got it';
        case 'early':
          return 'A touch early: wait for the beat';
        case 'late':
          return 'A little late: look ahead';
        default:
          return null;
      }
    case 'wrong': {
      const near = fb.nearNoteId ? score.notes.find((n) => n.id === fb.nearNoteId) : undefined;
      if (!near) return `That was ${name(fb.midi)}`;
      const d = fb.midi - near.midi;
      const dir = d > 0 ? 'lower' : 'higher';
      if (Math.abs(d) === 12) return `${name(fb.midi)}: right note, wrong octave (try ${name(near.midi)})`;
      return `That was ${name(fb.midi)}; try ${name(near.midi)}, ${Math.abs(d) === 1 ? 'one key' : `${Math.abs(d)} keys`} ${dir}`;
    }
    case 'extra':
      return `Extra note ${name(fb.midi)}`;
    case 'miss': {
      return `Missed ${name(fb.midi)}; keep going`;
    }
    case 'uncertain':
      return 'Not sure I heard that clearly';
    case 'relocate':
      return 'Picked you up from there';
    default:
      return null;
  }
}
