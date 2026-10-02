import { MicAnalyzer, defaultAnalyzerConfig, type AnalyzerConfig } from './analyzer';
import { MonoTracker, type MonoTrackerOptions } from './mono';
import type { AnalysisFrame } from './frames';
import type { NoteEvent } from '../../types';

/**
 * Runs the same analysis as the worklet over recorded audio (dev panel "evaluate take",
 * accuracy tests). `startTime` is the context time of the first sample.
 */
export function analyzeOffline(
  audio: Float32Array,
  sampleRate: number,
  startTime = 0,
  analyzer: Partial<AnalyzerConfig> = {},
  tracker: Partial<MonoTrackerOptions> = {},
): { events: NoteEvent[]; frames: AnalysisFrame[] } {
  const a = new MicAnalyzer({ ...defaultAnalyzerConfig(sampleRate), spectrumEvery: 0, ...analyzer });
  const t = new MonoTracker(tracker);
  const frames: AnalysisFrame[] = [];
  const events: NoteEvent[] = [];
  const q = 128;
  for (let i = 0; i + q <= audio.length; i += q) {
    const out = a.push(audio.subarray(i, i + q), startTime + (i + q - 1) / sampleRate);
    for (const f of out) {
      frames.push(f);
      events.push(...t.push(f));
    }
  }
  return { events, frames };
}
