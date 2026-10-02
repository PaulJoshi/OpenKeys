import * as Tone from 'tone';
import { ClockMapper, type AudioClock } from '../clock';
import { Player, type TickSource } from './player';
import { PianoSampler, type LoadProgress } from './sampler';
import { Metronome } from './metronome';
import { ScheduledAudioLog, type NoteSink } from './sink';
import { Emitter } from '../emitter';

/**
 * Owns the single AudioContext (the app's one clock), the piano, the metronome and the
 * lookahead transport. Browser-only; created lazily after a user gesture.
 */
export class AudioEngine implements AudioClock {
  readonly ctx: AudioContext;
  readonly mapper = new ClockMapper();
  readonly log = new ScheduledAudioLog();
  readonly piano: PianoSampler;
  readonly metronome: Metronome;
  readonly player: Player;
  readonly master: Tone.Gain;
  readonly loadProgress = new Emitter<LoadProgress>();
  lastProgress: LoadProgress = { loaded: 0, total: 1, layersReady: 0 };
  /** Optional alternative destination for scheduled playback (MIDI out). */
  private routeSink: NoteSink | null = null;
  private routeAlsoLocal = false;
  private mapTimer: number | undefined;

  constructor(sampleBaseUrl: string) {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    Tone.setContext(new Tone.Context({ context: this.ctx, lookAhead: 0, updateInterval: 0.025 }));
    this.master = new Tone.Gain(1).toDestination();
    this.piano = new PianoSampler(sampleBaseUrl);
    this.piano.output.connect(this.master);
    this.metronome = new Metronome();
    this.metronome.output.connect(this.master);
    const ticks: TickSource = {
      onTick: (cb) => {
        const c = Tone.getContext();
        c.on('tick', cb);
        return () => {
          c.off('tick', cb);
        };
      },
    };
    const routing: NoteSink = {
      play: (m, v, t, d) => {
        if (this.routeSink) {
          this.routeSink.play(m, v, t, d);
          if (!this.routeAlsoLocal) return;
        }
        this.piano.play(m, v, t, d);
      },
      stopAll: () => {
        this.routeSink?.stopAll();
        this.piano.stopAll();
      },
    };
    this.player = new Player(() => this.ctx.currentTime, ticks, routing, this.metronome, this.log);
    this.sampleClock();
    this.mapTimer = window.setInterval(() => this.sampleClock(), 1000);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
    await Tone.start();
    this.sampleClock();
  }

  loadPiano(): Promise<void> {
    return this.piano.load((p) => {
      this.lastProgress = p;
      this.loadProgress.emit(p);
    });
  }

  /** Re-samples the performance.now() <-> context time mapping. */
  sampleClock(): void {
    const ts = this.ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      this.mapper.addSample(ts.contextTime, ts.performanceTime);
    } else {
      // Fallback (Safari before playback starts): assume output latency.
      const lat = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
      this.mapper.addSample(Math.max(0, this.ctx.currentTime - lat), performance.now());
    }
  }

  now(): number {
    return this.ctx.currentTime;
  }

  perfToAudio(perfMs: number): number {
    return this.mapper.isValid ? this.mapper.perfToAudio(perfMs) : this.ctx.currentTime;
  }

  audioToPerf(audioSec: number): number {
    return this.mapper.audioToPerf(audioSec);
  }

  /** Total output latency estimate in seconds. */
  get outputLatency(): number {
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }

  setVolume(v: number): void {
    this.master.gain.value = v;
  }

  setRoute(sink: NoteSink | null, alsoLocal = false): void {
    this.routeSink = sink;
    this.routeAlsoLocal = alsoLocal;
  }

  dispose(): void {
    window.clearInterval(this.mapTimer);
    this.player.stop();
    void this.ctx.close();
  }
}

let engine: AudioEngine | null = null;

export function getEngine(): AudioEngine | null {
  return engine;
}

/** Creates (once) and resumes the engine. Must be called from a user gesture. */
export async function ensureEngine(sampleBaseUrl: string): Promise<AudioEngine> {
  if (!engine) {
    engine = new AudioEngine(sampleBaseUrl);
    void engine.loadPiano();
  }
  await engine.resume();
  return engine;
}
