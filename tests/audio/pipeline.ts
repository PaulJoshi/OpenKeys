import { MicAnalyzer, defaultAnalyzerConfig, type AnalyzerConfig } from '../../src/core/input/mic/analyzer';
import { MonoTracker, type MonoTrackerOptions } from '../../src/core/input/mic/mono';
import type { AnalysisFrame } from '../../src/core/input/mic/frames';
import type { NoteEvent } from '../../src/core/types';
import { SR, quanta, rng, type RenderNote } from './synth';

export function analyze(audio: Float32Array, cfg: Partial<AnalyzerConfig> = {}): AnalysisFrame[] {
  const a = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 0, ...cfg });
  const frames: AnalysisFrame[] = [];
  for (const q of quanta(audio)) frames.push(...a.push(q.block, q.endTime));
  return frames;
}

export function transcribeMono(audio: Float32Array, cfg: Partial<AnalyzerConfig> = {}, tracker: Partial<MonoTrackerOptions> = {}): { events: NoteEvent[]; frames: AnalysisFrame[] } {
  const frames = analyze(audio, cfg);
  const t = new MonoTracker({ range: { low: 21, high: 108 }, ...tracker });
  const events: NoteEvent[] = [];
  for (const f of frames) events.push(...t.push(f));
  return { events, frames };
}

/** Chromatic walk, fast repeated notes and a seeded random melody within a range. */
export function monoTestSet(low = 36, high = 96, seed = 11): { notes: RenderNote[]; total: number }[] {
  const sets: { notes: RenderNote[]; total: number }[] = [];
  // 1. every key, slow
  const walk: RenderNote[] = [];
  let t = 0.3;
  for (let m = low; m <= high; m++) {
    walk.push({ midi: m, start: t, dur: 0.3, velocity: 0.6 });
    t += 0.42;
  }
  sets.push({ notes: walk, total: t + 0.6 });
  // 2. fast repeated notes (8 per second) in each register
  const rep: RenderNote[] = [];
  t = 0.3;
  for (const m of [low + 7, 52, 64, 69, 76, Math.min(high - 3, 88)]) {
    for (let i = 0; i < 8; i++) {
      rep.push({ midi: m, start: t, dur: 0.09, velocity: 0.55 + 0.1 * (i % 2) });
      t += 0.125;
    }
    t += 0.4;
  }
  sets.push({ notes: rep, total: t + 0.6 });
  // 3. random melody
  const r = rng(seed);
  const mel: RenderNote[] = [];
  t = 0.3;
  let cur = 64;
  for (let i = 0; i < 80; i++) {
    cur = Math.max(low, Math.min(high, cur + Math.round((r() - 0.5) * 10)));
    const dur = 0.15 + r() * 0.45;
    mel.push({ midi: cur, start: t, dur: dur * 0.9, velocity: 0.35 + r() * 0.5 });
    t += dur;
  }
  sets.push({ notes: mel, total: t + 0.6 });
  return sets;
}
