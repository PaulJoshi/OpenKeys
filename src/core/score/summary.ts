import type { Score } from '../types';
import { keyName, midiToName } from '../music';
import { TempoMap, scoreEndBeat } from './tempo';
import { estimateDifficulty } from './difficulty';
import { noteRange } from './validate';

export interface ImportSummary {
  title: string;
  composer?: string;
  durationSec: number;
  measures: number;
  bpm: number;
  timeSignature: string;
  key: string;
  hands: string;
  range: string;
  lowMidi: number;
  highMidi: number;
  noteCount: number;
  difficulty: number;
}

export function summarize(score: Score): ImportSummary {
  const tm = new TempoMap(score.tempoMap);
  const end = scoreEndBeat(score);
  const r = noteRange(score.notes);
  const hasL = score.notes.some((n) => n.hand === 'L');
  const hasR = score.notes.some((n) => n.hand === 'R');
  const ts = score.timeSignatures[0];
  const ks = score.keySignatures[0];
  return {
    title: score.title,
    composer: score.composer,
    durationSec: tm.beatToSec(end),
    measures: score.measures.length,
    bpm: Math.round(score.tempoMap[0]?.bpm ?? 120),
    timeSignature: ts ? `${ts.numerator}/${ts.denominator}` : '4/4',
    key: ks ? keyName(ks.fifths, ks.mode) : 'C major',
    hands: hasL && hasR ? 'Both hands' : hasL ? 'Left hand' : hasR ? 'Right hand' : 'Unassigned',
    range: `${midiToName(r.low)}–${midiToName(r.high)}`,
    lowMidi: r.low,
    highMidi: r.high,
    noteCount: score.notes.length,
    difficulty: estimateDifficulty(score).level,
  };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
