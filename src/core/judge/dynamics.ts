import type { Hairpin, Score, ScoreNote } from '../types';
import { median } from '../music';
import type { DynamicsVerdict, NoteResult } from './types';

/** Does the score carry dynamics information worth judging? */
export function scoreHasDynamics(score: Pick<Score, 'notes' | 'hairpins'>): boolean {
  if (score.hairpins?.length) return true;
  const marked = score.notes.filter((n) => n.dynamic).length;
  if (marked > 0) {
    // A single marking throughout (e.g. just "mf") gives nothing to shape.
    const kinds = new Set(score.notes.filter((n) => n.dynamic).map((n) => n.dynamic));
    return kinds.size > 1;
  }
  const vels = score.notes.map((n) => n.velocity).filter((v): v is number => v !== undefined);
  if (vels.length < score.notes.length * 0.8) return false;
  // Velocities that are all the same carry no dynamics.
  return Math.max(...vels) - Math.min(...vels) > 0.12;
}

export interface DynamicsReport {
  perNote: Map<string, DynamicsVerdict>;
  hairpins: { hairpin: Hairpin; ok: boolean; measure: number }[];
  score: number | null;
}

/**
 * Judges RELATIVE dynamics: each note's played loudness relative to the learner's own median is
 * compared with the written level relative to the piece's median, so playing everything a bit
 * louder (or a differently calibrated mic) is not penalised. Hairpins must actually rise/fall.
 */
export function judgeDynamics(
  notes: readonly ScoreNote[],
  results: readonly NoteResult[],
  hairpins: readonly Hairpin[] | undefined,
  tolerance = 0.2,
): DynamicsReport {
  const perNote = new Map<string, DynamicsVerdict>();
  const byId = new Map(notes.map((n) => [n.id, n]));
  const pairs = results
    .filter((r) => r.velocity !== undefined && ['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict))
    .map((r) => ({ r, n: byId.get(r.noteId)! }))
    .filter((x) => x.n && x.n.velocity !== undefined);
  if (pairs.length < 4) return { perNote, hairpins: [], score: null };
  const expMed = median(pairs.map((x) => x.n.velocity!));
  const playMed = median(pairs.map((x) => x.r.velocity!));
  // Scale the learner's spread to the written spread so a timid but shaped performance passes.
  const expSpread = median(pairs.map((x) => Math.abs(x.n.velocity! - expMed))) || 0.1;
  const playSpread = median(pairs.map((x) => Math.abs(x.r.velocity! - playMed))) || 0.1;
  const k = Math.min(2, Math.max(0.5, expSpread / playSpread));
  let ok = 0;
  for (const { r, n } of pairs) {
    const want = n.velocity! - expMed;
    const got = (r.velocity! - playMed) * k;
    const d = got - want;
    const v: DynamicsVerdict = d > tolerance ? 'tooLoud' : d < -tolerance ? 'tooSoft' : 'ok';
    perNote.set(r.noteId, v);
    if (v === 'ok') ok++;
  }
  const hp: DynamicsReport['hairpins'] = [];
  for (const h of hairpins ?? []) {
    const inside = pairs
      .filter((x) => x.n.startBeat >= h.startBeat - 1e-6 && x.n.startBeat <= h.endBeat + 1e-6 && (h.hand === 'unknown' || x.n.hand === h.hand))
      .sort((a, b) => a.n.startBeat - b.n.startBeat);
    if (inside.length < 3) continue;
    const slope = regressionSlope(
      inside.map((x) => x.n.startBeat),
      inside.map((x) => x.r.velocity!),
    );
    const span = inside[inside.length - 1].n.startBeat - inside[0].n.startBeat;
    const rise = slope * span;
    const good = h.type === 'crescendo' ? rise > 0.04 : rise < -0.04;
    hp.push({ hairpin: h, ok: good, measure: inside[0].n.measure });
  }
  const noteScore = ok / pairs.length;
  const hpScore = hp.length ? hp.filter((x) => x.ok).length / hp.length : null;
  const score = hpScore === null ? noteScore : noteScore * 0.7 + hpScore * 0.3;
  return { perNote, hairpins: hp, score };
}

export function regressionSlope(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den > 0 ? num / den : 0;
}
