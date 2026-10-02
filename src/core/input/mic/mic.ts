import type { NoteEvent } from '../../types';
import type { InputPlugin, InputStatus } from '../types';
import { Emitter } from '../../emitter';
import { MonoTracker, type MonoTrackerOptions } from './mono';
import { unpackFrame, FRAME_FIELDS, type AnalysisFrame } from './frames';
import { LOG_BIN_COUNT } from './spectrum';
import type { AnalyzerConfig } from './analyzer';
import workletUrl from '../../../worklets/analysis.worklet.ts?worker&url';

export type MicPreset = 'laptop' | 'phone' | 'usb' | 'line';

export interface MicStats {
  underruns: number;
  avgCostMs: number;
  maxCostMs: number;
  budgetMs: number;
  floorDb: number;
}

export interface MicWarnings {
  /** Processing the browser left on despite our request (hurts accuracy). */
  ignored: string[];
  label: string;
  sampleRate: number;
}

/**
 * Microphone input: getUserMedia with all voice processing off, the analysis AudioWorklet,
 * and the monophonic tracker turning frames into NoteEvents. Frames are also exposed for the
 * score-informed detector, the dev panel and calibration.
 */
export class MicInput implements InputPlugin {
  readonly source = 'mic' as const;
  status: InputStatus = 'idle';
  statusMessage?: string;
  readonly frames = new Emitter<AnalysisFrame>();
  readonly stats = new Emitter<MicStats>();
  readonly recorded = new Emitter<{ samples: Float32Array; sampleRate: number }>();
  readonly tracker: MonoTracker;
  warnings: MicWarnings | null = null;
  /** Emit NoteEvents from the mono tracker (off while score-informed detection judges). */
  emitNotes = true;
  private readonly ev = new Emitter<NoteEvent>();
  private readonly st = new Emitter<InputStatus>();
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private moduleLoaded = false;

  constructor(
    private readonly ctx: AudioContext,
    private readonly opts: {
      deviceId: string | null;
      analyzer: Partial<AnalyzerConfig>;
      tracker: Partial<MonoTrackerOptions>;
    },
  ) {
    this.tracker = new MonoTracker(opts.tracker);
  }

  onEvent(cb: (e: NoteEvent) => void) {
    return this.ev.on(cb);
  }

  onStatus(cb: (s: InputStatus) => void) {
    return this.st.on(cb);
  }

  private setStatus(s: InputStatus, msg?: string) {
    this.status = s;
    this.statusMessage = msg;
    this.st.emit(s);
  }

  async start(): Promise<void> {
    if (this.status === 'running') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setStatus('unsupported', 'This browser cannot access the microphone (it needs HTTPS or localhost).');
      return;
    }
    this.setStatus('starting');
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          ...(this.opts.deviceId ? { deviceId: { exact: this.opts.deviceId } } : {}),
        },
        video: false,
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      const err = e as DOMException;
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') this.setStatus('denied', 'Microphone permission was denied.');
      else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') this.setStatus('error', 'No microphone found (or the chosen one is unplugged).');
      else this.setStatus('error', err.message || String(e));
      return;
    }
    const track = this.stream.getAudioTracks()[0];
    const settings = track.getSettings() as MediaTrackSettings & { echoCancellation?: boolean; noiseSuppression?: boolean; autoGainControl?: boolean };
    const ignored: string[] = [];
    if (settings.echoCancellation) ignored.push('echo cancellation');
    if (settings.noiseSuppression) ignored.push('noise suppression');
    if (settings.autoGainControl) ignored.push('automatic gain control');
    this.warnings = { ignored, label: track.label, sampleRate: this.ctx.sampleRate };
    track.onended = () => this.setStatus('error', 'The microphone was disconnected.');

    try {
      if (!this.moduleLoaded) {
        await this.ctx.audioWorklet.addModule(workletUrl);
        this.moduleLoaded = true;
      }
      this.node = new AudioWorkletNode(this.ctx, 'openkeys-analysis', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: this.opts.analyzer,
      });
    } catch (e) {
      this.setStatus('error', `Audio analysis could not start: ${(e as Error).message}`);
      return;
    }
    this.node.port.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    this.src = this.ctx.createMediaStreamSource(this.stream);
    // Keep the node pulled by the graph without making a sound.
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.src.connect(this.node);
    this.node.connect(this.sink);
    this.sink.connect(this.ctx.destination);
    this.tracker.reset();
    this.setStatus('running');
  }

  private onMessage(m: { type: string } & Record<string, unknown>) {
    if (m.type === 'frames') {
      const data = m.data as Float32Array;
      const n = m.n as number;
      const spec = m.spec as Float32Array | null;
      const idx = (m.spectrumIdx as number[]) ?? [];
      for (let i = 0; i < n; i++) {
        const f = unpackFrame(data, i * FRAME_FIELDS);
        const si = idx.indexOf(i);
        if (spec && si >= 0) f.spectrum = spec.subarray(si * LOG_BIN_COUNT, (si + 1) * LOG_BIN_COUNT);
        this.frames.emit(f);
        const events = this.tracker.push(f);
        if (this.emitNotes) for (const e of events) this.ev.emit(e);
      }
    } else if (m.type === 'stats') {
      this.stats.emit(m as unknown as MicStats);
    } else if (m.type === 'audio') {
      this.recorded.emit({ samples: m.samples as Float32Array, sampleRate: m.sampleRate as number });
    }
  }

  tune(p: Partial<AnalyzerConfig>): void {
    this.node?.port.postMessage({ type: 'tune', params: p });
  }

  setTracker(p: Partial<MonoTrackerOptions>): void {
    Object.assign(this.tracker.opts, p);
  }

  record(on: boolean): void {
    this.node?.port.postMessage({ type: 'record', on });
  }

  stop(): void {
    this.src?.disconnect();
    this.node?.disconnect();
    this.sink?.disconnect();
    this.node?.port.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.node = null;
    this.src = null;
    this.sink = null;
    if (this.status !== 'denied' && this.status !== 'unsupported') this.setStatus('idle');
  }
}

/** Lists audio input devices (labels need a granted permission first). */
export async function listMicDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'audioinput');
}
