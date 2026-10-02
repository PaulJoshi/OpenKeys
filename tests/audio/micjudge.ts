import type { Score, ScoreNote, NoteEvent } from '../../src/core/types';
import { MicAnalyzer, defaultAnalyzerConfig } from '../../src/core/input/mic/analyzer';
import { MonoTracker } from '../../src/core/input/mic/mono';
import { ScoreInformedDetector } from '../../src/core/input/mic/scoreinformed';
import { DEFAULT_DETECTOR_PARAMS } from '../../src/core/input/mic/params';
import { PlayAlongFollower } from '../../src/core/follow/playalong';
import { TempoMap } from '../../src/core/score/tempo';
import { summarizeTake } from '../../src/core/judge/scoring';
import type { TakeResult } from '../../src/core/judge/types';
import { SR, quanta, type RenderNote } from './synth';
import type { InstrumentProfile } from '../../src/core/calibration/types';

export interface PerformedNote extends RenderNote {
  /** The score note this is meant to play (undefined = extra). */
  scoreId?: string;
  kind: 'correct' | 'wrong' | 'extra';
}

/** A performance of a score: every note played correctly, with optional mistakes. */
export function perform(score: Score, t0: number, opts: { wrong?: Map<string, number>; skip?: Set<string>; jitter?: (i: number) => number; velocity?: number } = {}): PerformedNote[] {
  const tm = new TempoMap(score.tempoMap);
  return score.notes
    .filter((n) => !opts.skip?.has(n.id))
    .map((n, i) => {
      const w = opts.wrong?.get(n.id);
      return {
        midi: w ?? n.midi,
        start: t0 + tm.beatToSec(n.startBeat) + (opts.jitter?.(i) ?? 0),
        dur: Math.max(0.1, tm.durationSec(n.startBeat, n.durationBeats) * 0.92),
        velocity: opts.velocity ?? 0.6,
        scoreId: n.id,
        kind: w !== undefined ? 'wrong' : 'correct',
      } as PerformedNote;
    });
}

export interface MicJudgeResult {
  take: TakeResult;
  /** Correctly played notes judged as wrong (the honesty metric). */
  falseWrong: number;
  correctPlayed: number;
  /** Correctly played notes judged as a hit. */
  hits: number;
  /** Deliberate mistakes judged as wrong (or not counted as a hit). */
  mistakesCaught: number;
  mistakes: number;
  uncertain: number;
}

/** Runs the full mic judging pipeline (worklet analysis + mono + score-informed + play-along). */
export function judgeMicTake(score: Score, audio: Float32Array, performed: PerformedNote[], t0: number, latency = 0, profile: InstrumentProfile | null = null): MicJudgeResult {
  const tm = new TempoMap(score.tempoMap);
  const timeAt = (b: number) => t0 + tm.beatToSec(b);
  const f = new PlayAlongFollower(score.notes, {
    preset: 'standard',
    tempoFactor: 1,
    source: 'mic',
    timeAt,
    beatAt: (t) => tm.secToBeat(t - t0),
    secPerBeat: (b) => tm.secPerBeatAt(b),
    confidenceThreshold: DEFAULT_DETECTOR_PARAMS.confidenceThreshold,
    judgeRelease: false,
    measures: score.measures,
  });
  const p = DEFAULT_DETECTOR_PARAMS;
  const analyzer = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 2 });
  const mono = new MonoTracker({ latency });
  const det = new ScoreInformedDetector({
    a4: 440,
    octaveOffset: 0,
    latency,
    partials: p.partials,
    inharmonicity: p.inharmonicity,
    partialToleranceCents: p.partialToleranceCents,
    presenceThreshold: p.presenceThreshold,
    wrongNoteThreshold: p.wrongNoteThreshold,
    expected: (now) => f.expectedNear(now),
    profile,
    velocityFor: (snr) => mono.velocityFor(snr, 0),
  });
  let now = 0;
  for (const q of quanta(audio)) {
    for (const fr of analyzer.push(q.block, q.endTime)) {
      now = fr.time - latency;
      const evs: NoteEvent[] = mono.push(fr);
      for (const e of evs) det.onMonoEvent(e);
      const { evidence, wrong } = det.push(fr);
      for (const ev of evidence) f.onEvidence(ev, now);
      for (const w of wrong) f.onNote(w);
      f.tick(now);
    }
  }
  const { results, extras } = f.finish(now);
  const take = summarizeTake(score, results, extras, { scoreId: score.id, mode: 'playalong', hands: 'both', tempoFactor: 1, source: 'mic', startedAt: 0, durationSec: now, timingJudged: true });
  const byId = new Map(results.map((r) => [r.noteId, r]));
  let falseWrong = 0;
  let correct = 0;
  let hits = 0;
  let caught = 0;
  let mistakes = 0;
  let uncertain = 0;
  for (const pn of performed) {
    if (!pn.scoreId) continue;
    const r = byId.get(pn.scoreId);
    if (!r) continue;
    if (pn.kind === 'correct') {
      correct++;
      if (r.verdict === 'wrong') falseWrong++;
      else if (['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict)) hits++;
      else if (r.verdict === 'uncertain') uncertain++;
    } else if (pn.kind === 'wrong') {
      mistakes++;
      if (!['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict)) caught++;
    }
  }
  if (process.env.DUMPX) {
    for (const x of extras.slice(0, 40)) {
      const near = performed.filter((p) => Math.abs(p.start - x.time) < 0.1).map((p) => `${p.midi}${p.kind === 'wrong' ? '!' : ''}@${((x.time - p.start) * 1000).toFixed(0)}`);
      process.stdout.write(`  EXTRA ${x.midi} @${x.time.toFixed(2)} c=${x.confidence.toFixed(2)} near: ${near.join(' ')}\n`);
    }
  }
  if (process.env.DUMP) {
    for (const pn of performed) {
      if (!pn.scoreId || pn.kind !== 'correct') continue;
      const r = byId.get(pn.scoreId);
      if (!r || ['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict)) continue;
      const d = det.debug.get(pn.scoreId);
      process.stdout.write(`  ${r.verdict} ${pn.midi} @${pn.start.toFixed(2)} played=${r.playedMidi ?? '-'} pres=${d ? d.presence.toFixed(2) : 'none'} fresh=${d?.fresh} trap=${d?.octaveTrap.toFixed(2)}\n`);
    }
  }
  return { take, falseWrong, correctPlayed: correct, hits, mistakesCaught: caught, mistakes, uncertain };
}

export function notesOf(score: Score, pred: (n: ScoreNote) => boolean): string[] {
  return score.notes.filter(pred).map((n) => n.id);
}
