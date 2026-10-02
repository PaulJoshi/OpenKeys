/** One analysis hop, as produced by the worklet (or by MicAnalyzer in tests). */
export interface AnalysisFrame {
  /** AudioContext time of the last sample of the hop (not latency-corrected). */
  time: number;
  rmsDb: number;
  /** Level over the last ~21 ms (1024 samples): smoother than the hop RMS. */
  levelDb: number;
  floorDb: number;
  /** Onset detection function value and the adaptive threshold. */
  odf: number;
  threshold: number;
  /** An onset was decided in this hop. */
  onset: boolean;
  onsetTime: number;
  /** >= 1: clear onset; < 1: weak onset (only meaningful with a pitch change). */
  onsetStrength: number;
  /** Pitch estimate (Hz, 0 = none), its clarity and octave ambiguity. */
  f0: number;
  clarity: number;
  octaveAmbiguous: boolean;
  /** AudioContext time the pitch estimate refers to (window centre). */
  pitchTime: number;
  /** Optional log-frequency spectrum (dB), LOG_BIN_COUNT values. */
  spectrum?: Float32Array;
  /** Processing time of this hop in ms (dev panel). */
  costMs: number;
}

export const FRAME_FIELDS = 14;

export function packFrame(f: AnalysisFrame, out: Float32Array, offset: number): void {
  out[offset] = f.time;
  out[offset + 1] = f.rmsDb;
  out[offset + 2] = f.floorDb;
  out[offset + 3] = f.odf;
  out[offset + 4] = f.threshold;
  out[offset + 5] = f.onset ? 1 : 0;
  out[offset + 6] = f.onsetTime;
  out[offset + 7] = f.onsetStrength;
  out[offset + 8] = f.f0;
  out[offset + 9] = f.clarity;
  out[offset + 10] = f.octaveAmbiguous ? 1 : 0;
  out[offset + 11] = f.pitchTime;
  out[offset + 12] = f.costMs;
  out[offset + 13] = f.levelDb;
}

export function unpackFrame(a: Float32Array | Float64Array, offset: number): AnalysisFrame {
  return {
    time: a[offset],
    rmsDb: a[offset + 1],
    floorDb: a[offset + 2],
    odf: a[offset + 3],
    threshold: a[offset + 4],
    onset: a[offset + 5] > 0.5,
    onsetTime: a[offset + 6],
    onsetStrength: a[offset + 7],
    f0: a[offset + 8],
    clarity: a[offset + 9],
    octaveAmbiguous: a[offset + 10] > 0.5,
    pitchTime: a[offset + 11],
    costMs: a[offset + 12],
    levelDb: a[offset + 13],
  };
}
