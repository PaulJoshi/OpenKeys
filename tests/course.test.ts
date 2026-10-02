import { describe, expect, it } from 'vitest';
import { COURSE } from '../src/core/learn/course';
import { parseAbcDetailed } from '../src/core/score/abc';
import { songById } from '../src/core/content/songs';

describe('course', () => {
  it('has 7 lessons whose exercises parse and pieces exist', () => {
    expect(COURSE).toHaveLength(7);
    for (const l of COURSE) {
      expect(songById(l.piece.songId)).toBeTruthy();
      for (const ex of l.exercises) {
        const r = parseAbcDetailed(ex.abc);
        expect(r.issues.map((i) => i.message), ex.id).toEqual([]);
        expect(r.score!.notes.length).toBeGreaterThan(0);
        for (const n of r.score!.notes) expect(n.midi).toBeGreaterThanOrEqual(36);
        if (ex.hands === 'L') expect(r.score!.notes.every((n) => n.hand !== 'R'), ex.id).toBe(true);
      }
    }
  });
});
