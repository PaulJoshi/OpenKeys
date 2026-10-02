/** Pitch helpers. MIDI 69 = A4. */

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;
const ASCII_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const MIDI_MIN = 21;
export const MIDI_MAX = 108;

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Fractional MIDI number for a frequency. */
export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

/** Display name such as "C♯4". Uses flats when `preferFlats` (e.g. flat key signatures). */
export function midiToName(midi: number, preferFlats = false, withOctave = true): string {
  const pc = pitchClass(midi);
  const name = preferFlats ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
  return withOctave ? `${name}${octaveOf(midi)}` : name;
}

/** ASCII name such as "C#4" (used for sample file names and Tone.js). */
export function midiToAscii(midi: number): string {
  return `${ASCII_SHARP[pitchClass(midi)]}${octaveOf(midi)}`;
}

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Parses "C4", "C#4", "Db3", "F♯2", "Bb-1". Returns NaN if invalid. */
export function nameToMidi(name: string): number {
  const m = /^([A-Ga-g])([#♯b♭]*)(-?\d+)$/.exec(name.trim());
  if (!m) return NaN;
  let pc = STEP_PC[m[1].toUpperCase()];
  for (const ch of m[2]) pc += ch === '#' || ch === '♯' ? 1 : -1;
  return (parseInt(m[3], 10) + 1) * 12 + pc;
}

export function isBlackKey(midi: number): boolean {
  const pc = pitchClass(midi);
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

/** Diatonic step number (C0 = 0, D0 = 1 ... ) for staff positioning; black keys use the lower letter. */
export function diatonicStep(midi: number, preferFlats = false): number {
  const pc = pitchClass(midi);
  const oct = octaveOf(midi);
  const sharpStep = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc];
  const flatStep = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6][pc];
  return oct * 7 + (preferFlats ? flatStep : sharpStep);
}

const MAJOR_KEYS = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
const MINOR_KEYS = ['A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯'];

export function keyName(fifths: number, mode: 'major' | 'minor'): string {
  const i = Math.max(-7, Math.min(7, fifths)) + 7;
  return mode === 'major' ? `${MAJOR_KEYS[i]} major` : `${MINOR_KEYS[i]} minor`;
}

/** Pitch classes altered by a key signature, and the direction (+1 sharp, -1 flat). */
export function keySignatureAccidentals(fifths: number): Map<number, 1 | -1> {
  const out = new Map<number, 1 | -1>();
  const sharpOrder = [5, 0, 7, 2, 9, 4, 11]; // F C G D A E B (natural pitch classes)
  const flatOrder = [11, 4, 9, 2, 7, 0, 5]; // B E A D G C F
  if (fifths > 0) for (let i = 0; i < Math.min(7, fifths); i++) out.set(sharpOrder[i], 1);
  if (fifths < 0) for (let i = 0; i < Math.min(7, -fifths); i++) out.set(flatOrder[i], -1);
  return out;
}

/** Major-scale pitch classes for a key given in fifths (major mode tonic). */
export function scalePitchClasses(fifths: number, mode: 'major' | 'minor' = 'major'): number[] {
  const tonicMajor = (((fifths * 7) % 12) + 12) % 12;
  const tonic = mode === 'major' ? tonicMajor : (tonicMajor + 9) % 12;
  const steps = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return steps.map((s) => (tonic + s) % 12);
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const pos = clamp(q, 0, 1) * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export const DYNAMIC_VELOCITY: Record<string, number> = {
  ppp: 0.16,
  pp: 0.26,
  p: 0.38,
  mp: 0.5,
  mf: 0.62,
  f: 0.75,
  ff: 0.87,
  fff: 0.96,
};
