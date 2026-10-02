import type { TimingVerdict } from '../../core/judge/types';
import { OK } from '../design/palette';

export interface WrongMark {
  midi: number;
  /** Score note it was played instead of (for ghost noteheads). */
  nearNoteId?: string;
  beat: number;
}

/**
 * Practice view state read by the sheet, falling notes and keyboard at 60 fps, outside React.
 */
class PracticeLive {
  getBeat: () => number = () => 0;
  /** Seconds per beat at practice tempo (falling-notes speed). */
  secPerBeat = 0.5;
  marks = new Map<string, TimingVerdict>();
  wrongs: WrongMark[] = [];
  /** Brief hit-line flashes: midi -> {kind, until (performance.now ms)} */
  flashes = new Map<number, { kind: 'hit' | 'wrong' | 'missed'; until: number }>();
  loop: { startBeat: number; endBeat: number } | null = null;
  running = false;
  private listeners = new Set<() => void>();
  version = 0;

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  changed() {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  mark(noteId: string, v: TimingVerdict) {
    this.marks.set(noteId, v);
    this.changed();
  }

  addWrong(w: WrongMark) {
    this.wrongs.push(w);
    if (this.wrongs.length > 200) this.wrongs.shift();
    this.changed();
  }

  flash(midi: number, kind: 'hit' | 'wrong' | 'missed', ms = 220) {
    this.flashes.set(midi, { kind, until: performance.now() + ms });
  }

  reset() {
    this.marks.clear();
    this.wrongs = [];
    this.flashes.clear();
    this.changed();
  }
}

export const practiceLive = new PracticeLive();

export const VERDICT_STYLE: Record<TimingVerdict, { color: string; icon: string; label: string }> = {
  perfect: { color: 'var(--good)', icon: '✓', label: 'Perfect' },
  good: { color: 'var(--good)', icon: '✓', label: 'Good' },
  ok: { color: 'var(--good)', icon: '✓', label: 'OK' },
  early: { color: 'var(--warn)', icon: '←', label: 'Early' },
  late: { color: 'var(--warn)', icon: '→', label: 'Late' },
  wrong: { color: 'var(--bad)', icon: '✕', label: 'Wrong note' },
  missed: { color: 'var(--bad)', icon: '○', label: 'Missed' },
  extra: { color: 'var(--bad)', icon: '+', label: 'Extra' },
  uncertain: { color: 'var(--unsure)', icon: '?', label: 'Unsure' },
};

/** Concrete colours for canvas/SVG drawing (CSS variables don't work inside OSMD's SVG fills). */
export function verdictHex(v: TimingVerdict, dark: boolean): string {
  switch (v) {
    case 'perfect':
    case 'good':
    case 'ok':
      return dark ? OK.greenBright : OK.green;
    case 'early':
    case 'late':
      return dark ? OK.hairline : OK.charcoal;
    case 'uncertain':
      return OK.stone;
    default:
      return OK.red;
  }
}
