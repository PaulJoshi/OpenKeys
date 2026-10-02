import { describe, expect, it } from 'vitest';
import { RealFFT } from '../src/core/input/mic/fft';

describe('RealFFT', () => {
  it('matches a naive DFT and inverts', () => {
    const n = 64;
    const x = Array.from({ length: n }, (_, i) => Math.sin(i * 0.3) + 0.5 * Math.cos(i * 1.7) + (i % 5) * 0.1);
    const f = new RealFFT(n);
    const re = new Float64Array(n / 2 + 1);
    const im = new Float64Array(n / 2 + 1);
    f.forward(x, re, im);
    for (let k = 0; k <= n / 2; k++) {
      let sr = 0;
      let si = 0;
      for (let t = 0; t < n; t++) {
        sr += x[t] * Math.cos((-2 * Math.PI * k * t) / n);
        si += x[t] * Math.sin((-2 * Math.PI * k * t) / n);
      }
      expect(re[k]).toBeCloseTo(sr, 8);
      expect(im[k]).toBeCloseTo(si, 8);
    }
    const back = new Float64Array(n);
    f.inverse(re, im, back);
    for (let t = 0; t < n; t++) expect(back[t]).toBeCloseTo(x[t], 8);
  });
});
