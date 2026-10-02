import type { InputSource } from '../types';

/** Timing/pitch verdict for one expected note (or one extra played note). */
export type TimingVerdict = 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'wrong' | 'missed' | 'extra' | 'uncertain';

export type DynamicsVerdict = 'ok' | 'tooLoud' | 'tooSoft';

export interface NoteResult {
  noteId: string;
  midi: number;
  hand: 'L' | 'R' | 'unknown';
  measure: number;
  startBeat: number;
  verdict: TimingVerdict;
  /** Played minus expected, ms (positive = late). */
  offsetMs?: number;
  /** For 'wrong': what was played instead. */
  playedMidi?: number;
  playedTime?: number;
  expectedTime?: number;
  velocity?: number;
  releasedEarly?: boolean;
  dynamics?: DynamicsVerdict;
  /** 0-1, from the input source (mic may be < 1). */
  confidence: number;
  source?: InputSource;
}

/** A played note that matched nothing. */
export interface ExtraNote {
  midi: number;
  time: number;
  /** Nearest expected beat (for placing feedback). */
  nearBeat: number;
  measure: number;
  confidence: number;
}

export interface TakeResult {
  scoreId: string;
  mode: string;
  hands: string;
  tempoFactor: number;
  source: InputSource;
  startedAt: number;
  durationSec: number;
  notes: NoteResult[];
  extras: ExtraNote[];
  /** 0-1: correct pitch hits / judged notes. */
  accuracy: number;
  /** 0-1: timing quality of hits. */
  timing: number;
  /** 0-1 or null if the piece has no dynamics. */
  dynamics: number | null;
  stars: 0 | 1 | 2 | 3;
  /** measure index -> 0-1 accuracy (only measures with judged notes). */
  measureAccuracy: Map<number, number>;
  troubleSpots: TroubleSpot[];
  coaching: string[];
  /** Notes judged uncertain (mic), not counted against the learner. */
  uncertainCount: number;
  wrongCount: number;
  missedCount: number;
  extraCount: number;
  longestStreak: number;
}

export interface TroubleSpot {
  startMeasure: number;
  endMeasure: number;
  accuracy: number;
  /** Suggested practice tempo factor for the loop. */
  suggestedTempo: number;
  reason: string;
}
