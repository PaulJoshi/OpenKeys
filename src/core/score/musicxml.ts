import type { Dynamic, Finger, Hairpin, Hand, KeySignature, PedalMark, Score, TempoPoint, TimeSignature } from '../types';
import { DYNAMIC_VELOCITY } from '../music';
import { assembleScore, type WrittenMeasure, type WrittenNote } from './assemble';
import { assignHandsBySplit } from './hands';
import { measureLengthBeats } from './tempo';

/**
 * MusicXML (score-partwise) to Score.
 * Staff 1 = right hand, staff 2 = left hand. Reads fingering, dynamics, wedges, ties, grace
 * notes, arpeggios, tempo marks, pedal marks, rehearsal marks, repeats/voltas and D.C./D.S.
 * Needs a DOMParser (browser, or jsdom in tests).
 */

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DYNAMICS: Dynamic[] = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];
const EPS = 1e-6;

function kids(el: Element | null | undefined, name?: string): Element[] {
  if (!el) return [];
  const out: Element[] = [];
  for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (!name || c.localName === name) out.push(c);
  return out;
}
function kid(el: Element | null | undefined, name: string): Element | null {
  if (!el) return null;
  for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === name) return c;
  return null;
}
function txt(el: Element | null | undefined, name: string): string | null {
  const k = kid(el, name);
  return k ? (k.textContent ?? '').trim() : null;
}
function num(el: Element | null | undefined, name: string): number | null {
  const t = txt(el, name);
  if (t === null || t === '') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
function descendants(el: Element, name: string): Element[] {
  return Array.from(el.getElementsByTagName(name));
}

export class ImportError extends Error {}

export function parseMusicXml(xml: string, opts: { splitPoint?: number } = {}): Score {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const perr = doc.getElementsByTagName('parsererror')[0];
  if (perr) throw new ImportError(`Not valid XML: ${(perr.textContent ?? '').slice(0, 200)}`);
  const root = doc.documentElement;
  if (root.localName === 'score-timewise') throw new ImportError('Timewise MusicXML is not supported; please export as partwise (MuseScore default).');
  if (root.localName !== 'score-partwise') throw new ImportError('Not a MusicXML score (expected <score-partwise>).');

  const title =
    txt(kid(root, 'work'), 'work-title') ||
    txt(root, 'movement-title') ||
    kids(kid(root, 'credit'), 'credit-words')[0]?.textContent?.trim() ||
    'Untitled';
  let composer: string | undefined;
  for (const c of descendants(root, 'creator')) if (c.getAttribute('type') === 'composer') composer = (c.textContent ?? '').trim();
  const rights = txt(kid(root, 'identification'), 'rights') ?? undefined;

  const parts = kids(root, 'part');
  if (parts.length === 0) throw new ImportError('MusicXML has no parts.');

  const measureCount = Math.max(...parts.map((p) => kids(p, 'measure').length));
  const measures: WrittenMeasure[] = [];
  const notes: WrittenNote[] = [];
  const tempo: TempoPoint[] = [];
  const timeSignatures: TimeSignature[] = [];
  const keySignatures: KeySignature[] = [];
  const hairpins: Hairpin[] = [];
  const pedal: PedalMark[] = [];
  const sections: { name: string; measure: number }[] = [];

  // First pass: per-part parse into measure-relative data, so measure lengths can be aligned.
  interface PartMeasure {
    lengthBeats: number;
    implicit: boolean;
    expected: number;
    number?: number;
    flow: Partial<WrittenMeasure>;
    notes: WrittenNote[]; // startBeat relative to measure start
    tempo: { pos: number; bpm: number }[];
    time?: { numerator: number; denominator: number };
    key?: { fifths: number; mode: 'major' | 'minor' };
    wedges: { pos: number; type: 'crescendo' | 'diminuendo' | 'stop'; hand: Hand }[];
    pedal: { pos: number; down: boolean }[];
    rehearsal: string[];
  }
  const parsed: PartMeasure[][] = [];
  let maxStaves = 1;

  parts.forEach((part, partIndex) => {
    let divisions = 1;
    let staves = 1;
    let time = { numerator: 4, denominator: 4 };
    const dynByStaff = new Map<number, Dynamic>();
    const list: PartMeasure[] = [];
    let lastNoteStart = 0;
    let pendingGraces: WrittenNote[] = [];

    for (const m of kids(part, 'measure')) {
      const pm: PartMeasure = {
        lengthBeats: 0,
        implicit: m.getAttribute('implicit') === 'yes',
        expected: measureLengthBeats(time),
        number: Number(m.getAttribute('number')) || undefined,
        flow: {},
        notes: [],
        tempo: [],
        wedges: [],
        pedal: [],
        rehearsal: [],
      };
      let pos = 0;
      let maxPos = 0;

      for (const el of kids(m)) {
        switch (el.localName) {
          case 'attributes': {
            const d = num(el, 'divisions');
            if (d) divisions = d;
            const st = num(el, 'staves');
            if (st) staves = st;
            const t = kid(el, 'time');
            if (t) {
              const beats = Number((txt(t, 'beats') ?? '4').split('+').reduce((a, b) => a + Number(b), 0));
              const beatType = num(t, 'beat-type') ?? 4;
              time = { numerator: beats || 4, denominator: beatType };
              pm.time = time;
              pm.expected = measureLengthBeats(time);
            }
            const k = kid(el, 'key');
            if (k && !pm.key) {
              const fifths = num(k, 'fifths') ?? 0;
              const mode = txt(k, 'mode') === 'minor' ? 'minor' : 'major';
              pm.key = { fifths, mode };
            }
            break;
          }
          case 'direction': {
            const offset = (num(el, 'offset') ?? 0) / divisions;
            const at = pos + Math.max(0, offset);
            const staffNo = num(el, 'staff');
            for (const dt of kids(el, 'direction-type')) {
              for (const c of kids(dt)) {
                if (c.localName === 'dynamics') {
                  const d = kids(c).map((x) => x.localName).find((x): x is Dynamic => (DYNAMICS as string[]).includes(x));
                  if (d) {
                    if (staffNo) dynByStaff.set(staffNo, d);
                    else for (let s = 1; s <= Math.max(staves, 2); s++) dynByStaff.set(s, d);
                  }
                } else if (c.localName === 'wedge') {
                  const type = c.getAttribute('type');
                  const hand = handForStaff(staffNo ?? 1, staves, partIndex, parts.length);
                  if (type === 'crescendo' || type === 'diminuendo' || type === 'stop') pm.wedges.push({ pos: at, type, hand });
                } else if (c.localName === 'metronome') {
                  const unit = txt(c, 'beat-unit') ?? 'quarter';
                  const dotted = !!kid(c, 'beat-unit-dot');
                  const pmn = num(c, 'per-minute');
                  if (pmn) pm.tempo.push({ pos: at, bpm: pmn * unitInQuarters(unit) * (dotted ? 1.5 : 1) });
                } else if (c.localName === 'pedal') {
                  const type = c.getAttribute('type');
                  if (type === 'start') pm.pedal.push({ pos: at, down: true });
                  else if (type === 'stop') pm.pedal.push({ pos: at, down: false });
                  else if (type === 'change') pm.pedal.push({ pos: at, down: false }, { pos: at + 0.01, down: true });
                } else if (c.localName === 'rehearsal') {
                  const t = (c.textContent ?? '').trim();
                  if (t) pm.rehearsal.push(t);
                } else if (c.localName === 'segno') pm.flow.segno = true;
                else if (c.localName === 'coda') pm.flow.coda = true;
                else if (c.localName === 'words') readWords((c.textContent ?? '').trim(), pm.flow);
              }
            }
            const snd = kid(el, 'sound');
            if (snd) readSound(snd, pm, at);
            break;
          }
          case 'sound':
            readSound(el, pm, pos);
            break;
          case 'backup':
            pos -= (num(el, 'duration') ?? 0) / divisions;
            if (pos < 0) pos = 0;
            break;
          case 'forward':
            pos += (num(el, 'duration') ?? 0) / divisions;
            maxPos = Math.max(maxPos, pos);
            break;
          case 'barline': {
            const rep = kid(el, 'repeat');
            if (rep) {
              if (rep.getAttribute('direction') === 'forward') pm.flow.repeatForward = true;
              else pm.flow.repeatBackward = Number(rep.getAttribute('times')) || 2;
            }
            const ending = kid(el, 'ending');
            if (ending) {
              const nums = (ending.getAttribute('number') ?? '1')
                .split(/[,\s]+/)
                .map(Number)
                .filter((x) => x > 0);
              pm.flow.endings = Array.from(new Set([...(pm.flow.endings ?? []), ...nums]));
            }
            if (kid(el, 'segno')) pm.flow.segno = true;
            if (kid(el, 'coda')) pm.flow.coda = true;
            break;
          }
          case 'note': {
            const isChord = !!kid(el, 'chord');
            const isRest = !!kid(el, 'rest');
            const grace = kid(el, 'grace');
            const durDiv = num(el, 'duration') ?? 0;
            const dur = durDiv / divisions;
            const staff = num(el, 'staff') ?? 1;
            const voice = txt(el, 'voice') ?? '1';
            const start = isChord ? lastNoteStart : pos;
            if (!isChord) lastNoteStart = pos;
            if (!isRest && !kid(el, 'unpitched')) {
              const p = kid(el, 'pitch');
              if (p) {
                const step = txt(p, 'step') ?? 'C';
                const alter = num(p, 'alter') ?? 0;
                const octave = num(p, 'octave') ?? 4;
                const midi = (octave + 1) * 12 + STEP[step] + Math.round(alter);
                const ties = kids(el, 'tie').map((t) => t.getAttribute('type'));
                const notations = kid(el, 'notations');
                const tied = kids(notations, 'tied').map((t) => t.getAttribute('type'));
                const fingerText = txt(kid(notations, 'technical'), 'fingering');
                const finger = fingerText ? Number(fingerText.replace(/[^1-5].*$/, '')) : NaN;
                const hand = handForStaff(staff, staves, partIndex, parts.length);
                const dyn = dynByStaff.get(staff);
                const n: WrittenNote = {
                  midi,
                  startBeat: start,
                  durationBeats: grace ? 0.125 : dur,
                  measure: list.length,
                  hand,
                  tieStart: ties.includes('start') || tied.includes('start') || undefined,
                  tieStop: ties.includes('stop') || tied.includes('stop') || undefined,
                  lane: `${partIndex}:${staff}:${voice}`,
                };
                if (finger >= 1 && finger <= 5) n.finger = finger as Finger;
                if (dyn) {
                  n.dynamic = dyn;
                  n.velocity = DYNAMIC_VELOCITY[dyn];
                }
                if (kid(notations, 'arpeggiate')) n.arpeggiate = true;
                if (grace) {
                  n.grace = true;
                  pendingGraces.push(n);
                } else {
                  // Grace notes are placed just before the note they ornament.
                  if (pendingGraces.length) {
                    const k = pendingGraces.length;
                    pendingGraces.forEach((g, i) => {
                      g.startBeat = start - (k - i) * 0.125;
                    });
                    pm.notes.push(...pendingGraces);
                    pendingGraces = [];
                  }
                  pm.notes.push(n);
                }
              }
            }
            if (!isChord && !grace) {
              pos += dur;
              maxPos = Math.max(maxPos, pos);
            }
            break;
          }
          default:
            break;
        }
      }
      if (pendingGraces.length) {
        pm.notes.push(...pendingGraces);
        pendingGraces = [];
      }
      pm.lengthBeats = maxPos;
      list.push(pm);
    }
    maxStaves = Math.max(maxStaves, staves);
    parsed.push(list);
  });

  // Align measures across parts and build the written timeline.
  let beat = 0;
  let curTime: { numerator: number; denominator: number } = { numerator: 4, denominator: 4 };
  for (let mi = 0; mi < measureCount; mi++) {
    const across = parsed.map((pl) => pl[mi]).filter(Boolean);
    const t = across.find((x) => x.time)?.time;
    if (t) {
      curTime = t;
      timeSignatures.push({ beat, ...t });
    }
    const expected = measureLengthBeats(curTime);
    const content = Math.max(0, ...across.map((x) => x.lengthBeats));
    const implicit = across.some((x) => x.implicit);
    let length = implicit ? content || expected : content > expected + EPS ? content : expected;
    if (length <= 0) length = expected;
    const flow: Partial<WrittenMeasure> = {};
    for (const x of across) Object.assign(flow, x.flow);
    measures.push({ ...flow, startBeat: beat, lengthBeats: length, number: across[0]?.number ?? mi + 1 });
    const k = across.find((x) => x.key)?.key;
    if (k) keySignatures.push({ beat, ...k });
    for (const x of across) {
      for (const tp of x.tempo) tempo.push({ beat: beat + tp.pos, bpm: tp.bpm });
      for (const pd of x.pedal) pedal.push({ beat: beat + pd.pos, down: pd.down });
      for (const r of x.rehearsal) sections.push({ name: r, measure: mi });
      for (const n of x.notes) notes.push({ ...n, startBeat: Math.max(0, beat + n.startBeat), measure: mi });
    }
    beat += length;
  }

  // Wedges: pair start/stop per hand.
  const wedgeOpen = new Map<Hand, { type: 'crescendo' | 'diminuendo'; beat: number }>();
  for (let mi = 0; mi < measureCount; mi++) {
    for (const pl of parsed) {
      const pm = pl[mi];
      if (!pm) continue;
      for (const w of pm.wedges) {
        const b = measures[mi].startBeat + w.pos;
        if (w.type === 'stop') {
          const o = wedgeOpen.get(w.hand);
          if (o && b > o.beat) hairpins.push({ type: o.type, startBeat: o.beat, endBeat: b, hand: w.hand });
          wedgeOpen.delete(w.hand);
        } else wedgeOpen.set(w.hand, { type: w.type, beat: b });
      }
    }
  }

  // Single staff, single part: assign hands by pitch.
  if (maxStaves === 1 && parts.length === 1) assignHandsBySplit(notes, opts.splitPoint ?? 60);

  if (tempo.length === 0) tempo.push({ beat: 0, bpm: 100 });
  const score = assembleScore(
    { title, composer, license: rights, measures, notes, tempo, timeSignatures, keySignatures, hairpins, pedal, sections },
    'musicxml',
  );
  score.musicxml = xml;
  return score;

  function readSound(snd: Element, pm: PartMeasure, at: number) {
    const t = Number(snd.getAttribute('tempo'));
    if (t > 0 && !pm.tempo.some((x) => Math.abs(x.pos - at) < EPS)) pm.tempo.push({ pos: at, bpm: t });
    if (snd.getAttribute('dacapo') === 'yes') pm.flow.daCapo = true;
    if (snd.getAttribute('dalsegno')) pm.flow.dalSegno = true;
    if (snd.getAttribute('segno')) pm.flow.segno = true;
    if (snd.getAttribute('coda')) pm.flow.coda = true;
    if (snd.getAttribute('tocoda')) pm.flow.toCoda = true;
    if (snd.getAttribute('fine')) pm.flow.fine = true;
  }
}

function readWords(text: string, flow: Partial<WrittenMeasure>) {
  if (/^D\.?\s*C\.?/i.test(text) || /da\s+capo/i.test(text)) flow.daCapo = true;
  else if (/^D\.?\s*S\.?/i.test(text) || /dal\s+segno/i.test(text)) flow.dalSegno = true;
  else if (/to\s+coda/i.test(text)) flow.toCoda = true;
  else if (/^fine$/i.test(text)) flow.fine = true;
}

function unitInQuarters(unit: string): number {
  switch (unit) {
    case 'whole':
      return 4;
    case 'half':
      return 2;
    case 'eighth':
      return 0.5;
    case '16th':
      return 0.25;
    default:
      return 1;
  }
}

function handForStaff(staff: number, staves: number, partIndex: number, partCount: number): Hand {
  if (staves >= 2) return staff === 1 ? 'R' : 'L';
  if (partCount >= 2) return partIndex === 0 ? 'R' : 'L';
  return 'unknown';
}
