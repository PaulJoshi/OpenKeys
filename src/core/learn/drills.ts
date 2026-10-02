import type { Finger, Hand, Score, ScoreNote } from '../types';
import { buildMeasures, measureAtBeat } from '../score/tempo';
import { pitchClass } from '../music';
import { hashId } from '../score/ids';

/** Procedural drills; every generator returns a normal Score judged by the same engine. */

export const KEY_NAMES_MAJOR: Record<number, string> = { [-6]: 'G♭', [-5]: 'D♭', [-4]: 'A♭', [-3]: 'E♭', [-2]: 'B♭', [-1]: 'F', 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F♯' };
export const KEY_NAMES_MINOR: Record<number, string> = { [-6]: 'E♭', [-5]: 'B♭', [-4]: 'F', [-3]: 'C', [-2]: 'G', [-1]: 'D', 0: 'A', 1: 'E', 2: 'B', 3: 'F♯', 4: 'C♯', 5: 'G♯', 6: 'D♯' };

export function tonicPc(fifths: number, mode: 'major' | 'minor'): number {
  const major = (((fifths * 7) % 12) + 12) % 12;
  return mode === 'major' ? major : (major + 9) % 12;
}

interface DraftNote {
  midi: number;
  startBeat: number;
  durationBeats: number;
  hand: Hand;
  finger?: Finger;
}

function makeScore(id: string, title: string, notes: DraftNote[], opts: { bpm: number; numerator?: number; fifths?: number; mode?: 'major' | 'minor'; tags?: string[] }): Score {
  const num = opts.numerator ?? 4;
  const end = Math.max(...notes.map((n) => n.startBeat + n.durationBeats));
  const timeSignatures = [{ beat: 0, numerator: num, denominator: 4 }];
  const measures = buildMeasures(timeSignatures, end);
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  return {
    id,
    title,
    composer: 'OpenKeys drill',
    license: 'Generated exercise',
    source: 'json',
    tempoMap: [{ beat: 0, bpm: opts.bpm }],
    timeSignatures,
    keySignatures: [{ beat: 0, fifths: opts.fifths ?? 0, mode: opts.mode ?? 'major' }],
    measures,
    notes: sorted.map((n, i): ScoreNote => ({ ...n, id: `d${i}`, measure: measureAtBeat({ measures }, n.startBeat + 1e-6) })),
    tags: ['drill', ...(opts.tags ?? [])],
  };
}

// ---------- scales ----------

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 11];

/** Standard one-octave fingerings (8 notes, ascending) by tonic pitch class, major keys. */
const MAJOR_FINGERING: Record<number, { R: number[]; L: number[] }> = {
  0: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // C
  7: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // G
  2: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // D
  9: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // A
  4: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // E
  11: { R: [1, 2, 3, 1, 2, 3, 4, 5], L: [4, 3, 2, 1, 4, 3, 2, 1] }, // B
  5: { R: [1, 2, 3, 4, 1, 2, 3, 4], L: [5, 4, 3, 2, 1, 3, 2, 1] }, // F
  10: { R: [4, 1, 2, 3, 1, 2, 3, 4], L: [3, 2, 1, 4, 3, 2, 1, 3] }, // Bb
  3: { R: [3, 1, 2, 3, 4, 1, 2, 3], L: [3, 2, 1, 4, 3, 2, 1, 3] }, // Eb
  8: { R: [3, 4, 1, 2, 3, 1, 2, 3], L: [3, 2, 1, 4, 3, 2, 1, 3] }, // Ab
  1: { R: [2, 3, 1, 2, 3, 4, 1, 2], L: [3, 2, 1, 4, 3, 2, 1, 3] }, // Db
  6: { R: [2, 3, 4, 1, 2, 3, 1, 2], L: [4, 3, 2, 1, 3, 2, 1, 4] }, // F#/Gb
};

/** Extends a one-octave fingering over n octaves (the top note keeps the last finger). */
function fingeringFor(pc: number, hand: 'L' | 'R', octaves: number, minor = false): number[] {
  // Harmonic minor scales mostly share the fingering of the major scale on the same tonic.
  const base = (MAJOR_FINGERING[pc] ?? MAJOR_FINGERING[0])[hand];
  void minor;
  const inner = base.slice(0, 7);
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) out.push(...inner);
  out.push(base[7]);
  // LH: the octave joins use the thumb on the tonic -> replace the repeated first finger with 1 where needed.
  return out;
}

export interface ScaleOptions {
  fifths: number;
  mode: 'major' | 'minor';
  hands: 'L' | 'R' | 'both';
  octaves: number;
  bpm: number;
}

export function scaleDrill(o: ScaleOptions): Score {
  const pc = tonicPc(o.fifths, o.mode);
  const steps = o.mode === 'major' ? MAJOR_STEPS : HARMONIC_MINOR_STEPS;
  const notes: DraftNote[] = [];
  const startR = 60 + pc - (pc > 7 ? 12 : 0);
  const startL = startR - 12 * Math.max(1, Math.min(2, o.octaves));
  for (const hand of o.hands === 'both' ? (['R', 'L'] as const) : ([o.hands] as const)) {
    const start = hand === 'R' ? startR : startL;
    const up: number[] = [];
    for (let oct = 0; oct < o.octaves; oct++) for (const s of steps) up.push(start + oct * 12 + s);
    up.push(start + o.octaves * 12);
    const fing = fingeringFor(pc, hand, o.octaves, o.mode === 'minor');
    const seq = [...up, ...up.slice(0, -1).reverse()];
    const fseq = [...fing, ...fing.slice(0, -1).reverse()];
    seq.forEach((m, i) => notes.push({ midi: m, startBeat: i * 0.5, durationBeats: i === seq.length - 1 ? 2 : 0.5, hand, finger: fseq[i] as Finger }));
  }
  const name = `${o.mode === 'major' ? KEY_NAMES_MAJOR[o.fifths] : KEY_NAMES_MINOR[o.fifths]} ${o.mode === 'major' ? 'major' : 'harmonic minor'} scale`;
  return makeScore(hashId(JSON.stringify(o), 'drill-scale'), `${name}, ${o.octaves} octave${o.octaves > 1 ? 's' : ''}`, notes, { bpm: o.bpm, fifths: o.fifths, mode: o.mode, tags: ['scale'] });
}

export function arpeggioDrill(o: ScaleOptions): Score {
  const pc = tonicPc(o.fifths, o.mode);
  const triad = o.mode === 'major' ? [0, 4, 7] : [0, 3, 7];
  const notes: DraftNote[] = [];
  const startR = 60 + pc - (pc > 7 ? 12 : 0);
  const startL = startR - 12 * Math.max(1, Math.min(2, o.octaves));
  for (const hand of o.hands === 'both' ? (['R', 'L'] as const) : ([o.hands] as const)) {
    const start = hand === 'R' ? startR : startL;
    const up: number[] = [];
    for (let oct = 0; oct < o.octaves; oct++) for (const s of triad) up.push(start + oct * 12 + s);
    up.push(start + o.octaves * 12);
    const fUp = hand === 'R' ? [...Array.from({ length: o.octaves }, () => [1, 2, 3]).flat(), 5] : [5, ...Array.from({ length: o.octaves }, () => [4, 2, 1]).flat()].slice(0, up.length);
    const seq = [...up, ...up.slice(0, -1).reverse()];
    const fseq = [...fUp, ...fUp.slice(0, -1).reverse()];
    seq.forEach((m, i) => notes.push({ midi: m, startBeat: i * 0.5, durationBeats: i === seq.length - 1 ? 2 : 0.5, hand, finger: fseq[i] as Finger }));
  }
  const name = `${o.mode === 'major' ? KEY_NAMES_MAJOR[o.fifths] : KEY_NAMES_MINOR[o.fifths]} ${o.mode} arpeggio`;
  return makeScore(hashId(JSON.stringify(o), 'drill-arp'), `${name}, ${o.octaves} octave${o.octaves > 1 ? 's' : ''}`, notes, { bpm: o.bpm, fifths: o.fifths, mode: o.mode, tags: ['arpeggio'] });
}

// ---------- chord progressions ----------

export type Progression = 'I-IV-V-I' | 'I-V-vi-IV' | 'I-vi-IV-V' | 'ii-V-I';

const DEGREES: Record<string, number> = { I: 0, ii: 1, iii: 2, IV: 3, V: 4, vi: 5 };

export function progressionDrill(o: { fifths: number; progression: Progression; inversion: 'root' | 'smooth'; hands: 'L' | 'R' | 'both'; bpm: number; pattern: 'block' | 'broken' }): Score {
  const pc = tonicPc(o.fifths, 'major');
  const scale = MAJOR_STEPS.map((s) => (pc + s) % 12);
  const notes: DraftNote[] = [];
  let prev: number[] | null = null;
  o.progression.split('-').forEach((deg, i) => {
    const d = DEGREES[deg];
    const triadPcs = [scale[d], scale[(d + 2) % 7], scale[(d + 4) % 7]];
    // Right hand: root position around C4, or the inversion closest to the previous chord.
    const rootMidi = 60 + ((triadPcs[0] - 0 + 12) % 12);
    const root = [rootMidi, rootMidi + ((triadPcs[1] - triadPcs[0] + 12) % 12), rootMidi + ((triadPcs[2] - triadPcs[0] + 12) % 12)];
    let chord = root.map((m) => (m > 72 ? m - 12 : m));
    chord.sort((a, b) => a - b);
    if (o.inversion === 'smooth' && prev) {
      let best = chord;
      let bd = Infinity;
      for (let inv = 0; inv < 3; inv++) {
        for (const shift of [-12, 0, 12]) {
          const c = chord.map((m, k) => (k < inv ? m + 12 : m) + shift).sort((a, b) => a - b);
          if (c[0] < 55 || c[2] > 79) continue;
          const dist = c.reduce((s, m, k) => s + Math.abs(m - prev![k]), 0);
          if (dist < bd) {
            bd = dist;
            best = c;
          }
        }
      }
      chord = best;
    }
    prev = chord;
    const beat = i * 4;
    if (o.hands !== 'L') {
      if (o.pattern === 'block') chord.forEach((m, k) => notes.push({ midi: m, startBeat: beat, durationBeats: 4, hand: 'R', finger: ([1, 3, 5] as Finger[])[k] }));
      else [0, 1, 2, 1].forEach((k, j) => notes.push({ midi: chord[k], startBeat: beat + j, durationBeats: 1, hand: 'R', finger: ([1, 3, 5] as Finger[])[k] }));
    }
    if (o.hands !== 'R') {
      const bass = 48 + ((triadPcs[0] - 0 + 12) % 12) - (triadPcs[0] > 7 ? 12 : 0);
      notes.push({ midi: bass, startBeat: beat, durationBeats: 4, hand: 'L', finger: 5 });
    }
  });
  return makeScore(hashId(JSON.stringify(o), 'drill-prog'), `${o.progression} in ${KEY_NAMES_MAJOR[o.fifths]} major`, notes, { bpm: o.bpm, fifths: o.fifths, tags: ['chords'] });
}

// ---------- sight-reading ----------

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}

export interface SightReadingLevel {
  level: number;
  /** Range in scale steps above/below the tonic. */
  span: number;
  maxLeap: number;
  durations: number[];
  rests: boolean;
  keys: number[];
  bars: number;
  leftHand: boolean;
}

export function sightReadingLevel(level: number): SightReadingLevel {
  const l = Math.max(1, Math.min(10, Math.round(level)));
  return {
    level: l,
    span: l <= 1 ? 4 : l <= 3 ? 5 : l <= 5 ? 7 : 9,
    maxLeap: l <= 1 ? 1 : l <= 2 ? 2 : l <= 4 ? 3 : l <= 6 ? 4 : 7,
    durations: l <= 1 ? [1] : l <= 2 ? [1, 2] : l <= 4 ? [1, 2, 4] : l <= 6 ? [0.5, 1, 2] : [0.5, 1, 1.5, 2],
    rests: l >= 3,
    keys: l <= 4 ? [0] : l <= 6 ? [0, 1, -1] : [0, 1, -1, 2, -2],
    bars: l <= 2 ? 4 : 8,
    leftHand: l >= 5,
  };
}

/** Random melody constrained by key, range, rhythm vocabulary and leap size. */
export function sightReadingDrill(level: number, seed: number): Score {
  const L = sightReadingLevel(level);
  const r = rng(seed);
  const fifths = L.keys[Math.floor(r() * L.keys.length)];
  const pc = tonicPc(fifths, 'major');
  const scale = MAJOR_STEPS.map((s) => s);
  const tonic = 60 + pc - (pc > 5 ? 12 : 0);
  const degreeToMidi = (deg: number) => tonic + Math.floor(deg / 7) * 12 + scale[((deg % 7) + 7) % 7];
  const notes: DraftNote[] = [];
  let beat = 0;
  let deg = 0;
  const total = L.bars * 4;
  while (beat < total - 1e-6) {
    let dur = L.durations[Math.floor(r() * L.durations.length)];
    if (beat + dur > total) dur = total - beat;
    // Don't cross barlines with long notes.
    const toBar = 4 - (beat % 4);
    if (dur > toBar) dur = toBar;
    const last = beat + dur >= total - 1e-6;
    if (L.rests && !last && r() < 0.12 && beat > 0) {
      beat += Math.min(dur, 1);
      continue;
    }
    if (last) deg = 0; // end on the tonic
    else {
      const step = Math.round((r() * 2 - 1) * L.maxLeap);
      deg = Math.max(-1, Math.min(L.span, deg + (step === 0 ? (r() < 0.5 ? 1 : -1) : step)));
    }
    notes.push({ midi: degreeToMidi(deg), startBeat: beat, durationBeats: dur, hand: 'R' });
    beat += dur;
  }
  if (L.leftHand) {
    const chordsDeg = [0, 3, 4, 0];
    for (let b = 0; b < L.bars; b++) notes.push({ midi: degreeToMidi(chordsDeg[b % 4]) - 12 - (degreeToMidi(chordsDeg[b % 4]) - 12 > 55 ? 12 : 0), startBeat: b * 4, durationBeats: 4, hand: 'L' });
  }
  const bpm = 60 + L.level * 5;
  return makeScore(`drill-sight-${level}-${seed}`, `Sight-reading, level ${L.level}`, notes, { bpm, fifths, tags: ['sight-reading'] });
}

// ---------- rhythm ----------

/** Written rhythms on one key (judged on timing only: any key counts). */
export function rhythmDrill(level: number, seed: number): Score {
  const r = rng(seed);
  const vocab = level <= 1 ? [[1], [2]] : level <= 3 ? [[1], [2], [0.5, 0.5], [1.5, 0.5]] : [[1], [0.5, 0.5], [0.75, 0.25], [1.5, 0.5], [0.25, 0.25, 0.5], [1 / 3, 1 / 3, 1 / 3]];
  const notes: DraftNote[] = [];
  let beat = 0;
  while (beat < 16 - 1e-6) {
    const cell = vocab[Math.floor(r() * vocab.length)];
    const len = cell.reduce((a, b) => a + b, 0);
    if (beat % 4 + len > 4 + 1e-6) {
      notes.push({ midi: 72, startBeat: beat, durationBeats: 4 - (beat % 4), hand: 'R' });
      beat += 4 - (beat % 4);
      continue;
    }
    for (const d of cell) {
      notes.push({ midi: 72, startBeat: beat, durationBeats: d, hand: 'R' });
      beat += d;
    }
  }
  return makeScore(`drill-rhythm-${level}-${seed}`, `Rhythm, level ${level}`, notes, { bpm: 70 + level * 5, tags: ['rhythm', 'any-pitch'] });
}

// ---------- ear training ----------

export interface EarPhrase {
  notes: number[];
  description: string;
}

const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];

/** Level 1-2: intervals from middle C; 3+: short phrases in C major. */
export function earPhrase(level: number, seed: number): EarPhrase {
  const r = rng(seed);
  if (level <= 2) {
    const pool = level === 1 ? [2, 4, 5, 7, 12] : [1, 2, 3, 4, 5, 7, 9, 12];
    const iv = pool[Math.floor(r() * pool.length)];
    const base = 60 + MAJOR_STEPS[Math.floor(r() * 5)];
    return { notes: [base, base + iv], description: `${INTERVALS[iv]} up` };
  }
  const len = Math.min(6, 2 + level);
  const notes: number[] = [];
  let deg = Math.floor(r() * 5);
  for (let i = 0; i < len; i++) {
    notes.push(60 + Math.floor(deg / 7) * 12 + MAJOR_STEPS[((deg % 7) + 7) % 7]);
    deg = Math.max(0, Math.min(9, deg + Math.round((r() * 2 - 1) * Math.min(4, level - 1))));
  }
  return { notes, description: `${len}-note phrase in C major` };
}

/** Compares a played phrase (pitch order) with the target: per-note correctness. */
export function compareEar(target: number[], played: number[]): { correct: boolean[]; allRight: boolean; transposedBy: number | null } {
  const correct = target.map((m, i) => played[i] === m);
  // Right shape in another octave/key: tell the learner (interval memory is still good).
  let transposedBy: number | null = null;
  if (played.length === target.length && !correct.every(Boolean)) {
    const d = played[0] - target[0];
    if (d !== 0 && played.every((m, i) => m - target[i] === d)) transposedBy = d;
  }
  return { correct, allRight: correct.every(Boolean) && played.length >= target.length, transposedBy };
}

// ---------- note-reading game ----------

export interface NoteReadingStats {
  /** midi -> attempts, correct, mean reaction ms */
  perNote: Record<number, { attempts: number; correct: number; meanMs: number }>;
}

/** Picks the next note: favours notes that are slow or often missed. */
export function nextReadingNote(clef: 'treble' | 'bass' | 'both', stats: NoteReadingStats, r: () => number, naturalsOnly = true): number {
  const pool: number[] = [];
  const lo = clef === 'bass' ? 40 : clef === 'both' ? 43 : 57;
  const hi = clef === 'bass' ? 62 : clef === 'both' ? 81 : 81;
  for (let m = lo; m <= hi; m++) if (!naturalsOnly || [0, 2, 4, 5, 7, 9, 11].includes(pitchClass(m))) pool.push(m);
  const weights = pool.map((m) => {
    const s = stats.perNote[m];
    if (!s) return 3;
    const missRate = 1 - s.correct / Math.max(1, s.attempts);
    return 1 + missRate * 4 + Math.min(3, s.meanMs / 1500);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function recordReading(stats: NoteReadingStats, midi: number, correct: boolean, ms: number): NoteReadingStats {
  const s = stats.perNote[midi] ?? { attempts: 0, correct: 0, meanMs: 0 };
  const attempts = s.attempts + 1;
  const meanMs = correct ? (s.meanMs * s.correct + ms) / (s.correct + 1) : s.meanMs;
  return { perNote: { ...stats.perNote, [midi]: { attempts, correct: s.correct + (correct ? 1 : 0), meanMs } } };
}
