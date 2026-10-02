export type KeyState = 'target' | 'correct' | 'wrong' | 'pressed';
/**
 * Interactive piano keyboard — the OpenKeys signature surface (intentional addition).
 * Flat, square, ink-and-white; feedback colors mark target / correct / wrong notes.
 * @startingPoint section="Learning" subtitle="Two-octave interactive keyboard" viewport="700x220"
 */
export interface PianoKeyboardProps {
  /** First octave number (C of this octave is the leftmost key). Default 4. */
  startOctave?: number;
  /** Number of full octaves; a closing C is appended. Default 2. */
  octaves?: number;
  /** Map of note id (e.g. "C4", "F#4") to visual state. */
  keyStates?: Record<string, KeyState>;
  /** 'c' labels only C keys, 'all' labels every white key, 'none' hides labels. Default 'c'. */
  showLabels?: 'c' | 'all' | 'none';
  /** Height in px. Default 160. */
  height?: number;
  onKeyPress?: (note: string) => void;
  style?: React.CSSProperties;
}
export declare function PianoKeyboard(props: PianoKeyboardProps): JSX.Element;
