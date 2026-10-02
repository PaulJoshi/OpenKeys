import { describe, expect, it } from 'vitest';
import { MicAnalyzer, defaultAnalyzerConfig, type AnalyzerConfig } from '../src/core/input/mic/analyzer';

const SR = 48000;

/** Quiet room noise for 2 s, then a soft 440 Hz tone about 15 dB above it. */
function quietTone(): Float32Array {
  const x = new Float32Array(SR * 3);
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < x.length; i++) {
    x[i] = 0.001 * rand();
    if (i >= SR * 2) x[i] += 0.0056 * Math.sin((2 * Math.PI * 440 * i) / SR);
  }
  return x;
}

function onsets(cfg: Partial<AnalyzerConfig>, tune?: Partial<AnalyzerConfig>): number[] {
  const a = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 0, ...cfg });
  if (tune) a.tune(tune);
  const x = quietTone();
  const out: number[] = [];
  for (let i = 0; i + 128 <= x.length; i += 128) {
    for (const f of a.push(x.subarray(i, i + 128), (i + 128) / SR)) if (f.onset) out.push(f.onsetTime);
  }
  return out;
}

describe('noise gate', () => {
  it('lets a soft note through at the default gate', () => {
    const t = onsets({});
    expect(t.length).toBe(1);
    expect(t[0]).toBeCloseTo(2, 1);
  });

  it('drops the same note when the gate is raised, from config or live tuning', () => {
    expect(onsets({ onsetMinSnrDb: 22 })).toEqual([]);
    expect(onsets({}, { onsetMinSnrDb: 22 })).toEqual([]);
  });
});
