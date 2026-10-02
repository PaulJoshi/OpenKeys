import type { NoteEvent } from '../../types';
import type { InputPlugin, InputStatus } from '../types';
import type { AudioClock } from '../../clock';
import { Emitter } from '../../emitter';
import { OCTAVE_DOWN, OCTAVE_UP, codeToOffset } from './keymap';

/**
 * Virtual input: computer keys and the clickable on-screen piano. Used for testing and by
 * learners without an instrument. Always confidence 1. DOM wiring lives in the UI; this class
 * only needs key codes / pointer presses with performance.now() timestamps.
 */
export class VirtualInput implements InputPlugin {
  readonly source = 'virtual' as const;
  status: InputStatus = 'idle';
  private readonly ev = new Emitter<NoteEvent>();
  private readonly st = new Emitter<InputStatus>();
  private readonly downCodes = new Map<string, number>();
  readonly octaveChange = new Emitter<number>();
  /** MIDI number of the C under the "A" key. */
  baseC = 60;
  defaultVelocity = 0.7;
  low = 21;
  high = 108;

  constructor(private readonly clock: AudioClock) {}

  async start(): Promise<void> {
    this.status = 'running';
    this.st.emit(this.status);
  }

  stop(): void {
    for (const midi of this.downCodes.values()) this.release(midi, performance.now());
    this.downCodes.clear();
    this.status = 'idle';
    this.st.emit(this.status);
  }

  onEvent(cb: (e: NoteEvent) => void) {
    return this.ev.on(cb);
  }

  onStatus(cb: (s: InputStatus) => void) {
    return this.st.on(cb);
  }

  /** Returns true if the key code was handled. `perfMs` is KeyboardEvent.timeStamp. */
  keyDown(code: string, perfMs: number, repeat = false): boolean {
    if (code === OCTAVE_DOWN || code === OCTAVE_UP) {
      if (!repeat) {
        const next = this.baseC + (code === OCTAVE_UP ? 12 : -12);
        if (next >= 12 && next <= 108) {
          this.baseC = next;
          this.octaveChange.emit(next);
        }
      }
      return true;
    }
    const off = codeToOffset(code);
    if (off === null) return false;
    if (repeat || this.downCodes.has(code)) return true;
    const midi = this.baseC + off;
    if (midi < this.low || midi > this.high) return true;
    this.downCodes.set(code, midi);
    this.press(midi, perfMs, this.defaultVelocity);
    return true;
  }

  keyUp(code: string, perfMs: number): boolean {
    const midi = this.downCodes.get(code);
    if (midi === undefined) return codeToOffset(code) !== null;
    this.downCodes.delete(code);
    this.release(midi, perfMs);
    return true;
  }

  press(midi: number, perfMs: number, velocity = this.defaultVelocity): void {
    if (this.status !== 'running') return;
    this.ev.emit({ kind: 'noteOn', midi, time: this.clock.perfToAudio(perfMs), velocity, confidence: 1, source: 'virtual' });
  }

  release(midi: number, perfMs: number): void {
    if (this.status !== 'running') return;
    this.ev.emit({ kind: 'noteOff', midi, time: this.clock.perfToAudio(perfMs), velocity: 0, confidence: 1, source: 'virtual' });
  }

  /** Sustain pedal from the virtual keyboard (Space is reserved for start/stop, so the UI uses a toggle). */
  pedal(down: boolean, perfMs: number): void {
    this.ev.emit({ kind: 'pedal', midi: 64, time: this.clock.perfToAudio(perfMs), velocity: down ? 1 : 0, confidence: 1, source: 'virtual' });
  }
}
