// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFixture } from '../helpers';
import JSZip from 'jszip';
import { parseMusicXml } from '../../src/core/score/musicxml';
import { unzipMxl } from '../../src/core/score/mxl';
import { importScoreFile } from '../../src/core/score/import';
import { exportMusicXml } from '../../src/core/score/export-musicxml';
import { buildScoreEvents } from '../../src/core/score/events';

const xml = readFixture('scores/repeats-two-hands.musicxml');

describe('MusicXML import', () => {
  const s = parseMusicXml(xml);

  it('reads metadata, tempo, key and time', () => {
    expect(s.title).toBe('Repeat Test');
    expect(s.composer).toBe('OpenKeys');
    expect(s.tempoMap[0].bpm).toBe(90);
    expect(s.keySignatures[0]).toMatchObject({ fifths: 1, mode: 'major' });
    expect(s.timeSignatures[0]).toMatchObject({ numerator: 2, denominator: 4 });
  });

  it('unrolls repeats with voltas into performance order', () => {
    // written: 1 |: ... [1 2 :| [2 3 | 4 | 5  -> performance: 1 2 1 3 4 5
    expect(s.measures.map((m) => m.sourceIndex)).toEqual([0, 1, 0, 2, 3, 4]);
    expect(s.measures.map((m) => m.startBeat)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('assigns staff 1 to the right hand and staff 2 to the left', () => {
    const g4 = s.notes.filter((n) => n.midi === 67);
    expect(g4.every((n) => n.hand === 'R')).toBe(true);
    const g2 = s.notes.filter((n) => n.midi === 43);
    expect(g2.every((n) => n.hand === 'L')).toBe(true);
  });

  it('merges ties across barlines into one held note', () => {
    const tied = s.notes.filter((n) => n.midi === 67 && n.measure === 4);
    expect(tied).toHaveLength(1);
    expect(tied[0].durationBeats).toBe(4);
    expect(s.notes.some((n) => n.measure === 5 && n.midi === 67)).toBe(false);
  });

  it('reads fingering, dynamics, grace notes and accidentals', () => {
    const first = s.notes.find((n) => n.midi === 67 && n.startBeat === 0)!;
    expect(first.finger).toBe(1);
    expect(first.dynamic).toBe('p');
    const grace = s.notes.find((n) => n.grace)!;
    expect(grace.midi).toBe(76);
    expect(grace.startBeat).toBeCloseTo(6 - 0.125);
    const fsharp = s.notes.find((n) => n.midi === 66)!;
    expect(fsharp.dynamic).toBe('f');
    expect(fsharp.velocity).toBeGreaterThan(first.velocity!);
  });

  it('keeps the mapping back to the written layout', () => {
    const second = s.notes.filter((n) => n.midi === 67 && n.measure === 2);
    expect(second).toHaveLength(1);
    expect(second[0].sourceMeasure).toBe(0);
    expect(second[0].sourceBeat).toBe(0);
  });

  it('groups chords into score events', () => {
    const ev = buildScoreEvents(s.notes, 'L');
    expect(ev[0].notes.map((n) => n.midi)).toEqual([43, 50]);
  });

  it('imports compressed .mxl', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>');
    zip.file('score.xml', xml);
    const data = await zip.generateAsync({ type: 'uint8array' });
    expect(await unzipMxl(data)).toBe(xml);
    const s2 = await importScoreFile('piece.mxl', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    expect(s2.notes.length).toBe(s.notes.length);
  });

  it('round-trips through the MusicXML exporter', () => {
    const out = exportMusicXml(s);
    const back = parseMusicXml(out);
    expect(back.notes.length).toBe(s.notes.filter((n) => !n.grace).length + s.notes.filter((n) => n.grace).length);
    const pitches = (x: typeof s) => x.notes.map((n) => `${n.startBeat.toFixed(2)}:${n.midi}`).sort();
    // Grace note is quantised for display; compare the rest.
    const strip = (arr: string[]) => arr.filter((p) => !p.endsWith(':76'));
    expect(strip(pitches(back))).toEqual(strip(pitches(s)));
  });

  it('rejects non-MusicXML', () => {
    expect(() => parseMusicXml('<html></html>')).toThrow(/MusicXML/);
    expect(() => parseMusicXml('not xml <')).toThrow();
  });
});
