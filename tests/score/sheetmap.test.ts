// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mapMomentsToSteps, momentAt } from '../../src/ui/practice/sheetmap';
import { parseMusicXml } from '../../src/core/score/musicxml';
import { readFixture } from '../helpers';

describe('sheet step mapping', () => {
  const s = parseMusicXml(readFixture('scores/repeats-two-hands.musicxml'));
  it('maps unrolled moments to cursor visits when OSMD unrolls repeats', () => {
    // Visits as an unrolling cursor would produce: m0, m1, m0, m2, m3, m4
    const steps = [
      { measureIndex: 0, relBeat: 0 }, { measureIndex: 0, relBeat: 1 },
      { measureIndex: 1, relBeat: 0 },
      { measureIndex: 0, relBeat: 0 }, { measureIndex: 0, relBeat: 1 },
      { measureIndex: 2, relBeat: 0 }, { measureIndex: 2, relBeat: 1 },
      { measureIndex: 3, relBeat: 0 },
      { measureIndex: 4, relBeat: 0 },
    ];
    const m = mapMomentsToSteps(s, steps);
    const at = (beat: number) => m.steps[momentAt(m, beat)];
    expect(at(0)).toBe(0);
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(2);
    expect(at(4)).toBe(3); // second time through measure 0
    expect(at(5)).toBe(4);
    expect(at(6)).toBe(5);
  });
  it('falls back to the single visit when the cursor does not unroll', () => {
    const steps = [
      { measureIndex: 0, relBeat: 0 }, { measureIndex: 0, relBeat: 1 },
      { measureIndex: 1, relBeat: 0 },
      { measureIndex: 2, relBeat: 0 }, { measureIndex: 2, relBeat: 1 },
      { measureIndex: 3, relBeat: 0 },
    ];
    const m = mapMomentsToSteps(s, steps);
    expect(m.steps[momentAt(m, 4)]).toBe(0);
    expect(m.steps[momentAt(m, 8)]).toBe(5);
  });
});
