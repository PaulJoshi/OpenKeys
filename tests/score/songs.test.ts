import { describe, expect, it } from 'vitest';
import { BUILT_IN_SONGS } from '../../src/core/content/songs';
import { parseAbcDetailed } from '../../src/core/score/abc';
import { validateScore } from '../../src/core/score/validate';
import { estimateDifficulty } from '../../src/core/score/difficulty';

describe('bundled songs', () => {
  for (const song of BUILT_IN_SONGS) {
    for (const [variant, abc] of [['easy', song.easy], ['full', song.full]] as const) {
      if (!abc) continue;
      it(`${song.id} (${variant}) parses cleanly into two hands within C2–C7`, () => {
        const r = parseAbcDetailed(abc);
        expect(r.issues.map((i) => i.message)).toEqual([]);
        const s = r.score!;
        expect(validateScore(s).filter((i) => i.level === 'error')).toEqual([]);
        expect(s.notes.some((n) => n.hand === 'L')).toBe(true);
        expect(s.notes.some((n) => n.hand === 'R')).toBe(true);
        for (const n of s.notes) {
          expect(n.midi).toBeGreaterThanOrEqual(36);
          expect(n.midi).toBeLessThanOrEqual(96);
        }
        // Both hands end together (bar lengths line up).
        const end = (h: string) => Math.max(...s.notes.filter((n) => n.hand === h).map((n) => n.startBeat + n.durationBeats));
        expect(Math.abs(end('L') - end('R'))).toBeLessThan(0.01);
        const d = estimateDifficulty(s).level;
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(10);
      });
    }
  }

  it('has about 15 songs with unique ids', () => {
    expect(BUILT_IN_SONGS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(BUILT_IN_SONGS.map((s) => s.id)).size).toBe(BUILT_IN_SONGS.length);
  });
});
