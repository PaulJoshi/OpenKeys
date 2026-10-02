/**
 * Core types shared by every OpenKeys module.
 *
 * Everything in `src/core` is plain TypeScript: no React, no DOM, so it can be
 * unit-tested with recorded or synthetic event streams.
 */

export type InputSource = 'midi' | 'mic' | 'virtual';

export interface NoteEvent {
  kind: 'noteOn' | 'noteOff' | 'pedal';
  /** 21-108 for notes; for pedal events, the CC number (64 sustain, 66 sostenuto, 67 soft). */
  midi: number;
  /** Seconds on the AudioContext clock, latency-corrected. */
  time: number;
  /** 0-1. MIDI: exact. Mic: estimated from onset energy. For pedal: CC value / 127. */
  velocity?: number;
  /** 0-1. MIDI and virtual are always 1. */
  confidence: number;
  source: InputSource;
  /** Mic only: deviation from equal temperament (after tuning calibration). */
  cents?: number;
  /** Mic only: the detector is unsure whether this is the written octave. */
  octaveUncertain?: boolean;
}

/** Mic mode, score-informed: evidence that an EXPECTED note is sounding. */
export interface ExpectedNoteEvidence {
  scoreNoteId: string;
  midi: number;
  /** 0-1 harmonic-template match strength. */
  presence: number;
  /** When a fresh attack was detected for it. */
  onsetTime?: number;
  /** Estimated velocity 0-1 of that attack. */
  velocity?: number;
}

export type Dynamic = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff';
export type Hand = 'L' | 'R' | 'unknown';
export type Finger = 1 | 2 | 3 | 4 | 5;

export interface ScoreNote {
  id: string;
  midi: number;
  startBeat: number;
  durationBeats: number;
  /** Index into `Score.measures` (performance order, after repeat unrolling). */
  measure: number;
  hand: Hand;
  finger?: Finger;
  /** 0-1, from MIDI or derived from dynamics markings. */
  velocity?: number;
  dynamic?: Dynamic;
  /** Judged as held, not re-struck. */
  tiedFromPrevious?: boolean;
  /** Lenient timing. */
  grace?: boolean;
  /** Part of an arpeggiated (rolled) chord: lenient chord window. */
  arpeggiate?: boolean;
  /** Beat in the written (un-unrolled) layout; used to map back to the sheet. */
  sourceBeat?: number;
  /** Measure index in the written layout. */
  sourceMeasure?: number;
}

export interface TempoPoint {
  beat: number;
  bpm: number;
}

export interface TimeSignature {
  beat: number;
  numerator: number;
  denominator: number;
}

export interface KeySignature {
  beat: number;
  fifths: number;
  mode: 'major' | 'minor';
}

export interface Measure {
  index: number;
  startBeat: number;
  lengthBeats: number;
  /** Written measure index this performance measure comes from (repeat unrolling). */
  sourceIndex?: number;
  /** Measure number as printed. */
  number?: number;
}

export interface Section {
  name: string;
  startMeasure: number;
  endMeasure: number;
}

/** A crescendo/diminuendo wedge, in performance beats. */
export interface Hairpin {
  type: 'crescendo' | 'diminuendo';
  startBeat: number;
  endBeat: number;
  hand: Hand;
}

export interface PedalMark {
  /** CC64 down/up in beats (from MIDI files or MusicXML pedal markings). */
  beat: number;
  down: boolean;
}

export type ScoreSourceFormat = 'musicxml' | 'midi' | 'abc' | 'json';

export interface Score {
  id: string;
  title: string;
  composer?: string;
  /** Shown in the library; required for bundled songs. */
  license?: string;
  source: ScoreSourceFormat;
  /** Beats are quarter notes. */
  tempoMap: TempoPoint[];
  timeSignatures: TimeSignature[];
  keySignatures: KeySignature[];
  measures: Measure[];
  notes: ScoreNote[];
  sections?: Section[];
  hairpins?: Hairpin[];
  pedal?: PedalMark[];
  /** Original MusicXML (for sheet rendering with the written layout, repeats included). */
  musicxml?: string;
  /** Original ABC text, if imported from ABC. */
  abc?: string;
  /** Free-form tags, e.g. "lesson-2", "built-in". */
  tags?: string[];
  /** Graded version label, e.g. "Right hand", "Easy", "Original". */
  variant?: string;
  /** Groups the graded versions of the same piece. */
  pieceId?: string;
}

/** Notes sharing a startBeat and hand: a single note or a chord. */
export interface ScoreEvent {
  /** Stable index in performance order. */
  index: number;
  startBeat: number;
  hand: Hand;
  notes: ScoreNote[];
  measure: number;
}

export type PracticeMode = 'listen' | 'wait' | 'playalong' | 'followme' | 'loop' | 'free';
export type HandSelection = 'both' | 'L' | 'R';
