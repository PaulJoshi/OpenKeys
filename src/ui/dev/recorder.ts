import type { NoteEvent } from '../../core/types';
import { runtime } from '../runtime';
import { practice } from '../practice/controller';
import { getDb, type TakeRecord } from '../../core/progress/db';
import { useApp } from '../store';
import type { FollowerFeedback } from '../../core/follow/types';
import { Emitter } from '../../core/emitter';

export interface TakeMeta {
  version: 1;
  title: string;
  scoreId: string | null;
  sampleRate: number;
  /** Context time of the first audio sample. */
  audioStartTime: number;
  /** Mic-detected events (latency-corrected). */
  detected: NoteEvent[];
  /** MIDI events recorded at the same time: ground-truth labels for the mic audio. */
  midiTruth: NoteEvent[];
  feedback: (FollowerFeedback & { t: number })[];
  calibration: unknown;
  detector: unknown;
  /** Latency applied to mic events, so truth/detections can be aligned with the raw audio. */
  micLatency: number;
}

/**
 * "Record take": raw mic audio + detected events + MIDI ground truth + verdicts, saved to
 * IndexedDB and downloadable as a test fixture (WAV + JSON).
 */
class TakeRecorder {
  recording = false;
  readonly changed = new Emitter<boolean>();
  private chunks: Float32Array[] = [];
  private sampleRate = 48000;
  private startTime = 0;
  private detected: NoteEvent[] = [];
  private midi: NoteEvent[] = [];
  private feedback: (FollowerFeedback & { t: number })[] = [];
  private offs: (() => void)[] = [];

  start(): void {
    if (this.recording) return;
    const mic = runtime.mic;
    this.chunks = [];
    this.detected = [];
    this.midi = [];
    this.feedback = [];
    this.startTime = runtime.engine?.now() ?? 0;
    this.offs.push(
      runtime.allEvents.on((e) => {
        if (e.source === 'mic') this.detected.push(e);
        else if (e.source === 'midi') this.midi.push(e);
      }),
      practice.feedback.on((fb) => this.feedback.push({ ...fb, t: runtime.engine?.now() ?? 0 })),
    );
    if (mic) {
      this.offs.push(
        mic.recorded.on(({ samples, sampleRate }) => {
          this.sampleRate = sampleRate;
          this.chunks.push(samples);
        }),
      );
      mic.record(true);
    }
    this.recording = true;
    this.changed.emit(true);
  }

  async stop(title?: string): Promise<number | null> {
    if (!this.recording) return null;
    runtime.mic?.record(false);
    // The worklet flushes the last chunk asynchronously.
    await new Promise((r) => setTimeout(r, 250));
    for (const o of this.offs) o();
    this.offs = [];
    this.recording = false;
    this.changed.emit(false);
    const len = this.chunks.reduce((s, c) => s + c.length, 0);
    const audio = new Float32Array(len);
    let o = 0;
    for (const c of this.chunks) {
      audio.set(c, o);
      o += c.length;
    }
    const score = useApp.getState().score;
    const s = useApp.getState().settings;
    const meta: TakeMeta = {
      version: 1,
      title: title ?? `${score?.title ?? 'Free play'} ${new Date().toLocaleString()}`,
      scoreId: score?.id ?? null,
      sampleRate: this.sampleRate,
      audioStartTime: this.startTime,
      detected: this.detected,
      midiTruth: this.midi,
      feedback: this.feedback,
      calibration: runtime.calibration,
      detector: s.detector,
      micLatency: runtime.mic?.tracker.opts.latency ?? 0,
    };
    const rec: TakeRecord = {
      createdAt: Date.now(),
      scoreId: score?.id,
      title: meta.title,
      sampleRate: this.sampleRate,
      audio: len ? new Blob([audio.buffer], { type: 'application/octet-stream' }) : undefined,
      meta,
    };
    return getDb().takes.add(rec);
  }
}

export const takeRecorder = new TakeRecorder();

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return new Blob([buf], { type: 'audio/wav' });
}
