import { describe, expect, it } from 'vitest';
import { WaitFollower } from '../../src/core/follow/wait';
import { FollowMeFollower } from '../../src/core/follow/followme';
import { summarizeTake } from '../../src/core/judge/scoring';
import type { NoteEvent } from '../../src/core/types';
import { odeRH, chords } from '../synth';

const on = (midi: number, time: number): NoteEvent => ({ kind: 'noteOn', midi, time, velocity: 0.6, confidence: 1, source: 'virtual' });

describe('wait follower', () => {
  it('waits for each note and advances only on the right one', () => {
    const s = odeRH();
    const held = new Set<number>();
    const f = new WaitFollower(s.notes, { chordWindow: 0.12, isHeld: (m) => held.has(m), minConfidence: 0.5, loop: false });
    expect(f.current!.notes[0].midi).toBe(64);
    let fb = f.onNote(on(62, 1)); // wrong
    expect(fb[0].type).toBe('wrong');
    expect(f.index).toBe(0);
    fb = f.onNote(on(64, 2));
    expect(fb.some((x) => x.type === 'advance')).toBe(true);
    expect(f.index).toBe(1);
    // Play the rest correctly
    let t = 3;
    while (!f.done) {
      f.onNote(on(f.current!.notes[0].midi, t));
      t += 0.5;
    }
    const { results } = f.finish();
    expect(results).toHaveLength(s.notes.length);
    expect(results[0].verdict).toBe('wrong');
    expect(results[0].playedMidi).toBe(62);
    expect(results.slice(1).every((r) => r.verdict === 'perfect')).toBe(true);
    const take = summarizeTake(s, results, [], { scoreId: s.id, mode: 'wait', hands: 'R', tempoFactor: 1, source: 'virtual', startedAt: 0, durationSec: 30, timingJudged: false });
    expect(take.accuracy).toBeCloseTo((s.notes.length - 1) / s.notes.length);
  });

  it('accepts a chord struck together, or found note by note while held', () => {
    const s = chords();
    const held = new Set<number>();
    const f = new WaitFollower(s.notes, { chordWindow: 0.12, isHeld: (m) => held.has(m), minConfidence: 0.5, loop: false });
    // First moment: C3 + C4 E4 G4 (both hands)
    expect(f.current!.notes.map((n) => n.midi).sort()).toEqual([48, 60, 64, 67]);
    for (const m of [48, 60, 64, 67]) f.onNote(on(m, 1 + m * 0.0001));
    expect(f.index).toBe(1);
    // Second: find notes one by one, holding them
    const notes = f.current!.notes.map((n) => n.midi);
    let t = 3;
    for (const m of notes) {
      held.add(m);
      f.onNote(on(m, t));
      t += 0.8;
    }
    expect(f.index).toBe(2);
    // Third: notes one by one, released in between -> not a chord, must replay together
    held.clear();
    const third = f.current!.notes.map((n) => n.midi);
    for (const m of third) {
      f.onNote(on(m, t));
      t += 0.8;
    }
    expect(f.index).toBe(2);
    for (const m of third) f.onNote(on(m, t + 0.01));
    expect(f.index).toBe(3);
  });

  it('loops back to the start', () => {
    const s = chords();
    const f = new WaitFollower(s.notes.filter((n) => n.hand === 'L'), { chordWindow: 0.12, isHeld: () => false, minConfidence: 0.5, loop: true });
    let t = 0;
    for (let i = 0; i < 5; i++) f.onNote(on(f.current!.notes[0].midi, (t += 1)));
    expect(f.index).toBe(1);
    expect(f.pass).toBe(1);
  });
});

describe('follow-me follower', () => {
  const s = odeRH();
  const mk = () =>
    new FollowMeFollower(s.notes, { preset: 'standard', source: 'virtual', initialSecPerBeat: 0.5, chordWindow: 0.12, minConfidence: 0.5, relocateLookbackBeats: 16 });

  it('follows rubato without penalising it', () => {
    const f = mk();
    let t = 5;
    let spb = 0.5;
    for (const n of s.notes) {
      // Gradual ritardando: each beat 3% longer
      f.onNote(on(n.midi, t));
      spb *= 1.03;
      t += n.durationBeats * spb;
    }
    const { results } = f.finish();
    expect(results).toHaveLength(s.notes.length);
    expect(results.every((r) => ['perfect', 'good', 'ok'].includes(r.verdict))).toBe(true);
    const good = results.filter((r) => ['perfect', 'good'].includes(r.verdict)).length;
    expect(good / results.length).toBeGreaterThan(0.85);
    expect(f.localSecPerBeat).toBeGreaterThan(0.6);
  });

  it('relocates when the learner restarts a phrase', () => {
    const f = mk();
    let t = 0;
    const play = (from: number, to: number) => {
      for (let i = from; i < to; i++) {
        f.onNote(on(s.notes[i].midi, t));
        t += 0.5;
      }
    };
    play(0, 10); // into bar 3
    // Restart from bar 2 (note index 4: G F E D)
    const fb = [] as ReturnType<typeof f.onNote>;
    for (let i = 4; i < 8; i++) {
      fb.push(...f.onNote(on(s.notes[i].midi, t)));
      t += 0.5;
    }
    expect(fb.some((x) => x.type === 'relocate')).toBe(true);
    expect(f.index).toBe(8);
  });

  it('marks skipped notes as missed and keeps going', () => {
    const f = mk();
    let t = 0;
    for (let i = 0; i < s.notes.length; i++) {
      if (i === 5) continue;
      f.onNote(on(s.notes[i].midi, t));
      t += 0.5;
    }
    const { results } = f.finish();
    expect(results.find((r) => r.noteId === s.notes[5].id)!.verdict).toBe('missed');
    expect(f.done).toBe(true);
  });
});
