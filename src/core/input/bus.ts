import type { NoteEvent } from '../types';
import { Emitter } from '../emitter';

/**
 * Merges every input source into one NoteEvent stream and tracks the held-key and pedal
 * state. Everything downstream (follower, judge, feedback, progress) only sees this stream.
 */
export class InputBus {
  readonly events = new Emitter<NoteEvent>();
  /** midi -> noteOn event currently held */
  readonly held = new Map<number, NoteEvent>();
  /** Keys released while the sustain pedal is down are still sounding. */
  readonly sustained = new Set<number>();
  sustain = false;
  /** Ring buffer of recent events for the dev panel event log. */
  readonly log: NoteEvent[] = [];
  logLimit = 2000;
  lastEvent: NoteEvent | null = null;

  push(e: NoteEvent): void {
    if (e.kind === 'noteOn') {
      this.held.set(e.midi, e);
      this.sustained.delete(e.midi);
    } else if (e.kind === 'noteOff') {
      if (this.sustain) this.sustained.add(e.midi);
      this.held.delete(e.midi);
    } else if (e.kind === 'pedal' && e.midi === 64) {
      const down = (e.velocity ?? 0) >= 0.5;
      if (!down) this.sustained.clear();
      this.sustain = down;
    }
    this.lastEvent = e;
    this.log.push(e);
    if (this.log.length > this.logLimit) this.log.splice(0, this.log.length - this.logLimit);
    this.events.emit(e);
  }

  /** True if the key is held down or sustained by the pedal. */
  isSounding(midi: number): boolean {
    return this.held.has(midi) || this.sustained.has(midi);
  }

  reset(): void {
    this.held.clear();
    this.sustained.clear();
    this.sustain = false;
  }
}
