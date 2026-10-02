import type { NoteEvent, Score, ScoreNote } from '../src/core/types';
import { parseAbc } from '../src/core/score/abc';

export const ODE_RH_ABC = `X:1
T:Ode to Joy (right hand)
M:4/4
L:1/4
Q:1/4=120
K:C
E E F G | G F E D | C C D E | E3/2 D/ D2 |
E E F G | G F E D | C C D E | D3/2 C/ C2 |]
`;

export const CHORDS_ABC = `X:1
T:Chords
M:4/4
L:1/4
Q:1/4=120
K:C
V:1
[CEG] [DFA] [EGB] [CEG] |
V:2 clef=bass
C, D, E, C, |]
`;

export function odeRH(): Score {
  return parseAbc(ODE_RH_ABC);
}

export function chords(): Score {
  return parseAbc(CHORDS_ABC);
}

/** Generates noteOn/noteOff events for playing notes with given per-note timing tweaks. */
export function perform(
  notes: readonly ScoreNote[],
  timeAt: (beat: number) => number,
  opts: {
    offset?: (n: ScoreNote, i: number) => number;
    pitch?: (n: ScoreNote, i: number) => number;
    skip?: (n: ScoreNote, i: number) => boolean;
    velocity?: (n: ScoreNote) => number;
    source?: NoteEvent['source'];
    confidence?: number;
    holdFraction?: number;
    secPerBeat?: number;
  } = {},
): NoteEvent[] {
  const out: NoteEvent[] = [];
  const spb = opts.secPerBeat ?? 0.5;
  notes.forEach((n, i) => {
    if (opts.skip?.(n, i)) return;
    const t = timeAt(n.startBeat) + (opts.offset?.(n, i) ?? 0);
    const midi = opts.pitch?.(n, i) ?? n.midi;
    const common = { source: opts.source ?? ('virtual' as const), confidence: opts.confidence ?? 1 };
    out.push({ kind: 'noteOn', midi, time: t, velocity: opts.velocity?.(n) ?? 0.6, ...common });
    out.push({ kind: 'noteOff', midi, time: t + n.durationBeats * spb * (opts.holdFraction ?? 0.95), velocity: 0, ...common });
  });
  return out.sort((a, b) => a.time - b.time || (a.kind === 'noteOff' ? -1 : 1));
}
