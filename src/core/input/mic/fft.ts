/**
 * Radix-2 real FFT (N real samples -> N/2+1 complex bins) using an N/2 complex FFT and the
 * standard split step. Allocation-free after construction; safe for the audio thread.
 */
export class RealFFT {
  readonly n: number;
  private readonly half: number;
  private readonly rev: Uint32Array;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly splitCos: Float64Array;
  private readonly splitSin: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;

  constructor(n: number) {
    if (n < 4 || (n & (n - 1)) !== 0) throw new Error('FFT size must be a power of two >= 4');
    this.n = n;
    const h = n >> 1;
    this.half = h;
    this.rev = new Uint32Array(h);
    const bits = Math.log2(h);
    for (let i = 0; i < h; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float64Array(h / 2);
    this.sin = new Float64Array(h / 2);
    for (let i = 0; i < h / 2; i++) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / h);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / h);
    }
    this.splitCos = new Float64Array(h);
    this.splitSin = new Float64Array(h);
    for (let k = 0; k < h; k++) {
      this.splitCos[k] = Math.cos((-2 * Math.PI * k) / n);
      this.splitSin[k] = Math.sin((-2 * Math.PI * k) / n);
    }
    this.re = new Float64Array(h);
    this.im = new Float64Array(h);
  }

  private complexFFT(re: Float64Array, im: Float64Array, inverse: boolean) {
    const h = this.half;
    for (let i = 0; i < h; i++) {
      const j = this.rev[i];
      if (j > i) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    const sgn = inverse ? -1 : 1;
    for (let size = 2; size <= h; size <<= 1) {
      const halfSize = size >> 1;
      const step = h / size;
      for (let start = 0; start < h; start += size) {
        for (let k = 0; k < halfSize; k++) {
          const wr = this.cos[k * step];
          const wi = sgn * this.sin[k * step];
          const a = start + k;
          const b = a + halfSize;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
  }

  /**
   * Forward transform. `input` has n samples (shorter input is zero-padded).
   * Writes N/2+1 bins into outRe/outIm.
   */
  forward(input: ArrayLike<number>, outRe: Float64Array, outIm: Float64Array): void {
    const h = this.half;
    const re = this.re;
    const im = this.im;
    const len = input.length;
    for (let i = 0; i < h; i++) {
      const a = 2 * i;
      re[i] = a < len ? input[a] : 0;
      im[i] = a + 1 < len ? input[a + 1] : 0;
    }
    this.complexFFT(re, im, false);
    // Split: X[k] = (Z[k] + conj(Z[h-k]))/2 + W^k (Z[k] - conj(Z[h-k]))/(2i)
    outRe[0] = re[0] + im[0];
    outIm[0] = 0;
    outRe[h] = re[0] - im[0];
    outIm[h] = 0;
    for (let k = 1; k < h; k++) {
      const zr = re[k];
      const zi = im[k];
      const cr = re[h - k];
      const ci = -im[h - k];
      const er = (zr + cr) / 2;
      const ei = (zi + ci) / 2;
      const or = (zi - ci) / 2;
      const oi = -(zr - cr) / 2;
      const wr = this.splitCos[k];
      const wi = this.splitSin[k];
      outRe[k] = er + or * wr - oi * wi;
      outIm[k] = ei + or * wi + oi * wr;
    }
  }

  /** Inverse of `forward` for a Hermitian spectrum (N/2+1 bins) -> n real samples. */
  inverse(inRe: Float64Array, inIm: Float64Array, out: Float64Array): void {
    const h = this.half;
    const re = this.re;
    const im = this.im;
    for (let k = 0; k < h; k++) {
      const xr = inRe[k];
      const xi = inIm[k];
      const yr = inRe[h - k];
      const yi = -inIm[h - k];
      const er = (xr + yr) / 2;
      const ei = (xi + yi) / 2;
      const dr = (xr - yr) / 2;
      const di = (xi - yi) / 2;
      // O = D * conj(W^k)
      const wr = this.splitCos[k];
      const wi = -this.splitSin[k];
      const or = dr * wr - di * wi;
      const oi = dr * wi + di * wr;
      // Z = E + i O
      re[k] = er - oi;
      im[k] = ei + or;
    }
    this.complexFFT(re, im, true);
    for (let i = 0; i < h; i++) {
      out[2 * i] = re[i] / h;
      out[2 * i + 1] = im[i] / h;
    }
  }
}

export function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}
