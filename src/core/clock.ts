/**
 * One clock: AudioContext.currentTime. Input timestamps from other clocks
 * (performance.now() for MIDI and DOM events) are mapped onto it.
 */
export interface AudioClock {
  /** Current AudioContext time in seconds. */
  now(): number;
  /** Maps a performance.now() timestamp (ms) to AudioContext seconds. */
  perfToAudio(perfMs: number): number;
  /** Maps AudioContext seconds to performance.now() ms (for MIDI output timestamps). */
  audioToPerf(audioSec: number): number;
}

/**
 * Maintains the performance.now() <-> AudioContext mapping from periodic samples of
 * AudioContext.getOutputTimestamp(). Samples are smoothed: the offset (contextTime*1000 -
 * performanceTime) is median-filtered over the last few samples, rejecting outliers caused by
 * a busy main thread.
 *
 * Note: getOutputTimestamp().contextTime is the context time of the sample currently leaving
 * the speakers, so a key pressed "in time with what is heard" maps onto the scheduled time of
 * that sound. This compensates output latency for MIDI/virtual input automatically.
 */
export class ClockMapper {
  private offsets: number[] = [];
  private offsetMs = 0;
  private valid = false;

  constructor(private readonly window = 9) {}

  addSample(contextTime: number, performanceTime: number): void {
    if (!(performanceTime > 0) || !(contextTime >= 0)) return;
    const off = contextTime * 1000 - performanceTime;
    this.offsets.push(off);
    if (this.offsets.length > this.window) this.offsets.shift();
    const sorted = [...this.offsets].sort((a, b) => a - b);
    this.offsetMs = sorted[sorted.length >> 1];
    this.valid = true;
  }

  get isValid(): boolean {
    return this.valid;
  }

  perfToAudio(perfMs: number): number {
    return (perfMs + this.offsetMs) / 1000;
  }

  audioToPerf(audioSec: number): number {
    return audioSec * 1000 - this.offsetMs;
  }
}

/** A manual clock for tests and offline analysis. */
export class ManualClock implements AudioClock {
  t = 0;
  now(): number {
    return this.t;
  }
  perfToAudio(perfMs: number): number {
    return perfMs / 1000;
  }
  audioToPerf(audioSec: number): number {
    return audioSec * 1000;
  }
}
