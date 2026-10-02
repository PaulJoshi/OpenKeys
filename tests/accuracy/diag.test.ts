import { it } from 'vitest';
import { monoTestSet, transcribeMono } from '../audio/pipeline';
import { renderSalamander, ffmpegAvailable } from '../audio/salamander';
import { synthPiano, addNoise, addReverb, laptopSpeaker, gain } from '../audio/synth';
import { evaluate } from '../audio/metrics';

const out = (s: string) => process.stdout.write(s + '\n');

it.runIf(!!process.env.DIAG)('diagnostic', () => {
  const sets = monoTestSet();
  for (const [name, render] of [
    ['synth', (n: Parameters<typeof synthPiano>[0], t: number) => synthPiano(n, t)],
    ['salamander-line', (n: Parameters<typeof synthPiano>[0], t: number) => (ffmpegAvailable() ? renderSalamander(n, t) : null)],
    ['salamander-laptop', (n: Parameters<typeof synthPiano>[0], t: number) => {
      const a = ffmpegAvailable() ? renderSalamander(n, t) : null;
      return a ? gain(addNoise(addReverb(laptopSpeaker(a), 0.5, 0.25), 32), -14) : null;
    }],
  ] as const) {
    sets.forEach((s, i) => {
      const audio = render(s.notes, s.total);
      if (!audio) return;
      const { events } = transcribeMono(audio);
      const m = evaluate(s.notes, events);
      if (process.env.FP && i === Number(process.env.FP) && (!process.env.COND || process.env.COND === name)) {
        const on = events.filter((e) => e.kind === 'noteOn');
        for (const e of on) {
          const hit = s.notes.find((r) => r.midi === e.midi && Math.abs(r.start - e.time) < 0.05);
          if (!hit) out(`  FP ${e.midi} @${e.time.toFixed(3)} conf=${e.confidence}`);
        }
        for (const r of s.notes) {
          const near = on.filter((e) => Math.abs(r.start - e.time) < 0.08).map((e) => `${e.midi}@${((e.time - r.start) * 1000).toFixed(0)}ms`);
          if (!on.some((e) => e.midi === r.midi && Math.abs(r.start - e.time) < 0.05)) out(`  FN ${r.midi} @${r.start.toFixed(3)} near: ${near.join(' ')}`);
          else if (process.env.ERR) out(`  ok ${r.midi} @${r.start.toFixed(3)} ${near.join(' ')}`);
        }
      }
      out(`${name} set${i}: F1=${m.f1.toFixed(3)} P=${m.precision.toFixed(3)} R=${m.recall.toFixed(3)} oct=${m.octaveErrors} fw=${m.falseWrongRate.toFixed(3)} onset med=${m.onsetErrorMedianMs.toFixed(1)} p95=${m.onsetErrorP95Ms.toFixed(1)} det=${m.detected}/${m.reference}`);
    });
  }
});
