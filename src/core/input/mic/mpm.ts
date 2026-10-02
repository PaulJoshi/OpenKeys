import { RealFFT } from './fft';
import { nextPow2, type PitchEstimate } from './yin';

/**
 * McLeod Pitch Method (McLeod & Wyvill 2005): normalised square difference function (NSDF) via
 * FFT autocorrelation, key-maximum picking with threshold k * highest peak. Follows the approach
 * of the `pitchy` library (MIT). Selectable alternative to YIN for comparison.
 */
export class Mpm {
  private readonly fft: RealFFT;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly buf: Float64Array;
  private readonly ac: Float64Array;
  private readonly nsdf: Float64Array;

  constructor(
    readonly frameSize: number,
    readonly sampleRate: number,
    public k = 0.9,
    readonly minFreq = 25,
    readonly maxFreq = 4400,
  ) {
    const n = nextPow2(frameSize * 2);
    this.fft = new RealFFT(n);
    this.re = new Float64Array(n / 2 + 1);
    this.im = new Float64Array(n / 2 + 1);
    this.buf = new Float64Array(n);
    this.ac = new Float64Array(n);
    this.nsdf = new Float64Array(frameSize);
  }

  estimate(x: ArrayLike<number>): PitchEstimate {
    const N = this.frameSize;
    this.buf.fill(0);
    for (let i = 0; i < N; i++) this.buf[i] = x[i];
    this.fft.forward(this.buf, this.re, this.im);
    for (let i = 0; i < this.re.length; i++) {
      this.re[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
      this.im[i] = 0;
    }
    this.fft.inverse(this.re, this.im, this.ac);
    // m'(tau) = sum x_j^2 + x_{j+tau}^2 computed incrementally.
    let m = 2 * this.ac[0];
    const nsdf = this.nsdf;
    const maxTau = Math.min(N - 1, Math.ceil(this.sampleRate / this.minFreq));
    for (let tau = 0; tau < maxTau; tau++) {
      nsdf[tau] = m > 0 ? (2 * this.ac[tau]) / m : 0;
      m -= x[tau] * x[tau] + x[N - 1 - tau] * x[N - 1 - tau];
    }
    if (this.ac[0] < 1e-10) return { freq: 0, clarity: 0, octaveAmbiguous: false };
    // Key maxima: highest peak between positive zero crossings.
    const peaks: number[] = [];
    let pos = 0;
    while (pos < maxTau - 1 && nsdf[pos] > 0) pos++;
    while (pos < maxTau - 1 && nsdf[pos] <= 0) pos++;
    while (pos < maxTau - 1) {
      let best = -1;
      while (pos < maxTau - 1 && nsdf[pos] > 0) {
        if (best < 0 || nsdf[pos] > nsdf[best]) best = pos;
        pos++;
      }
      if (best > 0) peaks.push(best);
      while (pos < maxTau - 1 && nsdf[pos] <= 0) pos++;
    }
    if (!peaks.length) return { freq: 0, clarity: 0, octaveAmbiguous: false };
    let highest = 0;
    for (const p of peaks) highest = Math.max(highest, nsdf[p]);
    const cutoff = this.k * highest;
    const minLag = this.sampleRate / this.maxFreq;
    let chosen = -1;
    for (const p of peaks) {
      if (p >= minLag && nsdf[p] >= cutoff) {
        chosen = p;
        break;
      }
    }
    if (chosen < 0) return { freq: 0, clarity: 0, octaveAmbiguous: false };
    const [tau, val] = parabolicPeak(nsdf, chosen);
    // Ambiguity: a later key maximum (double period) almost as strong.
    const dbl = peaks.find((p) => Math.abs(p - 2 * tau) < 3);
    const octaveAmbiguous = dbl !== undefined && nsdf[dbl] > val - 0.03;
    return { freq: this.sampleRate / tau, clarity: Math.max(0, Math.min(1, val)), octaveAmbiguous };
  }
}

function parabolicPeak(a: Float64Array, i: number): [number, number] {
  if (i <= 0 || i >= a.length - 1) return [i, a[i]];
  const y0 = a[i - 1];
  const y1 = a[i];
  const y2 = a[i + 1];
  const den = y0 - 2 * y1 + y2;
  if (Math.abs(den) < 1e-12) return [i, y1];
  const shift = (0.5 * (y0 - y2)) / den;
  return [i + shift, y1 - 0.25 * (y0 - y2) * shift];
}
