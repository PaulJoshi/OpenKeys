import type { InputSource, Score } from '../types';
import type { ExtraNote, NoteResult, TakeResult, TroubleSpot } from './types';
import { HIT_VERDICTS, TIMING_WEIGHT } from './windows';
import { coach } from './coaching';
import { judgeDynamics, scoreHasDynamics } from './dynamics';

export interface TakeMeta {
  scoreId: string;
  mode: string;
  hands: string;
  tempoFactor: number;
  source: InputSource;
  startedAt: number;
  durationSec: number;
  /** Wait mode does not judge timing. */
  timingJudged: boolean;
}

export function starsFor(accuracy: number, timing: number | null): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.95 && (timing === null || timing >= 0.75)) return 3;
  if (accuracy >= 0.85) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}

/** Turns per-note verdicts into the after-take summary: scores, stars, heatmap, trouble spots, coaching. */
export function summarizeTake(score: Score, results: NoteResult[], extras: ExtraNote[], meta: TakeMeta): TakeResult {
  const judged = results.filter((r) => r.verdict !== 'uncertain');
  const hits = judged.filter((r) => HIT_VERDICTS.has(r.verdict));
  // Extra notes count against accuracy, gently (half a note each) so a slip doesn't dominate.
  const denom = judged.length + extras.length * 0.5;
  const accuracy = denom > 0 ? hits.length / denom : 0;
  const timing = meta.timingJudged && hits.length ? hits.reduce((s, r) => s + TIMING_WEIGHT[r.verdict], 0) / hits.length : meta.timingJudged ? 0 : null;

  let dynamicsScore: number | null = null;
  let dynReport = null;
  if (meta.timingJudged && scoreHasDynamics(score)) {
    dynReport = judgeDynamics(score.notes, results, score.hairpins);
    for (const r of results) {
      const d = dynReport.perNote.get(r.noteId);
      if (d) r.dynamics = d;
    }
    dynamicsScore = dynReport.score;
  }

  const measureAccuracy = new Map<number, number>();
  const perMeasure = new Map<number, { hit: number; total: number; timing: number }>();
  for (const r of judged) {
    const m = perMeasure.get(r.measure) ?? { hit: 0, total: 0, timing: 0 };
    m.total++;
    if (HIT_VERDICTS.has(r.verdict)) {
      m.hit++;
      m.timing += TIMING_WEIGHT[r.verdict];
    }
    perMeasure.set(r.measure, m);
  }
  for (const x of extras) {
    const m = perMeasure.get(x.measure) ?? { hit: 0, total: 0, timing: 0 };
    m.total += 0.5;
    perMeasure.set(x.measure, m);
  }
  for (const [m, v] of perMeasure) measureAccuracy.set(m, v.total ? v.hit / v.total : 1);

  const troubleSpots = findTroubleSpots(score, results, extras, perMeasure, meta);
  const coaching = coach(score, results, { timingJudged: meta.timingJudged, dynamics: dynReport });

  // Longest streak of hits in time order.
  let longest = 0;
  let cur = 0;
  for (const r of [...results].sort((a, b) => a.startBeat - b.startBeat)) {
    if (r.verdict === 'uncertain') continue;
    if (HIT_VERDICTS.has(r.verdict)) longest = Math.max(longest, ++cur);
    else cur = 0;
  }

  return {
    scoreId: meta.scoreId,
    mode: meta.mode,
    hands: meta.hands,
    tempoFactor: meta.tempoFactor,
    source: meta.source,
    startedAt: meta.startedAt,
    durationSec: meta.durationSec,
    notes: results,
    extras,
    accuracy,
    timing: timing ?? 1,
    dynamics: dynamicsScore,
    stars: starsFor(accuracy, meta.timingJudged ? timing : null),
    measureAccuracy,
    troubleSpots,
    coaching,
    uncertainCount: results.length - judged.length,
    wrongCount: results.filter((r) => r.verdict === 'wrong').length,
    missedCount: results.filter((r) => r.verdict === 'missed').length,
    extraCount: extras.length,
    longestStreak: longest,
  };
}

function findTroubleSpots(
  score: Score,
  results: NoteResult[],
  extras: ExtraNote[],
  perMeasure: Map<number, { hit: number; total: number; timing: number }>,
  meta: TakeMeta,
): TroubleSpot[] {
  const quality = (m: number) => {
    const v = perMeasure.get(m);
    if (!v || v.total < 1) return null;
    const acc = v.hit / v.total;
    const tim = v.hit ? v.timing / v.hit : 0;
    return { acc, q: meta.timingJudged ? acc * 0.7 + tim * 0.3 : acc, n: v.total };
  };
  const cands: { a: number; b: number; q: number; acc: number }[] = [];
  const measures = [...perMeasure.keys()].sort((a, b) => a - b);
  for (const m of measures) {
    const one = quality(m);
    if (one && one.n >= 2) cands.push({ a: m, b: m, q: one.q, acc: one.acc });
    const two = quality(m + 1);
    if (one && two && one.n + two.n >= 3) {
      cands.push({ a: m, b: m + 1, q: (one.q * one.n + two.q * two.n) / (one.n + two.n) + 0.02, acc: (one.acc * one.n + two.acc * two.n) / (one.n + two.n) });
    }
  }
  cands.sort((x, y) => x.q - y.q);
  const out: TroubleSpot[] = [];
  for (const c of cands) {
    if (c.q >= 0.85) break;
    if (out.some((o) => !(c.b < o.startMeasure || c.a > o.endMeasure))) continue;
    const inSpot = results.filter((r) => r.measure >= c.a && r.measure <= c.b);
    const counts = { wrong: 0, missed: 0, timing: 0 };
    for (const r of inSpot) {
      if (r.verdict === 'wrong') counts.wrong++;
      else if (r.verdict === 'missed') counts.missed++;
      else if (r.verdict === 'early' || r.verdict === 'late') counts.timing++;
    }
    const extrasIn = extras.filter((x) => x.measure >= c.a && x.measure <= c.b).length;
    const reason =
      counts.wrong >= Math.max(counts.missed, counts.timing) && counts.wrong > 0
        ? 'wrong notes'
        : counts.missed >= counts.timing && counts.missed > 0
          ? 'missed notes'
          : counts.timing > 0
            ? 'timing'
            : extrasIn > 0
              ? 'extra notes'
              : 'accuracy';
    const suggested = Math.max(0.4, Math.round(Math.min(meta.tempoFactor, 1) * 0.8 * 20) / 20);
    out.push({ startMeasure: c.a, endMeasure: c.b, accuracy: c.acc, suggestedTempo: suggested, reason });
    if (out.length >= 3) break;
  }
  void score;
  return out;
}
