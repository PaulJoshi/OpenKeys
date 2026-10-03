import type { Hand, HandSelection, PracticeMode, Score } from '../../core/types';
import { PracticeSession, type SessionConfig } from '../../core/session';
import type { TakeResult } from '../../core/judge/types';
import type { FollowerFeedback } from '../../core/follow/types';
import { TempoMap } from '../../core/score/tempo';
import { recordTake, gradeReview } from '../../core/progress/progress';
import { runtime } from '../runtime';
import { liveKeys } from '../live';
import { practiceLive } from './live';
import { getSettings, useApp } from '../store';
import { Emitter } from '../../core/emitter';
import { ScoreInformedDetector } from '../../core/input/mic/scoreinformed';
import { midiToName } from '../../core/music';

export interface TakeOptions {
  mode: PracticeMode;
  hands: HandSelection;
  tempoFactor: number;
  range: { startMeasure: number; endMeasure: number } | null;
  loop: boolean;
  /** Review item being drilled (graded on finish). */
  reviewId?: string | null;
  anyPitch?: boolean;
  /** Called with the result before it is saved (drills adapt their level). */
  onResult?: (r: TakeResult) => void;
}

/**
 * Glue between the framework-free PracticeSession and the UI: routes input events into the
 * session, turns feedback into colours/flashes, keeps practiceLive in sync and saves progress.
 */
class PracticeController {
  session: PracticeSession | null = null;
  readonly takeEnded = new Emitter<TakeResult | null>();
  readonly feedback = new Emitter<FollowerFeedback>();
  readonly stateChange = new Emitter<string>();
  private unsubs: (() => void)[] = [];
  private raf = 0;
  private score: Score | null = null;
  private idleBeat = 0;
  private opts: TakeOptions | null = null;
  /** Notes the learner played in the last take (for take replay), on the audio clock. */
  lastTakePlayed: { midi: number; time: number; duration: number; velocity: number }[] = [];
  private openPlayed = new Map<number, { midi: number; time: number; duration: number; velocity: number }>();
  /** Score-informed mic detector for the current take (mic mode only). */
  detector: ScoreInformedDetector | null = null;

  /** Per-expected-note evidence lines for the dev panel. */
  evidenceDebug(): string {
    const d = this.detector;
    if (!d) return '';
    return [...d.debug.values()]
      .slice(-8)
      .map((e) => `${midiToName(e.midi).padEnd(4)} presence ${e.presence.toFixed(2)} ${e.fresh ? 'fresh' : 'ringing'}${e.octaveTrap > 0.3 ? ` octave? ${e.octaveTrap.toFixed(2)}` : ''}`)
      .join('\n');
  }

  setScore(score: Score | null) {
    this.stop(false);
    this.score = score;
    this.idleBeat = score?.measures[0]?.startBeat ?? 0;
    practiceLive.getBeat = () => this.idleBeat;
    if (score) practiceLive.secPerBeat = new TempoMap(score.tempoMap).secPerBeatAt(0);
    practiceLive.reset();
    liveKeys.clear();
  }

  /** Where the cursor rests while stopped. */
  setIdleBeat(beat: number) {
    this.idleBeat = beat;
    if (!this.session) practiceLive.changed();
  }

  get idle(): number {
    return this.idleBeat;
  }

  get running(): boolean {
    return !!this.session && this.session.state !== 'finished';
  }

  async start(opts: TakeOptions): Promise<void> {
    const score = this.score;
    if (!score) return;
    this.stop(false);
    const engine = await runtime.ensureAudio();
    const s = getSettings();
    const source = s.inputSource;
    const micMode = source === 'mic';
    this.opts = opts;
    const config: SessionConfig = {
      mode: opts.mode,
      hands: opts.hands,
      tempoFactor: opts.tempoFactor,
      range: opts.range,
      loop: opts.loop,
      ramp: { enabled: opts.mode === 'loop', start: Math.min(0.6, opts.tempoFactor), step: 0.05, target: opts.tempoFactor },
      preset: s.timingPreset,
      source,
      accompaniment: s.accompaniment,
      appAudioAllowed: !micMode || s.micAllowSpeakerPlayback || opts.mode === 'listen',
      metronome: s.metronome,
      subdivision: s.subdivision,
      countInBars: opts.mode === 'wait' || opts.mode === 'followme' ? 0 : s.countInBars,
      chordWindow: s.chordWindowMs / 1000,
      confidenceThreshold: s.detector.confidenceThreshold,
      anyPitch: opts.anyPitch,
    };
    engine.metronome.visualOnly = s.metronomeVisualOnly;
    engine.player.setScore(score);
    practiceLive.reset();
    liveKeys.clear();
    const session = new PracticeSession(score, config, {
      player: engine.player,
      now: () => engine.now(),
      onTick: (cb) => {
        const id = window.setInterval(cb, 25);
        return () => window.clearInterval(id);
      },
      isHeld: (midi, now) => {
        if (runtime.bus.isSounding(midi)) return true;
        // Mic has no key-up: a struck note keeps ringing for a while.
        const last = runtime.bus.held.get(midi);
        return micMode && !!last && now - last.time < 1.2;
      },
      playNow: (notes) => engine.player.playNow(notes),
    });
    this.session = session;
    const tm = new TempoMap(score.tempoMap, config.tempoFactor);
    practiceLive.secPerBeat = tm.secPerBeatAt(0);
    practiceLive.getBeat = () => session.viewBeat(engine.now());
    const r = config.range;
    practiceLive.loop =
      opts.loop || opts.mode === 'loop'
        ? { startBeat: score.measures[r?.startMeasure ?? 0].startBeat, endBeat: score.measures[r?.endMeasure ?? score.measures.length - 1].startBeat + score.measures[r?.endMeasure ?? score.measures.length - 1].lengthBeats }
        : null;

    // Mic mode judges with score-informed evidence; mono notes only assist the detector.
    const mic = runtime.mic;
    const scoreInformed = source === 'mic' && !!mic && opts.mode !== 'listen';
    if (scoreInformed && mic) {
      const d = s.detector;
      const cal = runtime.calibration;
      const latency = mic.tracker.opts.latency;
      const det = new ScoreInformedDetector({
        a4: mic.tracker.opts.a4,
        octaveOffset: mic.tracker.opts.octaveOffset,
        latency,
        partials: d.partials,
        inharmonicity: d.inharmonicity,
        partialToleranceCents: d.partialToleranceCents,
        presenceThreshold: d.presenceThreshold,
        wrongNoteThreshold: d.wrongNoteThreshold,
        expected: (now) => session.expectedNear(now),
        appSounding: (raw) => engine.log.soundingAt(raw - latency).map((m) => m + 12 * mic.tracker.opts.octaveOffset),
        clickNear: (t) => engine.log.clickNear(t),
        profile: cal.instrumentProfile ?? null,
        velocityFor: (snr) => mic.tracker.velocityFor(snr, 0),
      });
      this.detector = det;
      this.unsubs.push(
        mic.frames.on((f) => {
          const { evidence, wrong } = det.push(f);
          for (const ev of evidence) session.handleEvidence(ev);
          for (const w of wrong) session.handleNote(w);
        }),
      );
    }
    this.lastTakePlayed = [];
    this.openPlayed.clear();
    const recordPlayed = (e: { kind: string; midi: number; time: number; velocity?: number }) => {
      if (e.kind === 'noteOn') {
        const n = { midi: e.midi, time: e.time, duration: 0.4, velocity: e.velocity ?? 0.6 };
        this.lastTakePlayed.push(n);
        this.openPlayed.set(e.midi, n);
      } else if (e.kind === 'noteOff') {
        const n = this.openPlayed.get(e.midi);
        if (n) n.duration = Math.max(0.05, e.time - n.time);
        this.openPlayed.delete(e.midi);
      }
    };
    this.unsubs.push(
      session.feedback.on((fb) => {
        // Mic chords: what was played comes from the judge's hits and wrong notes.
        if (!scoreInformed) return;
        if (fb.type === 'hit' || fb.type === 'wrong') recordPlayed({ kind: 'noteOn', midi: fb.midi, time: fb.time });
      }),
      runtime.bus.events.on((e) => {
        if (!scoreInformed) recordPlayed(e);
        if (e.kind === 'noteOff' && e.source !== 'mic') liveKeys.release(e.midi);
        if (scoreInformed && e.source === 'mic') {
          this.detector?.onMonoEvent(e);
          // Damper releases are the only reliable mic note-offs (for "released too early").
          if (e.kind === 'noteOff' && e.abrupt) session.handleNote(e);
          return;
        }
        session.handleNote(e);
      }),
      session.feedback.on((fb) => this.onFeedback(fb, score)),
      session.stateChange.on((st) => this.stateChange.emit(st)),
      session.finished.on((res) => void this.finish(res)),
      session.passEnd.on(() => {
        // New pass: clear colours so each pass is fresh.
        practiceLive.marks.clear();
        practiceLive.wrongs = [];
        practiceLive.secPerBeat = new TempoMap(score.tempoMap, session.stats.currentTempo).secPerBeatAt(0);
        practiceLive.changed();
      }),
    );
    session.start();
    practiceLive.running = true;
    this.stateChange.emit(session.state);
    // Upcoming-key highlights.
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.session || opts.mode === 'listen') return;
      const up = new Map<number, Hand>();
      for (const ev of this.session.upcoming(engine.now())) for (const n of ev.notes) up.set(n.midi, n.hand);
      liveKeys.setUpcoming(up);
    };
    if (opts.mode !== 'listen') this.raf = requestAnimationFrame(loop);
  }

  private onFeedback(fb: FollowerFeedback, score: Score) {
    const s = getSettings();
    switch (fb.type) {
      case 'hit':
        practiceLive.mark(fb.noteId, fb.verdict);
        practiceLive.flash(fb.midi, 'hit');
        liveKeys.mark(fb.midi, 'hit');
        break;
      case 'wrong': {
        const near = fb.nearNoteId ? score.notes.find((n) => n.id === fb.nearNoteId) : undefined;
        practiceLive.addWrong({ midi: fb.midi, nearNoteId: fb.nearNoteId, beat: near?.startBeat ?? practiceLive.getBeat() });
        practiceLive.flash(fb.midi, 'wrong');
        liveKeys.mark(fb.midi, 'wrong');
        if (s.errorSound) runtime.engine?.player.playNow([{ midi: 30, velocity: 0.15, durationSec: 0.08 }]);
        break;
      }
      case 'extra':
        practiceLive.flash(fb.midi, 'wrong');
        liveKeys.mark(fb.midi, 'wrong');
        break;
      case 'miss':
        practiceLive.mark(fb.noteId, 'missed');
        practiceLive.flash(fb.midi, 'missed');
        break;
      case 'uncertain':
        practiceLive.mark(fb.noteId, 'uncertain');
        break;
      default:
        break;
    }
    this.feedback.emit(fb);
  }

  private async finish(result: TakeResult | null) {
    const session = this.session;
    this.cleanup();
    if (result) this.opts?.onResult?.(result);
    if (result && session && this.score && session.mode !== 'listen') {
      const { lessonId } = useApp.getState();
      try {
        await recordTake(this.score, result, { lessonId });
        if (this.opts?.reviewId) await gradeReview(this.opts.reviewId, result.accuracy);
      } catch (e) {
        console.warn('Could not save progress', e);
      }
    }
    this.takeEnded.emit(result);
  }

  /** Stops the current take; returns its result. */
  stop(emit = true): void {
    const s = this.session;
    if (!s) return;
    if (s.state === 'finished') {
      this.cleanup();
      return;
    }
    const res = s.stop();
    if (!emit) {
      this.cleanup();
      return;
    }
    // finished.emit() inside stop() triggers finish(); if nothing was judged, report null.
    if (!res) {
      this.cleanup();
      this.takeEnded.emit(null);
    }
  }

  skip() {
    this.session?.skip();
  }

  private cleanup() {
    this.detector = null;
    cancelAnimationFrame(this.raf);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    const s = this.session;
    this.session = null;
    practiceLive.running = false;
    liveKeys.setUpcoming(new Map());
    if (s) {
      const beat = s.viewBeat(runtime.engine?.now() ?? 0);
      this.idleBeat = Math.max(s.rangeStartBeat, Math.min(beat, s.rangeEndBeat));
      if (s.mode === 'listen' || s.state === 'finished') this.idleBeat = s.rangeStartBeat;
    }
    practiceLive.getBeat = () => this.idleBeat;
    this.stateChange.emit('idle');
  }
}

export const practice = new PracticeController();
