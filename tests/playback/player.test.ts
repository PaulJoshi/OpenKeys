import { describe, expect, it } from 'vitest';
import { Player, type TickSource } from '../../src/core/playback/player';
import { RecordingSink, ScheduledAudioLog } from '../../src/core/playback/sink';
import { soundingEndBeat } from '../../src/core/playback/pedal';
import type { Score } from '../../src/core/types';

function makeScore(): Score {
  return {
    id: 't',
    title: 't',
    source: 'json',
    tempoMap: [{ beat: 0, bpm: 120 }],
    timeSignatures: [{ beat: 0, numerator: 4, denominator: 4 }],
    keySignatures: [{ beat: 0, fifths: 0, mode: 'major' }],
    measures: [
      { index: 0, startBeat: 0, lengthBeats: 4 },
      { index: 1, startBeat: 4, lengthBeats: 4 },
    ],
    notes: [
      { id: 'a', midi: 60, startBeat: 0, durationBeats: 1, measure: 0, hand: 'R' },
      { id: 'b', midi: 48, startBeat: 0, durationBeats: 4, measure: 0, hand: 'L' },
      { id: 'c', midi: 62, startBeat: 1, durationBeats: 1, measure: 0, hand: 'R' },
      { id: 'd', midi: 64, startBeat: 4, durationBeats: 4, measure: 1, hand: 'R' },
    ],
  };
}

class FakeTicks implements TickSource {
  cbs = new Set<() => void>();
  onTick(cb: () => void) {
    this.cbs.add(cb);
    return () => this.cbs.delete(cb);
  }
  run() {
    for (const cb of [...this.cbs]) cb();
  }
}

function setup() {
  let t = 10;
  const ticks = new FakeTicks();
  const sink = new RecordingSink();
  const log = new ScheduledAudioLog();
  const p = new Player(() => t, ticks, sink, sink, log);
  p.setScore(makeScore());
  const advance = (until: number) => {
    while (t < until) {
      t += 0.025;
      ticks.run();
    }
  };
  return { p, sink, log, advance, now: () => t };
}

describe('Player', () => {
  it('schedules notes ahead with count-in at practice tempo', () => {
    const { p, sink, advance } = setup();
    p.configure({ tempoFactor: 0.5, countInBars: 1, metronome: false });
    const start = p.start(0);
    // 1 bar of 4/4 at 60 bpm effective = 4 s count-in
    expect(start).toBeCloseTo(10.12 + 4);
    expect(sink.clicks).toHaveLength(4);
    expect(sink.clicks[0].accent).toBe(true);
    advance(start + 2.5);
    const c = sink.notes.find((n) => n.midi === 62)!;
    expect(c.time).toBeCloseTo(start + 1); // beat 1 at 60 bpm
    expect(c.duration).toBeCloseTo(1);
    advance(start + 20);
    expect(p.state).toBe('stopped');
  });

  it('mutes hands and plays only the accompaniment hand', () => {
    const { p, sink, advance } = setup();
    p.configure({ audibleHands: 'L', countInBars: 0 });
    const start = p.start(0);
    advance(start + 5);
    expect(sink.notes.map((n) => n.midi)).toEqual([48]);
  });

  it('loops and ramps tempo at each wrap', () => {
    const { p, sink, advance } = setup();
    p.configure({ loop: { startBeat: 0, endBeat: 4 }, countInBars: 0, audibleHands: 'R', tempoFactor: 1 });
    const wraps: number[] = [];
    p.loopWrap.on((w) => wraps.push(w.time));
    p.onLoopFactor = () => 0.5;
    const start = p.start(0);
    advance(start + 2 + 4 + 0.1);
    expect(wraps[0]).toBeCloseTo(start + 2);
    const cs = sink.notes.filter((n) => n.midi === 62);
    expect(cs[0].time).toBeCloseTo(start + 0.5);
    expect(cs[1].time).toBeCloseTo(start + 2 + 1); // half speed after wrap
    expect(p.timeline.beatAt(start + 2 + 1)).toBeCloseTo(1);
    p.stop();
  });

  it('reports key down and up times for each scheduled note (ties held, pedal ignored)', () => {
    const { p, advance } = setup();
    const score = makeScore();
    score.notes.push({ id: 'e', midi: 64, startBeat: 8, durationBeats: 2, measure: 1, hand: 'R', tiedFromPrevious: true });
    score.measures.push({ index: 2, startBeat: 8, lengthBeats: 4 });
    score.pedal = [
      { beat: 0, down: true },
      { beat: 4, down: false },
    ];
    p.setScore(score);
    p.configure({ countInBars: 0, tempoFactor: 1 });
    const keys: { midi: number; time: number; upTime: number }[] = [];
    p.scheduled.on((k) => keys.push(k));
    const start = p.start(0);
    advance(start + 7);
    const c = keys.find((k) => k.midi === 60)!;
    expect(c.time).toBeCloseTo(start);
    expect(c.upTime).toBeCloseTo(start + 0.5); // one beat at 120 bpm, not held to the pedal lift
    const e = keys.find((k) => k.midi === 64)!;
    expect(e.upTime - e.time).toBeCloseTo(3); // 4 beats tied into 2 more
    expect(keys.filter((k) => k.midi === 64)).toHaveLength(1);
  });

  it('logs clicks for mic gating', () => {
    const { p, log, advance } = setup();
    p.configure({ metronome: true, countInBars: 0 });
    const start = p.start(0);
    advance(start + 1);
    expect(log.clickNear(start + 0.01)).toBe(true);
    expect(log.clickNear(start + 0.25)).toBe(false);
    expect(log.soundingAt(start + 0.2)).toContain(60);
  });
});

describe('pedal', () => {
  it('extends notes released under the pedal', () => {
    const pedal = [
      { beat: 0, down: true },
      { beat: 3, down: false },
    ];
    expect(soundingEndBeat({ startBeat: 0, durationBeats: 1 }, pedal)).toBe(3);
    expect(soundingEndBeat({ startBeat: 3.5, durationBeats: 1 }, pedal)).toBe(4.5);
  });
});
