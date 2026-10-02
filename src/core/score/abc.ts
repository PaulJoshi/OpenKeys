import abcjs from 'abcjs';
import type { Finger, Hand, Score, ScoreNote, TimeSignature } from '../types';
import { assignHandsBySplit } from './hands';
import { buildMeasures, measureAtBeat } from './tempo';
import { makeId } from './ids';
import { ImportError } from './musicxml';

export interface AbcIssue {
  message: string;
  line?: number;
  column?: number;
}

export interface AbcParseResult {
  score: Score | null;
  issues: AbcIssue[];
  /** startChar of each produced note, so the editor can highlight source while playing. */
  noteChars: Map<string, number>;
}

interface AbcAudioNote {
  cmd: string;
  pitch: number;
  start: number;
  duration: number;
  volume?: number;
  startChar?: number;
}

interface AbcStaffLike {
  clef?: { type?: string };
  key?: { accidentals?: { acc: string }[] };
  voices?: { el_type: string; startChar?: number; decoration?: string[]; startTie?: unknown; pitches?: { startTie?: unknown; endTie?: unknown }[] }[][];
}

/**
 * ABC notation to Score. Uses abcjs for parsing and accidental/key resolution
 * (setUpAudio also unrolls repeats and voltas). `V:` voices map to hands:
 * a voice on a bass-clef staff is the left hand; otherwise the first voice is the right hand.
 * A single voice is split by pitch around `splitPoint`.
 */
export function parseAbcDetailed(text: string, opts: { splitPoint?: number; id?: string } = {}): AbcParseResult {
  const issues: AbcIssue[] = [];
  const noteChars = new Map<string, number>();
  let tunes: ReturnType<typeof abcjs.parseOnly>;
  try {
    tunes = abcjs.parseOnly(text);
  } catch (e) {
    return { score: null, issues: [{ message: `Could not parse ABC: ${(e as Error).message}` }], noteChars };
  }
  const tune = tunes[0];
  if (!tune) return { score: null, issues: [{ message: 'No tune found (an ABC tune starts with "X:").' }], noteChars };
  const warnObjs = (tune as unknown as { warningObjects?: { message: string; line: number; column: number }[] }).warningObjects;
  for (const w of warnObjs ?? []) issues.push({ message: stripHtml(w.message), line: w.line, column: w.column });

  let audio: { tracks: AbcAudioNote[][] };
  try {
    audio = (tune as unknown as { setUpAudio: (o: object) => { tracks: AbcAudioNote[][] } }).setUpAudio({});
  } catch (e) {
    issues.push({ message: `Could not build the note sequence: ${(e as Error).message}` });
    return { score: null, issues, noteChars };
  }

  // Map voices (tracks) to clefs.
  const lines = (tune.lines as unknown as { staff?: AbcStaffLike[] }[]).filter((l) => l.staff);
  const trackClefs: string[] = [];
  const decorationsByChar = new Map<number, string[]>();
  if (lines[0]) for (const st of lines[0].staff ?? []) for (let v = 0; v < (st.voices?.length ?? 0); v++) trackClefs.push(st.clef?.type ?? 'treble');
  for (const l of lines)
    for (const st of l.staff ?? [])
      for (const voice of st.voices ?? [])
        for (const el of voice) if (el.el_type === 'note' && el.decoration && el.startChar !== undefined) decorationsByChar.set(el.startChar, el.decoration);

  const meter = tune.getMeterFraction?.() ?? { num: 4, den: 4 };
  const ts: TimeSignature = { beat: 0, numerator: meter.num || 4, denominator: meter.den || 4 };
  const beatLenWhole = tune.getBeatLength?.() ?? 0.25;
  const bpm = (tune.getBpm?.() ?? 0) > 0 ? tune.getBpm() * beatLenWhole * 4 : 100;
  const pickupWhole = (tune as unknown as { getPickupLength?: () => number }).getPickupLength?.() ?? 0;
  const pickup = pickupWhole * 4;

  const noteTracks = audio.tracks.map((tr) => tr.filter((x) => x.cmd === 'note'));
  const nonEmpty = noteTracks.map((t, i) => ({ t, i })).filter((x) => x.t.length > 0);
  const raw: (Omit<ScoreNote, 'id' | 'measure'> & { char?: number })[] = [];
  nonEmpty.forEach(({ t, i }, k) => {
    let hand: Hand = 'unknown';
    if (nonEmpty.length > 1) {
      const clef = trackClefs[i] ?? 'treble';
      hand = clef.startsWith('bass') ? 'L' : k === 0 ? 'R' : nonEmpty.some((o) => (trackClefs[o.i] ?? '').startsWith('bass')) ? 'R' : 'L';
    }
    for (const n of t) {
      const note: Omit<ScoreNote, 'id' | 'measure'> & { char?: number } = {
        midi: n.pitch,
        startBeat: round(n.start * 4),
        durationBeats: round(n.duration * 4),
        hand,
        char: n.startChar,
      };
      const deco = n.startChar !== undefined ? decorationsByChar.get(n.startChar) : undefined;
      const f = deco?.map(Number).find((x) => x >= 1 && x <= 5);
      if (f) note.finger = f as Finger;
      const dyn = deco?.find((d) => ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'].includes(d));
      if (dyn) note.dynamic = dyn as ScoreNote['dynamic'];
      raw.push(note);
    }
  });
  if (raw.length === 0) {
    issues.push({ message: 'The tune contains no notes.' });
    return { score: null, issues, noteChars };
  }
  if (nonEmpty.length === 1) {
    // One voice: a bass-clef voice is the left hand; a treble melody that stays above E3 is the
    // right hand; anything else (piano parts written in one voice) is split by pitch.
    const clef = trackClefs[nonEmpty[0].i] ?? 'treble';
    if (clef.startsWith('bass')) for (const n of raw) n.hand = 'L';
    else if (raw.every((n) => n.midi >= 52)) for (const n of raw) n.hand = 'R';
    else assignHandsBySplit(raw, opts.splitPoint ?? 60);
  }

  // Propagate dynamics forward per hand and map to velocity.
  const dynVel: Record<string, number> = { ppp: 0.16, pp: 0.26, p: 0.38, mp: 0.5, mf: 0.62, f: 0.75, ff: 0.87, fff: 0.96 };
  raw.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const curDyn = new Map<Hand, ScoreNote['dynamic']>();
  if (raw.some((n) => n.dynamic)) {
    for (const n of raw) {
      if (n.dynamic) curDyn.set(n.hand, n.dynamic);
      const d = n.dynamic ?? curDyn.get(n.hand) ?? curDyn.get('unknown');
      if (d) {
        n.dynamic = d;
        n.velocity = dynVel[d];
      }
    }
  }

  const end = Math.max(...raw.map((n) => n.startBeat + n.durationBeats));
  const measureLen = (ts.numerator * 4) / ts.denominator;
  let measures;
  if (pickup > 1e-6 && pickup < measureLen - 1e-6) {
    const rest = buildMeasures([ts], Math.max(0, end - pickup));
    measures = [{ index: 0, startBeat: 0, lengthBeats: pickup, number: 0 }, ...rest.map((m) => ({ ...m, index: m.index + 1, startBeat: m.startBeat + pickup, number: m.index + 1 }))];
  } else measures = buildMeasures([ts], end);

  const scoreLike = { measures };
  const notes: ScoreNote[] = raw.map((n, i) => {
    const { char, ...rest } = n;
    const id = `n${i}`;
    if (char !== undefined) noteChars.set(id, char);
    return { ...rest, id, measure: measureAtBeat(scoreLike, n.startBeat + 1e-6) };
  });

  const meta = tune.metaText as { title?: string; composer?: string; rhythm?: string };
  const key = tune.getKeySignature?.() as { root?: string; acc?: string; mode?: string; accidentals?: { acc: string }[] } | undefined;
  const fifths = keyToFifths(key);
  const score: Score = {
    id: opts.id ?? makeId('abc'),
    title: meta?.title || 'Untitled exercise',
    composer: meta?.composer,
    source: 'abc',
    tempoMap: [{ beat: 0, bpm: round(bpm) }],
    timeSignatures: [ts],
    keySignatures: [{ beat: 0, fifths, mode: key?.mode === 'm' ? 'minor' : 'major' }],
    measures,
    notes,
    abc: text,
  };
  return { score, issues, noteChars };
}

export function parseAbc(text: string, opts: { splitPoint?: number; id?: string } = {}): Score {
  const r = parseAbcDetailed(text, opts);
  if (!r.score) throw new ImportError(r.issues.map((i) => i.message).join('\n') || 'Invalid ABC');
  return r.score;
}

function keyToFifths(key: { accidentals?: { acc: string }[] } | undefined): number {
  if (!key?.accidentals) return 0;
  let f = 0;
  for (const a of key.accidentals) {
    if (a.acc === 'sharp') f++;
    else if (a.acc === 'flat') f--;
  }
  return f;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
