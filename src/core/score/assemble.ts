import type {
  Dynamic,
  Finger,
  Hairpin,
  Hand,
  KeySignature,
  Measure,
  PedalMark,
  Score,
  ScoreNote,
  ScoreSourceFormat,
  Section,
  TempoPoint,
  TimeSignature,
} from '../types';
import { unrollRepeats, type WrittenMeasureFlow } from './repeats';
import { makeId } from './ids';

/** Notes and measures in the WRITTEN layout (before repeat unrolling). */
export interface WrittenNote {
  midi: number;
  startBeat: number;
  durationBeats: number;
  measure: number;
  hand: Hand;
  finger?: Finger;
  velocity?: number;
  dynamic?: Dynamic;
  tieStart?: boolean;
  tieStop?: boolean;
  grace?: boolean;
  arpeggiate?: boolean;
  /** Voice/staff key used to keep tie chains apart. */
  lane?: string;
}

export interface WrittenMeasure extends WrittenMeasureFlow {
  startBeat: number;
  lengthBeats: number;
  number?: number;
}

export interface WrittenScore {
  title: string;
  composer?: string;
  license?: string;
  measures: WrittenMeasure[];
  notes: WrittenNote[];
  tempo: TempoPoint[];
  timeSignatures: TimeSignature[];
  keySignatures: KeySignature[];
  hairpins?: Hairpin[];
  pedal?: PedalMark[];
  sections?: { name: string; measure: number }[];
}

const EPS = 1e-4;

function atBeat<T extends { beat: number }>(list: readonly T[], beat: number): T | undefined {
  let cur: T | undefined;
  for (const x of list) if (x.beat <= beat + EPS) cur = x;
  return cur;
}

/**
 * Unrolls repeats, maps written beats to performance beats, merges ties and produces a Score.
 * The mapping back to the written layout is kept on each note (sourceBeat/sourceMeasure) and
 * measure (sourceIndex), so the sheet view can keep the original layout.
 */
export function assembleScore(
  w: WrittenScore,
  source: ScoreSourceFormat,
  opts: { unroll?: boolean; id?: string } = {},
): Score {
  const order = opts.unroll === false ? w.measures.map((_, i) => i) : unrollRepeats(w.measures);
  const tempo = [...w.tempo].sort((a, b) => a.beat - b.beat);
  const tsigs = [...w.timeSignatures].sort((a, b) => a.beat - b.beat);
  const ksigs = [...w.keySignatures].sort((a, b) => a.beat - b.beat);

  const notesByMeasure = new Map<number, WrittenNote[]>();
  for (const n of w.notes) {
    const list = notesByMeasure.get(n.measure);
    if (list) list.push(n);
    else notesByMeasure.set(n.measure, [n]);
  }

  const measures: Measure[] = [];
  const raw: (ScoreNote & { tieStart?: boolean; tieStop?: boolean; lane?: string })[] = [];
  const tempoMap: TempoPoint[] = [];
  const timeSignatures: TimeSignature[] = [];
  const keySignatures: KeySignature[] = [];
  const hairpins: Hairpin[] = [];
  const pedal: PedalMark[] = [];
  const sectionStarts: { name: string; measure: number }[] = [];

  let perfBeat = 0;
  order.forEach((wi, p) => {
    const wm = w.measures[wi];
    const offset = perfBeat - wm.startBeat;
    const wEnd = wm.startBeat + wm.lengthBeats;
    measures.push({ index: p, startBeat: perfBeat, lengthBeats: wm.lengthBeats, sourceIndex: wi, number: wm.number ?? wi + 1 });

    const t0 = atBeat(tempo, wm.startBeat);
    if (t0) tempoMap.push({ beat: perfBeat, bpm: t0.bpm });
    for (const t of tempo) if (t.beat > wm.startBeat + EPS && t.beat < wEnd - EPS) tempoMap.push({ beat: t.beat + offset, bpm: t.bpm });
    const ts = atBeat(tsigs, wm.startBeat);
    if (ts) timeSignatures.push({ ...ts, beat: perfBeat });
    const ks = atBeat(ksigs, wm.startBeat);
    if (ks) keySignatures.push({ ...ks, beat: perfBeat });
    for (const h of w.hairpins ?? [])
      if (h.startBeat >= wm.startBeat - EPS && h.startBeat < wEnd - EPS)
        hairpins.push({ ...h, startBeat: h.startBeat + offset, endBeat: h.endBeat + offset });
    for (const pd of w.pedal ?? []) if (pd.beat >= wm.startBeat - EPS && pd.beat < wEnd - EPS) pedal.push({ ...pd, beat: pd.beat + offset });
    for (const s of w.sections ?? []) if (s.measure === wi && !sectionStarts.some((x) => x.name === s.name)) sectionStarts.push({ name: s.name, measure: p });

    for (const n of notesByMeasure.get(wi) ?? []) {
      raw.push({
        id: '',
        midi: n.midi,
        startBeat: n.startBeat + offset,
        durationBeats: n.durationBeats,
        measure: p,
        hand: n.hand,
        finger: n.finger,
        velocity: n.velocity,
        dynamic: n.dynamic,
        grace: n.grace || undefined,
        arpeggiate: n.arpeggiate || undefined,
        sourceBeat: n.startBeat,
        sourceMeasure: wi,
        tieStart: n.tieStart,
        tieStop: n.tieStop,
        lane: n.lane,
      });
    }
    perfBeat += wm.lengthBeats;
  });

  // Merge ties into single held notes.
  raw.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const open = new Map<string, (typeof raw)[number]>();
  const notes: ScoreNote[] = [];
  for (const n of raw) {
    const key = `${n.midi}:${n.hand}`;
    if (n.tieStop) {
      const prev = open.get(key);
      if (prev && Math.abs(prev.startBeat + prev.durationBeats - n.startBeat) < 0.01) {
        prev.durationBeats = n.startBeat + n.durationBeats - prev.startBeat;
        if (!n.tieStart) open.delete(key);
        continue;
      }
    }
    if (n.tieStart) open.set(key, n);
    else open.delete(key);
    notes.push(n);
  }

  const cleaned: ScoreNote[] = notes.map((n, i) => {
    const out: ScoreNote = {
      id: `n${i}`,
      midi: n.midi,
      startBeat: round(n.startBeat),
      durationBeats: round(Math.max(n.durationBeats, 1 / 64)),
      measure: n.measure,
      hand: n.hand,
    };
    if (n.finger) out.finger = n.finger;
    if (n.velocity !== undefined) out.velocity = n.velocity;
    if (n.dynamic) out.dynamic = n.dynamic;
    if (n.grace) out.grace = true;
    if (n.arpeggiate) out.arpeggiate = true;
    if (n.sourceBeat !== undefined) out.sourceBeat = round(n.sourceBeat);
    if (n.sourceMeasure !== undefined) out.sourceMeasure = n.sourceMeasure;
    return out;
  });

  const sections: Section[] = sectionStarts.map((s, i) => ({
    name: s.name,
    startMeasure: s.measure,
    endMeasure: i + 1 < sectionStarts.length ? sectionStarts[i + 1].measure - 1 : measures.length - 1,
  }));

  return {
    id: opts.id ?? makeId('score'),
    title: w.title || 'Untitled',
    composer: w.composer || undefined,
    license: w.license,
    source,
    tempoMap: dedupe(tempoMap.length ? tempoMap : [{ beat: 0, bpm: 120 }], (a, b) => a.bpm === b.bpm),
    timeSignatures: dedupe(timeSignatures.length ? timeSignatures : [{ beat: 0, numerator: 4, denominator: 4 }], (a, b) => a.numerator === b.numerator && a.denominator === b.denominator),
    keySignatures: dedupe(keySignatures.length ? keySignatures : [{ beat: 0, fifths: 0, mode: 'major' }], (a, b) => a.fifths === b.fifths && a.mode === b.mode),
    measures,
    notes: cleaned,
    sections: sections.length ? sections : undefined,
    hairpins: hairpins.length ? hairpins : undefined,
    pedal: pedal.length ? pedal : undefined,
  };
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

function dedupe<T extends { beat: number }>(list: T[], same: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (const x of [...list].sort((a, b) => a.beat - b.beat)) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.beat - x.beat) < EPS) out[out.length - 1] = x;
    else if (!last || !same(last, x)) out.push(x);
  }
  return out;
}
