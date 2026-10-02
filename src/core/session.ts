import type { ExpectedNoteEvidence, HandSelection, InputSource, NoteEvent, PracticeMode, Score, ScoreEvent, ScoreNote } from './types';
import type { Player } from './playback/player';
import type { Follower, FollowerFeedback } from './follow/types';
import { WaitFollower } from './follow/wait';
import { PlayAlongFollower } from './follow/playalong';
import { FollowMeFollower } from './follow/followme';
import { summarizeTake } from './judge/scoring';
import type { NoteResult, ExtraNote, TakeResult } from './judge/types';
import type { TimingPreset } from './settings';
import { TempoMap, scoreEndBeat } from './score/tempo';
import { notesForHands, otherHandNotes } from './score/events';
import { Emitter } from './emitter';

export interface SessionConfig {
  mode: PracticeMode;
  hands: HandSelection;
  tempoFactor: number;
  /** Measure range (inclusive) to practise / loop; null = whole piece. */
  range: { startMeasure: number; endMeasure: number } | null;
  /** Repeat the range (loop drill / looping in other modes). */
  loop: boolean;
  /** Loop drill tempo ramp. */
  ramp: { enabled: boolean; start: number; step: number; target: number };
  preset: TimingPreset;
  source: InputSource;
  /** App plays the hand the learner is not practising. */
  accompaniment: boolean;
  /** Mic mode: app audio is muted unless the learner allows speaker playback. */
  appAudioAllowed: boolean;
  metronome: boolean;
  subdivision: number;
  countInBars: number;
  chordWindow: number;
  confidenceThreshold: number;
}

export interface SessionStats {
  hits: number;
  misses: number;
  wrongs: number;
  streak: number;
  bestStreak: number;
  pass: number;
  cleanPasses: number;
  currentTempo: number;
}

export type SessionState = 'idle' | 'countIn' | 'running' | 'finished';

export interface PassSummary {
  pass: number;
  tempo: number;
  accuracy: number;
  clean: boolean;
}

/**
 * One practice take: wires the transport (Player), the follower for the selected mode, the
 * accompaniment and the loop/tempo-ramp logic, and turns follower verdicts into a TakeResult.
 * Framework-free: the UI subscribes to `feedback`, `stateChange` and `finished`.
 */
export class PracticeSession {
  readonly feedback = new Emitter<FollowerFeedback & { pass: number }>();
  readonly stateChange = new Emitter<SessionState>();
  readonly finished = new Emitter<TakeResult>();
  readonly passEnd = new Emitter<PassSummary>();
  state: SessionState = 'idle';
  stats: SessionStats = { hits: 0, misses: 0, wrongs: 0, streak: 0, bestStreak: 0, pass: 0, cleanPasses: 0, currentTempo: 1 };
  passes: PassSummary[] = [];

  private follower: Follower | null = null;
  private prevFollower: { f: Follower; until: number; wrapTime: number } | null = null;
  private judged: ScoreNote[] = [];
  private accompanimentNotes: ScoreNote[] = [];
  private unsubs: (() => void)[] = [];
  private startedAt = 0;
  private startPerf = 0;
  private allResults: NoteResult[] = [];
  private allExtras: ExtraNote[] = [];
  private failedInRow = 0;
  private tempoFactor: number;
  private startBeat = 0;
  private endBeat = 0;

  constructor(
    readonly score: Score,
    readonly config: SessionConfig,
    private readonly deps: {
      player: Player;
      now: () => number;
      onTick: (cb: () => void) => () => void;
      isHeld: (midi: number, now: number) => boolean;
      /** Plays notes right away (wait/follow-me accompaniment). */
      playNow: (notes: { midi: number; velocity?: number; durationSec: number }[]) => void;
    },
  ) {
    this.tempoFactor = config.mode === 'loop' && config.ramp.enabled ? config.ramp.start : config.tempoFactor;
    this.stats.currentTempo = this.tempoFactor;
  }

  get mode(): PracticeMode {
    return this.config.mode;
  }

  get currentFollower(): Follower | null {
    return this.follower;
  }

  /** Beats of the selected range. */
  private rangeBeats(): { start: number; end: number } {
    const r = this.config.range;
    const ms = this.score.measures;
    if (!r || !ms.length) return { start: ms[0]?.startBeat ?? 0, end: scoreEndBeat(this.score) };
    const a = ms[Math.max(0, Math.min(ms.length - 1, r.startMeasure))];
    const b = ms[Math.max(0, Math.min(ms.length - 1, r.endMeasure))];
    return { start: a.startBeat, end: b.startBeat + b.lengthBeats };
  }

  start(): void {
    const { start, end } = this.rangeBeats();
    this.startBeat = start;
    this.endBeat = end;
    const inRange = (n: ScoreNote) => n.startBeat >= start - 1e-6 && n.startBeat < end - 1e-6;
    this.judged = notesForHands(this.score, this.config.hands).filter(inRange);
    this.accompanimentNotes = this.config.accompaniment && this.config.appAudioAllowed ? otherHandNotes(this.score, this.config.hands).filter(inRange) : [];
    this.startedAt = this.deps.now();
    this.startPerf = Date.now();
    const p = this.deps.player;
    const mode = this.config.mode;

    if (mode === 'listen' || mode === 'playalong' || mode === 'loop') {
      const loop = mode === 'loop' || this.config.loop;
      const audible: HandSelection | 'none' =
        mode === 'listen'
          ? this.config.appAudioAllowed
            ? this.config.hands
            : 'none'
          : this.config.accompaniment && this.config.appAudioAllowed && this.config.hands !== 'both'
            ? this.config.hands === 'L'
              ? 'R'
              : 'L'
            : 'none';
      p.configure({
        tempoFactor: this.tempoFactor,
        audibleHands: audible,
        metronome: this.config.metronome,
        subdivision: this.config.subdivision,
        countInBars: this.config.countInBars,
        loop: loop ? { startBeat: start, endBeat: end } : null,
      });
      p.onLoopFactor = mode === 'loop' && this.config.ramp.enabled ? () => this.rampDecision() : null;
      if (mode === 'listen') p.onLoopFactor = null;
      const startTime = p.start(start);
      this.setState(this.config.countInBars > 0 ? 'countIn' : 'running');
      if (mode !== 'listen') this.follower = this.makePlayAlong(startTime);
      this.unsubs.push(
        p.loopWrap.on(({ iteration, time }) => this.onWrap(iteration, time)),
        p.ended.on(() => this.finish()),
        p.stateChange.on((s) => {
          if (s === 'playing' && this.state === 'countIn') this.setState('running');
        }),
      );
    } else if (mode === 'wait') {
      this.follower = new WaitFollower(this.judged, {
        chordWindow: this.config.chordWindow,
        isHeld: this.deps.isHeld,
        minConfidence: this.config.confidenceThreshold,
        loop: this.config.loop,
      });
      this.setState('running');
    } else if (mode === 'followme') {
      const tm = new TempoMap(this.score.tempoMap, this.config.tempoFactor);
      this.follower = new FollowMeFollower(this.judged, {
        preset: this.config.preset,
        source: this.config.source,
        initialSecPerBeat: tm.secPerBeatAt(start),
        chordWindow: this.config.chordWindow,
        minConfidence: this.config.confidenceThreshold,
        relocateLookbackBeats: 16,
      });
      this.setState('running');
    }
    this.unsubs.push(this.deps.onTick(() => this.tick()));
  }

  private makePlayAlong(segStart: number): PlayAlongFollower {
    const tl = this.deps.player.timeline;
    const tm = new TempoMap(this.score.tempoMap, this.tempoFactor);
    return new PlayAlongFollower(this.judged, {
      preset: this.config.preset,
      tempoFactor: this.tempoFactor,
      source: this.config.source,
      timeAt: (b) => tl.timeInSegment(segStart, b),
      beatAt: (t) => tl.beatAt(t),
      secPerBeat: (b) => tm.secPerBeatAt(b),
      confidenceThreshold: this.config.source === 'mic' ? this.config.confidenceThreshold : 0,
      judgeRelease: this.config.source !== 'mic',
      measures: this.score.measures,
    });
  }

  private setState(s: SessionState) {
    if (s === this.state) return;
    this.state = s;
    this.stateChange.emit(s);
  }

  handleNote(e: NoteEvent): void {
    if (this.state === 'idle' || this.state === 'finished') return;
    const f = this.routeByTime(e.time);
    if (!f) return;
    this.dispatch(f.onNote(e));
  }

  handleEvidence(ev: ExpectedNoteEvidence): void {
    if (this.state !== 'running' && this.state !== 'countIn') return;
    const f = this.routeByTime(ev.onsetTime ?? this.deps.now());
    if (!f) return;
    this.dispatch(f.onEvidence(ev, this.deps.now()));
  }

  /** Expected notes near now, for score-informed mic detection. */
  expectedNear(now: number) {
    const a = this.follower?.expectedNear(now) ?? [];
    const b = this.prevFollower ? this.prevFollower.f.expectedNear(now) : [];
    return [...a, ...b];
  }

  private routeByTime(t: number): Follower | null {
    if (this.prevFollower && t < this.prevFollower.wrapTime - 0.05) return this.prevFollower.f;
    return this.follower;
  }

  private dispatch(fbs: FollowerFeedback[]) {
    for (const fb of fbs) {
      switch (fb.type) {
        case 'hit':
          if (fb.verdict === 'early' || fb.verdict === 'late') this.stats.streak = 0;
          else this.stats.bestStreak = Math.max(this.stats.bestStreak, ++this.stats.streak);
          this.stats.hits++;
          break;
        case 'miss':
          this.stats.misses++;
          this.stats.streak = 0;
          break;
        case 'wrong':
          this.stats.wrongs++;
          this.stats.streak = 0;
          break;
        case 'advance':
          this.onAdvance(fb.eventIndex);
          break;
        case 'done':
          if (this.config.mode === 'wait' || this.config.mode === 'followme') queueMicrotask(() => this.finish());
          break;
        default:
          break;
      }
      this.feedback.emit({ ...fb, pass: this.stats.pass });
    }
  }

  /** Wait / follow-me: accompaniment plays the other hand when an event is completed. */
  private onAdvance(index: number) {
    if (!this.accompanimentNotes.length) return;
    const f = this.follower as WaitFollower | FollowMeFollower | null;
    if (!f || !('moments' in f)) return;
    const prev = f.moments[index - 1];
    if (!prev) return;
    const tm = new TempoMap(this.score.tempoMap, this.config.tempoFactor);
    const next = f.moments[index];
    const toPlay = this.accompanimentNotes.filter((n) => n.startBeat >= prev.startBeat - 1e-6 && n.startBeat < (next?.startBeat ?? Infinity) - 1e-6);
    this.deps.playNow(toPlay.map((n) => ({ midi: n.midi, velocity: n.velocity, durationSec: Math.min(3, tm.durationSec(n.startBeat, n.durationBeats)) })));
  }

  private tick() {
    const now = this.deps.now();
    if (this.prevFollower) {
      this.dispatch(this.prevFollower.f.tick(now).filter((x) => x.type !== 'done'));
      if (now > this.prevFollower.until) {
        this.collect(this.prevFollower.f, now);
        this.prevFollower = null;
      }
    }
    if (this.follower) this.dispatch(this.follower.tick(now).filter((x) => x.type !== 'done' || this.config.mode !== 'playalong'));
  }

  /** Loop drill: decide the tempo for the next pass (called just before the wrap). */
  private rampDecision(): number {
    const f = this.follower;
    if (!f) return this.tempoFactor;
    const { results } = f.finish(this.deps.now() + 1);
    const judged = results.filter((r) => r.verdict !== 'uncertain');
    const hits = judged.filter((r) => ['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict)).length;
    const acc = judged.length ? hits / judged.length : 0;
    const clean = acc >= 0.95 && !results.some((r) => r.verdict === 'missed');
    const r = this.config.ramp;
    let next = this.tempoFactor;
    if (clean) {
      this.failedInRow = 0;
      next = Math.min(r.target, this.tempoFactor + r.step);
    } else if (++this.failedInRow >= 2) {
      this.failedInRow = 0;
      next = Math.max(0.25, this.tempoFactor - r.step);
    }
    next = Math.round(next * 100) / 100;
    this.pendingPass = { pass: this.stats.pass + 1, tempo: this.tempoFactor, accuracy: acc, clean };
    this.tempoFactor = next;
    return next;
  }

  private pendingPass: PassSummary | null = null;

  private onWrap(iteration: number, wrapTime: number) {
    const old = this.follower;
    if (this.config.mode === 'listen' || !old) return;
    if (this.prevFollower) this.collect(this.prevFollower.f, wrapTime);
    // Keep the old pass alive for late notes, then collect its verdicts.
    this.prevFollower = { f: old, until: wrapTime + 0.35, wrapTime };
    this.follower = this.makePlayAlong(wrapTime);
    this.stats.pass = iteration;
    this.stats.currentTempo = this.tempoFactor;
    const summary = this.pendingPass ?? this.quickPassSummary(old, wrapTime);
    this.pendingPass = null;
    if (summary.clean) this.stats.cleanPasses++;
    this.passes.push(summary);
    this.passEnd.emit(summary);
  }

  private quickPassSummary(f: Follower, now: number): PassSummary {
    const { results } = f.finish(now);
    const judged = results.filter((r) => r.verdict !== 'uncertain');
    const hits = judged.filter((r) => ['perfect', 'good', 'ok', 'early', 'late'].includes(r.verdict)).length;
    const acc = judged.length ? hits / judged.length : 0;
    return { pass: this.stats.pass + 1, tempo: this.tempoFactor, accuracy: acc, clean: acc >= 0.95 && !results.some((r) => r.verdict === 'missed') };
  }

  private lastCollected: NoteResult[] = [];

  private collect(f: Follower, now: number) {
    const { results, extras } = f.finish(now);
    this.lastCollected = results;
    this.allResults.push(...results);
    this.allExtras.push(...extras);
  }

  /** Learner skips the current wait-mode event. */
  skip(): void {
    const f = this.follower;
    if (f instanceof WaitFollower) this.dispatch(f.skip(this.deps.now()));
  }

  viewBeat(now: number): number {
    if (this.config.mode === 'listen' || !this.follower) {
      const p = this.deps.player;
      return p.timeline.isEmpty ? this.startBeat : p.timeline.beatAt(now);
    }
    if (this.prevFollower && now < this.prevFollower.wrapTime) return this.prevFollower.f.viewBeat(now);
    return this.follower.viewBeat(now);
  }

  upcoming(now: number): ScoreEvent[] {
    return this.follower?.upcoming(now) ?? [];
  }

  get rangeStartBeat(): number {
    return this.startBeat;
  }

  get rangeEndBeat(): number {
    return this.endBeat;
  }

  /** Stops the take and produces the result (null for listen mode or if nothing was judged). */
  stop(): TakeResult | null {
    return this.finish();
  }

  private finished_ = false;
  private result: TakeResult | null = null;

  private finish(): TakeResult | null {
    if (this.finished_) return this.result;
    this.finished_ = true;
    const now = this.deps.now();
    this.deps.player.stop();
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.prevFollower) this.collect(this.prevFollower.f, now);
    this.prevFollower = null;
    // For loops, the take is judged on the last complete pass if there was one (plus the partial current pass otherwise).
    if (this.follower) {
      const isLoop = this.config.mode === 'loop' || this.config.loop;
      if (isLoop && this.passes.length > 0 && this.lastCollected.length) {
        // discard the partial pass
      } else this.collect(this.follower, now);
    }
    this.setState('finished');
    if (this.config.mode === 'listen') return null;
    const isLoop = this.config.mode === 'loop' || this.config.loop;
    const results = isLoop && this.lastCollected.length ? this.lastCollected : this.allResults;
    const extras = isLoop ? this.allExtras.filter((x) => results.length && x.time >= Math.min(...results.map((r) => r.playedTime ?? Infinity)) - 1) : this.allExtras;
    if (results.length === 0) return null;
    this.result = summarizeTake(this.score, results, extras, {
      scoreId: this.score.id,
      mode: this.config.mode,
      hands: this.config.hands,
      tempoFactor: this.tempoFactor,
      source: this.config.source,
      startedAt: this.startPerf,
      durationSec: now - this.startedAt,
      timingJudged: this.follower?.timingJudged ?? true,
    });
    this.finished.emit(this.result);
    return this.result;
  }
}
