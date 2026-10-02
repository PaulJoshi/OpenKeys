import { TempoMap } from '../score/tempo';

interface Segment {
  startTime: number;
  startBeat: number;
  endBeat: number;
  tempo: TempoMap;
}

/**
 * Maps AudioContext time <-> score beats for a running transport. A loop or a tempo change
 * appends a new segment; positions are resolved by the segment active at the given time.
 */
export class Timeline {
  private segments: Segment[] = [];

  /** Starts a segment where `startBeat` sounds at context time `startTime`. */
  addSegment(startTime: number, startBeat: number, endBeat: number, tempo: TempoMap): void {
    // Drop segments that would start after this one (re-anchoring).
    this.segments = this.segments.filter((s) => s.startTime < startTime);
    this.segments.push({ startTime, startBeat, endBeat, tempo });
    if (this.segments.length > 64) this.segments.splice(0, this.segments.length - 64);
  }

  clear(): void {
    this.segments = [];
  }

  get isEmpty(): boolean {
    return this.segments.length === 0;
  }

  private segAt(time: number): Segment | undefined {
    let found: Segment | undefined;
    for (const s of this.segments) if (s.startTime <= time + 1e-9) found = s;
    return found ?? this.segments[0];
  }

  /** Beat at a context time (may be < startBeat during the count-in). */
  beatAt(time: number): number {
    const s = this.segAt(time);
    if (!s) return 0;
    return s.tempo.secToBeat(s.tempo.beatToSec(s.startBeat) + (time - s.startTime));
  }

  /** Context time at which `beat` sounds in the segment active at `nearTime` (or the latest). */
  timeAt(beat: number, nearTime?: number): number {
    const s = nearTime !== undefined ? this.segAt(nearTime) : this.segments[this.segments.length - 1];
    if (!s) return 0;
    return s.startTime + s.tempo.beatToSec(beat) - s.tempo.beatToSec(s.startBeat);
  }

  /** Context time of a beat inside a specific segment (by start time). */
  timeInSegment(segStart: number, beat: number): number {
    const s = this.segments.find((x) => Math.abs(x.startTime - segStart) < 1e-9) ?? this.segAt(segStart);
    if (!s) return 0;
    return s.startTime + s.tempo.beatToSec(beat) - s.tempo.beatToSec(s.startBeat);
  }

  /** Seconds per beat at a time (practice tempo). */
  secPerBeatAt(time: number): number {
    const s = this.segAt(time);
    if (!s) return 0.5;
    return s.tempo.secPerBeatAt(this.beatAt(time));
  }

  get current(): Readonly<Segment> | undefined {
    return this.segments[this.segments.length - 1];
  }
}
