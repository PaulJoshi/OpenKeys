/**
 * Computer-keyboard mapping for the virtual input. Uses KeyboardEvent.code so it works on any
 * layout (QWERTY positions). A-row = white keys, Q-row = black keys, Z/X = octave down/up.
 *
 *   W E   T Y U   O P
 *  A S D F G H J K L ; '
 *  C D E F G A B C D E F
 */
export const WHITE_ROW: Record<string, number> = {
  KeyA: 0,
  KeyS: 2,
  KeyD: 4,
  KeyF: 5,
  KeyG: 7,
  KeyH: 9,
  KeyJ: 11,
  KeyK: 12,
  KeyL: 14,
  Semicolon: 16,
  Quote: 17,
};

export const BLACK_ROW: Record<string, number> = {
  KeyW: 1,
  KeyE: 3,
  KeyT: 6,
  KeyY: 8,
  KeyU: 10,
  KeyO: 13,
  KeyP: 15,
};

export const OCTAVE_DOWN = 'KeyZ';
export const OCTAVE_UP = 'KeyX';

/** Semitone offset from the base C for a key code, or null if unmapped. */
export function codeToOffset(code: string): number | null {
  if (code in WHITE_ROW) return WHITE_ROW[code];
  if (code in BLACK_ROW) return BLACK_ROW[code];
  return null;
}

/** Inverse: the key label for a MIDI note given the base C, for on-screen hints. */
export function midiToKeyLabel(midi: number, baseC: number): string | null {
  const off = midi - baseC;
  for (const [code, o] of Object.entries({ ...WHITE_ROW, ...BLACK_ROW })) {
    if (o === off) {
      if (code.startsWith('Key')) return code.slice(3);
      return code === 'Semicolon' ? ';' : "'";
    }
  }
  return null;
}
