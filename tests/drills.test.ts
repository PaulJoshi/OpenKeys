import { describe, expect, it } from 'vitest';
import { scaleDrill, arpeggioDrill, progressionDrill, sightReadingDrill, rhythmDrill, earPhrase, compareEar, nextReadingNote, recordReading, rng } from '../src/core/learn/drills';
import { validateScore } from '../src/core/score/validate';
import { scalePitchClasses, pitchClass } from '../src/core/music';
import { estimateDifficulty } from '../src/core/score/difficulty';

describe('drills', () => {
  it('scales use the key and standard fingering', () => {
    const s = scaleDrill({ fifths: 1, mode: 'major', hands: 'R', octaves: 1, bpm: 80 });
    expect(validateScore(s).filter((i) => i.level === 'error')).toEqual([]);
    expect(s.notes.map((n) => n.midi).slice(0, 8)).toEqual([67, 69, 71, 72, 74, 76, 78, 79]);
    expect(s.notes.slice(0, 8).map((n) => n.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    const pcs = new Set(scalePitchClasses(1));
    expect(s.notes.every((n) => pcs.has(pitchClass(n.midi)))).toBe(true);
    const two = scaleDrill({ fifths: -2, mode: 'major', hands: 'both', octaves: 2, bpm: 80 });
    expect(two.notes.filter((n) => n.hand === 'L').length).toBe(two.notes.filter((n) => n.hand === 'R').length);
    expect(two.notes.find((n) => n.hand === 'R')!.finger).toBe(4); // Bb RH starts on 4
    const minor = scaleDrill({ fifths: 0, mode: 'minor', hands: 'R', octaves: 1, bpm: 80 });
    expect(minor.notes.map((n) => n.midi).slice(0, 8)).toEqual([57, 59, 60, 62, 64, 65, 68, 69]);
  });

  it('arpeggios and progressions are valid', () => {
    expect(arpeggioDrill({ fifths: 0, mode: 'major', hands: 'R', octaves: 2, bpm: 80 }).notes.slice(0, 7).map((n) => n.midi)).toEqual([60, 64, 67, 72, 76, 79, 84]);
    const p = progressionDrill({ fifths: 0, progression: 'I-IV-V-I', inversion: 'smooth', hands: 'both', bpm: 70, pattern: 'block' });
    const rh = p.notes.filter((n) => n.hand === 'R');
    // smooth voice leading: each chord within a few semitones of the previous
    const chords = [0, 4, 8, 12].map((b) => rh.filter((n) => n.startBeat === b).map((n) => n.midi));
    for (let i = 1; i < chords.length; i++) expect(chords[i].reduce((s, m, k) => s + Math.abs(m - chords[i - 1][k]), 0)).toBeLessThanOrEqual(6);
    expect(p.notes.filter((n) => n.hand === 'L').map((n) => n.midi)).toEqual([48, 53, 55, 48]);
  });

  it('sight-reading gets harder with level and ends on the tonic', () => {
    const easy = sightReadingDrill(1, 42);
    const hard = sightReadingDrill(8, 42);
    expect(validateScore(easy).filter((i) => i.level === 'error')).toEqual([]);
    expect(estimateDifficulty(hard).level).toBeGreaterThan(estimateDifficulty(easy).level);
    const rh = easy.notes.filter((n) => n.hand === 'R');
    expect(pitchClass(rh[rh.length - 1].midi)).toBe(0);
    expect(easy.notes.every((n) => n.durationBeats === 1)).toBe(true);
  });

  it('rhythm drill fills 4 bars', () => {
    const r = rhythmDrill(3, 7);
    const end = Math.max(...r.notes.map((n) => n.startBeat + n.durationBeats));
    expect(end).toBeCloseTo(16);
  });

  it('ear training compares phrases and notices transposition', () => {
    const p = earPhrase(3, 9);
    expect(p.notes.length).toBeGreaterThanOrEqual(3);
    expect(compareEar([60, 64, 67], [60, 64, 67]).allRight).toBe(true);
    expect(compareEar([60, 64, 67], [62, 66, 69]).transposedBy).toBe(2);
  });

  it('note reading favours weak notes', () => {
    let stats = { perNote: {} as Record<number, { attempts: number; correct: number; meanMs: number }> };
    for (let i = 0; i < 20; i++) stats = recordReading(stats, 64, i % 2 === 0, 3000);
    const r = rng(1);
    const picks = Array.from({ length: 400 }, () => nextReadingNote('treble', stats, r));
    const share = picks.filter((m) => m === 64).length / picks.length;
    expect(share).toBeGreaterThan(1 / 15);
  });
});
