import type { Hand, Score, ScoreNote } from '../types';
import { pitchClass, octaveOf } from '../music';
import { timeSignatureAt } from './tempo';

/**
 * Score to MusicXML, used to render scores that did not come from MusicXML (MIDI, ABC, JSON,
 * generated drills) in the sheet view. Display-only: onsets are quantised to a 16th/triplet
 * grid, overlapping notes in one staff are shortened, durations split with ties at barlines.
 * Performance order is written linearly (no repeat signs), so sheet beat == performance beat.
 */

const DIV = 12; // divisions per quarter: 16ths = 3, triplet eighths = 4
const TYPES: { units: number; type: string; dots: number; tuplet?: boolean }[] = [
  { units: 48, type: 'whole', dots: 0 },
  { units: 36, type: 'half', dots: 1 },
  { units: 24, type: 'half', dots: 0 },
  { units: 18, type: 'quarter', dots: 1 },
  { units: 16, type: 'half', dots: 0, tuplet: true },
  { units: 12, type: 'quarter', dots: 0 },
  { units: 9, type: 'eighth', dots: 1 },
  { units: 8, type: 'quarter', dots: 0, tuplet: true },
  { units: 6, type: 'eighth', dots: 0 },
  { units: 4, type: 'eighth', dots: 0, tuplet: true },
  { units: 3, type: '16th', dots: 0 },
  { units: 2, type: '16th', dots: 0, tuplet: true },
  { units: 1, type: '32nd', dots: 0, tuplet: true },
];

function q(beat: number): number {
  // nearest of the 16th grid (3 units) and the triplet grid (4 units)
  const u = beat * DIV;
  const a = Math.round(u / 3) * 3;
  const b = Math.round(u / 4) * 4;
  return Math.abs(a - u) <= Math.abs(b - u) + 1e-9 ? a : b;
}

const SHARP_STEPS = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const SHARP_ALTER = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const FLAT_STEPS = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];
const FLAT_ALTER = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

function pitchXml(midi: number, flats: boolean): string {
  const pc = pitchClass(midi);
  const step = (flats ? FLAT_STEPS : SHARP_STEPS)[pc];
  const alter = (flats ? FLAT_ALTER : SHARP_ALTER)[pc];
  const oct = octaveOf(midi);
  return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Seg {
  start: number; // units, absolute
  dur: number; // units
  notes: ScoreNote[]; // empty = rest
}

export function exportMusicXml(score: Score, opts: { title?: boolean } = {}): string {
  const hands: Hand[] = [];
  const hasL = score.notes.some((n) => n.hand === 'L');
  const hasR = score.notes.some((n) => n.hand !== 'L');
  if (hasR) hands.push('R');
  if (hasL) hands.push('L');
  if (hands.length === 0) hands.push('R');
  const staffOf = (n: ScoreNote) => (hands.length === 1 ? 1 : n.hand === 'L' ? 2 : 1);
  const flats = (score.keySignatures[0]?.fifths ?? 0) < 0;

  const measureStarts = score.measures.map((m) => q(m.startBeat));
  const measureEnds = score.measures.map((m) => q(m.startBeat + m.lengthBeats));

  // Build segments per staff.
  const perStaff: Seg[][] = hands.map(() => []);
  hands.forEach((_, si) => {
    const notes = score.notes.filter((n) => staffOf(n) === si + 1).sort((a, b) => a.startBeat - b.startBeat);
    const groups = new Map<number, ScoreNote[]>();
    for (const n of notes) {
      const s = q(n.startBeat);
      const g = groups.get(s);
      if (g) {
        if (!g.some((x) => x.midi === n.midi)) g.push(n);
      } else groups.set(s, [n]);
    }
    const starts = [...groups.keys()].sort((a, b) => a - b);
    const segs: Seg[] = [];
    let cursor = 0;
    starts.forEach((s, i) => {
      const g = groups.get(s)!;
      const next = i + 1 < starts.length ? starts[i + 1] : Infinity;
      let end = Math.min(...g.map((n) => Math.max(s + 1, q(n.startBeat + n.durationBeats))), next);
      if (end <= s) end = s + 1;
      if (s > cursor) segs.push({ start: cursor, dur: s - cursor, notes: [] });
      segs.push({ start: s, dur: end - s, notes: g });
      cursor = end;
    });
    const total = measureEnds[measureEnds.length - 1] ?? cursor;
    if (total > cursor) segs.push({ start: cursor, dur: total - cursor, notes: [] });
    perStaff[si] = segs;
  });

  const parts: string[] = [];
  const twoStaves = hands.length === 2;
  const avg = score.notes.length ? score.notes.reduce((s, n) => s + n.midi, 0) / score.notes.length : 60;
  const singleClef = hands[0] === 'L' || avg < 57 ? '<clef><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>';

  let lastTs = '';
  let lastKey = NaN;
  score.measures.forEach((m, mi) => {
    const ms = measureStarts[mi];
    const me = measureEnds[mi];
    let body = '';
    const ts = timeSignatureAt(score.timeSignatures, m.startBeat);
    const tsKey = `${ts.numerator}/${ts.denominator}`;
    let key = score.keySignatures[0]?.fifths ?? 0;
    for (const k of score.keySignatures) if (k.beat <= m.startBeat + 1e-6) key = k.fifths;
    let attrs = '';
    if (mi === 0) attrs += `<divisions>${DIV}</divisions>`;
    if (key !== lastKey) attrs += `<key><fifths>${key}</fifths></key>`;
    // Pickup measures keep the prevailing time signature.
    if (tsKey !== lastTs) attrs += `<time><beats>${ts.numerator}</beats><beat-type>${ts.denominator}</beat-type></time>`;
    if (mi === 0) {
      attrs += twoStaves ? '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>' : singleClef;
    }
    lastTs = tsKey;
    lastKey = key;
    if (attrs) body += `<attributes>${attrs}</attributes>`;
    if (mi === 0) {
      const bpm = Math.round(score.tempoMap[0]?.bpm ?? 120);
      body += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`;
    }
    for (const sec of score.sections ?? []) {
      if (sec.startMeasure === mi) body += `<direction placement="above"><direction-type><rehearsal>${esc(sec.name)}</rehearsal></direction-type></direction>`;
    }
    perStaff.forEach((segs, si) => {
      if (si > 0) body += `<backup><duration>${me - ms}</duration></backup>`;
      for (const seg of segs) {
        const a = Math.max(seg.start, ms);
        const b = Math.min(seg.start + seg.dur, me);
        if (b <= a) continue;
        const tieIn = seg.notes.length > 0 && a > seg.start;
        const tieOut = seg.notes.length > 0 && b < seg.start + seg.dur;
        body += writeSegment(seg.notes, b - a, si + 1, twoStaves, flats, tieIn, tieOut, a === seg.start);
      }
    });
    parts.push(`<measure number="${m.number ?? mi + 1}"${mi === 0 && me - ms < Math.round(((ts.numerator * 4) / ts.denominator) * DIV) ? ' implicit="yes"' : ''}>${body}</measure>`);
  });

  const title = opts.title === false ? '' : `<work><work-title>${esc(score.title)}</work-title></work>`;
  const composer = score.composer ? `<identification><creator type="composer">${esc(score.composer)}</creator></identification>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">${title}${composer}<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${parts.join('')}</part></score-partwise>`;
}

function decompose(units: number): (typeof TYPES)[number][] {
  const out: (typeof TYPES)[number][] = [];
  let left = units;
  while (left > 0) {
    const t = TYPES.find((x) => x.units <= left) ?? TYPES[TYPES.length - 1];
    out.push(t);
    left -= t.units;
  }
  return out;
}

function writeSegment(
  notes: ScoreNote[],
  units: number,
  staff: number,
  twoStaves: boolean,
  flats: boolean,
  tieIn: boolean,
  tieOut: boolean,
  firstPiece: boolean,
): string {
  const pieces = decompose(units);
  let xml = '';
  pieces.forEach((p, pi) => {
    const tStop = tieIn || pi > 0;
    const tStart = tieOut || pi < pieces.length - 1;
    const dots = '<dot/>'.repeat(p.dots);
    const tm = p.tuplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '';
    const staffXml = twoStaves ? `<staff>${staff}</staff>` : '';
    if (notes.length === 0) {
      xml += `<note><rest/><duration>${p.units}</duration><voice>${staff}</voice><type>${p.type}</type>${dots}${tm}${staffXml}</note>`;
      return;
    }
    notes
      .slice()
      .sort((a, b) => a.midi - b.midi)
      .forEach((n, ni) => {
        const ties = (tStop ? '<tie type="stop"/>' : '') + (tStart ? '<tie type="start"/>' : '');
        const tied = (tStop ? '<tied type="stop"/>' : '') + (tStart ? '<tied type="start"/>' : '');
        const finger = n.finger && firstPiece && pi === 0 ? `<technical><fingering>${n.finger}</fingering></technical>` : '';
        const notations = tied || finger ? `<notations>${tied}${finger}</notations>` : '';
        xml += `<note>${ni > 0 ? '<chord/>' : ''}${pitchXml(n.midi, flats)}<duration>${p.units}</duration>${ties}<voice>${staff}</voice><type>${p.type}</type>${dots}${tm}${staffXml}${notations}</note>`;
      });
  });
  return xml;
}
