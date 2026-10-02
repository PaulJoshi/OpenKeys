import type { NoteEvent } from '../../types';
import { clamp, freqToMidi, median } from '../../music';
import type { AnalysisFrame } from './frames';

export interface MonoTrackerOptions {
  /** A4 reference after tuning calibration (Hz). */
  a4: number;
  /** Keyboard octave shift (mic): heard pitch minus 12*offset = key pressed. */
  octaveOffset: number;
  /** Input latency (s) subtracted from timestamps (judging offset from calibration). */
  latency: number;
  medianFrames: number;
  hysteresisCents: number;
  /** Max time after an onset to wait for a stable pitch (s). */
  pitchWaitMax: number;
  minClarity: number;
  /** Level above floor (dB) mapped to velocity: [soft, loud] -> [0.3, 0.85]. */
  dynamics: { softSnrDb: number; loudSnrDb: number };
  range: { low: number; high: number };
  /** True if a metronome click is expected near this (latency-corrected) time. */
  clickNear?: (time: number) => boolean;
  /** Pitches the app itself is sounding at this time (leak exclusion). */
  appSounding?: (time: number) => number[];
}

export const DEFAULT_MONO_OPTIONS: MonoTrackerOptions = {
  a4: 440,
  octaveOffset: 0,
  latency: 0,
  medianFrames: 3,
  hysteresisCents: 12,
  pitchWaitMax: 0.09,
  minClarity: 0.5,
  dynamics: { softSnrDb: 18, loudSnrDb: 45 },
  range: { low: 21, high: 108 },
};

interface Pending {
  onset: number; // raw (not latency-corrected)
  strength: number;
  /** Weak onset: only a new note if the pitch differs from the sounding note. */
  weak: boolean;
  est: { m: number; clarity: number; amb: boolean }[];
  peakDb: number;
  floorDb: number;
}

interface Active {
  midi: number; // heard midi (before octave offset)
  onTime: number; // raw
  peakDb: number;
  levels: { t: number; db: number }[];
}

/**
 * Monophonic note tracking from analysis frames (free play, single-note lines, calibration).
 * Emits noteOn at the ONSET time (not when the pitch stabilises), keeps the cents offset,
 * median-filters the pitch, uses hysteresis against flicker between neighbours, and reports an
 * uncertain octave through `confidence` rather than silently guessing.
 */
export class MonoTracker {
  opts: MonoTrackerOptions;
  private pending: Pending | null = null;
  private active: Active | null = null;
  /** Pitch run without an onset (missed attack / legato). */
  private run: { m: number[]; t0: number; clarity: number[]; db: number[] } | null = null;
  /** Last ended note, so its decaying tail is not mistaken for a new note. */
  private lastEnded: { midi: number; time: number } | null = null;
  /** Live pitch for the meter (fractional MIDI, heard) and clarity. */
  live = { midi: 0, clarity: 0, cents: 0 };
  /** Level above the floor (dB) of the last emitted onset: raw input for dynamics calibration. */
  lastOnsetSnrDb = 0;

  constructor(opts: Partial<MonoTrackerOptions> = {}) {
    this.opts = { ...DEFAULT_MONO_OPTIONS, ...opts };
  }

  reset(): void {
    this.pending = null;
    this.active = null;
    this.run = null;
  }

  private toMidi(f: number): number {
    return freqToMidi(f, this.opts.a4);
  }

  velocityFor(peakDb: number, floorDb: number): number {
    const { softSnrDb, loudSnrDb } = this.opts.dynamics;
    const snr = peakDb - floorDb;
    const t = (snr - softSnrDb) / Math.max(1, loudSnrDb - softSnrDb);
    return clamp(0.3 + t * 0.55, 0.05, 1);
  }

  push(f: AnalysisFrame): NoteEvent[] {
    const out: NoteEvent[] = [];
    const o = this.opts;
    if (f.f0 > 0 && f.clarity >= o.minClarity) {
      const m = this.toMidi(f.f0);
      this.live = { midi: m, clarity: f.clarity, cents: (m - Math.round(m)) * 100 };
    } else if (f.levelDb - f.floorDb < 6) this.live = { midi: 0, clarity: 0, cents: 0 };

    if (f.onset) {
      const t = f.onsetTime;
      const gated = o.clickNear?.(t - o.latency) ?? false;
      if (!gated) {
        if (this.pending) out.push(...this.decide(true));
        this.pending = { onset: t, strength: f.onsetStrength, weak: f.onsetStrength < 1, est: [], peakDb: f.levelDb, floorDb: f.floorDb };
        this.run = null;
      }
    }

    const p = this.pending;
    if (p) {
      if (f.time <= p.onset + 0.06) p.peakDb = Math.max(p.peakDb, f.levelDb);
      // Use pitch windows that start (almost) after the attack, so the previous note's tail
      // does not pull the estimate to a neighbouring pitch.
      const windowStart = 2 * f.pitchTime - f.time;
      if (f.f0 > 0 && windowStart >= p.onset - 0.01 && f.clarity >= o.minClarity * 0.8) {
        p.est.push({ m: this.toMidi(f.f0), clarity: f.clarity, amb: f.octaveAmbiguous });
      }
      const agree = this.agreement(p.est.slice(-o.medianFrames));
      if ((p.est.length >= o.medianFrames && agree >= 0.99) || f.time >= p.onset + o.pitchWaitMax) out.push(...this.decide(false));
    } else {
      out.push(...this.trackWithoutOnset(f));
    }

    // Note-off: silence, or an abrupt drop (damper).
    const a = this.active;
    if (a) {
      a.levels.push({ t: f.time, db: f.levelDb });
      if (a.levels.length > 24) a.levels.shift();
      a.peakDb = Math.max(a.peakDb, f.levelDb);
      const snr = f.levelDb - f.floorDb;
      const prior = a.levels.find((l) => l.t >= f.time - 0.06);
      const drop = prior ? prior.db - f.levelDb : 0;
      const abrupt = drop > 18 && f.time - a.onTime > 0.08;
      if (snr < 5 || abrupt) {
        out.push(this.noteOff(a, f.time, abrupt));
        this.active = null;
      }
    }
    return out;
  }

  /** Share of estimates within 50 cents of their median. */
  private agreement(est: { m: number }[]): number {
    if (!est.length) return 0;
    const med = median(est.map((e) => e.m));
    return est.filter((e) => Math.abs(e.m - med) < 0.5).length / est.length;
  }

  private decide(interrupted: boolean): NoteEvent[] {
    const p = this.pending!;
    this.pending = null;
    const o = this.opts;
    if (p.est.length === 0) return [];
    const recent = p.est.slice(-Math.max(o.medianFrames, 3));
    const med = median(recent.map((e) => e.m));
    let midi = Math.round(med);
    // Hysteresis: a re-strike close to the active note keeps its pitch.
    const sameAsActive = !!this.active && Math.abs(med - this.active.midi) * 100 < 50 + o.hysteresisCents;
    if (sameAsActive && this.active) midi = this.active.midi;
    // A weak onset on the pitch already sounding is a fluctuation, not a re-strike.
    if (p.weak && sameAsActive) return [];
    const agree = this.agreement(recent);
    const clarity = recent.reduce((s, e) => s + e.clarity, 0) / recent.length;
    const amb = recent.filter((e) => e.amb).length / recent.length >= 0.5;
    const snr = p.peakDb - p.floorDb;
    let confidence = clamp(clarity, 0, 1) * (0.5 + 0.5 * agree) * clamp((snr - 6) / 14, 0.3, 1);
    if (p.weak) confidence *= 0.85;
    if (amb) confidence *= 0.6;
    if (recent.length < 2) confidence *= 0.75;
    if (interrupted) confidence *= 0.9;
    // App's own sound leaking into the mic: ignore weak attacks on pitches it is playing.
    const leak = o.appSounding?.(p.onset - o.latency) ?? [];
    if (leak.includes(midi) && p.strength < 2.5) return [];
    const key = midi - 12 * o.octaveOffset;
    this.lastOnsetSnrDb = snr;
    if (key < o.range.low - 1 || key > o.range.high + 1) confidence *= 0.5;
    const out: NoteEvent[] = [];
    if (this.active) out.push(this.noteOff(this.active, p.onset, false));
    const time = p.onset - o.latency;
    out.push({
      kind: 'noteOn',
      midi: key,
      time,
      velocity: this.velocityFor(p.peakDb, p.floorDb),
      confidence: Math.round(confidence * 1000) / 1000,
      source: 'mic',
      cents: Math.round((med - Math.round(med)) * 100),
      octaveUncertain: amb || undefined,
    });
    this.active = { midi, onTime: p.onset, peakDb: p.peakDb, levels: [] };
    return out;
  }

  /** Pitch changes (or a sound starts) without a detected onset: lower confidence. */
  private trackWithoutOnset(f: AnalysisFrame): NoteEvent[] {
    const o = this.opts;
    if (!(f.f0 > 0) || f.clarity < 0.75 || f.levelDb - f.floorDb < o.dynamics.softSnrDb * 0.8) {
      this.run = null;
      return [];
    }
    const m = this.toMidi(f.f0);
    const differs = !this.active || Math.abs(m - this.active.midi) * 100 > 50 + o.hysteresisCents;
    if (!differs) {
      this.run = null;
      return [];
    }
    if (!this.run || Math.abs(median(this.run.m) - m) > 0.5) this.run = { m: [m], t0: f.pitchTime, clarity: [f.clarity], db: [f.levelDb] };
    else {
      this.run.m.push(m);
      this.run.clarity.push(f.clarity);
      this.run.db.push(f.levelDb);
    }
    if (this.run.m.length < 5) return [];
    const med = median(this.run.m);
    const midi = Math.round(med);
    // A new note has energy; a decaying tail of the last note (or of a damped note) does not.
    const db = this.run.db;
    const decaying = db[db.length - 1] < Math.max(...db.slice(0, 2)) - 1.5;
    const tail = this.lastEnded && this.lastEnded.midi === midi && f.time - this.lastEnded.time < 0.6;
    if (decaying || tail) {
      this.run = null;
      return [];
    }
    const out: NoteEvent[] = [];
    const t = this.run.t0;
    if (this.active) out.push(this.noteOff(this.active, t, false));
    const conf = clamp(median(this.run.clarity), 0, 1) * 0.6;
    out.push({
      kind: 'noteOn',
      midi: midi - 12 * o.octaveOffset,
      time: t - o.latency,
      velocity: this.velocityFor(f.levelDb, f.floorDb),
      confidence: Math.round(conf * 1000) / 1000,
      source: 'mic',
      cents: Math.round((med - midi) * 100),
    });
    this.active = { midi, onTime: t, peakDb: f.levelDb, levels: [] };
    this.run = null;
    return out;
  }

  private noteOff(a: Active, rawTime: number, abrupt: boolean): NoteEvent {
    this.lastEnded = { midi: a.midi, time: rawTime };
    return {
      kind: 'noteOff',
      midi: a.midi - 12 * this.opts.octaveOffset,
      time: rawTime - this.opts.latency,
      velocity: 0,
      confidence: abrupt ? 0.8 : 0.5,
      source: 'mic',
      abrupt: abrupt || undefined,
    };
  }
}
