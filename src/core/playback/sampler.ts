import * as Tone from 'tone';
import type { NoteSink } from './sink';
import { midiToAscii } from '../music';

/**
 * Salamander Grand Piano sampler (CC-BY 3.0, Alexander Holm). Samples every minor third
 * (A, C, D#, F#), 4 velocity layers, self-hosted under /samples/piano and cached by the
 * service worker. The medium layer loads first; until it is ready a light synth plays.
 */
export const SAMPLE_LAYERS = [4, 8, 12, 16] as const;
/** Upper velocity bound (0-1) served by each layer. */
const LAYER_MAX = [0.3, 0.55, 0.8, 1.01];
const SAMPLE_NOTES: string[] = (() => {
  const out: string[] = ['A0', 'C1', 'D#1', 'F#1'];
  for (let o = 1; o <= 7; o++) out.push(`A${o}`, `C${o + 1}`, `D#${o + 1}`, `F#${o + 1}`);
  return out.filter((n) => n !== 'D#8' && n !== 'F#8');
})();

export interface LoadProgress {
  loaded: number;
  total: number;
  /** Layers ready for playback. */
  layersReady: number;
}

export class PianoSampler implements NoteSink {
  readonly output: Tone.Gain;
  private readonly layers: (Tone.Sampler | null)[] = SAMPLE_LAYERS.map(() => null);
  private readonly fallback: Tone.PolySynth;
  private loading: Promise<void> | null = null;
  private readonly active = new Map<number, number[]>(); // midi -> layer indices with live notes
  release = 0.35;

  constructor(private readonly baseUrl: string) {
    this.output = new Tone.Gain(0.9);
    this.fallback = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.15, release: 0.4 },
      volume: -10,
    }).connect(this.output);
  }

  get ready(): boolean {
    return this.layers.some((l) => l !== null);
  }

  load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.loading) return this.loading;
    const total = SAMPLE_NOTES.length * SAMPLE_LAYERS.length;
    let loaded = 0;
    let layersReady = 0;
    const order = [1, 2, 0, 3]; // medium first
    const ctx = Tone.getContext().rawContext as BaseAudioContext;
    const loadLayer = async (li: number) => {
      const v = SAMPLE_LAYERS[li];
      const buffers: Record<string, Tone.ToneAudioBuffer> = {};
      await runLimited(SAMPLE_NOTES, 6, async (note) => {
        const url = `${this.baseUrl}${note.replace('#', 's')}v${v}.mp3`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${res.status}`);
          const audio = await ctx.decodeAudioData(await res.arrayBuffer());
          buffers[note] = new Tone.ToneAudioBuffer(audio);
        } catch (e) {
          console.warn(`[sampler] could not load ${url}`, e);
        }
        loaded++;
        onProgress?.({ loaded, total, layersReady });
      });
      if (Object.keys(buffers).length >= SAMPLE_NOTES.length / 2) {
        this.layers[li] = new Tone.Sampler({ urls: buffers, release: this.release, attack: 0 }).connect(this.output);
        layersReady++;
        onProgress?.({ loaded, total, layersReady });
      }
    };
    this.loading = (async () => {
      for (const li of order) await loadLayer(li);
    })();
    return this.loading;
  }

  private layerFor(velocity: number): { sampler: Tone.Sampler | null; gain: number; index: number } {
    let li = LAYER_MAX.findIndex((m) => velocity < m);
    if (li < 0) li = LAYER_MAX.length - 1;
    // Nearest loaded layer.
    for (let d = 0; d < SAMPLE_LAYERS.length; d++) {
      for (const cand of [li - d, li + d]) {
        if (cand >= 0 && cand < SAMPLE_LAYERS.length && this.layers[cand]) {
          const lo = cand === 0 ? 0 : LAYER_MAX[cand - 1];
          const hi = Math.min(1, LAYER_MAX[cand]);
          const rel = Math.min(1, Math.max(0, (velocity - lo) / Math.max(0.01, hi - lo)));
          return { sampler: this.layers[cand], gain: 0.7 + 0.3 * rel, index: cand };
        }
      }
    }
    return { sampler: null, gain: velocity, index: -1 };
  }

  play(midi: number, velocity: number, time: number, duration: number): void {
    const { sampler, gain } = this.layerFor(velocity);
    const note = midiToAscii(midi);
    if (sampler) sampler.triggerAttackRelease(note, duration, time, gain);
    else this.fallback.triggerAttackRelease(note, duration, time, Math.max(0.2, velocity));
  }

  noteOn(midi: number, velocity: number, time: number): void {
    const { sampler, gain, index } = this.layerFor(velocity);
    const note = midiToAscii(midi);
    if (sampler) sampler.triggerAttack(note, time, gain);
    else this.fallback.triggerAttack(note, time, Math.max(0.2, velocity));
    const list = this.active.get(midi) ?? [];
    list.push(index);
    this.active.set(midi, list);
  }

  noteOff(midi: number, time: number): void {
    const note = midiToAscii(midi);
    const list = this.active.get(midi);
    if (!list) return;
    for (const index of list) {
      if (index >= 0) this.layers[index]?.triggerRelease(note, time);
      else this.fallback.triggerRelease(note, time);
    }
    this.active.delete(midi);
  }

  stopAll(): void {
    const t = Tone.getContext().rawContext.currentTime;
    for (const l of this.layers) l?.releaseAll(t);
    this.fallback.releaseAll(t);
    this.active.clear();
  }
}

async function runLimited<T>(items: readonly T[], limit: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}
