import { it } from 'vitest';
import { analyze, monoTestSet } from '../audio/pipeline';
import { renderSalamander } from '../audio/salamander';
import { addNoise, addReverb, laptopSpeaker, gain } from '../audio/synth';

it.runIf(!!process.env.DIAG)('dbg', () => {
  const s = monoTestSet()[Number(process.env.SET ?? 2)];
  const a = renderSalamander(s.notes, s.total)!;
  const audio = process.env.LINE ? a : gain(addNoise(addReverb(laptopSpeaker(a), 0.5, 0.25), 32), -14);
  const frames = analyze(audio);
  const from = Number(process.env.FROM ?? 2), to = Number(process.env.TO ?? 4);
  for (const n of s.notes) if (n.start >= from && n.start <= to) process.stdout.write(`REF ${n.midi} @${n.start.toFixed(3)} v=${n.velocity?.toFixed(2)}\n`);
  for (const f of frames) {
    if (f.time < from || f.time > to) continue;
    process.stdout.write(`${f.time.toFixed(3)} rms=${f.rmsDb.toFixed(1)} fl=${f.floorDb.toFixed(1)} odf=${f.odf.toFixed(3)} thr=${f.threshold.toFixed(3)} ${f.onset ? 'ONSET ' + f.onsetTime.toFixed(3) : ''} f0=${f.f0.toFixed(1)} c=${f.clarity.toFixed(2)}\n`);
  }
});
