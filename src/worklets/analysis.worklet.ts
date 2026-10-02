/// <reference lib="es2022" />
/**
 * AudioWorklet that runs all real-time mic analysis off the main thread: level, noise floor,
 * onsets, pitch and (optionally) the multi-resolution log spectrum. Frames are posted in
 * batches as transferable Float32Arrays (no SharedArrayBuffer: static hosts cannot set the
 * cross-origin isolation headers it needs).
 */
import { MicAnalyzer, defaultAnalyzerConfig, type AnalyzerConfig } from '../core/input/mic/analyzer';
import { FRAME_FIELDS, packFrame, type AnalysisFrame } from '../core/input/mic/frames';
import { LOG_BIN_COUNT } from '../core/input/mic/spectrum';

declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;
interface ProcessorPort {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
}
declare class AudioWorkletProcessor {
  readonly port: ProcessorPort;
  constructor(options?: { processorOptions?: unknown });
}
declare function registerProcessor(name: string, ctor: new (options: { processorOptions?: unknown }) => AudioWorkletProcessor): void;

type Msg =
  | { type: 'tune'; params: Partial<AnalyzerConfig> }
  | { type: 'record'; on: boolean }
  | { type: 'ping' };

class AnalysisProcessor extends AudioWorkletProcessor {
  private analyzer: MicAnalyzer;
  private pending: AnalysisFrame[] = [];
  private recording = false;
  private rec: Float32Array[] = [];
  private recLen = 0;
  private lastFrame = -1;
  private underruns = 0;
  private maxCost = 0;
  private costSum = 0;
  private costN = 0;
  private quanta = 0;

  constructor(options: { processorOptions?: unknown }) {
    super(options);
    const cfg = { ...defaultAnalyzerConfig(sampleRate), ...((options.processorOptions as Partial<AnalyzerConfig>) ?? {}) };
    this.analyzer = new MicAnalyzer(cfg);
    this.port.onmessage = (e: MessageEvent) => {
      const m = e.data as Msg;
      if (m.type === 'tune') this.analyzer.tune(m.params);
      else if (m.type === 'record') {
        this.recording = m.on;
        if (!m.on) this.flushRecording();
      }
    };
  }

  private flushRecording() {
    if (!this.recLen) return;
    const out = new Float32Array(this.recLen);
    let o = 0;
    for (const c of this.rec) {
      out.set(c, o);
      o += c.length;
    }
    this.rec = [];
    this.recLen = 0;
    this.port.postMessage({ type: 'audio', samples: out, sampleRate }, [out.buffer]);
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    // Dropouts show up as gaps in currentFrame between calls.
    if (this.lastFrame >= 0 && currentFrame - this.lastFrame > ch.length * 1.5) this.underruns++;
    this.lastFrame = currentFrame;
    const t0 = Date.now();
    const frames = this.analyzer.push(ch, currentTime + (ch.length - 1) / sampleRate);
    const cost = Date.now() - t0;
    this.costSum += cost;
    this.costN++;
    if (cost > this.maxCost) this.maxCost = cost;
    if (frames.length) this.pending.push(...frames);
    if (this.recording) {
      this.rec.push(new Float32Array(ch));
      this.recLen += ch.length;
      if (this.recLen >= sampleRate * 2) this.flushRecording();
    }
    // Post every ~2 hops to keep message overhead low but latency small.
    if (this.pending.length >= 2 || (this.pending.length && this.pending[this.pending.length - 1].onset)) this.post();
    if (++this.quanta % 375 === 0) {
      // ~1 s at 48 kHz: stats for the dev panel.
      this.port.postMessage({
        type: 'stats',
        underruns: this.underruns,
        avgCostMs: this.costSum / Math.max(1, this.costN),
        maxCostMs: this.maxCost,
        budgetMs: (ch.length / sampleRate) * 1000,
        floorDb: this.analyzer.noiseFloorDb,
      });
      this.maxCost = 0;
      this.costSum = 0;
      this.costN = 0;
    }
    return true;
  }

  private post() {
    const n = this.pending.length;
    const data = new Float32Array(n * FRAME_FIELDS);
    const spectra: Float32Array[] = [];
    const spectrumIdx: number[] = [];
    this.pending.forEach((f, i) => {
      packFrame(f, data, i * FRAME_FIELDS);
      if (f.spectrum) {
        spectra.push(f.spectrum);
        spectrumIdx.push(i);
      }
    });
    let spec: Float32Array | null = null;
    if (spectra.length) {
      spec = new Float32Array(spectra.length * LOG_BIN_COUNT);
      spectra.forEach((s, i) => spec!.set(s, i * LOG_BIN_COUNT));
    }
    this.pending = [];
    const transfer: Transferable[] = [data.buffer];
    if (spec) transfer.push(spec.buffer);
    this.port.postMessage({ type: 'frames', data, n, spec, spectrumIdx }, transfer);
  }
}

registerProcessor('openkeys-analysis', AnalysisProcessor);
