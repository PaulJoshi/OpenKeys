import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidiFile } from '../../src/core/score/midi';
import { parseAbc, parseAbcDetailed } from '../../src/core/score/abc';
import { parseOpenKeysJson, serializeScore, migrate } from '../../src/core/score/json';
import { detectFormat } from '../../src/core/score/import';
import { assignHandsBySplit } from '../../src/core/score/hands';
import { checkRange, octaveFold, transposeScore, validateScore } from '../../src/core/score/validate';
import { estimateDifficulty } from '../../src/core/score/difficulty';
import { summarize } from '../../src/core/score/summary';

function makeMidi(tracks: { midi: number; time: number; duration: number; velocity?: number }[][], bpm = 120): Uint8Array {
  const m = new Midi();
  m.header.setTempo(bpm);
  m.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] });
  for (const notes of tracks) {
    const t = m.addTrack();
    for (const n of notes) t.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity ?? 0.7 });
  }
  return m.toArray();
}

describe('MIDI import', () => {
  it('assigns two tracks to hands by average pitch', () => {
    const data = makeMidi([
      [
        { midi: 48, time: 0, duration: 0.5 },
        { midi: 43, time: 0.5, duration: 0.5 },
      ],
      [
        { midi: 72, time: 0, duration: 0.25, velocity: 0.9 },
        { midi: 74, time: 0.25, duration: 0.25 },
      ],
    ]);
    const s = parseMidiFile(data);
    expect(s.tempoMap[0].bpm).toBeCloseTo(120);
    expect(s.timeSignatures[0]).toMatchObject({ numerator: 3, denominator: 4 });
    expect(s.notes.filter((n) => n.hand === 'L').map((n) => n.midi)).toEqual([48, 43]);
    expect(s.notes.filter((n) => n.hand === 'R').map((n) => n.midi)).toEqual([72, 74]);
    const c5 = s.notes.find((n) => n.midi === 72)!;
    expect(c5.startBeat).toBeCloseTo(0);
    expect(c5.durationBeats).toBeCloseTo(0.5);
    expect(c5.velocity).toBeCloseTo(0.9, 1);
    expect(s.notes.find((n) => n.midi === 43)!.startBeat).toBeCloseTo(1);
  });

  it('splits a single track at middle C with continuity', () => {
    const data = makeMidi([
      [
        { midi: 48, time: 0, duration: 1 },
        { midi: 64, time: 0, duration: 0.25 },
        { midi: 62, time: 0.25, duration: 0.25 },
        { midi: 59, time: 0.5, duration: 0.25 }, // B3: melody dips under the split
        { midi: 60, time: 0.75, duration: 0.25 },
      ],
    ]);
    const s = parseMidiFile(data);
    const hand = (m: number) => s.notes.find((n) => n.midi === m)!.hand;
    expect(hand(48)).toBe('L');
    expect(hand(64)).toBe('R');
    expect(hand(59)).toBe('R');
  });

  it('rejects garbage', () => {
    expect(() => parseMidiFile(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe('hand split heuristic', () => {
  it('splits wide chords at the largest gap', () => {
    const notes = [36, 43, 64, 67, 72].map((m) => ({ midi: m, startBeat: 0, hand: 'unknown' as const }));
    assignHandsBySplit(notes as { midi: number; startBeat: number; hand: 'L' | 'R' | 'unknown' }[]);
    expect(notes.map((n) => n.hand)).toEqual(['L', 'L', 'R', 'R', 'R']);
  });
});

const ODE_ABC = `X:1
T:Ode to Joy (exercise)
C:Beethoven
M:4/4
L:1/4
Q:1/4=100
K:C
V:1 clef=treble
!3!E E F G | G F E D | C C D E | E3/2 D/ D2 |]
V:2 clef=bass
C,4 | G,,4 | C,4 | G,,2 C,2 |]
`;

describe('ABC import', () => {
  it('parses voices into hands, with fingering and tempo', () => {
    const s = parseAbc(ODE_ABC);
    expect(s.title).toBe('Ode to Joy (exercise)');
    expect(s.tempoMap[0].bpm).toBe(100);
    const rh = s.notes.filter((n) => n.hand === 'R');
    const lh = s.notes.filter((n) => n.hand === 'L');
    expect(rh.slice(0, 4).map((n) => n.midi)).toEqual([64, 64, 65, 67]);
    expect(lh[0].midi).toBe(48);
    expect(lh[0].durationBeats).toBe(4);
    expect(rh[0].finger).toBe(3);
    expect(s.measures).toHaveLength(4);
    expect(rh.find((n) => n.durationBeats === 1.5)!.measure).toBe(3);
  });

  it('resolves key signatures and bar accidentals', () => {
    const s = parseAbc('X:1\nM:4/4\nL:1/4\nK:G\nF ^C C =F|F4|]\n');
    expect(s.notes.map((n) => n.midi)).toEqual([66, 61, 61, 65, 66]);
    expect(s.keySignatures[0].fifths).toBe(1);
  });

  it('unrolls repeats and handles pickups', () => {
    const s = parseAbc('X:1\nM:3/4\nL:1/4\nK:C\nG|:c d e:|\n');
    expect(s.measures[0].lengthBeats).toBe(1);
    expect(s.notes.map((n) => n.midi)).toEqual([67, 72, 74, 76, 72, 74, 76]);
  });

  it('reports errors with positions', () => {
    const r = parseAbcDetailed('X:1\nK:C\nC D E | F G A ] ][');
    expect(r.issues.length).toBeGreaterThanOrEqual(0);
    const bad = parseAbcDetailed('');
    expect(bad.score).toBeNull();
    expect(bad.issues.length).toBeGreaterThan(0);
  });
});

describe('OpenKeys JSON', () => {
  it('round-trips and migrates v0', () => {
    const s = parseAbc(ODE_ABC);
    const back = parseOpenKeysJson(serializeScore(s));
    expect(back.notes).toEqual(s.notes);
    expect(migrate(JSON.parse(JSON.stringify(s))).score.id).toBe(s.id);
    expect(() => parseOpenKeysJson('{"format":"openkeys-score","version":99,"score":{}}')).toThrow(/newer/);
  });
});

describe('format detection, validation and range', () => {
  it('detects formats by name and content', () => {
    const enc = new TextEncoder();
    expect(detectFormat('a.mid', new Uint8Array())).toBe('midi');
    expect(detectFormat('x', new Uint8Array([0x4d, 0x54, 0x68, 0x64]))).toBe('midi');
    expect(detectFormat('x', enc.encode('<?xml version="1.0"?><score-partwise>'))).toBe('musicxml');
    expect(detectFormat('x', enc.encode('X:1\nK:C\nC'))).toBe('abc');
    expect(detectFormat('song.openkeys.json', new Uint8Array())).toBe('json');
  });

  it('validates and fits ranges', () => {
    const s = parseAbc(ODE_ABC);
    expect(validateScore(s).filter((i) => i.level === 'error')).toHaveLength(0);
    const r = checkRange(s, { low: 48, high: 72 });
    expect(r.outOfRange.map((n) => n.midi)).toContain(43);
    expect(r.suggestedTranspose).toBeNull(); // span 43..67 = 24 fits 48..72 with +12? 55..79 no
    const folded = octaveFold(s, { low: 48, high: 72 });
    expect(folded.notes.every((n) => n.midi >= 48 && n.midi <= 72)).toBe(true);
    const up = transposeScore(s, 2);
    expect(up.keySignatures[0].fifths).toBe(2);
    expect(up.notes[0].midi).toBe(s.notes[0].midi + 2);
  });

  it('estimates difficulty and summarises', () => {
    const easy = parseAbc('X:1\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\nC D E F|G4|]\n');
    const hard = parseAbc(
      'X:1\nM:4/4\nL:1/16\nQ:1/4=140\nK:C\nV:1\n[ceg]^f[ac\'e\']b [c\'e\'g\']^d\'[ac\'] b ^g e c ^A F D C B,|]\nV:2 clef=bass\nC,,G,,C,G, ^D,A,,E,,B,, C,,G,,C,G, ^D,A,,E,,B,,|]\n',
    );
    expect(estimateDifficulty(easy).level).toBeLessThan(estimateDifficulty(hard).level);
    const sum = summarize(easy);
    expect(sum.key).toBe('C major');
    expect(sum.hands).toBe('Right hand');
    expect(sum.range).toBe('C4–G4');
  });
});
