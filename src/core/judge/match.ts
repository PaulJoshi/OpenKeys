import { matchWindow, type TimingWindows } from './windows';

export interface ExpectedNote {
  id: string;
  midi: number;
  /** Expected context time (s). */
  time: number;
  windows: TimingWindows;
}

export interface PlayedNote {
  /** Index into the caller's played list. */
  index: number;
  midi: number;
  time: number;
}

export interface MatchResult {
  /** expected id -> played index */
  matched: Map<string, number>;
  /** expected id -> played index of a wrong pitch played in its place */
  wrong: Map<string, number>;
  missed: string[];
  /** played indices that matched nothing */
  extra: number[];
}

/**
 * Offline note matching for play-along takes, solved as an assignment problem.
 *
 * 1. Per pitch, an edit-distance style DP aligns expected and played onsets in time order:
 *    skip expected = missed (cost 1), skip played = extra (cost 1), match within the match
 *    window costs |dt| / window (< 1). This is optimal (nearest-in-time wins, each expected
 *    note matched at most once) and handles repeated notes correctly.
 * 2. Remaining expected notes pair with remaining played notes of another pitch inside the
 *    window (nearest in time first): those are "wrong pitch" with what was played recorded.
 */
export function matchNotes(expected: readonly ExpectedNote[], played: readonly PlayedNote[]): MatchResult {
  const matched = new Map<string, number>();
  const byPitchE = new Map<number, ExpectedNote[]>();
  const byPitchP = new Map<number, PlayedNote[]>();
  for (const e of expected) push(byPitchE, e.midi, e);
  for (const p of played) push(byPitchP, p.midi, p);

  for (const [midi, es] of byPitchE) {
    const ps = byPitchP.get(midi);
    if (!ps) continue;
    es.sort((a, b) => a.time - b.time);
    ps.sort((a, b) => a.time - b.time);
    for (const [ei, pi] of alignDP(es, ps)) matched.set(es[ei].id, ps[pi].index);
  }

  const usedPlayed = new Set(matched.values());
  const leftE = expected.filter((e) => !matched.has(e.id)).sort((a, b) => a.time - b.time);
  const leftP = played.filter((p) => !usedPlayed.has(p.index));
  const wrong = new Map<string, number>();
  // Wrong pitch: candidate pairs sorted by time distance, greedy (each used once).
  const cands: { e: ExpectedNote; p: PlayedNote; d: number }[] = [];
  for (const e of leftE) {
    const win = matchWindow(e.windows);
    for (const p of leftP) {
      const d = Math.abs(p.time - e.time);
      if (d <= win) cands.push({ e, p, d: d + Math.min(12, Math.abs(p.midi - e.midi)) * 0.004 });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  const usedE = new Set<string>();
  for (const c of cands) {
    if (usedE.has(c.e.id) || usedPlayed.has(c.p.index)) continue;
    // A played note that coincides with another (correctly matched) chord tone is more likely
    // a wrong chord tone than a wrong melody note; both are "wrong", so greedy is fine.
    usedE.add(c.e.id);
    usedPlayed.add(c.p.index);
    wrong.set(c.e.id, c.p.index);
  }
  const missed = leftE.filter((e) => !usedE.has(e.id)).map((e) => e.id);
  const extra = played.filter((p) => !usedPlayed.has(p.index)).map((p) => p.index);
  return { matched, wrong, missed, extra };
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const l = m.get(k);
  if (l) l.push(v);
  else m.set(k, [v]);
}

/** Returns index pairs [expectedIdx, playedIdx] of the optimal monotone alignment. */
function alignDP(es: readonly ExpectedNote[], ps: readonly PlayedNote[]): [number, number][] {
  const n = es.length;
  const m = ps.length;
  const W = m + 1;
  const cost = new Float64Array((n + 1) * W);
  const move = new Uint8Array((n + 1) * W); // 1 = skip e, 2 = skip p, 3 = match
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      let best = Infinity;
      let mv = 0;
      if (i > 0) {
        const c = cost[(i - 1) * W + j] + 1;
        if (c < best) {
          best = c;
          mv = 1;
        }
      }
      if (j > 0) {
        const c = cost[i * W + j - 1] + 1;
        if (c < best) {
          best = c;
          mv = 2;
        }
      }
      if (i > 0 && j > 0) {
        const e = es[i - 1];
        const d = Math.abs(ps[j - 1].time - e.time);
        const win = matchWindow(e.windows);
        if (d <= win) {
          const c = cost[(i - 1) * W + j - 1] + d / win;
          if (c < best) {
            best = c;
            mv = 3;
          }
        }
      }
      cost[i * W + j] = best;
      move[i * W + j] = mv;
    }
  }
  const pairs: [number, number][] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const mv = move[i * W + j];
    if (mv === 3) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (mv === 1) i--;
    else j--;
  }
  return pairs.reverse();
}
