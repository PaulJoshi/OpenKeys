/** Calibration stored per input-device profile in IndexedDB. Every step is optional. */
export interface CalibrationData {
  /** Mic: room noise floor (dBFS) measured in silence. */
  noiseFloorDb?: number;
  /** Judging offset (s): learner's key press -> event timestamp, measured by tapping along. */
  latencySec?: number;
  /** Mic loopback test: output (speaker) and input (mic) latency estimates (s), for the dev panel. */
  loopback?: { totalSec: number; outputSec: number; inputSec: number };
  /** Mic: global tuning offset in cents (keyboard tuning/transpose). */
  tuningCents?: number;
  /** Detected keyboard transpose in semitones (mic heard a whole-semitone offset). */
  transposeSemitones?: number;
  /** Lowest and highest keys. */
  range?: { low: number; high: number };
  /** Mic: octave shift detected in the range step. */
  octaveOffset?: number;
  /**
   * Dynamics: mic = level above the floor (dB) for soft/medium/loud;
   * MIDI = raw velocities (0-1) for soft/medium/loud, giving a velocity curve.
   */
  dynamics?: { soft: number; medium: number; loud: number };
  /** Mic: measured per-key spectral templates (instrument profile). */
  instrumentProfile?: InstrumentProfile;
  updatedAt?: number;
}

export interface InstrumentProfile {
  /** Recorded keys: partial magnitudes in dB relative to the strongest partial. */
  keys: { midi: number; partialsDb: number[] }[];
  partials: number;
  createdAt: number;
}

export function profileKey(source: 'mic' | 'midi' | 'virtual', device: string | null): string {
  return `${source}:${device ?? 'default'}`;
}
