import { parseAbc } from '../../src/core/score/abc';
import { BUILT_IN_SONGS } from '../../src/core/content/songs';
import { monoTestSet, transcribeMono } from '../audio/pipeline';
import { renderSalamander, ffmpegAvailable } from '../audio/salamander';
import { synthPiano, addNoise, addReverb, laptopSpeaker, gain, quanta, SR } from '../audio/synth';
import { evaluate, type TranscriptionMetrics } from '../audio/metrics';
import { perform, judgeMicTake } from '../audio/micjudge';
import { profileKeys, measureKeyTemplate, buildProfile } from '../../src/core/calibration/profile';
import { MicAnalyzer, defaultAnalyzerConfig } from '../../src/core/input/mic/analyzer';
import { DEFAULT_DETECTOR_PARAMS as P } from '../../src/core/input/mic/params';
import type { InstrumentProfile } from '../../src/core/calibration/types';

export const laptopChain = (a: Float32Array) => gain(addNoise(addReverb(laptopSpeaker(a), 0.5, 0.25), 35), -12);

export type MonoCondition = 'synth' | 'line' | 'laptop';

export function renderFor(cond: MonoCondition, notes: Parameters<typeof synthPiano>[0], total: number): Float32Array | null {
  if (cond === 'synth') return synthPiano(notes, total);
  if (!ffmpegAvailable()) return null;
  const a = renderSalamander(notes, total);
  if (!a) return null;
  return cond === 'line' ? a : laptopChain(a);
}

export function pool(ms: TranscriptionMetrics[]): TranscriptionMetrics & { sets: number } {
  const sum = (k: keyof TranscriptionMetrics) => ms.reduce((s, m) => s + (m[k] as number), 0);
  const matched = sum('matched');
  const detected = sum('detected');
  const reference = sum('reference');
  const precision = detected ? matched / detected : 0;
  const recall = reference ? matched / reference : 0;
  const wmean = (k: keyof TranscriptionMetrics) => ms.reduce((s, m) => s + (m[k] as number) * m.matched, 0) / Math.max(1, matched);
  return {
    sets: ms.length,
    reference,
    detected,
    matched,
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    octaveErrors: sum('octaveErrors'),
    octaveErrorRate: reference ? sum('octaveErrors') / reference : 0,
    onsetErrorMedianMs: wmean('onsetErrorMedianMs'),
    onsetErrorP95Ms: Math.max(...ms.map((m) => m.onsetErrorP95Ms)),
    falseWrongRate: reference ? ms.reduce((s, m) => s + m.falseWrongRate * m.reference, 0) / reference : 0,
  };
}

export function monoSuite(cond: MonoCondition, sets = monoTestSet()) {
  const ms: TranscriptionMetrics[] = [];
  for (const s of sets) {
    const audio = renderFor(cond, s.notes, s.total);
    if (!audio) return null;
    ms.push(evaluate(s.notes, transcribeMono(audio).events));
  }
  return pool(ms);
}

export const CHORD_DRILL = `X:1
T:Chord drill
M:4/4
L:1/2
Q:1/4=80
K:C
V:1
[CEG] [CFA] | [B,DG] [CEG] | [EGc] [FAc] | [DGB] [EGc] | [CEGc] [CFAc] | [B,DFG] [CEGc] |]
V:2 clef=bass
C, F, | G,, C, | C, F, | G,, C, | C, F, | G,, C, |]
`;

export function chordPieces() {
  return [
    ['Chord drill (3-4 notes + bass)', parseAbc(CHORD_DRILL)],
    ['Ode to Joy, easy two hands', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'ode')!.easy)],
    ['Twinkle, full (LH triads)', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'twinkle')!.full!)],
    ['Minuet in G, easy two hands', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'minuetG')!.easy)],
  ] as const;
}

export function simulatedProfile(chain: (a: Float32Array) => Float32Array): InstrumentProfile | null {
  if (!ffmpegAvailable()) return null;
  const keys = profileKeys(36, 96);
  const notes = keys.map((m, i) => ({ midi: m, start: 0.5 + i * 1.2, dur: 0.8, velocity: 0.6 }));
  const raw = renderSalamander(notes, 0.5 + keys.length * 1.2 + 1);
  if (!raw) return null;
  const audio = chain(raw);
  const a = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 2 });
  const spectra: { t: number; s: Float32Array }[] = [];
  for (const q of quanta(audio)) for (const f of a.push(q.block, q.endTime)) if (f.spectrum) spectra.push({ t: f.time, s: new Float32Array(f.spectrum) });
  return buildProfile(
    notes.map((n) => ({ midi: n.midi, partialsDb: measureKeyTemplate(spectra.filter((x) => x.t > n.start + 0.08 && x.t < n.start + 0.4).map((x) => x.s), n.midi, P.partials, P.inharmonicity) })),
    P.partials,
  );
}

export interface ChordRow {
  piece: string;
  condition: string;
  correctPlayed: number;
  hits: number;
  falseWrong: number;
  uncertain: number;
  mistakes: number;
  mistakesCaught: number;
  extras: number;
  f1: number;
  accuracyClean: number;
}

/** Clean + mistakes takes of one piece in one condition, pooled. */
export function chordRun(name: string, score: ReturnType<typeof parseAbc>, condition: string, chain: (a: Float32Array) => Float32Array, profile: InstrumentProfile | null): ChordRow | null {
  let row: ChordRow = { piece: name, condition, correctPlayed: 0, hits: 0, falseWrong: 0, uncertain: 0, mistakes: 0, mistakesCaught: 0, extras: 0, f1: 0, accuracyClean: 0 };
  for (const variant of ['clean', 'mistakes']) {
    const wrong = new Map<string, number>();
    if (variant === 'mistakes') score.notes.forEach((n, i) => i % 7 === 3 && wrong.set(n.id, n.midi + (i % 2 ? 1 : -2)));
    const perf = perform(score, 0.5, { wrong });
    const end = Math.max(...perf.map((p) => p.start + p.dur)) + 1;
    const raw = renderSalamander(perf, end);
    if (!raw) return null;
    const r = judgeMicTake(score, chain(raw), perf, 0.5, 0, profile);
    row = {
      ...row,
      correctPlayed: row.correctPlayed + r.correctPlayed,
      hits: row.hits + r.hits,
      falseWrong: row.falseWrong + r.falseWrong,
      uncertain: row.uncertain + r.uncertain,
      mistakes: row.mistakes + r.mistakes,
      mistakesCaught: row.mistakesCaught + r.mistakesCaught,
      extras: row.extras + r.take.extraCount,
      accuracyClean: variant === 'clean' ? r.take.accuracy : row.accuracyClean,
    };
  }
  const tp = row.hits;
  const fn = row.correctPlayed - row.hits;
  const fp = row.mistakes - row.mistakesCaught + row.extras;
  row.f1 = (2 * tp) / Math.max(1, 2 * tp + fp + fn);
  return row;
}
