import type { ExpectedNoteEvidence, NoteEvent } from '../../types';
import { clamp } from '../../music';
import type { AnalysisFrame } from './frames';
import { LOG_BIN_COUNT, LOG_BINS_PER_SEMITONE, freqToLogBin } from './spectrum';
import type { InstrumentProfile } from '../../calibration/types';

export interface ScoreInformedOptions {
  a4: number;
  /** Keyboard octave shift: heard = key + 12 * offset. */
  octaveOffset: number;
  /** Judging offset (s): judged time = raw time - latency. */
  latency: number;
  partials: number;
  /** Inharmonicity coefficient at middle C; scaled by register. */
  inharmonicity: number;
  partialToleranceCents: number;
  presenceThreshold: number;
  wrongNoteThreshold: number;
  /** Expected notes near a (judged-clock) time: id, key pressed (MIDI), expected time. */
  expected: (now: number) => { id: string; midi: number; time: number }[];
  /** Pitches the app itself is sounding (heard pitch), raw time. */
  appSounding?: (rawTime: number) => number[];
  clickNear?: (judgedTime: number) => boolean;
  profile?: InstrumentProfile | null;
  /** Velocity from onset level above floor (dB). */
  velocityFor?: (snrDb: number) => number;
}

interface SpecFrame {
  time: number; // raw
  db: Float32Array;
  /** Strongest bin (dB). */
  max: number;
}

interface OnsetRec {
  time: number; // raw
  strength: number;
  snrDb: number;
  decided: boolean;
  /** No onset was detected; checked at the expected time of this note only. */
  virtualFor?: string;
  /** Mono tracker's confident pitch for this onset (heard MIDI), if any. */
  mono?: { midi: number; confidence: number };
}

export interface EvidenceDebug {
  midi: number;
  presence: number;
  fresh: boolean;
  octaveTrap: number;
}

/**
 * Score-informed detection for chords and two hands in mic mode: asks "are the notes I expect
 * sounding now, freshly struck?" rather than "what notes are these?".
 *
 * For each expected note: harmonic template match over 8-12 inharmonic partials
 * (f_k = k f0 sqrt(1 + B k^2)) against a per-bin noise floor; a fresh attack is required (an onset
 * plus a rise of the note's own template energy) so notes still ringing from the previous chord
 * or the sustain pedal do not count; octave traps are checked through the odd partials of the
 * lower octave. Strong unexplained spectral peaks become wrong-note candidates with a best-guess
 * pitch. Single expected notes use the monophonic tracker's pitch when it is confident.
 */
export class ScoreInformedDetector {
  opts: ScoreInformedOptions;
  private hist: SpecFrame[] = [];
  private floor = new Float32Array(LOG_BIN_COUNT).fill(-80);
  private blockMin = new Float32Array(LOG_BIN_COUNT).fill(0);
  private blockMins: Float32Array[] = [];
  private blockCount = 0;
  private onsets: OnsetRec[] = [];
  private consumed = new Set<string>();
  private virtualChecked = new Set<string>();
  private templateCache = new Map<number, { bins: number[]; tol: number[]; w: number[] }>();
  /** Latest evidence per expected note, for the dev panel. */
  debug = new Map<string, EvidenceDebug>();

  constructor(opts: ScoreInformedOptions) {
    this.opts = opts;
  }

  setOptions(p: Partial<ScoreInformedOptions>): void {
    this.opts = { ...this.opts, ...p };
    this.templateCache.clear();
  }

  reset(): void {
    this.hist = [];
    this.onsets = [];
    this.consumed.clear();
    this.virtualChecked.clear();
  }

  /** Template for a heard pitch: log-bin positions of its partials, tolerances and weights. */
  private template(heard: number) {
    const hit = this.templateCache.get(heard);
    if (hit) return hit;
    const o = this.opts;
    const f0 = o.a4 * Math.pow(2, (heard - 69) / 12);
    const B = o.inharmonicity * Math.pow(2, (heard - 60) / 12);
    const bins: number[] = [];
    const tol: number[] = [];
    const w: number[] = [];
    const prof = this.profileWeights(heard);
    for (let k = 1; k <= o.partials; k++) {
      const f = k * f0 * Math.sqrt(1 + B * k * k);
      if (f > 9000) break;
      const b = freqToLogBin(f);
      if (b < 1 || b >= LOG_BIN_COUNT - 1) continue;
      bins.push(b);
      // Tolerance widens with k (inharmonicity uncertainty grows with partial number).
      tol.push(((o.partialToleranceCents * (1 + 0.06 * (k - 1))) / 100) * LOG_BINS_PER_SEMITONE);
      w.push(prof ? prof[k - 1] ?? 0.05 : 1 / Math.pow(k, 0.8));
    }
    const t = { bins, tol, w };
    this.templateCache.set(heard, t);
    return t;
  }

  /** Partial weights from the instrument profile (nearest recorded key), linear amplitude. */
  private profileWeights(heard: number): number[] | null {
    const p = this.opts.profile;
    if (!p || !p.keys.length) return null;
    let best = p.keys[0];
    for (const k of p.keys) if (Math.abs(k.midi - heard) < Math.abs(best.midi - heard)) best = k;
    if (Math.abs(best.midi - heard) > 4) return null;
    return best.partialsDb.map((db) => Math.max(0.03, Math.pow(10, db / 20)));
  }

  /**
   * Per-partial analysis of a heard pitch in one frame: for each template partial, the level of
   * the spectral PEAK within tolerance (or null if the maximum is just the slope of another peak).
   */
  partialLevels(heard: number, f: SpecFrame): (number | null)[] {
    const t = this.template(heard);
    const db = f.db;
    const out: (number | null)[] = [];
    for (let i = 0; i < t.bins.length; i++) {
      const b = t.bins[i];
      const lo = Math.max(1, Math.round(b - t.tol[i]));
      const hi = Math.min(LOG_BIN_COUNT - 2, Math.round(b + t.tol[i]));
      let jm = lo;
      for (let j = lo; j <= hi; j++) if (db[j] > db[jm]) jm = j;
      // Must be a real local maximum (not the skirt of a neighbouring peak).
      const isPeak = db[jm] >= db[jm - 1] && db[jm] >= db[jm + 1] && db[jm] > Math.min(db[Math.max(0, jm - 2)], db[Math.min(LOG_BIN_COUNT - 1, jm + 2)]) + 1.5;
      out.push(isPeak ? db[jm] : null);
    }
    return out;
  }

  /** 0-1 template salience: weighted share of partials present as clear peaks. */
  salienceIn(heard: number, f: SpecFrame, partialSet?: (k: number) => boolean, exclude?: Set<number>): number {
    const t = this.template(heard);
    const lv = this.partialLevels(heard, f);
    let num = 0;
    let den = 0;
    for (let i = 0; i < t.bins.length; i++) {
      if (partialSet && !partialSet(i + 1)) continue;
      if (exclude && exclude.has(Math.round(t.bins[i]))) continue;
      den += t.w[i];
      const v = lv[i];
      if (v === null) continue;
      const b = Math.round(t.bins[i]);
      // Relative to the frame (dynamic range) and to the per-bin noise floor.
      const ref = Math.max(this.floor[b] + 8, f.max - 50);
      num += t.w[i] * clamp((v - ref) / 18, 0, 1);
    }
    return den > 0 ? num / den : 0;
  }

  /**
   * Strict evidence for a NOT-expected pitch (wrong-note candidates): only partials no expected
   * note explains, each a clear peak within ~25 dB of the strongest peak. Returns salience and
   * the number of strong unexplained partials.
   */
  private strictEvidence(c: number, f: SpecFrame, exclude: Set<number>): { s: number; n: number; fundamental: boolean } {
    const t = this.template(c);
    const lv = this.partialLevels(c, f);
    let num = 0;
    let den = 0;
    let n = 0;
    let fundamental = false;
    for (let i = 0; i < t.bins.length; i++) {
      const b = Math.round(t.bins[i]);
      if (exclude.has(b)) continue;
      den += t.w[i];
      const v = lv[i];
      if (v === null) continue;
      const ref = Math.max(this.floor[b] + 15, f.max - 25);
      const st = clamp((v - ref) / 12, 0, 1);
      if (st > 0.3) {
        n++;
        if (i === 0 || (c < 48 && i === 1)) fundamental = true;
      }
      num += t.w[i] * st;
    }
    return { s: den > 0 ? num / den : 0, n, fundamental };
  }

  /** Mean dB rise of a pitch's partials between two frames (only partials present after). */
  private partialRise(heard: number, before: SpecFrame, after: SpecFrame, partialSet?: (k: number) => boolean, exclude?: Set<number>): number {
    const t = this.template(heard);
    const la = this.partialLevels(heard, after);
    let sum = 0;
    let wsum = 0;
    for (let i = 0; i < t.bins.length; i++) {
      if (la[i] === null) continue;
      if (partialSet && !partialSet(i + 1)) continue;
      if (exclude && exclude.has(Math.round(t.bins[i]))) continue;
      const b = Math.round(t.bins[i]);
      const lo = Math.max(0, Math.floor(t.bins[i] - t.tol[i]));
      const hi = Math.min(LOG_BIN_COUNT - 1, Math.ceil(t.bins[i] + t.tol[i]));
      let vb = -200;
      for (let j = lo; j <= hi; j++) vb = Math.max(vb, before.db[j]);
      vb = Math.max(vb, this.floor[b]);
      sum += t.w[i] * clamp(la[i]! - vb, -20, 30);
      wsum += t.w[i];
    }
    return wsum > 0 ? sum / wsum : 0;
  }

  frameAt(raw: number): SpecFrame | null {
    let best: SpecFrame | null = null;
    for (const f of this.hist) if (!best || Math.abs(f.time - raw) < Math.abs(best.time - raw)) best = f;
    return best;
  }

  /** Max salience over frames in [a, b] (raw times). */
  private salienceOver(heard: number, a: number, b: number, partialSet?: (k: number) => boolean, exclude?: Set<number>): number {
    let best = 0;
    let n = 0;
    for (const f of this.hist) {
      if (f.time < a || f.time > b) continue;
      best = Math.max(best, this.salienceIn(heard, f, partialSet, exclude));
      n++;
    }
    if (!n) {
      const f = this.frameAt((a + b) / 2);
      return f ? this.salienceIn(heard, f, partialSet, exclude) : 0;
    }
    return best;
  }

  /** Feed the mono tracker's events so single notes can use its pitch. */
  onMonoEvent(e: NoteEvent): void {
    if (e.kind !== 'noteOn' || e.source !== 'mic') return;
    const raw = e.time + this.opts.latency;
    const heard = e.midi + 12 * this.opts.octaveOffset;
    let best: OnsetRec | null = null;
    for (const o of this.onsets) if (Math.abs(o.time - raw) < 0.03 && (!best || Math.abs(o.time - raw) < Math.abs(best.time - raw))) best = o;
    if (best) best.mono = { midi: heard, confidence: e.confidence };
  }

  push(f: AnalysisFrame): { evidence: ExpectedNoteEvidence[]; wrong: NoteEvent[] } {
    const out = { evidence: [] as ExpectedNoteEvidence[], wrong: [] as NoteEvent[] };
    if (f.onset) {
      const judged = f.onsetTime - this.opts.latency;
      if (!this.opts.clickNear?.(judged)) this.onsets.push({ time: f.onsetTime, strength: f.onsetStrength, snrDb: f.levelDb - f.floorDb, decided: false });
    }
    if (f.spectrum) {
      const db = new Float32Array(f.spectrum);
      let max = -200;
      for (let i = 0; i < db.length; i++) {
        if (db[i] < -110) db[i] = -110; // digital silence
        if (db[i] > max) max = db[i];
      }
      this.hist.push({ time: f.time, db, max });
      while (this.hist.length && this.hist[0].time < f.time - 0.6) this.hist.shift();
      this.updateFloor(f.spectrum);
    }
    // Missed onsets: an expected note whose time has passed with no onset near it is checked at
    // its expected time (soft notes in reverberant rooms can slip under the onset threshold).
    const judgedNow = f.time - this.opts.latency;
    for (const e of this.opts.expected(judgedNow - 0.15)) {
      if (this.consumed.has(e.id) || this.virtualChecked.has(e.id)) continue;
      const raw = e.time + this.opts.latency;
      if (f.time < raw + 0.15) continue;
      this.virtualChecked.add(e.id);
      if (this.onsets.some((o) => Math.abs(o.time - raw) < 0.09)) continue;
      this.onsets.push({ time: raw, strength: 0, snrDb: f.levelDb - f.floorDb, decided: false, virtualFor: e.id });
    }
    // Decide each onset once ~90 ms of post-attack spectrum is available.
    for (const o of this.onsets) {
      if (o.decided || f.time < o.time + 0.09) continue;
      o.decided = true;
      this.decide(o, out);
    }
    this.onsets = this.onsets.filter((o) => f.time - o.time < 2);
    return out;
  }

  private updateFloor(db: Float32Array) {
    if (this.blockCount === 0) for (let i = 0; i < LOG_BIN_COUNT; i++) this.blockMin[i] = Math.max(-110, db[i]);
    else for (let i = 0; i < LOG_BIN_COUNT; i++) if (db[i] < this.blockMin[i]) this.blockMin[i] = Math.max(-110, db[i]);
    this.blockCount++;
    if (this.blockCount >= 10) {
      this.blockMins.push(new Float32Array(this.blockMin));
      if (this.blockMins.length > 30) this.blockMins.shift();
      this.blockCount = 0;
      for (let i = 0; i < LOG_BIN_COUNT; i++) {
        let m = Infinity;
        for (const b of this.blockMins) if (b[i] < m) m = b[i];
        this.floor[i] = Math.max(-100, m + 2);
      }
    }
  }

  private decide(o: OnsetRec, out: { evidence: ExpectedNoteEvidence[]; wrong: NoteEvent[] }) {
    const opt = this.opts;
    const judged = o.time - opt.latency;
    let exp = opt.expected(judged).filter((e) => !this.consumed.has(e.id));
    if (o.virtualFor) exp = exp.filter((e) => e.id === o.virtualFor);
    const vel = opt.velocityFor?.(o.snrDb);
    const heardOf = (key: number) => key + 12 * opt.octaveOffset;
    const after = [o.time + 0.035, o.time + 0.09] as const;

    // The monophonic tracker's pitch confirms a single expected note; it never decides a wrong
    // note on its own (a ringing left hand can fool it), it only nominates a candidate.
    const monoHeard = o.mono && o.mono.confidence >= 0.7 ? o.mono.midi : null;

    const expectedHeard = new Set(exp.map((e) => heardOf(e.midi)));
    const fBefore = this.frameAt(o.time - 0.025);
    const fAfter = this.frameAt(o.time + 0.06);
    if (!fBefore || !fAfter) return;
    const explained: number[] = [];
    for (const e of exp) {
      const h = heardOf(e.midi);
      const sAfter = this.salienceOver(h, after[0], after[1]);
      const sBefore = this.salienceIn(h, fBefore);
      // Fresh attack: the note's own partials rose (not just ringing on from before / pedal).
      const rise = this.partialRise(h, fBefore, fAfter);
      const fresh = rise >= 2 || sBefore < 0.25 || (exp.length === 1 && monoHeard === h);
      let presence = fresh ? sAfter : sAfter * 0.3;
      if (exp.length === 1 && monoHeard === h) presence = Math.max(presence, o.mono!.confidence);
      if (o.virtualFor) presence *= 0.9;
      // Octave traps: a played lower octave contains this note's partials (its odd ones are extra);
      // a played upper octave has this note's even partials but not the odd ones.
      let trap = 0;
      // Partials explained by the other chord tones don't count as evidence for a trap, and
      // notes doubled at the octave in the chord can't be told apart this way at all.
      const others = this.coveredBins([...expectedHeard].filter((x) => x !== h));
      const octaveDoubled = [...expectedHeard].some((x) => x !== h && Math.abs(x - h) % 12 === 0);
      const free = (pitch: number, odd: boolean) => this.template(pitch).bins.filter((b, i) => (i % 2 === 0) === odd && !others.has(Math.round(b))).length;
      const lower = h - 12;
      // Lower-octave trap (e.g. C3 played for C4): the lower note's fundamental and odd partials
      // appear. Not checked in the bass, where fundamentals are weak and unreliable.
      if (h >= 48 && monoHeard !== h && !octaveDoubled && !expectedHeard.has(lower) && free(lower, true) >= 2) {
        const odd = this.salienceOver(lower, after[0], after[1], (k) => k % 2 === 1, others);
        const lowRise = this.partialRise(lower, fBefore, fAfter, (k) => k % 2 === 1, others);
        const fund = this.partialLevels(lower, fAfter)[0];
        if (fund !== null && odd > 0.45 && lowRise >= 4) trap = clamp((odd - 0.35) / 0.4, 0, 1);
      }
      const upper = h + 12;
      // Upper-octave trap (C5 played for C4): this note's fundamental is missing while its even
      // partials are there.
      if (h >= 52 && monoHeard !== h && !octaveDoubled && !expectedHeard.has(upper) && free(h, true) >= 2 && free(h, false) >= 2) {
        const lv = this.partialLevels(h, fAfter);
        const oddSelf = this.salienceOver(h, after[0], after[1], (k) => k % 2 === 1, others);
        const evenSelf = this.salienceOver(h, after[0], after[1], (k) => k % 2 === 0, others);
        if (lv[0] === null && evenSelf > 0.5 && oddSelf < evenSelf * 0.3) trap = Math.max(trap, clamp((evenSelf - oddSelf) / 0.6, 0, 1));
      }
      presence *= 1 - 0.8 * trap;
      // Neighbour competition: a freshly struck key 1-2 semitones away that matches better means
      // the learner probably hit the neighbour (the commonest slip).
      for (const d of [-2, -1, 1, 2]) {
        const nb = h + d;
        if (expectedHeard.has(nb)) continue;
        const sN = this.salienceOver(nb, after[0], after[1]);
        if (sN > sAfter + 0.12 && this.partialRise(nb, fBefore, fAfter) >= 3) {
          presence *= 0.3;
          break;
        }
      }
      this.debug.set(e.id, { midi: e.midi, presence, fresh, octaveTrap: trap });
      if (presence >= opt.presenceThreshold * 0.5) {
        if (presence >= opt.presenceThreshold) {
          this.consumed.add(e.id);
          explained.push(h);
        }
        out.evidence.push({ scoreNoteId: e.id, midi: e.midi, presence, onsetTime: judged, velocity: vel });
      }
      if (trap > 0.5) {
        const played = this.salienceOver(lower, after[0], after[1]) >= this.salienceOver(upper, after[0], after[1]) ? lower : upper;
        if (!expectedHeard.has(played)) out.wrong.push({ kind: 'noteOn', midi: played - 12 * opt.octaveOffset, time: judged, velocity: vel, confidence: clamp(0.4 + trap * 0.4, 0, 0.85), source: 'mic', octaveUncertain: true });
      }
    }

    if (o.virtualFor) return;
    // Wrong notes: candidates (neighbours of expected notes, best guesses for unexplained fresh
    // peaks) are scored only on partials that the expected/app notes do NOT explain.
    const app = opt.appSounding?.(o.time) ?? [];
    const covered = this.coveredBins([...expectedHeard, ...app]);
    const cands = new Set<number>();
    for (const h of expectedHeard) for (const d of [-2, -1, 1, 2]) cands.add(h + d);
    for (const c of this.unexplainedPeaks(fBefore, fAfter, covered)) cands.add(c);
    if (monoHeard !== null) cands.add(monoHeard);
    const scored: { c: number; s: number }[] = [];
    for (const c of cands) {
      if (expectedHeard.has(c) || app.includes(c) || c < 21 || c > 108) continue;
      const t = this.template(c);
      const free = t.bins.filter((b) => !covered.has(Math.round(b))).length;
      if (free < 2) continue;
      const ev = this.strictEvidence(c, fAfter, covered);
      const rise = this.partialRise(c, fBefore, fAfter, undefined, covered);
      // Its fundamental (or, in the bass, 2nd partial) and at least one more unexplained partial
      // must stand out clearly, and they must be freshly struck.
      if (ev.fundamental && ev.n >= 2 && rise >= 4 && ev.s >= opt.wrongNoteThreshold) scored.push({ c, s: ev.s });
    }
    // Keep the strongest candidate per region (a wrong key produces one note, not its harmonics).
    scored.sort((a, b) => b.s - a.s);
    const taken: number[] = [];
    for (const x of scored) {
      if (taken.some((t) => Math.abs(t - x.c) <= 2 || Math.abs(t - x.c) === 12 || Math.abs(t - x.c) === 19 || Math.abs(t - x.c) === 24)) continue;
      taken.push(x.c);
      out.wrong.push({ kind: 'noteOn', midi: x.c - 12 * opt.octaveOffset, time: judged, velocity: vel, confidence: clamp(x.s, 0, 0.95), source: 'mic' });
      if (taken.length >= 3) break;
    }
  }

  /** Log bins covered by the partials of the given heard pitches. */
  private coveredBins(heard: number[]): Set<number> {
    const covered = new Set<number>();
    for (const h of heard) {
      const t = this.template(h);
      for (let i = 0; i < t.bins.length; i++) for (let j = Math.floor(t.bins[i] - t.tol[i] - 0.5); j <= Math.ceil(t.bins[i] + t.tol[i] + 0.5); j++) covered.add(j);
    }
    return covered;
  }

  /** Strong peaks that appeared at the onset and no expected note accounts for -> pitch guesses. */
  private unexplainedPeaks(fb: SpecFrame, fa: SpecFrame, covered: Set<number>): number[] {
    const out: number[] = [];
    const lowBin = Math.max(2, Math.floor(freqToLogBin(50)));
    const highBin = Math.min(LOG_BIN_COUNT - 3, Math.ceil(freqToLogBin(2500)));
    for (let b = lowBin; b < highBin; b++) {
      const v = fa.db[b];
      if (v < fa.db[b - 1] || v < fa.db[b + 1] || v < Math.min(fa.db[b - 2], fa.db[b + 2]) + 3) continue;
      if (v < fa.max - 30 || v - this.floor[b] < 20 || v - fb.db[b] < 6 || covered.has(b)) continue;
      const m = 20 + b / LOG_BINS_PER_SEMITONE;
      for (const sub of [0, 12, 19]) {
        const c = Math.round(m - sub);
        if (c >= 21 && c <= 108) out.push(c);
      }
    }
    return Array.from(new Set(out));
  }
}
