import { describe, expect, it } from 'vitest';
import { unrollRepeats } from '../../src/core/score/repeats';

describe('unrollRepeats', () => {
  it('plays simple repeats twice', () => {
    expect(unrollRepeats([{}, { repeatForward: true }, { repeatBackward: 2 }, {}])).toEqual([0, 1, 2, 1, 2, 3]);
  });
  it('repeats from the start when there is no forward repeat', () => {
    expect(unrollRepeats([{}, { repeatBackward: 2 }, {}])).toEqual([0, 1, 0, 1, 2]);
  });
  it('honours repeat times', () => {
    expect(unrollRepeats([{ repeatForward: true, repeatBackward: 3 }])).toEqual([0, 0, 0]);
  });
  it('handles first and second endings', () => {
    expect(unrollRepeats([{}, { endings: [1], repeatBackward: 2 }, { endings: [2] }, {}])).toEqual([0, 1, 0, 2, 3]);
  });
  it('handles D.C. al Fine', () => {
    expect(unrollRepeats([{}, { fine: true }, {}, { daCapo: true }])).toEqual([0, 1, 2, 3, 0, 1]);
  });
  it('handles D.S. al Coda', () => {
    const order = unrollRepeats([{}, { segno: true }, { toCoda: true }, { dalSegno: true }, { coda: true }]);
    expect(order).toEqual([0, 1, 2, 3, 1, 2, 4]);
  });
  it('skips repeats after D.C.', () => {
    expect(unrollRepeats([{ repeatForward: true }, { repeatBackward: 2 }, { daCapo: true }])).toEqual([0, 1, 0, 1, 2, 0, 1, 2]);
  });
});
