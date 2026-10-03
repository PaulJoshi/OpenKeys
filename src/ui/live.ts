import type { Hand } from '../core/types';

/**
 * Non-React live state for 60 fps visuals (keyboard highlights, falling notes, meters).
 * Components subscribe and update the DOM/canvas directly instead of re-rendering React.
 */
export type KeyMark = 'down' | 'hit' | 'wrong';

class LiveKeys {
  /** Keys the learner is pressing (with a mark). */
  pressed = new Map<number, KeyMark>();
  /** Upcoming keys to play (outlined), with hand. */
  upcoming = new Map<number, Hand>();
  private listeners = new Set<() => void>();
  private scheduled = false;
  private flashTimers = new Map<number, number>();

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private changed() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      for (const cb of this.listeners) cb();
    });
  }

  press(midi: number, mark: KeyMark = 'down') {
    // A held key stays lit until it is released, keeping any verdict the judge already gave it.
    const flash = this.flashTimers.get(midi);
    if (flash) {
      clearTimeout(flash);
      this.flashTimers.delete(midi);
    }
    const prev = this.pressed.get(midi);
    this.pressed.set(midi, mark === 'down' && prev && prev !== 'down' ? prev : mark);
    this.changed();
  }

  /** Upgrades a held key's mark (e.g. to hit/wrong when the judge decides). */
  mark(midi: number, mark: KeyMark) {
    if (this.pressed.has(midi)) {
      this.pressed.set(midi, mark);
      this.changed();
    } else this.flash(midi, mark);
  }

  release(midi: number) {
    if (this.pressed.delete(midi)) this.changed();
  }

  /** Briefly marks a key (mic mode, where key-up is not known). */
  flash(midi: number, mark: KeyMark, ms = 280) {
    this.pressed.set(midi, mark);
    this.changed();
    const prev = this.flashTimers.get(midi);
    if (prev) clearTimeout(prev);
    this.flashTimers.set(
      midi,
      window.setTimeout(() => {
        this.flashTimers.delete(midi);
        this.release(midi);
      }, ms),
    );
  }

  setUpcoming(next: Map<number, Hand>) {
    let same = next.size === this.upcoming.size;
    if (same) for (const [k, v] of next) if (this.upcoming.get(k) !== v) same = false;
    if (same) return;
    this.upcoming = next;
    this.changed();
  }

  clear() {
    this.pressed.clear();
    this.upcoming = new Map();
    this.changed();
  }
}

export const liveKeys = new LiveKeys();

/** Small observable for high-rate values (input meter, feedback line). */
export class LiveValue<T> {
  private listeners = new Set<(v: T) => void>();
  constructor(public value: T) {}
  set(v: T) {
    this.value = v;
    for (const cb of this.listeners) cb(v);
  }
  subscribe(cb: (v: T) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export interface MeterState {
  source: 'mic' | 'midi' | 'virtual';
  levelDb: number;
  floorDb: number;
  noteName: string | null;
  cents: number | null;
  confidence: number;
  deviceName: string | null;
  lastVelocity: number | null;
  active: boolean;
}

export const meter = new LiveValue<MeterState>({
  source: 'virtual',
  levelDb: -100,
  floorDb: -80,
  noteName: null,
  cents: null,
  confidence: 0,
  deviceName: null,
  lastVelocity: null,
  active: false,
});
