import type { ExpectedNoteEvidence, NoteEvent, ScoreEvent } from '../types';
import type { ExtraNote, NoteResult, TimingVerdict } from '../judge/types';

export type FollowerFeedback =
  | { type: 'hit'; noteId: string; midi: number; verdict: TimingVerdict; offsetMs?: number; time: number }
  | { type: 'wrong'; midi: number; nearNoteId?: string; time: number; confidence: number }
  | { type: 'extra'; midi: number; time: number; confidence: number }
  | { type: 'miss'; noteId: string; midi: number }
  | { type: 'uncertain'; noteId: string; midi: number }
  | { type: 'advance'; eventIndex: number }
  | { type: 'relocate'; eventIndex: number }
  | { type: 'done' };

export interface Follower {
  readonly kind: 'wait' | 'playalong' | 'followme';
  readonly timingJudged: boolean;
  onNote(e: NoteEvent): FollowerFeedback[];
  onEvidence(e: ExpectedNoteEvidence, now: number): FollowerFeedback[];
  tick(now: number): FollowerFeedback[];
  /** Score position for the views (beats). */
  viewBeat(now: number): number;
  /** The next event(s) the learner should play (for upcoming-key highlights). */
  upcoming(now: number): ScoreEvent[];
  /** Score notes still expected in the timing window (mic score-informed detection). */
  expectedNear(now: number): { id: string; midi: number; time: number }[];
  finish(now: number): { results: NoteResult[]; extras: ExtraNote[] };
  readonly done: boolean;
}
