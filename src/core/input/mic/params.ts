/** Tunable detector parameters (dev panel sliders; saved to settings). */
export interface DetectorParams {
  /** Analysis hop in samples (at 48 kHz, 256 = 5.3 ms). */
  hop: number;
  /** YIN aperiodicity threshold (0.1-0.15 typical). */
  yinThreshold: number;
  pitchAlgorithm: 'yin' | 'mpm';
  /** MPM clarity threshold (k). */
  mpmK: number;
  /** Onset: adaptive threshold = median * multiplier + delta. */
  onsetDelta: number;
  onsetMultiplier: number;
  /** Frames in the median window for the adaptive onset threshold. */
  onsetMedianFrames: number;
  /** Minimum gap between onsets (s). */
  onsetMinGap: number;
  /** Noise gate: minimum level above the noise floor (dB) for an onset to count. Raise to ignore room noise. */
  onsetMinSnrDb: number;
  /** Onsets weaker than the adaptive threshold still count down to this fraction of it (1 = only full-strength onsets). */
  onsetWeakRatio: number;
  /** Pitch-track median filter length in frames (3-5). */
  medianFrames: number;
  /** Hysteresis in cents before switching to a neighbouring note. */
  hysteresisCents: number;
  /** Partials used in harmonic templates (8-12). */
  partials: number;
  /** Inharmonicity coefficient B used for templates (piano ~1e-4 mid range). */
  inharmonicity: number;
  /** Template partial tolerance in cents (widened with k). */
  partialToleranceCents: number;
  /** Presence threshold for an expected note to count as played. */
  presenceThreshold: number;
  /** Minimum confidence for a mic verdict; below it the verdict is "uncertain". */
  confidenceThreshold: number;
  /** Wrong-note evidence threshold (unexplained energy share). */
  wrongNoteThreshold: number;
  /** Max time after an onset to wait for a stable pitch (s). */
  pitchWaitMax: number;
}

export const DEFAULT_DETECTOR_PARAMS: DetectorParams = {
  hop: 256,
  yinThreshold: 0.12,
  pitchAlgorithm: 'yin',
  mpmK: 0.9,
  onsetDelta: 0.12,
  onsetMultiplier: 2.0,
  onsetMedianFrames: 24,
  onsetMinGap: 0.03,
  onsetMinSnrDb: 10,
  onsetWeakRatio: 0.4,
  medianFrames: 3,
  hysteresisCents: 12,
  partials: 10,
  inharmonicity: 0.0004,
  partialToleranceCents: 35,
  presenceThreshold: 0.45,
  confidenceThreshold: 0.55,
  wrongNoteThreshold: 0.5,
  pitchWaitMax: 0.09,
};
