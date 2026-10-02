import { Midi } from '@tonejs/midi';
import type { Score } from '../types';
import { buildMeasures, measureAtBeat } from './tempo';
import { assignHandsBySplit } from './hands';
import { makeId } from './ids';

export interface TimedNote {
  midi: number;
  /** seconds */
  start: number;
  duration: number;
  velocity?: number;
}

/**
 * Turns played/transcribed notes into a Score: estimates the tempo from inter-onset intervals
 * (or uses `bpm`), quantises to a 16th grid, and splits hands at middle C.
 */
export function notesToScore(notes: TimedNote[], opts: { title?: string; bpm?: number; splitPoint?: number } = {}): Score {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const t0 = sorted[0]?.start ?? 0;
  const bpm = opts.bpm ?? estimateBpm(sorted.map((n) => n.start));
  const spb = 60 / bpm;
  const q = (b: number) => Math.round(b * 4) / 4;
  const raw = sorted.map((n) => ({
    midi: n.midi,
    startBeat: q((n.start - t0) / spb),
    durationBeats: Math.max(0.25, q(n.duration / spb)),
    hand: 'unknown' as const as 'L' | 'R' | 'unknown',
    velocity: n.velocity,
  }));
  assignHandsBySplit(raw, opts.splitPoint ?? 60);
  const timeSignatures = [{ beat: 0, numerator: 4, denominator: 4 }];
  const end = Math.max(1, ...raw.map((n) => n.startBeat + n.durationBeats));
  const measures = buildMeasures(timeSignatures, end);
  return {
    id: makeId('take'),
    title: opts.title ?? 'My recording',
    source: 'json',
    tempoMap: [{ beat: 0, bpm: Math.round(bpm) }],
    timeSignatures,
    keySignatures: [{ beat: 0, fifths: 0, mode: 'major' }],
    measures,
    notes: raw.map((n, i) => ({ ...n, id: `n${i}`, measure: measureAtBeat({ measures }, n.startBeat + 1e-6) })),
  };
}

/** Rough tempo: the most common inter-onset interval folded into 60-140 bpm. */
export function estimateBpm(onsets: number[]): number {
  const iois: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const d = onsets[i] - onsets[i - 1];
    if (d > 0.08 && d < 2) iois.push(d);
  }
  if (iois.length < 3) return 90;
  // Histogram of candidate beat lengths.
  const scores = new Map<number, number>();
  for (let bpm = 60; bpm <= 140; bpm += 2) {
    const beat = 60 / bpm;
    let s = 0;
    for (const d of iois) {
      const r = d / beat;
      const nearest = [0.5, 1, 1.5, 2, 3, 4].reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a));
      s += Math.exp(-((r - nearest) ** 2) / 0.01);
    }
    scores.set(bpm, s);
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function notesToMidiFile(notes: TimedNote[], title = 'OpenKeys recording'): Uint8Array {
  const m = new Midi();
  m.header.setTempo(120);
  m.header.name = title;
  const t = m.addTrack();
  t.name = 'Piano';
  const t0 = Math.min(...notes.map((n) => n.start), 0);
  for (const n of notes) t.addNote({ midi: n.midi, time: n.start - t0, duration: Math.max(0.05, n.duration), velocity: n.velocity ?? 0.7 });
  return m.toArray();
}
