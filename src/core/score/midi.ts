import { Midi } from '@tonejs/midi';
import type { Hand, KeySignature, PedalMark, Score, ScoreNote, TempoPoint, TimeSignature } from '../types';
import { assignHandsBySplit, handsForTracks } from './hands';
import { buildMeasures, measureAtBeat } from './tempo';
import { makeId } from './ids';
import { ImportError } from './musicxml';

const KEY_FIFTHS: Record<string, number> = {
  Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
};

/**
 * Standard MIDI file to Score. Two pitched tracks: hands by average pitch. One track: split at
 * `splitPoint` (default middle C) smoothed with a hand-continuity heuristic. Keeps velocities
 * and the sustain pedal (CC64).
 */
export function parseMidiFile(data: ArrayBuffer | Uint8Array, opts: { splitPoint?: number; title?: string } = {}): Score {
  let midi: Midi;
  try {
    midi = new Midi(data instanceof Uint8Array ? data : new Uint8Array(data));
  } catch (e) {
    throw new ImportError(`Not a valid MIDI file: ${(e as Error).message}`);
  }
  const ppq = midi.header.ppq || 480;
  const tracks = midi.tracks.filter((t) => t.notes.length > 0 && t.channel !== 9 && !t.instrument.percussion);
  if (tracks.length === 0) throw new ImportError('The MIDI file contains no pitched notes.');

  const avgs = tracks.map((t) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length);
  const hands: Hand[] = handsForTracks(avgs);
  const raw: Omit<ScoreNote, 'id' | 'measure'>[] = [];
  tracks.forEach((t, ti) => {
    for (const n of t.notes) {
      raw.push({
        midi: n.midi,
        startBeat: n.ticks / ppq,
        durationBeats: Math.max(n.durationTicks / ppq, 1 / 32),
        hand: hands[ti],
        velocity: Math.round(n.velocity * 1000) / 1000,
      });
    }
  });
  if (tracks.length === 1) assignHandsBySplit(raw, opts.splitPoint ?? 60);

  // Zero-pad leading silence to the first downbeat, if notes start late (common in exports).
  const tempoMap: TempoPoint[] = midi.header.tempos.map((t) => ({ beat: t.ticks / ppq, bpm: round3(t.bpm) }));
  if (tempoMap.length === 0) tempoMap.push({ beat: 0, bpm: 120 });
  const timeSignatures: TimeSignature[] = midi.header.timeSignatures.map((t) => ({
    beat: t.ticks / ppq,
    numerator: t.timeSignature[0],
    denominator: t.timeSignature[1],
  }));
  if (timeSignatures.length === 0) timeSignatures.push({ beat: 0, numerator: 4, denominator: 4 });
  const keySignatures: KeySignature[] = midi.header.keySignatures.map((k) => ({
    beat: k.ticks / ppq,
    fifths: KEY_FIFTHS[k.key] ?? 0,
    mode: k.scale === 'minor' ? 'minor' : 'major',
  }));
  if (keySignatures.length === 0) keySignatures.push({ beat: 0, fifths: 0, mode: 'major' });

  const pedal: PedalMark[] = [];
  for (const t of tracks) {
    for (const cc of t.controlChanges[64] ?? []) {
      const down = cc.value >= 0.5;
      const last = pedal[pedal.length - 1];
      if (!last || last.down !== down) pedal.push({ beat: cc.ticks / ppq, down });
    }
  }
  pedal.sort((a, b) => a.beat - b.beat);

  const end = Math.max(...raw.map((n) => n.startBeat + n.durationBeats));
  const measures = buildMeasures(timeSignatures, end);
  raw.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const notes: ScoreNote[] = raw.map((n, i) => ({ ...n, id: `n${i}`, measure: measureAtBeat({ measures }, n.startBeat + 1e-6) }));

  const name = opts.title || midi.header.name || tracks[0].name || 'Untitled MIDI';
  return {
    id: makeId('midi'),
    title: name.trim() || 'Untitled MIDI',
    source: 'midi',
    tempoMap,
    timeSignatures,
    keySignatures,
    measures,
    notes,
    pedal: pedal.length ? pedal : undefined,
  };
}

function round3(x: number) {
  return Math.round(x * 1000) / 1000;
}
