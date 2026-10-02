import type { ExpectedNoteEvidence, InputSource, NoteEvent, ScoreEvent, ScoreNote } from '../types';
import type { ExtraNote, NoteResult } from '../judge/types';
import { classifyOffset, windowsFor } from '../judge/windows';
import type { TimingPreset } from '../settings';
import { buildMoments, buildScoreEvents } from '../score/events';
import { clamp } from '../music';
import type { Follower, FollowerFeedback } from './types';

export interface FollowMeOptions {
  preset: TimingPreset;
  source: InputSource;
  /** Written seconds per beat at the chosen practice tempo (initial estimate). */
  initialSecPerBeat: number;
  chordWindow: number;
  minConfidence: number;
  /** Measures to look back when the learner restarts a phrase. */
  relocateLookbackBeats: number;
}

/**
 * Follow-me: no fixed tempo; the app follows the learner. An online alignment over score
 * positions (a small HMM-like search: stay / advance / skip one / jump back) tracks the position,
 * and an exponentially smoothed local tempo is estimated from matched onsets. Timing is judged
 * against the learner's own local tempo, so rubato is fine; a sudden restart of a phrase is
 * detected by matching the last few played pitches against the previous measures.
 */
export class FollowMeFollower implements Follower {
  readonly kind = 'followme';
  readonly timingJudged = true;
  readonly moments: ScoreEvent[];
  index = 0;
  private spb: number;
  private last: { beat: number; time: number } | null = null;
  private struck = new Map<number, number>();
  private chordStart = 0;
  private recent: { midi: number; time: number }[] = [];
  private results = new Map<string, NoteResult>();
  private extras: ExtraNote[] = [];
  private wrongForCurrent: number | null = null;
  done = false;

  constructor(notes: readonly ScoreNote[], private readonly opts: FollowMeOptions) {
    this.moments = buildMoments(buildScoreEvents(notes));
    this.spb = opts.initialSecPerBeat;
    if (!this.moments.length) this.done = true;
  }

  get localSecPerBeat(): number {
    return this.spb;
  }

  onNote(e: NoteEvent): FollowerFeedback[] {
    if (e.kind !== 'noteOn' || this.done || e.confidence < this.opts.minConfidence) return [];
    return this.strike(e.midi, e.time, e.confidence, e.velocity);
  }

  onEvidence(ev: ExpectedNoteEvidence, now: number): FollowerFeedback[] {
    if (ev.onsetTime === undefined || ev.presence < 0.5) return [];
    return this.strike(ev.midi, ev.onsetTime ?? now, ev.presence, ev.velocity);
  }

  private strike(midi: number, time: number, confidence: number, velocity?: number): FollowerFeedback[] {
    this.recent.push({ midi, time });
    if (this.recent.length > 6) this.recent.shift();
    const out: FollowerFeedback[] = [];
    const cur = this.moments[this.index];
    if (!cur) return out;

    // Chord in progress timed out: close it (unstruck notes are missed).
    if (this.struck.size && time - this.chordStart > this.opts.chordWindow * 2.5) out.push(...this.complete(time, true));

    const c = this.moments[this.index];
    if (!c) return out;
    if (c.notes.some((n) => n.midi === midi) && !this.struck.has(midi)) {
      if (!this.struck.size) this.chordStart = time;
      this.struck.set(midi, time);
      this.record(c, midi, time, confidence, velocity);
      if (c.notes.every((n) => this.struck.has(n.midi))) out.push(...this.complete(time, false));
      return out;
    }
    // Restarted a phrase? (checked first: three matching notes are stronger evidence than one)
    const reloc = this.relocate();
    if (reloc !== null) {
      this.index = reloc;
      this.struck.clear();
      this.last = null; // re-anchor tempo at the next onset
      this.wrongForCurrent = null;
      out.push({ type: 'relocate', eventIndex: reloc });
      return out;
    }
    // Skipped ahead by one or two events?
    for (let k = 1; k <= 2; k++) {
      const ahead = this.moments[this.index + k];
      if (ahead && ahead.notes.some((n) => n.midi === midi)) {
        for (let j = 0; j < k; j++) out.push(...this.complete(time, true));
        return [...out, ...this.strike(midi, time, confidence, velocity)];
      }
    }
    // Wrong note.
    if (this.wrongForCurrent === null) this.wrongForCurrent = midi;
    const near = c.notes.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
    out.push({ type: 'wrong', midi, nearNoteId: near.id, time, confidence });
    return out;
  }

  private record(ev: ScoreEvent, midi: number, time: number, confidence: number, velocity?: number) {
    const n = ev.notes.find((x) => x.midi === midi)!;
    let verdict: NoteResult['verdict'] = 'perfect';
    let offsetMs: number | undefined;
    if (this.last) {
      const expected = this.last.time + (ev.startBeat - this.last.beat) * this.spb;
      const off = time - expected;
      offsetMs = off * 1000;
      // Judge against the learner's own tempo, with relaxed windows (rubato is musical).
      const w = windowsFor({ preset: this.opts.preset, tempoFactor: 0.8, source: this.opts.source, grace: n.grace, arpeggiate: n.arpeggiate });
      verdict = classifyOffset(off, w);
    }
    if (this.wrongForCurrent !== null) verdict = 'wrong';
    this.results.set(n.id, {
      noteId: n.id,
      midi,
      hand: n.hand,
      measure: n.measure,
      startBeat: n.startBeat,
      verdict,
      offsetMs,
      playedMidi: this.wrongForCurrent ?? undefined,
      playedTime: time,
      velocity,
      confidence,
    });
  }

  private complete(time: number, partial: boolean): FollowerFeedback[] {
    const ev = this.moments[this.index];
    const out: FollowerFeedback[] = [];
    if (!ev) return out;
    if (partial) {
      for (const n of ev.notes) {
        if (!this.struck.has(n.midi) && !this.results.has(n.id)) {
          this.results.set(n.id, { noteId: n.id, midi: n.midi, hand: n.hand, measure: n.measure, startBeat: n.startBeat, verdict: 'missed', confidence: 1 });
          out.push({ type: 'miss', noteId: n.id, midi: n.midi });
        }
      }
    }
    if (this.struck.size) {
      const onset = Math.min(...this.struck.values());
      if (this.last && ev.startBeat > this.last.beat) {
        const observed = (onset - this.last.time) / (ev.startBeat - this.last.beat);
        const ratio = clamp(observed / this.spb, 0.6, 1.6);
        this.spb = this.spb * (0.7 + 0.3 * ratio);
      }
      this.last = { beat: ev.startBeat, time: onset };
    }
    this.struck.clear();
    this.wrongForCurrent = null;
    this.index++;
    out.push({ type: 'advance', eventIndex: this.index });
    if (this.index >= this.moments.length) {
      this.done = true;
      out.push({ type: 'done' });
    }
    void time;
    return out;
  }

  /** Finds where the last few played pitches match the score in the recent past. */
  private relocate(): number | null {
    const n = 3;
    if (this.recent.length < n) return null;
    const seq = this.recent.slice(-n).map((r) => r.midi);
    const curBeat = this.moments[this.index]?.startBeat ?? 0;
    for (let k = this.index - 1; k >= n - 1; k--) {
      if (curBeat - this.moments[k].startBeat > this.opts.relocateLookbackBeats) break;
      let ok = true;
      for (let j = 0; j < n; j++) {
        if (!this.moments[k - (n - 1) + j].notes.some((x) => x.midi === seq[j])) {
          ok = false;
          break;
        }
      }
      if (ok) return k + 1;
    }
    return null;
  }

  tick(): FollowerFeedback[] {
    return [];
  }

  viewBeat(now: number): number {
    const cur = this.moments[this.index];
    if (!this.last) return cur?.startBeat ?? this.moments[this.moments.length - 1]?.startBeat ?? 0;
    const est = this.last.beat + (now - this.last.time) / this.spb;
    return Math.min(est, cur?.startBeat ?? est);
  }

  upcoming(): ScoreEvent[] {
    const cur = this.moments[this.index];
    return cur ? [{ ...cur, notes: cur.notes.filter((n) => !this.struck.has(n.midi)) }] : [];
  }

  expectedNear(now: number) {
    const cur = this.moments[this.index];
    return cur ? cur.notes.filter((n) => !this.struck.has(n.midi)).map((n) => ({ id: n.id, midi: n.midi, time: now })) : [];
  }

  finish(): { results: NoteResult[]; extras: ExtraNote[] } {
    return { results: [...this.results.values()], extras: this.extras };
  }
}
