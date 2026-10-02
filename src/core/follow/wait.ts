import type { ExpectedNoteEvidence, NoteEvent, ScoreEvent, ScoreNote } from '../types';
import type { ExtraNote, NoteResult } from '../judge/types';
import { buildMoments, buildScoreEvents } from '../score/events';
import type { Follower, FollowerFeedback } from './types';

export interface WaitOptions {
  /** Notes struck within this window (s) count as one chord. */
  chordWindow: number;
  /** Is the key still held (MIDI/virtual) or still ringing (mic)? Lets learners find chord notes one by one. */
  isHeld: (midi: number, now: number) => boolean;
  /** Minimum confidence for a mic note to count. */
  minConfidence: number;
  /** Repeat from the first event after the last (loop drill in wait mode). */
  loop: boolean;
}

/**
 * Wait (step) mode: the music stops at each event until the right note(s) are played. Wrong
 * notes are logged but do not advance. Verdicts are first-try: a note struck with no wrong notes
 * before it at that event is "perfect"; otherwise "wrong" with the first wrong pitch recorded.
 */
export class WaitFollower implements Follower {
  readonly kind = 'wait';
  readonly timingJudged = false;
  readonly moments: ScoreEvent[];
  index = 0;
  pass = 0;
  private struck = new Map<number, number>(); // midi -> time
  private firstWrong: { midi: number; time: number } | null = null;
  private results = new Map<string, NoteResult>();
  private prevBeat: number;
  private moveTime = -1;
  done = false;

  constructor(notes: readonly ScoreNote[], private readonly opts: WaitOptions) {
    this.moments = buildMoments(buildScoreEvents(notes));
    this.prevBeat = this.moments[0]?.startBeat ?? 0;
    if (this.moments.length === 0) this.done = true;
  }

  get current(): ScoreEvent | null {
    return this.moments[this.index] ?? null;
  }

  onNote(e: NoteEvent): FollowerFeedback[] {
    if (e.kind !== 'noteOn' || this.done) return [];
    if (e.confidence < this.opts.minConfidence) return [];
    return this.strike(e.midi, e.time, e.confidence);
  }

  onEvidence(ev: ExpectedNoteEvidence, now: number): FollowerFeedback[] {
    const cur = this.current;
    if (!cur || ev.onsetTime === undefined || ev.presence < 0.5) return [];
    if (!cur.notes.some((n) => n.id === ev.scoreNoteId)) return [];
    return this.strike(ev.midi, ev.onsetTime ?? now, ev.presence);
  }

  private strike(midi: number, time: number, confidence: number): FollowerFeedback[] {
    const cur = this.current;
    if (!cur) return [];
    const note = cur.notes.find((n) => n.midi === midi);
    const out: FollowerFeedback[] = [];
    if (!note) {
      // Re-striking a note of the previous event right after advancing is not a mistake.
      const prev = this.moments[this.index - 1];
      if (prev && prev.notes.some((n) => n.midi === midi) && time - this.moveTime < 0.25) return [];
      if (!this.firstWrong) this.firstWrong = { midi, time };
      const near = nearestByPitch(cur.notes.filter((n) => !this.struck.has(n.midi)), midi) ?? nearestByPitch(cur.notes, midi);
      out.push({ type: 'wrong', midi, nearNoteId: near?.id, time, confidence });
      return out;
    }
    if (!this.struck.has(midi)) {
      const prevResult = this.results.get(note.id);
      const r: NoteResult = {
        noteId: note.id,
        midi,
        hand: note.hand,
        measure: note.measure,
        startBeat: note.startBeat,
        verdict: this.firstWrong ? 'wrong' : 'perfect',
        playedMidi: this.firstWrong?.midi,
        playedTime: time,
        confidence,
      };
      // Keep the first pass's verdict for the take; later loop passes only update if better.
      if (!prevResult || this.pass === 0 || r.verdict === 'perfect') this.results.set(note.id, r);
      out.push({ type: 'hit', noteId: note.id, midi, verdict: r.verdict === 'perfect' ? 'perfect' : 'ok', time });
    }
    this.struck.set(midi, time);
    // Complete when every note is struck, and either all within the chord window or still held.
    if (cur.notes.every((n) => this.struck.has(n.midi))) {
      const times = cur.notes.map((n) => this.struck.get(n.midi)!);
      const spread = Math.max(...times) - Math.min(...times);
      const held = cur.notes.every((n) => this.struck.get(n.midi)! >= time - this.opts.chordWindow || this.opts.isHeld(n.midi, time));
      if (spread <= this.opts.chordWindow || held) {
        out.push(...this.advance(time));
      } else {
        // Drop notes that were released long ago: they must be played together.
        for (const n of cur.notes) if (!this.opts.isHeld(n.midi, time) && this.struck.get(n.midi)! < time - this.opts.chordWindow) this.struck.delete(n.midi);
      }
    }
    return out;
  }

  private advance(time: number): FollowerFeedback[] {
    this.prevBeat = this.viewBeat(time);
    this.moveTime = time;
    this.index++;
    this.struck.clear();
    this.firstWrong = null;
    if (this.index >= this.moments.length) {
      if (this.opts.loop) {
        this.index = 0;
        this.pass++;
        return [{ type: 'advance', eventIndex: 0 }];
      }
      this.done = true;
      return [{ type: 'advance', eventIndex: this.index }, { type: 'done' }];
    }
    return [{ type: 'advance', eventIndex: this.index }];
  }

  /** Skip the current event (learner gives up on it). */
  skip(now: number): FollowerFeedback[] {
    const cur = this.current;
    if (!cur) return [];
    const out: FollowerFeedback[] = [];
    for (const n of cur.notes) {
      if (!this.results.has(n.id)) {
        this.results.set(n.id, { noteId: n.id, midi: n.midi, hand: n.hand, measure: n.measure, startBeat: n.startBeat, verdict: 'missed', confidence: 1 });
        out.push({ type: 'miss', noteId: n.id, midi: n.midi });
      }
    }
    return [...out, ...this.advance(now)];
  }

  tick(): FollowerFeedback[] {
    return [];
  }

  viewBeat(now: number): number {
    const target = this.current?.startBeat ?? this.moments[this.moments.length - 1]?.startBeat ?? 0;
    if (this.moveTime < 0) return target;
    const k = Math.min(1, Math.max(0, (now - this.moveTime) / 0.18));
    const ease = 1 - (1 - k) * (1 - k);
    const from = this.prevBeat > target ? target : this.prevBeat; // loop wrap: jump
    return from + (target - from) * ease;
  }

  upcoming(): ScoreEvent[] {
    const cur = this.current;
    if (!cur) return [];
    return [{ ...cur, notes: cur.notes.filter((n) => !this.struck.has(n.midi)) }];
  }

  expectedNear(now: number) {
    const cur = this.current;
    return cur ? cur.notes.filter((n) => !this.struck.has(n.midi)).map((n) => ({ id: n.id, midi: n.midi, time: now })) : [];
  }

  finish(): { results: NoteResult[]; extras: ExtraNote[] } {
    // Only notes the learner reached are judged.
    return { results: [...this.results.values()], extras: [] };
  }
}

function nearestByPitch(notes: readonly ScoreNote[], midi: number): ScoreNote | undefined {
  let best: ScoreNote | undefined;
  for (const n of notes) if (!best || Math.abs(n.midi - midi) < Math.abs(best.midi - midi)) best = n;
  return best;
}
