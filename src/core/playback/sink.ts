/** Where scheduled notes go: the piano sampler, a MIDI output, or a test recorder. */
export interface NoteSink {
  /** `time` is AudioContext seconds; durations in seconds. */
  play(midi: number, velocity: number, time: number, duration: number): void;
  /** Immediately silence everything (stop button). */
  stopAll(): void;
}

export interface ClickSink {
  click(time: number, accent: boolean, sub: boolean): void;
}

export class RecordingSink implements NoteSink, ClickSink {
  notes: { midi: number; velocity: number; time: number; duration: number }[] = [];
  clicks: { time: number; accent: boolean; sub: boolean }[] = [];
  play(midi: number, velocity: number, time: number, duration: number): void {
    this.notes.push({ midi, velocity, time, duration });
  }
  click(time: number, accent: boolean, sub: boolean): void {
    this.clicks.push({ time, accent, sub });
  }
  stopAll(): void {}
}

/** Everything the app itself made audible, so mic detection can ignore its own sound. */
export class ScheduledAudioLog {
  notes: { midi: number; start: number; end: number }[] = [];
  clicks: number[] = [];

  addNote(midi: number, start: number, end: number): void {
    this.notes.push({ midi, start, end });
    if (this.notes.length > 4000) this.notes.splice(0, 1000);
  }

  addClick(time: number): void {
    this.clicks.push(time);
    if (this.clicks.length > 2000) this.clicks.splice(0, 500);
  }

  /** Pitches the app is sounding at time t (with a release tail). */
  soundingAt(t: number, tail = 0.6): number[] {
    const out: number[] = [];
    for (const n of this.notes) if (n.start - 0.02 <= t && n.end + tail >= t) out.push(n.midi);
    return out;
  }

  /** True if a scheduled click is within `window` seconds of t. */
  clickNear(t: number, before = 0.015, after = 0.06): boolean {
    for (let i = this.clicks.length - 1; i >= 0; i--) {
      const c = this.clicks[i];
      if (t >= c - before && t <= c + after) return true;
      if (c < t - 5) break;
    }
    return false;
  }

  clear(): void {
    this.notes = [];
    this.clicks = [];
  }
}
