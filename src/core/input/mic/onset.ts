import { RealFFT, hann } from './fft';

export interface OnsetDecision {
  /** Index of the frame the onset belongs to (in the caller's hop count). */
  frame: number;
  strength: number;
}

/**
 * Onset detection function: log-compressed, half-wave-rectified spectral flux
 * (Böck & Widmer style), on a short window for timing precision.
 */
export class SpectralFlux {
  private readonly fft: RealFFT;
  private readonly win: Float32Array;
  private readonly frame: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private prev: Float64Array;
  private cur: Float64Array;
  private readonly maxBin: number;
  /** Magnitude spectrum of the last frame (linear). */
  readonly mag: Float64Array;

  constructor(
    readonly size: number,
    readonly sampleRate: number,
    readonly gamma = 100,
    maxFreq = 10000,
  ) {
    this.fft = new RealFFT(size);
    this.win = hann(size);
    this.frame = new Float64Array(size);
    this.re = new Float64Array(size / 2 + 1);
    this.im = new Float64Array(size / 2 + 1);
    this.prev = new Float64Array(size / 2 + 1);
    this.cur = new Float64Array(size / 2 + 1);
    this.mag = new Float64Array(size / 2 + 1);
    this.maxBin = Math.min(size / 2, Math.round((maxFreq * size) / sampleRate));
  }

  /** `x` holds the most recent `size` samples. Returns the ODF value. */
  process(x: ArrayLike<number>): number {
    const n = this.size;
    for (let i = 0; i < n; i++) this.frame[i] = x[i] * this.win[i];
    this.fft.forward(this.frame, this.re, this.im);
    const tmp = this.prev;
    this.prev = this.cur;
    this.cur = tmp;
    let flux = 0;
    // Max-filter the previous frame over +/-1 bin to suppress vibrato/tremolo (SuperFlux).
    for (let k = 1; k < this.maxBin; k++) {
      const m = Math.hypot(this.re[k], this.im[k]);
      this.mag[k] = m;
      const v = Math.log1p(this.gamma * m);
      this.cur[k] = v;
      const p = Math.max(this.prev[k - 1], this.prev[k], this.prev[k + 1]);
      const diff = v - p;
      if (diff > 0) flux += diff;
    }
    return flux / this.maxBin;
  }
}

/**
 * Adaptive-threshold peak picking: a frame is an onset if it is the local maximum over
 * [-pre, +post] frames, exceeds median(history) * multiplier + delta, and is at least `minGap`
 * frames after the previous onset. Decisions are delayed by `post` frames.
 */
export class PeakPicker {
  private readonly hist: number[] = [];
  private lastOnset = -1e9;
  private frame = -1;
  private readonly window: number[] = [];
  lastThreshold = 0;

  constructor(
    public medianFrames = 24,
    public multiplier = 1.6,
    public delta = 0.6,
    public minGapFrames = 6,
    readonly pre = 3,
    readonly post = 2,
  ) {}

  /** Feed one ODF value; returns an onset decision for frame (current - post), if any. */
  /** Weak onsets down to this fraction of the threshold are reported (strength < 1). */
  weakRatio = 0.4;

  push(value: number, gate = true): OnsetDecision | null {
    this.frame++;
    this.window.push(value);
    if (this.window.length > this.pre + this.post + 1) this.window.shift();
    this.hist.push(value);
    if (this.hist.length > this.medianFrames) this.hist.shift();
    if (this.window.length < this.pre + this.post + 1) return null;
    const cIdx = this.pre;
    const c = this.window[cIdx];
    const cFrame = this.frame - this.post;
    const sorted = [...this.hist].sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    const thr = med * this.multiplier + this.delta;
    this.lastThreshold = thr;
    if (!gate) return null;
    if (c < thr * this.weakRatio) return null;
    for (let i = 0; i < this.window.length; i++) if (i !== cIdx && this.window[i] > c) return null;
    if (cFrame - this.lastOnset < this.minGapFrames) return null;
    // A weak peak right after a strong onset is its tail, not a new note.
    if (c < thr && cFrame - this.lastOnset < this.minGapFrames * 2) return null;
    this.lastOnset = cFrame;
    return { frame: cFrame, strength: c / Math.max(1e-6, thr) };
  }
}
