import type { Score, ScoreNote } from '../types';
import { keySignatureAccidentals, median, midiToName, pitchClass } from '../music';
import type { NoteResult } from './types';
import type { DynamicsReport } from './dynamics';
import { HIT_VERDICTS } from './windows';

const NUMBER_WORDS = ['zero', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times'];

function times(n: number): string {
  return NUMBER_WORDS[n] ?? `${n} times`;
}

function bars(score: Pick<Score, 'measures'>, a: number, b: number): string {
  const num = (i: number) => score.measures[i]?.number ?? i + 1;
  return a === b ? `bar ${num(a)}` : `bars ${num(a)}–${num(b)}`;
}

function durationClass(beats: number): string | null {
  if (Math.abs(beats - 0.5) < 0.06) return 'eighth notes';
  if (Math.abs(beats - 0.25) < 0.04) return 'sixteenth notes';
  if (Math.abs(beats - 1) < 0.08) return 'quarter notes';
  if (Math.abs(beats - 1 / 3) < 0.04) return 'triplets';
  return null;
}

/**
 * Pattern-level coaching from the verdict log: at most a few short, specific, encouraging
 * sentences, most useful first.
 */
export function coach(
  score: Pick<Score, 'notes' | 'measures' | 'keySignatures'>,
  results: readonly NoteResult[],
  opts: { timingJudged: boolean; dynamics?: DynamicsReport | null; maxTips?: number } = { timingJudged: true },
): string[] {
  const tips: { weight: number; text: string }[] = [];
  const notesById = new Map<string, ScoreNote>(score.notes.map((n) => [n.id, n]));
  const hits = results.filter((r) => HIT_VERDICTS.has(r.verdict) && r.offsetMs !== undefined);

  if (opts.timingJudged) {
    // 1. A hand consistently early/late.
    for (const hand of ['L', 'R'] as const) {
      const offs = hits.filter((r) => r.hand === hand).map((r) => r.offsetMs!);
      if (offs.length >= 6) {
        const med = median(offs);
        const consistent = offs.filter((o) => Math.sign(o) === Math.sign(med) && Math.abs(o) > 20).length / offs.length;
        if (Math.abs(med) >= 45 && consistent >= 0.6) {
          const name = hand === 'L' ? 'left' : 'right';
          tips.push({
            weight: Math.abs(med) / 10,
            text: `Your ${name} hand is consistently about ${Math.round(Math.abs(med) / 10) * 10} ms ${med > 0 ? 'late' : 'early'}${med > 0 ? ': try anticipating the beat a little.' : ': relax and let the beat come to you.'}`,
          });
        }
      }
    }
    // 2. Rushing / dragging a rhythm in a run of bars.
    const byClass = new Map<string, Map<number, number[]>>();
    for (const r of hits) {
      const n = notesById.get(r.noteId);
      if (!n) continue;
      const cls = durationClass(n.durationBeats);
      if (!cls) continue;
      const m = byClass.get(cls) ?? new Map<number, number[]>();
      const arr = m.get(r.measure) ?? [];
      arr.push(r.offsetMs!);
      m.set(r.measure, arr);
      byClass.set(cls, m);
    }
    for (const [cls, perMeasure] of byClass) {
      for (const dir of [-1, 1]) {
        const flagged = [...perMeasure.entries()]
          .filter(([, offs]) => offs.length >= 2 && dir * median(offs) > 40)
          .map(([m]) => m)
          .sort((a, b) => a - b);
        const run = longestRun(flagged);
        if (run && run[1] - run[0] >= 1) {
          tips.push({
            weight: 5 + (run[1] - run[0]),
            text: `You ${dir < 0 ? 'rush' : 'drag'} the ${cls} in ${bars(score, run[0], run[1])}; ${dir < 0 ? 'count the subdivisions out loud' : 'keep them moving'} and try it with the metronome.`,
          });
        }
      }
    }
    // 3. Rolled chords.
    const chords = new Map<string, NoteResult[]>();
    for (const r of results) {
      if (!HIT_VERDICTS.has(r.verdict) || r.playedTime === undefined) continue;
      const key = `${r.hand}:${r.startBeat.toFixed(3)}`;
      const l = chords.get(key) ?? [];
      l.push(r);
      chords.set(key, l);
    }
    const chordList = [...chords.values()].filter((c) => c.length >= 2 && !c.some((r) => notesById.get(r.noteId)?.arpeggiate));
    if (chordList.length >= 3) {
      const rolled = chordList.filter((c) => {
        const ts = c.map((r) => r.playedTime!);
        return Math.max(...ts) - Math.min(...ts) > 0.06;
      }).length;
      if (rolled / chordList.length >= 0.5) tips.push({ weight: 6, text: 'Chords are rolled; try striking all the notes of a chord together.' });
    }
  }

  // 4. A recurring wrong pitch.
  const confusions = new Map<string, { exp: number; played: number; count: number; midiExp: number }>();
  for (const r of results) {
    if (r.verdict !== 'wrong' || r.playedMidi === undefined) continue;
    const key = `${pitchClass(r.midi)}>${pitchClass(r.playedMidi)}`;
    const c = confusions.get(key) ?? { exp: pitchClass(r.midi), played: pitchClass(r.playedMidi), count: 0, midiExp: r.midi };
    c.count++;
    confusions.set(key, c);
  }
  const fifths = score.keySignatures[0]?.fifths ?? 0;
  const keyAcc = keySignatureAccidentals(fifths);
  for (const c of confusions.values()) {
    if (c.count < 3) continue;
    const semis = ((c.played - c.exp + 12) % 12);
    const flats = fifths < 0;
    const expName = midiToName(c.exp + 60, flats, false);
    const playedName = midiToName(c.played + 60, flats, false);
    let hint = '';
    if (semis === 1 || semis === 11) {
      // Pitch classes the key signature produces (e.g. F# in G major).
      let fromKey = false;
      for (const [natural, dir] of keyAcc) if ((natural + dir + 12) % 12 === c.exp && natural === c.played) fromKey = true;
      hint = fromKey ? ' (check the key signature)' : ' (watch the accidental)';
    }
    tips.push({ weight: 4 + c.count, text: `${expName} was played as ${playedName} ${times(c.count)}${hint}.` });
  }

  // 5. Octave errors.
  const octave = results.filter((r) => r.verdict === 'wrong' && r.playedMidi !== undefined && Math.abs(r.playedMidi - r.midi) === 12).length;
  if (octave >= 2) tips.push({ weight: 3 + octave, text: `${octave} notes were played an octave off; check your hand position before you start.` });

  // 6. Missed notes concentrated in one hand.
  const missed = results.filter((r) => r.verdict === 'missed');
  if (missed.length >= 4) {
    const l = missed.filter((r) => r.hand === 'L').length;
    const share = l / missed.length;
    if (share >= 0.75 || share <= 0.25) {
      const hand = share >= 0.75 ? 'left' : 'right';
      tips.push({ weight: 4, text: `Most missed notes were in the ${hand} hand; try that hand on its own for a few passes.` });
    }
  }

  // 7. Released early.
  const early = results.filter((r) => r.releasedEarly);
  if (early.length >= 2) {
    const ms = early.map((r) => r.measure).sort((a, b) => a - b);
    tips.push({ weight: 3, text: `Hold the long notes for their full value (${bars(score, ms[0], ms[ms.length - 1])}).` });
  }

  // 8. Dynamics.
  const dyn = opts.dynamics;
  if (dyn) {
    for (const h of dyn.hairpins.filter((x) => !x.ok).slice(0, 1)) {
      tips.push({
        weight: 4,
        text: `The ${h.hairpin.type} in ${bars(score, h.measure, h.measure)} didn't ${h.hairpin.type === 'crescendo' ? 'grow' : 'fade'}; let it ${h.hairpin.type === 'crescendo' ? 'get louder' : 'get softer'} gradually.`,
      });
    }
    const loud = [...dyn.perNote.values()].filter((v) => v === 'tooLoud').length;
    const soft = [...dyn.perNote.values()].filter((v) => v === 'tooSoft').length;
    const total = dyn.perNote.size;
    if (total >= 8 && soft / total > 0.3) tips.push({ weight: 3, text: 'The loud passages could be bolder; give the forte notes more weight.' });
    else if (total >= 8 && loud / total > 0.3) tips.push({ weight: 3, text: 'The quiet passages are a bit loud; play the piano markings more gently.' });
  }

  tips.sort((a, b) => b.weight - a.weight);
  const out = tips.slice(0, opts.maxTips ?? 3).map((t) => t.text);
  const judged = results.filter((r) => r.verdict !== 'uncertain');
  const good = judged.filter((r) => HIT_VERDICTS.has(r.verdict)).length;
  if (judged.length && good / judged.length >= 0.95 && out.length === 0) out.push('Clean take! Try it a little faster next time.');
  return out;
}

function longestRun(sorted: number[]): [number, number] | null {
  if (!sorted.length) return null;
  let best: [number, number] = [sorted[0], sorted[0]];
  let cur: [number, number] = [sorted[0], sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === cur[1] + 1) cur = [cur[0], sorted[i]];
    else cur = [sorted[i], sorted[i]];
    if (cur[1] - cur[0] > best[1] - best[0]) best = cur;
  }
  return best;
}
