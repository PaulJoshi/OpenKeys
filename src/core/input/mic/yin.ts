import { RealFFT } from './fft';

export interface PitchEstimate {
  /** Hz, or 0 if unvoiced. */
  freq: number;
  /** 0-1 periodicity (1 - CMNDF minimum for YIN, NSDF peak for MPM). */
  clarity: number;
  /** The sub-octave (double period) was nearly as good: octave is uncertain. */
  octaveAmbiguous: boolean;
}

/**
 * YIN pitch detector (de Cheveigné & Kawahara 2002) with the difference function computed via
 * FFT cross-correlation, parabolic interpolation, and an explicit sub-octave check (octave errors
 * are the classic failure on piano).
 */
export class Yin {
  private readonly fft: RealFFT;
  private readonly maxLag: number;
  private readonly w: number;
  private readonly aRe: Float64Array;
  private readonly aIm: Float64Array;
  private readonly bRe: Float64Array;
  private readonly bIm: Float64Array;
  private readonly corr: Float64Array;
  private readonly d: Float64Array;
  private readonly cmnd: Float64Array;
  private readonly prefix: Float64Array;
  private readonly bufA: Float64Array;

  constructor(
    readonly frameSize: number,
    readonly sampleRate: number,
    public threshold = 0.12,
    readonly minFreq = 25,
    readonly maxFreq = 4400,
  ) {
    this.maxLag = Math.min(frameSize >> 1, Math.ceil(sampleRate / minFreq));
    this.w = frameSize - this.maxLag;
    const n = nextPow2(frameSize * 2);
    this.fft = new RealFFT(n);
    const bins = n / 2 + 1;
    this.aRe = new Float64Array(bins);
    this.aIm = new Float64Array(bins);
    this.bRe = new Float64Array(bins);
    this.bIm = new Float64Array(bins);
    this.corr = new Float64Array(n);
    this.d = new Float64Array(this.maxLag + 1);
    this.cmnd = new Float64Array(this.maxLag + 1);
    this.prefix = new Float64Array(frameSize + 1);
    this.bufA = new Float64Array(n);
  }

  /** Lowest detectable frequency for this frame size. */
  get lowestFreq(): number {
    return this.sampleRate / this.maxLag;
  }

  /** CMNDF of the last call (for the dev panel). */
  get lastCmnd(): Float64Array {
    return this.cmnd;
  }

  estimate(x: ArrayLike<number>): PitchEstimate {
    const N = this.frameSize;
    const W = this.w;
    const L = this.maxLag;
    // prefix sums of squares
    this.prefix[0] = 0;
    for (let i = 0; i < N; i++) this.prefix[i + 1] = this.prefix[i] + x[i] * x[i];
    const e0 = this.prefix[W];
    if (e0 < 1e-10) return { freq: 0, clarity: 0, octaveAmbiguous: false };
    // r(tau) = sum_{j<W} x[j] x[j+tau]  via FFT: corr = IFFT(conj(A) * B), A = x[0:W], B = x[0:N]
    const a = this.bufA;
    a.fill(0);
    for (let i = 0; i < W; i++) a[i] = x[i];
    this.fft.forward(a, this.aRe, this.aIm);
    a.fill(0);
    for (let i = 0; i < N; i++) a[i] = x[i];
    this.fft.forward(a, this.bRe, this.bIm);
    const bins = this.aRe.length;
    for (let k = 0; k < bins; k++) {
      const ar = this.aRe[k];
      const ai = -this.aIm[k];
      const br = this.bRe[k];
      const bi = this.bIm[k];
      this.aRe[k] = ar * br - ai * bi;
      this.aIm[k] = ar * bi + ai * br;
    }
    this.fft.inverse(this.aRe, this.aIm, this.corr);
    const d = this.d;
    const c = this.cmnd;
    d[0] = 0;
    c[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= L; tau++) {
      const et = this.prefix[tau + W] - this.prefix[tau];
      d[tau] = Math.max(0, e0 + et - 2 * this.corr[tau]);
      running += d[tau];
      c[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }
    const minLag = Math.max(2, Math.floor(this.sampleRate / this.maxFreq));
    // First dip below threshold, then walk to its local minimum.
    let tau = -1;
    for (let t = minLag; t <= L; t++) {
      if (c[t] < this.threshold) {
        while (t + 1 <= L && c[t + 1] < c[t]) t++;
        tau = t;
        break;
      }
    }
    let lowClarity = false;
    if (tau < 0) {
      // No dip under threshold: the first local minimum close to the global minimum (multiples
      // of the period are about as deep, so the global minimum alone causes octave/twelfth errors).
      let best = minLag;
      for (let t = minLag; t <= L; t++) if (c[t] < c[best]) best = t;
      const relaxed = c[best] + 0.1;
      tau = best;
      for (let t = minLag; t <= L; t++) {
        if (c[t] < relaxed && (t === L || c[t] <= c[t + 1]) && c[t] <= c[t - 1]) {
          tau = t;
          break;
        }
      }
      lowClarity = true;
    }
    const refined = parabolic(c, tau, L);
    let freq = this.sampleRate / refined;
    let clarity = Math.max(0, Math.min(1, 1 - c[tau]));
    if (lowClarity) clarity *= 0.6;

    // Sub-octave check: if the double period is (almost) as periodic, the true pitch may be an
    // octave lower (missing fundamental / strong 2nd partial). Prefer the lower octave only if
    // it is clearly better; otherwise flag the ambiguity.
    let octaveAmbiguous = false;
    const t2 = tau * 2;
    if (t2 + 1 <= L) {
      let m2 = t2;
      for (let t = Math.max(minLag, t2 - 2); t <= Math.min(L, t2 + 2); t++) if (c[t] < c[m2]) m2 = t;
      // A truly periodic signal is also periodic at 2T, so only a clear improvement counts.
      const gain = c[tau] - c[m2];
      if (gain > 0.06 && c[m2] < c[tau] * 0.5) {
        freq = this.sampleRate / parabolic(c, m2, L);
        clarity = Math.max(0, Math.min(1, 1 - c[m2]));
      } else if (gain > 0.025) octaveAmbiguous = true;
    }
    if (freq < this.lowestFreq * 0.98 || freq > this.maxFreq) return { freq: 0, clarity: 0, octaveAmbiguous: false };
    return { freq, clarity, octaveAmbiguous };
  }
}

function parabolic(a: ArrayLike<number>, i: number, max: number): number {
  if (i <= 0 || i >= max) return i;
  const y0 = a[i - 1];
  const y1 = a[i];
  const y2 = a[i + 1];
  const den = y0 - 2 * y1 + y2;
  if (Math.abs(den) < 1e-12) return i;
  const shift = (0.5 * (y0 - y2)) / den;
  return Math.abs(shift) <= 1 ? i + shift : i;
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
