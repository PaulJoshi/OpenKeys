import { Yin, type PitchEstimate } from './yin';
import { Mpm } from './mpm';
import { PeakPicker, SpectralFlux } from './onset';
import { MultiResSpectrum } from './spectrum';
import type { AnalysisFrame } from './frames';

export interface AnalyzerConfig {
  sampleRate: number;
  hop: number;
  /** Pitch window (2048 covers down to ~47 Hz at 48 kHz; 4096 for the lowest octave). */
  pitchFrame: number;
  pitchAlgorithm: 'yin' | 'mpm';
  yinThreshold: number;
  mpmK: number;
  onsetMedianFrames: number;
  onsetMultiplier: number;
  onsetDelta: number;
  onsetMinGap: number; // seconds
  /** Compute the log spectrum every N hops (0 = off). */
  spectrumEvery: number;
  /** Minimum level above the noise floor for an onset to count (dB). */
  onsetMinSnrDb: number;
  /** Weak onsets down to this fraction of the adaptive threshold are reported. */
  onsetWeakRatio: number;
  /** Weight of the level-rise term in the onset function (per dB above 1.5 dB). Helps bass notes. */
  riseWeight: number;
  /** Noise floor measured in calibration (dB), caps the running estimate; null if not calibrated. */
  calibratedFloorDb: number | null;
}

export function defaultAnalyzerConfig(sampleRate: number): AnalyzerConfig {
  return {
    sampleRate,
    hop: sampleRate > 60000 ? 512 : 256,
    pitchFrame: sampleRate > 60000 ? 4096 : 2048,
    pitchAlgorithm: 'yin',
    yinThreshold: 0.12,
    mpmK: 0.9,
    onsetMedianFrames: 24,
    onsetMultiplier: 2.0,
    onsetDelta: 0.12,
    onsetMinGap: 0.03,
    spectrumEvery: 2,
    onsetMinSnrDb: 10,
    onsetWeakRatio: 0.4,
    riseWeight: 0.04,
    calibratedFloorDb: null,
  };
}

const ODF_SIZE = 1024;

/**
 * Per-hop audio analysis: level and noise floor, spectral-flux onsets with adaptive peak
 * picking, a monophonic pitch estimate (YIN or MPM) and an optional multi-resolution log
 * spectrum. Pure computation: runs inside the AudioWorklet and in Node tests.
 */
export class MicAnalyzer {
  readonly cfg: AnalyzerConfig;
  private readonly ring: Float32Array;
  private readonly mask: number;
  private write = 0;
  private filled = 0;
  private sinceHop = 0;
  private hopCount = 0;
  private readonly flux: SpectralFlux;
  private readonly picker: PeakPicker;
  private yin: Yin;
  private mpm: Mpm;
  private readonly spec: MultiResSpectrum | null;
  private readonly odfBuf: Float64Array;
  private readonly pitchBuf: Float64Array;
  private floorDb = -70;
  private readonly recentRms: number[] = [];
  private readonly frameTimes: number[] = [];
  /** Level over the last 1024 samples (smoother than the hop RMS, for rises and the floor). */
  private readonly levelHist: number[] = [];

  /** Minimum-statistics noise floor: minimum level per ~0.1 s block over the last ~6 s. */
  private readonly blockMins: number[] = [];
  private blockMin = 0;
  private blockHops = 0;
  /** Offset from the decided ODF frame time to the actual attack (s), measured on piano samples. */
  onsetBias: number;

  constructor(cfg: AnalyzerConfig) {
    this.cfg = cfg;
    let size = 1;
    while (size < 16384) size <<= 1;
    this.ring = new Float32Array(size);
    this.mask = size - 1;
    this.flux = new SpectralFlux(ODF_SIZE, cfg.sampleRate);
    const gapFrames = Math.max(1, Math.round((cfg.onsetMinGap * cfg.sampleRate) / cfg.hop));
    this.picker = new PeakPicker(cfg.onsetMedianFrames, cfg.onsetMultiplier, cfg.onsetDelta, gapFrames);
    this.picker.weakRatio = cfg.onsetWeakRatio;
    this.yin = new Yin(cfg.pitchFrame, cfg.sampleRate, cfg.yinThreshold);
    this.mpm = new Mpm(cfg.pitchFrame, cfg.sampleRate, cfg.mpmK);
    this.spec = cfg.spectrumEvery > 0 ? new MultiResSpectrum(cfg.sampleRate) : null;
    this.odfBuf = new Float64Array(ODF_SIZE);
    this.pitchBuf = new Float64Array(cfg.pitchFrame);
    this.onsetBias = (0.35 * ODF_SIZE) / cfg.sampleRate;
  }

  /** Updates tunable parameters without losing state. */
  tune(p: Partial<AnalyzerConfig>): void {
    Object.assign(this.cfg, p);
    if (p.onsetMultiplier !== undefined) this.picker.multiplier = p.onsetMultiplier;
    if (p.onsetDelta !== undefined) this.picker.delta = p.onsetDelta;
    if (p.onsetMedianFrames !== undefined) this.picker.medianFrames = p.onsetMedianFrames;
    if (p.onsetMinGap !== undefined) this.picker.minGapFrames = Math.max(1, Math.round((p.onsetMinGap * this.cfg.sampleRate) / this.cfg.hop));
    if (p.onsetWeakRatio !== undefined) this.picker.weakRatio = p.onsetWeakRatio;
    if (p.yinThreshold !== undefined) this.yin.threshold = p.yinThreshold;
    if (p.mpmK !== undefined) this.mpm.k = p.mpmK;
    if (p.pitchFrame !== undefined && p.pitchFrame !== this.yin.frameSize) {
      this.yin = new Yin(p.pitchFrame, this.cfg.sampleRate, this.cfg.yinThreshold);
      this.mpm = new Mpm(p.pitchFrame, this.cfg.sampleRate, this.cfg.mpmK);
    }
  }

  get noiseFloorDb(): number {
    return this.floorDb;
  }

  /**
   * Feeds samples; `endTime` is the context time of the last sample in `x`.
   * Returns the frames completed by this block.
   */
  push(x: Float32Array, endTime: number, now: () => number = () => 0): AnalysisFrame[] {
    const out: AnalysisFrame[] = [];
    const sr = this.cfg.sampleRate;
    for (let i = 0; i < x.length; i++) {
      this.ring[this.write] = x[i];
      this.write = (this.write + 1) & this.mask;
      if (this.filled < this.ring.length) this.filled++;
      this.sinceHop++;
      if (this.sinceHop >= this.cfg.hop) {
        this.sinceHop = 0;
        const t = endTime - (x.length - 1 - i) / sr;
        const t0 = now();
        const f = this.analyzeHop(t);
        f.costMs = now() - t0;
        out.push(f);
      }
    }
    return out;
  }

  private sample(back: number): number {
    return this.ring[(this.write - 1 - back) & this.mask];
  }

  private analyzeHop(time: number): AnalysisFrame {
    const cfg = this.cfg;
    const sr = cfg.sampleRate;
    const hop = cfg.hop;
    this.hopCount++;
    // Level.
    let sum = 0;
    for (let i = 0; i < hop; i++) {
      const v = this.sample(i);
      sum += v * v;
    }
    const rmsDb = 10 * Math.log10(sum / hop + 1e-12);
    let e = 0;
    for (let i = 0; i < ODF_SIZE; i++) {
      const v = this.sample(i);
      e += v * v;
    }
    const levelDb = 10 * Math.log10(e / ODF_SIZE + 1e-12);
    // Noise floor by minimum statistics over ~6 s (robust while music plays continuously),
    // capped by the calibrated floor when known.
    if (this.blockHops === 0) this.blockMin = levelDb;
    else this.blockMin = Math.min(this.blockMin, levelDb);
    this.blockHops++;
    const hopsPerBlock = Math.max(1, Math.round((0.1 * sr) / hop));
    if (this.blockHops >= hopsPerBlock) {
      this.blockMins.push(this.blockMin);
      if (this.blockMins.length > 60) this.blockMins.shift();
      this.blockHops = 0;
    }
    let floor = this.blockMin;
    for (const m of this.blockMins) if (m < floor) floor = m;
    floor += 1.5;
    if (this.cfg.calibratedFloorDb !== null) floor = Math.min(floor, this.cfg.calibratedFloorDb + 12);
    this.floorDb = Math.max(-110, floor);
    this.recentRms.push(rmsDb);
    this.frameTimes.push(time);
    this.levelHist.push(levelDb);
    if (this.recentRms.length > 16) {
      this.recentRms.shift();
      this.frameTimes.shift();
      this.levelHist.shift();
    }

    // Onsets.
    for (let i = 0; i < ODF_SIZE; i++) this.odfBuf[i] = this.sample(ODF_SIZE - 1 - i);
    let odf = this.flux.process(this.odfBuf);
    // Level rise over ~3 hops: piano bass attacks show up here even when flux is weak.
    const lh = this.levelHist;
    if (lh.length > 4) {
      const prevMin = Math.min(lh[lh.length - 4], lh[lh.length - 5]);
      const rise = levelDb - prevMin;
      if (rise > 1.5 && levelDb - this.floorDb > cfg.onsetMinSnrDb * 0.6) odf += cfg.riseWeight * (rise - 1.5);
    }
    // Short-term transient: the unwindowed hop RMS jumps when a hammer strikes (re-strikes, bass).
    const rh = this.recentRms;
    if (rh.length > 3) {
      const hopRise = rmsDb - Math.max(rh[rh.length - 2], rh[rh.length - 3]);
      if (hopRise > 4 && rmsDb - this.floorDb > cfg.onsetMinSnrDb * 0.6) odf += 0.75 * cfg.riseWeight * (hopRise - 4);
    }
    const decision = this.picker.push(odf, this.filled >= ODF_SIZE);
    let onset = false;
    let onsetTime = 0;
    let onsetStrength = 0;
    if (decision) {
      // The decided frame is `post` hops ago; require the level to stand out from the floor.
      const back = this.picker.post;
      const idx = this.recentRms.length - 1 - back;
      const peak = Math.max(...this.levelHist.slice(Math.max(0, idx), this.levelHist.length));
      if (peak - this.floorDb >= cfg.onsetMinSnrDb) {
        // Refine the time: the attack starts right after the quietest hop just before the rise
        // (unwindowed hop RMS has no window-taper delay). Falls back to the ODF frame.
        const ci = Math.max(0, idx);
        let first = ci;
        let minDb = Infinity;
        let minAt = -1;
        for (let k = Math.max(0, ci - 6); k <= ci; k++) {
          if (rh[k] <= minDb + 0.5) {
            if (rh[k] < minDb) minDb = rh[k];
            minAt = k;
          }
        }
        const peakAfter = Math.max(...rh.slice(minAt + 1, Math.min(rh.length, ci + this.picker.post + 1)));
        const useDip = minAt >= 0 && minAt < ci + 1 && minAt > Math.max(0, ci - 6) && peakAfter - minDb >= 3;
        if (useDip) first = minAt;
        onset = true;
        onsetTime = useDip ? this.frameTimes[first] - (0.25 * hop) / sr : this.frameTimes[first] - this.onsetBias;
        onsetStrength = decision.strength;
      }
    }

    // Pitch.
    let p: PitchEstimate = { freq: 0, clarity: 0, octaveAmbiguous: false };
    const pf = cfg.pitchFrame;
    if (this.filled >= pf && levelDb - this.floorDb > 6) {
      for (let i = 0; i < pf; i++) this.pitchBuf[i] = this.sample(pf - 1 - i);
      p = cfg.pitchAlgorithm === 'mpm' ? this.mpm.estimate(this.pitchBuf) : this.yin.estimate(this.pitchBuf);
    }

    let spectrum: Float32Array | undefined;
    if (this.spec && cfg.spectrumEvery > 0 && this.hopCount % cfg.spectrumEvery === 0 && this.filled >= this.spec.longestWindow) {
      spectrum = new Float32Array(this.spec.compute((b) => this.sample(b)));
    }

    return {
      time,
      rmsDb,
      levelDb,
      floorDb: this.floorDb,
      odf,
      threshold: this.picker.lastThreshold,
      onset,
      onsetTime,
      onsetStrength,
      f0: p.freq,
      clarity: p.clarity,
      octaveAmbiguous: p.octaveAmbiguous,
      pitchTime: time - pf / 2 / sr,
      spectrum,
      costMs: 0,
    };
  }
}
