import { RealFFT, hann } from './fft';

/** Log-frequency bins: 3 per semitone from MIDI 20 (A0 - 1 semitone) to MIDI 127. */
export const LOG_BINS_PER_SEMITONE = 3;
export const LOG_MIDI_LOW = 20;
export const LOG_MIDI_HIGH = 127;
export const LOG_BIN_COUNT = (LOG_MIDI_HIGH - LOG_MIDI_LOW) * LOG_BINS_PER_SEMITONE + 1;

export function logBinMidi(b: number): number {
  return LOG_MIDI_LOW + b / LOG_BINS_PER_SEMITONE;
}

/** Fractional log-bin index for a frequency (A4 = 440 reference). */
export function freqToLogBin(freq: number): number {
  return (69 + 12 * Math.log2(freq / 440) - LOG_MIDI_LOW) * LOG_BINS_PER_SEMITONE;
}

interface Band {
  fft: RealFFT;
  win: Float32Array;
  frame: Float64Array;
  re: Float64Array;
  im: Float64Array;
  mag: Float64Array;
  size: number;
}

/**
 * Multi-resolution analysis: long windows (8192) for the bass register, where neighbouring
 * notes are only ~4 Hz apart, medium (4096) for the middle and short (2048) for the treble.
 * Output: dB magnitudes (re. a full-scale sine) on a log-frequency grid.
 */
export class MultiResSpectrum {
  private readonly bands: Band[];
  /** For each log bin: which band, and the FFT bin range [lo, hi] (fractional centre in `centre`). */
  private readonly map: { band: number; lo: number; hi: number; centre: number }[] = [];
  readonly out = new Float32Array(LOG_BIN_COUNT);

  constructor(
    readonly sampleRate: number,
    sizes: [number, number, number] = [8192, 4096, 2048],
    edges: [number, number] = [300, 1200],
  ) {
    this.bands = sizes.map((size) => ({
      fft: new RealFFT(size),
      win: hann(size),
      frame: new Float64Array(size),
      re: new Float64Array(size / 2 + 1),
      im: new Float64Array(size / 2 + 1),
      mag: new Float64Array(size / 2 + 1),
      size,
    }));
    for (let b = 0; b < LOG_BIN_COUNT; b++) {
      const midi = logBinMidi(b);
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const band = f < edges[0] ? 0 : f < edges[1] ? 1 : 2;
      const size = sizes[band];
      const fLo = f * Math.pow(2, -0.5 / (12 * LOG_BINS_PER_SEMITONE));
      const fHi = f * Math.pow(2, 0.5 / (12 * LOG_BINS_PER_SEMITONE));
      const k = (x: number) => (x * size) / sampleRate;
      this.map.push({ band, lo: Math.max(1, Math.ceil(k(fLo))), hi: Math.min(size / 2, Math.floor(k(fHi))), centre: k(f) });
    }
  }

  get longestWindow(): number {
    return this.bands[0].size;
  }

  /** `ring(i)` returns the sample i positions back from the newest (0 = newest). */
  compute(latest: (back: number) => number): Float32Array {
    for (const band of this.bands) {
      const n = band.size;
      for (let i = 0; i < n; i++) band.frame[i] = latest(n - 1 - i) * band.win[i];
      band.fft.forward(band.frame, band.re, band.im);
      const norm = 4 / n; // Hann coherent gain 0.5, one-sided spectrum: sine amplitude A -> peak A*n/4
      for (let k = 0; k < band.mag.length; k++) band.mag[k] = Math.hypot(band.re[k], band.im[k]) * norm;
    }
    for (let b = 0; b < LOG_BIN_COUNT; b++) {
      const m = this.map[b];
      const mag = this.bands[m.band].mag;
      let v = 0;
      if (m.hi >= m.lo) {
        for (let k = m.lo; k <= m.hi; k++) if (mag[k] > v) v = mag[k];
      } else {
        // Bin narrower than the FFT resolution: interpolate at the centre.
        const i = Math.floor(m.centre);
        const t = m.centre - i;
        v = mag[i] * (1 - t) + (mag[i + 1] ?? 0) * t;
      }
      this.out[b] = 20 * Math.log10(v + 1e-9);
    }
    return this.out;
  }
}
