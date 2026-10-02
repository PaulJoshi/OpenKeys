import { describe, expect, it } from 'vitest';
import { TempoMap, metronomeBeats, buildMeasures, measureAtBeat } from '../../src/core/score/tempo';

describe('TempoMap', () => {
  it('converts at constant tempo', () => {
    const tm = new TempoMap([{ beat: 0, bpm: 120 }]);
    expect(tm.beatToSec(4)).toBeCloseTo(2);
    expect(tm.secToBeat(2)).toBeCloseTo(4);
  });
  it('applies the practice-tempo factor', () => {
    const tm = new TempoMap([{ beat: 0, bpm: 120 }], 0.5);
    expect(tm.beatToSec(4)).toBeCloseTo(4);
    expect(tm.withFactor(1).beatToSec(4)).toBeCloseTo(2);
  });
  it('handles tempo changes', () => {
    const tm = new TempoMap([
      { beat: 0, bpm: 60 },
      { beat: 4, bpm: 120 },
    ]);
    expect(tm.beatToSec(4)).toBeCloseTo(4);
    expect(tm.beatToSec(8)).toBeCloseTo(6);
    expect(tm.secToBeat(5)).toBeCloseTo(6);
    expect(tm.secPerBeatAt(5)).toBeCloseTo(0.5);
    for (const b of [0, 1.5, 4, 7.25, 10]) expect(tm.secToBeat(tm.beatToSec(b))).toBeCloseTo(b);
  });
  it('extrapolates negative beats (count-in)', () => {
    const tm = new TempoMap([{ beat: 0, bpm: 60 }]);
    expect(tm.beatToSec(-4)).toBeCloseTo(-4);
  });
});

describe('measures and metronome', () => {
  it('builds measures across time signature changes', () => {
    const ms = buildMeasures(
      [
        { beat: 0, numerator: 4, denominator: 4 },
        { beat: 8, numerator: 3, denominator: 4 },
      ],
      14,
    );
    expect(ms.map((m) => m.startBeat)).toEqual([0, 4, 8, 11]);
    expect(measureAtBeat({ measures: ms }, 9)).toBe(2);
  });
  it('accents downbeats and counts 6/8 in dotted quarters', () => {
    const score = { timeSignatures: [{ beat: 0, numerator: 6, denominator: 8 }], measures: [{ index: 0, startBeat: 0, lengthBeats: 3 }] };
    const clicks = metronomeBeats(score, 0, 3);
    expect(clicks.map((c) => c.beat)).toEqual([0, 1.5]);
    expect(clicks[0].accent).toBe(true);
    expect(metronomeBeats(score, 0, 3, 3).filter((c) => c.sub)).toHaveLength(4);
  });
});
