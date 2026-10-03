// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BUILT_IN_SONGS } from '../../src/core/content/songs';
import { builtInScore, builtInVariants } from '../../src/core/progress/library';
import { validateScore } from '../../src/core/score/validate';
import { estimateDifficulty } from '../../src/core/score/difficulty';

describe('bundled MusicXML full versions', () => {
  for (const song of BUILT_IN_SONGS.filter((s) => s.fullMusicXml)) {
    it(`${song.id} (full) imports cleanly into two hands on an 88-key piano`, () => {
      expect(song.fullLicense).toBeTruthy();
      expect(builtInVariants(song)).toEqual(['R', 'easy', 'full']);
      const s = builtInScore(song, 'full');
      expect(s.id).toBe(`builtin-${song.id}-full`);
      expect(s.title).toBe(song.title);
      expect(s.license).toBe(song.fullLicense);
      expect(s.musicxml).toBe(song.fullMusicXml);
      expect(validateScore(s).filter((i) => i.level === 'error')).toEqual([]);
      expect(s.notes.some((n) => n.hand === 'L')).toBe(true);
      expect(s.notes.some((n) => n.hand === 'R')).toBe(true);
      for (const n of s.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(21);
        expect(n.midi).toBeLessThanOrEqual(108);
      }
      const end = (h: string) => Math.max(...s.notes.filter((n) => n.hand === h).map((n) => n.startBeat + n.durationBeats));
      expect(Math.abs(end('L') - end('R'))).toBeLessThan(0.01);
      const d = estimateDifficulty(s).level;
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    });
  }

  it('Für Elise has the complete piece with fingering', () => {
    const s = builtInScore(BUILT_IN_SONGS.find((x) => x.id === 'furElise')!, 'full');
    expect(s.measures.length).toBeGreaterThan(100);
    expect(s.notes.filter((n) => n.finger).length).toBeGreaterThan(100);
  });
});
