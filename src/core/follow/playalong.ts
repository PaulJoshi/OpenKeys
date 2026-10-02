import type { ExpectedNoteEvidence, InputSource, NoteEvent, ScoreEvent, ScoreNote } from '../types';
import type { ExtraNote, NoteResult } from '../judge/types';
import { classifyOffset, matchWindow, windowsFor, type TimingWindows } from '../judge/windows';
import { matchNotes } from '../judge/match';
import type { TimingPreset } from '../settings';
import { buildScoreEvents } from '../score/events';
import { measureAtBeat } from '../score/tempo';
import type { Follower, FollowerFeedback } from './types';

export interface PlayAlongOptions {
  preset: TimingPreset;
  tempoFactor: number;
  source: InputSource;
  /** Beat -> context time for this pass. */
  timeAt: (beat: number) => number;
  /** Context time -> beat. */
  beatAt: (time: number) => number;
  /** Seconds per beat at practice tempo (for duration judging). */
  secPerBeat: (beat: number) => number;
  /** Mic: verdicts below this confidence become "uncertain". */
  confidenceThreshold: number;
  /** Judge note release (not in mic mode, where decay makes it unreliable). */
  judgeRelease: boolean;
  /** Measures for placing extra notes. */
  measures: { index: number; startBeat: number }[];
}

interface Expected {
  note: ScoreNote;
  time: number;
  windows: TimingWindows;
  matched: number | null; // played index
  liveWrong: boolean;
  missedReported: boolean;
}

interface Played {
  midi: number;
  time: number;
  velocity?: number;
  confidence: number;
  releaseTime?: number;
  /** Came from score-informed evidence (mic chords). */
  evidenceFor?: string;
}

/**
 * Play-along: the transport runs at practice tempo and the learner keeps up. Live feedback uses
 * greedy nearest-in-time matching; the final verdicts re-solve the whole take as an assignment
 * problem (see judge/match.ts) so early live guesses never distort the result.
 */
export class PlayAlongFollower implements Follower {
  readonly kind = 'playalong';
  readonly timingJudged = true;
  private expected: Expected[];
  private byId = new Map<string, Expected>();
  private played: Played[] = [];
  private pedalDown = false;
  private pendingRelease = new Map<number, number>(); // midi -> played index held under pedal
  private uncertain = new Set<string>();
  private readonly events: ScoreEvent[];
  done = false;

  constructor(notes: readonly ScoreNote[], private readonly opts: PlayAlongOptions) {
    this.expected = notes
      .filter((n) => !n.tiedFromPrevious)
      .map((n) => ({
        note: n,
        time: opts.timeAt(n.startBeat),
        windows: windowsFor({ preset: opts.preset, tempoFactor: opts.tempoFactor, source: opts.source, grace: n.grace, arpeggiate: n.arpeggiate }),
        matched: null,
        liveWrong: false,
        missedReported: false,
      }))
      .sort((a, b) => a.time - b.time);
    for (const e of this.expected) this.byId.set(e.note.id, e);
    this.events = buildScoreEvents(notes);
  }

  get endTime(): number {
    const last = this.expected[this.expected.length - 1];
    return last ? last.time + matchWindow(last.windows) : 0;
  }

  onNote(e: NoteEvent): FollowerFeedback[] {
    if (e.kind === 'pedal') {
      if (e.midi === 64) {
        const down = (e.velocity ?? 0) >= 0.5;
        if (!down) {
          for (const [, idx] of this.pendingRelease) this.played[idx].releaseTime = e.time;
          this.pendingRelease.clear();
        }
        this.pedalDown = down;
      }
      return [];
    }
    if (e.kind === 'noteOff') {
      // Mic: piano notes decay naturally, so only an abrupt stop (damper) says the key was released.
      if (e.source === 'mic' && !e.abrupt) return [];
      for (let i = this.played.length - 1; i >= 0; i--) {
        const p = this.played[i];
        if (p.midi === e.midi && p.releaseTime === undefined) {
          if (this.pedalDown) this.pendingRelease.set(e.midi, i);
          else p.releaseTime = e.time;
          break;
        }
      }
      return [];
    }
    return this.addPlayed({ midi: e.midi, time: e.time, velocity: e.velocity, confidence: e.confidence });
  }

  onEvidence(ev: ExpectedNoteEvidence, now: number): FollowerFeedback[] {
    const exp = this.byId.get(ev.scoreNoteId);
    if (!exp || exp.matched !== null) return [];
    if (ev.onsetTime !== undefined && ev.presence >= this.opts.confidenceThreshold) {
      this.uncertain.delete(ev.scoreNoteId);
      return this.addPlayed({ midi: ev.midi, time: ev.onsetTime, velocity: ev.velocity, confidence: ev.presence, evidenceFor: ev.scoreNoteId });
    }
    if (ev.presence >= this.opts.confidenceThreshold * 0.5 && now <= exp.time + matchWindow(exp.windows)) {
      if (!this.uncertain.has(ev.scoreNoteId)) {
        this.uncertain.add(ev.scoreNoteId);
        return [{ type: 'uncertain', noteId: ev.scoreNoteId, midi: ev.midi }];
      }
    }
    return [];
  }

  private addPlayed(p: Played): FollowerFeedback[] {
    const idx = this.played.push(p) - 1;
    // Live greedy: nearest unmatched expected note of the same pitch within its match window.
    let best: Expected | null = null;
    let bestD = Infinity;
    for (const ex of this.expected) {
      if (ex.matched !== null) continue;
      if (p.evidenceFor ? ex.note.id !== p.evidenceFor : ex.note.midi !== p.midi) continue;
      const d = Math.abs(p.time - ex.time);
      if (d <= matchWindow(ex.windows) && d < bestD) {
        best = ex;
        bestD = d;
      }
    }
    if (best) {
      best.matched = idx;
      const off = p.time - best.time;
      const lowConf = p.confidence < this.opts.confidenceThreshold;
      return [
        lowConf
          ? { type: 'uncertain', noteId: best.note.id, midi: p.midi }
          : { type: 'hit', noteId: best.note.id, midi: p.midi, verdict: classifyOffset(off, best.windows), offsetMs: off * 1000, time: p.time },
      ];
    }
    // Not an expected pitch: wrong if something was expected around now, else extra.
    let near: Expected | null = null;
    let nearD = Infinity;
    for (const ex of this.expected) {
      if (ex.matched !== null) continue;
      const d = Math.abs(p.time - ex.time);
      if (d <= ex.windows.ok * 1.5 && d < nearD) {
        near = ex;
        nearD = d;
      }
    }
    if (p.confidence < this.opts.confidenceThreshold) return [];
    if (near) {
      near.liveWrong = true;
      return [{ type: 'wrong', midi: p.midi, nearNoteId: near.note.id, time: p.time, confidence: p.confidence }];
    }
    return [{ type: 'extra', midi: p.midi, time: p.time, confidence: p.confidence }];
  }

  tick(now: number): FollowerFeedback[] {
    const out: FollowerFeedback[] = [];
    for (const ex of this.expected) {
      if (ex.time > now) break;
      if (ex.matched === null && !ex.missedReported && now > ex.time + matchWindow(ex.windows)) {
        ex.missedReported = true;
        if (this.uncertain.has(ex.note.id)) continue;
        out.push({ type: 'miss', noteId: ex.note.id, midi: ex.note.midi });
      }
    }
    if (!this.done && now > this.endTime) {
      this.done = true;
      out.push({ type: 'done' });
    }
    return out;
  }

  viewBeat(now: number): number {
    return this.opts.beatAt(now);
  }

  upcoming(now: number): ScoreEvent[] {
    const beat = this.opts.beatAt(now);
    // Events starting within the next ~half beat, or currently in their window and unplayed.
    return this.events
      .filter((ev) => ev.startBeat >= beat - 0.25 && ev.startBeat <= beat + 0.6)
      .map((ev) => ({ ...ev, notes: ev.notes.filter((n) => this.byId.get(n.id)?.matched === null) }))
      .filter((ev) => ev.notes.length > 0);
  }

  expectedNear(now: number) {
    return this.expected
      .filter((ex) => ex.matched === null && Math.abs(now - ex.time) <= matchWindow(ex.windows) + 0.05)
      .map((ex) => ({ id: ex.note.id, midi: ex.note.midi, time: ex.time }));
  }

  /** Final verdicts for notes whose expected time is before `now` (a stopped take judges only what was reached). */
  finish(now: number): { results: NoteResult[]; extras: ExtraNote[] } {
    const reached = this.expected.filter((ex) => ex.time <= now + 0.05);
    const played = this.played.map((p, index) => ({ index, midi: p.midi, time: p.time }));
    // Evidence-based plays are bound to their note: give them that note's pitch for matching.
    const m = matchNotes(
      reached.map((ex) => ({ id: ex.note.id, midi: ex.note.midi, time: ex.time, windows: ex.windows })),
      played,
    );
    const results: NoteResult[] = [];
    for (const ex of reached) {
      const n = ex.note;
      const base = { noteId: n.id, midi: n.midi, hand: n.hand, measure: n.measure, startBeat: n.startBeat, expectedTime: ex.time };
      const pi = m.matched.get(n.id);
      if (pi !== undefined) {
        const p = this.played[pi];
        const off = p.time - ex.time;
        let releasedEarly: boolean | undefined;
        if (this.opts.judgeRelease && p.releaseTime !== undefined) {
          const written = n.durationBeats * this.opts.secPerBeat(n.startBeat);
          const held = p.releaseTime - p.time;
          if (written >= 0.4 && held < written * 0.6 - 0.1) releasedEarly = true;
        }
        const uncertain = p.confidence < this.opts.confidenceThreshold;
        results.push({
          ...base,
          verdict: uncertain ? 'uncertain' : classifyOffset(off, ex.windows),
          offsetMs: off * 1000,
          playedTime: p.time,
          velocity: p.velocity,
          releasedEarly,
          confidence: p.confidence,
        });
        continue;
      }
      const wi = m.wrong.get(n.id);
      if (wi !== undefined) {
        const p = this.played[wi];
        // Honesty: in mic mode, if there was some evidence for the expected note itself, don't
        // claim the learner played a wrong note: say "unsure" instead.
        const uncertain = p.confidence < this.opts.confidenceThreshold || (this.opts.source === 'mic' && this.uncertain.has(n.id));
        results.push({ ...base, verdict: uncertain ? 'uncertain' : 'wrong', playedMidi: p.midi, playedTime: p.time, confidence: p.confidence });
        continue;
      }
      results.push({ ...base, verdict: this.uncertain.has(n.id) ? 'uncertain' : 'missed', confidence: 1 });
    }
    const extras: ExtraNote[] = m.extra
      .map((i) => this.played[i])
      .filter((p) => p.confidence >= this.opts.confidenceThreshold && !p.evidenceFor)
      .map((p) => {
        const beat = this.opts.beatAt(p.time);
        return { midi: p.midi, time: p.time, nearBeat: beat, measure: measureAtBeat({ measures: this.opts.measures as { index: number; startBeat: number; lengthBeats: number }[] }, beat), confidence: p.confidence };
      });
    return { results, extras };
  }
}
