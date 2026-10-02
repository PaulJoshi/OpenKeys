import { it } from 'vitest';
import { analyze } from '../audio/pipeline';
import { synthPiano, SR } from '../audio/synth';

it.runIf(!!process.env.DIAG)('perf', () => {
  const notes = Array.from({ length: 20 }, (_, i) => ({ midi: 48 + i, start: i * 0.5, dur: 0.4 }));
  const audio = synthPiano(notes, 10.5);
  for (const spectrumEvery of [0, 2]) {
    const t0 = performance.now();
    analyze(audio, { spectrumEvery });
    const ms = performance.now() - t0;
    process.stdout.write(`spectrumEvery=${spectrumEvery}: ${(ms / 10.5 / 10).toFixed(2)}% of real time\n`);
  }
  const t1 = performance.now();
  synthPiano(notes, 10.5);
  process.stdout.write(`synth ${(performance.now() - t1).toFixed(0)} ms; SR ${SR}\n`);
});
