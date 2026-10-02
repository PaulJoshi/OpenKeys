import { describe, expect, it } from 'vitest';
import { PlayAlongFollower } from '../../src/core/follow/playalong';
import { TempoMap } from '../../src/core/score/tempo';
import { summarizeTake } from '../../src/core/judge/scoring';
import type { NoteEvent, Score } from '../../src/core/types';
import type { FollowerFeedback } from '../../src/core/follow/types';
import { odeRH, chords, perform } from '../synth';

function run(score: Score, events: NoteEvent[], opts: { factor?: number; source?: 'mic' | 'virtual' } = {}) {
  const tm = new TempoMap(score.tempoMap, opts.factor ?? 1);
  const t0 = 10;
  const timeAt = (b: number) => t0 + tm.beatToSec(b);
  const f = new PlayAlongFollower(score.notes, {
    preset: 'standard',
    tempoFactor: opts.factor ?? 1,
    source: opts.source ?? 'virtual',
    timeAt,
    beatAt: (t) => tm.secToBeat(t - t0),
    secPerBeat: (b) => tm.secPerBeatAt(b),
    confidenceThreshold: 0.55,
    judgeRelease: true,
    measures: score.measures,
  });
  const live: FollowerFeedback[] = [];
  let now = t0 - 1;
  const end = timeAt(score.measures.at(-1)!.startBeat + 4) + 1;
  let ei = 0;
  while (now < end) {
    now += 0.01;
    while (ei < events.length && events[ei].time <= now) live.push(...f.onNote(events[ei++]));
    live.push(...f.tick(now));
  }
  const { results, extras } = f.finish(now);
  const take = summarizeTake(score, results, extras, {
    scoreId: score.id, mode: 'playalong', hands: 'R', tempoFactor: opts.factor ?? 1, source: 'virtual', startedAt: 0, durationSec: 10, timingJudged: true,
  });
  return { take, live, timeAt, results };
}

describe('play-along follower', () => {
  const score = odeRH();
  const tm = new TempoMap(score.tempoMap);
  const timeAt = (b: number) => 10 + tm.beatToSec(b);

  it('grades perfect play as perfect', () => {
    const { take } = run(score, perform(score.notes, timeAt));
    expect(take.accuracy).toBe(1);
    expect(take.notes.every((r) => r.verdict === 'perfect')).toBe(true);
    expect(take.stars).toBe(3);
    expect(take.troubleSpots).toHaveLength(0);
  });

  it('detects consistently late playing and coaches it', () => {
    const { take } = run(score, perform(score.notes, timeAt, { offset: () => 0.08 }));
    expect(take.accuracy).toBe(1);
    expect(take.notes.filter((r) => r.verdict === 'good').length).toBe(score.notes.length);
    expect(take.coaching.join(' ')).toMatch(/right hand is consistently about 80 ms late/);
  });

  it('marks wrong pitches with what was played', () => {
    // Play every F as E (index 2 and 5 of the first phrase are F4=65)
    const { take } = run(score, perform(score.notes, timeAt, { pitch: (n) => (n.midi === 65 ? 64 : n.midi) }));
    const wrong = take.notes.filter((r) => r.verdict === 'wrong');
    expect(wrong.length).toBe(score.notes.filter((n) => n.midi === 65).length);
    expect(wrong.every((r) => r.playedMidi === 64)).toBe(true);
    expect(take.coaching.join(' ')).toMatch(/F was played as E/);
  });

  it('marks missed notes live and in the result', () => {
    const { take, live } = run(score, perform(score.notes, timeAt, { skip: (_, i) => i === 3 || i === 10 }));
    expect(take.missedCount).toBe(2);
    expect(live.filter((f) => f.type === 'miss')).toHaveLength(2);
    expect(take.troubleSpots.length).toBeGreaterThan(0);
  });

  it('classifies early and late beyond the OK window but inside the match window', () => {
    const { take } = run(score, perform(score.notes, timeAt, { offset: (_, i) => (i === 0 ? -0.2 : i === 1 ? 0.2 : 0) }));
    expect(take.notes[0].verdict).toBe('early');
    expect(take.notes[1].verdict).toBe('late');
  });

  it('counts extra notes', () => {
    const ev = perform(score.notes, timeAt);
    ev.push({ kind: 'noteOn', midi: 90, time: timeAt(30.5), velocity: 0.5, confidence: 1, source: 'virtual' });
    ev.sort((a, b) => a.time - b.time);
    const { take } = run(score, ev);
    expect(take.extraCount).toBe(1);
  });

  it('matches repeated notes optimally (no stealing)', () => {
    // First E (beat 0) played very late (0.25s) and second E (beat 1) on time.
    const { take } = run(score, perform(score.notes, timeAt, { offset: (_, i) => (i === 0 ? 0.25 : 0) }));
    expect(take.notes[1].verdict).toBe('perfect');
    expect(take.notes[0].verdict).toBe('late');
  });

  it('widens windows at slower practice tempo', () => {
    const slowTm = new TempoMap(score.tempoMap, 0.5);
    const slowTimeAt = (b: number) => 10 + slowTm.beatToSec(b);
    const { take } = run(score, perform(score.notes, slowTimeAt, { offset: () => 0.07 }), { factor: 0.5 });
    expect(take.notes.every((r) => r.verdict === 'perfect')).toBe(true);
  });

  it('flags released-too-early on long notes', () => {
    const { take } = run(score, perform(score.notes, timeAt, { holdFraction: 0.2 }));
    const longNotes = take.notes.filter((r) => score.notes.find((n) => n.id === r.noteId)!.durationBeats >= 2);
    expect(longNotes.every((r) => r.releasedEarly)).toBe(true);
    expect(take.coaching.join(' ')).toMatch(/Hold the long notes/);
  });

  it('detects rolled chords', () => {
    const s = chords();
    const ctm = new TempoMap(s.tempoMap);
    const cAt = (b: number) => 10 + ctm.beatToSec(b);
    const lowest = (b: number) => Math.min(...s.notes.filter((x) => x.hand === 'R' && x.startBeat === b).map((x) => x.midi));
    const ev = perform(s.notes, cAt, { offset: (n) => (n.hand === 'R' ? (n.midi - lowest(n.startBeat)) * 0.012 : 0) });
    const { take } = run(s, ev);
    expect(take.accuracy).toBe(1);
    expect(take.coaching.join(' ')).toMatch(/rolled/);
  });

  it('treats low-confidence mic notes as uncertain, never wrong', () => {
    const ev = perform(score.notes, timeAt, { source: 'mic', confidence: 0.3, pitch: (n, i) => (i % 2 ? n.midi + 1 : n.midi) });
    const { take } = run(score, ev, { source: 'mic' });
    expect(take.wrongCount).toBe(0);
    expect(take.uncertainCount).toBeGreaterThan(0);
  });
});
