import type { Hand, HandSelection, Score, ScoreNote } from '../types';
import { TempoMap, metronomeBeats, scoreEndBeat, timeSignatureAt, measureLengthBeats } from '../score/tempo';
import { Emitter } from '../emitter';
import { Timeline } from './timeline';
import type { ClickSink, NoteSink, ScheduledAudioLog } from './sink';
import { soundingEndBeat } from './pedal';
import { tiedLengthBeats } from '../score/events';

export interface PlayerConfig {
  /** 0.25 - 1.5 */
  tempoFactor: number;
  /** Which hands the app plays audibly ('none' = silent transport, e.g. play-along without accompaniment). */
  audibleHands: HandSelection | 'none';
  metronome: boolean;
  /** 1 = beats only, 2 = eighths, 3 = triplets, 4 = sixteenths */
  subdivision: number;
  countInBars: number;
  /** Loop range in beats, or null to play to the end. */
  loop: { startBeat: number; endBeat: number } | null;
  /** Default velocity for notes without one. */
  defaultVelocity: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  tempoFactor: 1,
  audibleHands: 'both',
  metronome: false,
  subdivision: 1,
  countInBars: 1,
  loop: null,
  defaultVelocity: 0.62,
};

export type PlayerState = 'stopped' | 'countIn' | 'playing';

export interface TickSource {
  /** Registers a periodic callback (every ~25-50 ms). Returns an unsubscribe function. */
  onTick(cb: () => void): () => void;
}

/**
 * Lookahead transport: schedules notes and metronome clicks slightly ahead of the audio clock
 * (never from requestAnimationFrame or React effects). Handles count-in, loops (with an
 * optional tempo change at each wrap, used by the loop-drill tempo ramp) and hand muting.
 */
export class Player {
  readonly timeline = new Timeline();
  readonly stateChange = new Emitter<PlayerState>();
  readonly loopWrap = new Emitter<{ iteration: number; time: number }>();
  readonly ended = new Emitter<void>();
  /** Visual metronome pulse (fires at schedule time with the click's context time). */
  readonly pulse = new Emitter<{ time: number; accent: boolean; sub: boolean; countIn: boolean }>();
  /**
   * Each score note as it is scheduled: context times of the key going down and coming back up
   * (the written length including ties, not the pedalled sound). Drives the listen-mode keys.
   */
  readonly scheduled = new Emitter<{ midi: number; hand: Hand; time: number; upTime: number }>();

  state: PlayerState = 'stopped';
  config: PlayerConfig = { ...DEFAULT_PLAYER_CONFIG };
  lookahead = 0.2;
  /** Called at each loop wrap; may return a new tempo factor for the next pass. */
  onLoopFactor: ((iteration: number) => number | null) | null = null;

  private score: Score | null = null;
  private notes: ScoreNote[] = [];
  private unsub: (() => void) | null = null;
  private noteIdx = 0;
  private clicks: { beat: number; accent: boolean; sub: boolean }[] = [];
  private clickIdx = 0;
  private segStart = 0;
  private segBeat = 0;
  private segEnd = 0;
  private tempo: TempoMap = new TempoMap([{ beat: 0, bpm: 120 }]);
  private iteration = 0;
  private endTime = Infinity;
  private countInEndTime = 0;
  private startedAt = 0;

  constructor(
    private readonly now: () => number,
    private readonly ticks: TickSource,
    private readonly sink: NoteSink,
    private readonly clickSink: ClickSink,
    private readonly log?: ScheduledAudioLog,
  ) {}

  setScore(score: Score | null): void {
    this.stop();
    this.score = score;
  }

  configure(patch: Partial<PlayerConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  get playing(): boolean {
    return this.state !== 'stopped';
  }

  /** Current beat at the audio clock (during count-in, less than the start beat). */
  get beat(): number {
    return this.timeline.isEmpty ? 0 : this.timeline.beatAt(this.now());
  }

  get countInEnd(): number {
    return this.countInEndTime;
  }

  get startTime(): number {
    return this.startedAt;
  }

  /** Starts the transport so that `fromBeat` sounds after the count-in. Returns that context time. */
  start(fromBeat: number): number {
    if (!this.score) throw new Error('No score loaded');
    this.stop();
    const score = this.score;
    const cfg = this.config;
    this.tempo = new TempoMap(score.tempoMap, cfg.tempoFactor);
    const ts = timeSignatureAt(score.timeSignatures, fromBeat);
    const barBeats = measureLengthBeats(ts);
    const countInBeats = cfg.countInBars * barBeats;
    const t0 = this.now() + 0.12;
    const countInSec = this.tempo.beatToSec(fromBeat) - this.tempo.beatToSec(fromBeat - countInBeats);
    const startTime = t0 + countInSec;
    this.startedAt = startTime;
    this.countInEndTime = startTime;
    const end = cfg.loop ? cfg.loop.endBeat : scoreEndBeat(score);
    this.iteration = 0;
    this.beginSegment(startTime, fromBeat, end);

    // Count-in clicks (always audible unless the metronome is in visual-only mode; the visual pulse always fires).
    if (countInBeats > 0) {
      const compound = ts.denominator === 8 && ts.numerator % 3 === 0 && ts.numerator > 3;
      const pulse = compound ? 1.5 : 4 / ts.denominator;
      for (let b = fromBeat - countInBeats; b < fromBeat - 1e-6; b += pulse) {
        const time = this.timeline.timeAt(b);
        const accent = Math.abs((b - (fromBeat - countInBeats)) % barBeats) < 1e-6;
        this.clickSink.click(time, accent, false);
        this.log?.addClick(time);
        this.pulse.emit({ time, accent, sub: false, countIn: true });
      }
    }
    this.endTime = Infinity;
    this.setState(countInBeats > 0 ? 'countIn' : 'playing');
    this.unsub = this.ticks.onTick(() => this.tick());
    this.tick();
    return startTime;
  }

  stop(): void {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    if (this.state !== 'stopped') {
      this.sink.stopAll();
      this.setState('stopped');
    }
  }

  /** Plays notes immediately (wait-mode accompaniment, previews). */
  playNow(notes: readonly { midi: number; velocity?: number; durationSec: number }[], delay = 0.01): void {
    const t = this.now() + delay;
    for (const n of notes) {
      this.sink.play(n.midi, n.velocity ?? this.config.defaultVelocity, t, n.durationSec);
      this.log?.addNote(n.midi, t, t + n.durationSec);
    }
  }

  private setState(s: PlayerState) {
    if (this.state === s) return;
    this.state = s;
    this.stateChange.emit(s);
  }

  private audible(n: ScoreNote): boolean {
    const h = this.config.audibleHands;
    if (h === 'none') return false;
    if (h === 'both') return true;
    return n.hand === h || (n.hand === 'unknown' && h === 'R');
  }

  private beginSegment(startTime: number, fromBeat: number, endBeat: number) {
    const score = this.score!;
    this.segStart = startTime;
    this.segBeat = fromBeat;
    this.segEnd = endBeat;
    this.timeline.addSegment(startTime, fromBeat, endBeat, this.tempo);
    this.notes = score.notes
      .filter((n) => !n.tiedFromPrevious && n.startBeat >= fromBeat - 1e-6 && n.startBeat < endBeat - 1e-6 && this.audible(n))
      .sort((a, b) => a.startBeat - b.startBeat);
    this.noteIdx = 0;
    this.clicks = this.config.metronome ? metronomeBeats(score, fromBeat, endBeat, this.config.subdivision) : [];
    this.clickIdx = 0;
  }

  private tick() {
    if (this.state === 'stopped' || !this.score) return;
    const now = this.now();
    if (this.state === 'countIn' && now >= this.countInEndTime) this.setState('playing');
    const horizon = now + this.lookahead;
    let guard = 0;
    while (guard++ < 8) {
      const horizonBeat = Math.min(this.segEnd, this.tempo.secToBeat(this.tempo.beatToSec(this.segBeat) + (horizon - this.segStart)));
      // Notes.
      while (this.noteIdx < this.notes.length && this.notes[this.noteIdx].startBeat < horizonBeat) {
        const n = this.notes[this.noteIdx++];
        const t = this.segTime(n.startBeat);
        if (t < now - 0.05) continue; // too late (tab was asleep): skip rather than burst
        const endBeat = soundingEndBeat(n, this.score.pedal);
        const dur = Math.max(0.05, this.segTime(endBeat) - t);
        const vel = n.velocity ?? this.config.defaultVelocity;
        this.sink.play(n.midi, vel, t, dur);
        this.log?.addNote(n.midi, t, t + dur);
        if (this.scheduled.size) {
          const upBeat = Math.min(this.segEnd, n.startBeat + tiedLengthBeats(this.score.notes, n));
          this.scheduled.emit({ midi: n.midi, hand: n.hand, time: t, upTime: Math.max(t + 0.05, this.segTime(upBeat)) });
        }
      }
      // Clicks.
      while (this.clickIdx < this.clicks.length && this.clicks[this.clickIdx].beat < horizonBeat) {
        const c = this.clicks[this.clickIdx++];
        const t = this.segTime(c.beat);
        if (t < now - 0.05) continue;
        this.clickSink.click(t, c.accent, c.sub);
        this.log?.addClick(t);
        this.pulse.emit({ time: t, accent: c.accent, sub: c.sub, countIn: false });
      }
      if (horizonBeat < this.segEnd - 1e-9) break;
      // Reached the segment end within the horizon.
      const wrapTime = this.segTime(this.segEnd);
      if (this.config.loop) {
        this.iteration++;
        const f = this.onLoopFactor?.(this.iteration);
        if (f && f !== this.tempo.factor) this.tempo = this.tempo.withFactor(f);
        this.beginSegment(wrapTime, this.config.loop.startBeat, this.config.loop.endBeat);
        this.loopWrap.emit({ iteration: this.iteration, time: wrapTime });
        continue;
      }
      if (this.endTime === Infinity) {
        // Let the last notes ring a little before reporting the end.
        this.endTime = wrapTime + 0.3;
      }
      break;
    }
    if (now >= this.endTime) {
      this.unsub?.();
      this.unsub = null;
      this.setState('stopped');
      this.ended.emit();
    }
  }

  private segTime(beat: number): number {
    return this.segStart + this.tempo.beatToSec(beat) - this.tempo.beatToSec(this.segBeat);
  }
}
