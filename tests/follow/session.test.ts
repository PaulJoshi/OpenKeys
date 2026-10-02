import { describe, expect, it } from 'vitest';
import { PracticeSession, type SessionConfig } from '../../src/core/session';
import { Player, type TickSource } from '../../src/core/playback/player';
import { RecordingSink } from '../../src/core/playback/sink';
import type { NoteEvent } from '../../src/core/types';
import { odeRH, chords } from '../synth';

class Ticks implements TickSource {
  cbs = new Set<() => void>();
  onTick(cb: () => void) {
    this.cbs.add(cb);
    return () => this.cbs.delete(cb);
  }
  run() {
    for (const cb of [...this.cbs]) cb();
  }
}

const base: SessionConfig = {
  mode: 'playalong',
  hands: 'R',
  tempoFactor: 1,
  range: null,
  loop: false,
  ramp: { enabled: true, start: 0.6, step: 0.05, target: 1 },
  preset: 'standard',
  source: 'virtual',
  accompaniment: true,
  appAudioAllowed: true,
  metronome: false,
  subdivision: 1,
  countInBars: 0,
  chordWindow: 0.12,
  confidenceThreshold: 0.55,
};

function harness(cfg: Partial<SessionConfig>, score = odeRH()) {
  let t = 1;
  const ticks = new Ticks();
  const sink = new RecordingSink();
  const player = new Player(() => t, ticks, sink, sink);
  player.setScore(score);
  const played: number[] = [];
  const s = new PracticeSession(score, { ...base, ...cfg }, {
    player,
    now: () => t,
    onTick: (cb) => ticks.onTick(cb),
    isHeld: () => false,
    playNow: (notes) => played.push(...notes.map((n) => n.midi)),
  });
  const step = (until: number, onTime?: (t: number) => void) => {
    while (t < until) {
      t += 0.01;
      onTime?.(t);
      ticks.run();
    }
  };
  return { s, player, sink, step, played, now: () => t, score };
}

describe('PracticeSession', () => {
  it('play-along: perfect take produces a 3-star result', () => {
    const h = harness({ mode: 'playalong' });
    let result = null as ReturnType<typeof h.s.stop>;
    h.s.finished.on((r) => (result = r));
    h.s.start();
    const notes = [...h.score.notes];
    let i = 0;
    h.step(25, (now) => {
      while (i < notes.length && h.player.timeline.timeAt(notes[i].startBeat) <= now) {
        const e: NoteEvent = { kind: 'noteOn', midi: notes[i].midi, time: h.player.timeline.timeAt(notes[i].startBeat), velocity: 0.6, confidence: 1, source: 'virtual' };
        h.s.handleNote(e);
        i++;
      }
    });
    expect(result).not.toBeNull();
    expect(result!.accuracy).toBe(1);
    expect(result!.stars).toBe(3);
    expect(h.s.state).toBe('finished');
  });

  it('wait mode plays the other hand as accompaniment on advance', () => {
    const h = harness({ mode: 'wait', hands: 'R' }, chords());
    h.s.start();
    const first = h.s.upcoming(h.now())[0].notes.map((n) => n.midi);
    for (const m of first) h.s.handleNote({ kind: 'noteOn', midi: m, time: h.now(), velocity: 0.6, confidence: 1, source: 'virtual' });
    expect(h.played).toEqual([48]);
  });

  it('loop drill ramps tempo up after clean passes', () => {
    const h = harness({ mode: 'loop', range: { startMeasure: 0, endMeasure: 0 } });
    h.s.start();
    expect(h.s.stats.currentTempo).toBe(0.6);
    const m0 = h.score.notes.filter((n) => n.measure === 0);
    let lastPass = -1;
    const playedAt = new Set<string>();
    h.step(40, (now) => {
      const tl = h.player.timeline;
      const seg = tl.current!;
      for (const n of m0) {
        const t = tl.timeInSegment(seg.startTime, n.startBeat);
        const key = `${seg.startTime.toFixed(3)}:${n.id}`;
        if (t <= now && !playedAt.has(key)) {
          playedAt.add(key);
          h.s.handleNote({ kind: 'noteOn', midi: n.midi, time: t, velocity: 0.6, confidence: 1, source: 'virtual' });
        }
      }
      lastPass = h.s.stats.pass;
    });
    expect(lastPass).toBeGreaterThan(3);
    expect(h.s.stats.cleanPasses).toBeGreaterThan(2);
    expect(h.s.stats.currentTempo).toBeGreaterThan(0.7);
    const r = h.s.stop();
    expect(r!.accuracy).toBeGreaterThan(0.9);
  });
});
