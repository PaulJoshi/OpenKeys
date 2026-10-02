import { it } from 'vitest';
import { parseAbc } from '../../src/core/score/abc';
import { BUILT_IN_SONGS } from '../../src/core/content/songs';
import { renderSalamander, ffmpegAvailable } from '../audio/salamander';
import { addNoise, addReverb, laptopSpeaker, gain } from '../audio/synth';
import { perform, judgeMicTake } from '../audio/micjudge';

const out = (s: string) => process.stdout.write(s + '\n');

const CHORDS = `X:1
T:Chord drill
M:4/4
L:1/2
Q:1/4=80
K:C
V:1
[CEG] [CFA] | [B,DG] [CEG] | [EGc] [FAc] | [DGB] [EGc] | [CEGc] [CFAc] | [B,DFG] [CEGc] |]
V:2 clef=bass
C, F, | G,, C, | C, F, | G,, C, | C, F, | G,, C, |]
`;

it.runIf(!!process.env.DIAG)('chords diagnostic', () => {
  if (!ffmpegAvailable()) return;
  const pieces = [
    ['chord-drill', parseAbc(CHORDS)],
    ['ode-easy', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'ode')!.easy)],
    ['twinkle-full', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'twinkle')!.full!)],
    ['minuet-easy', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'minuetG')!.easy)],
  ] as const;
  for (const [name, score] of pieces.filter(([n]) => !process.env.PIECE || n === process.env.PIECE)) {
    for (const cond of ['line', 'laptop'].filter((c) => !process.env.COND || c === process.env.COND)) {
      for (const variant of ['clean', 'mistakes'].filter((v) => !process.env.VAR || v === process.env.VAR)) {
        const t0 = 0.5;
        const wrong = new Map<string, number>();
        if (variant === 'mistakes') score.notes.forEach((n, i) => i % 7 === 3 && wrong.set(n.id, n.midi + (i % 2 ? 1 : -2)));
        const perf = perform(score, t0, { wrong });
        const end = Math.max(...perf.map((p) => p.start + p.dur)) + 1;
        let audio = renderSalamander(perf, end)!;
        if (cond === 'laptop') audio = gain(addNoise(addReverb(laptopSpeaker(audio), 0.5, 0.25), 35), -12);
        const r = judgeMicTake(score, audio, perf, t0);
        out(
          `${name} ${cond} ${variant}: hits ${r.hits}/${r.correctPlayed} (${((r.hits / r.correctPlayed) * 100).toFixed(1)}%) falseWrong ${r.falseWrong} (${((r.falseWrong / r.correctPlayed) * 100).toFixed(1)}%) uncertain ${r.uncertain} caught ${r.mistakesCaught}/${r.mistakes} acc=${r.take.accuracy.toFixed(3)} extras=${r.take.extraCount}`,
        );
      }
    }
  }
});

it.runIf(!!process.env.DIAG)('with instrument profile', async () => {
  const { profileKeys, measureKeyTemplate, buildProfile } = await import('../../src/core/calibration/profile');
  const { MicAnalyzer, defaultAnalyzerConfig } = await import('../../src/core/input/mic/analyzer');
  const { quanta, SR } = await import('../audio/synth');
  const { DEFAULT_DETECTOR_PARAMS: P } = await import('../../src/core/input/mic/params');
  const chain = (a: Float32Array) => gain(addNoise(addReverb(laptopSpeaker(a), 0.5, 0.25), 35), -12);
  // Simulated calibration: one key every minor third at medium force through the laptop chain.
  const keys = profileKeys(36, 96);
  const notes = keys.map((m, i) => ({ midi: m, start: 0.5 + i * 1.2, dur: 0.8, velocity: 0.6 }));
  const audio = chain(renderSalamander(notes, 0.5 + keys.length * 1.2 + 1)!);
  const a = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 2 });
  const spectra: { t: number; s: Float32Array }[] = [];
  for (const q of quanta(audio)) for (const f of a.push(q.block, q.endTime)) if (f.spectrum) spectra.push({ t: f.time, s: new Float32Array(f.spectrum) });
  const profile = buildProfile(
    notes.map((n) => ({ midi: n.midi, partialsDb: measureKeyTemplate(spectra.filter((x) => x.t > n.start + 0.08 && x.t < n.start + 0.4).map((x) => x.s), n.midi, P.partials, P.inharmonicity) })),
    P.partials,
  );
  (globalThis as unknown as { __profile: unknown }).__profile = profile;
  const pieces = [
    ['chord-drill', parseAbc(CHORDS)],
    ['twinkle-full', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'twinkle')!.full!)],
    ['minuet-easy', parseAbc(BUILT_IN_SONGS.find((s) => s.id === 'minuetG')!.easy)],
  ] as const;
  for (const [name, score] of pieces) {
    for (const variant of ['clean', 'mistakes']) {
      const wrong = new Map<string, number>();
      if (variant === 'mistakes') score.notes.forEach((n, i) => i % 7 === 3 && wrong.set(n.id, n.midi + (i % 2 ? 1 : -2)));
      const perf = perform(score, 0.5, { wrong });
      const end = Math.max(...perf.map((p) => p.start + p.dur)) + 1;
      const r = judgeMicTake(score, chain(renderSalamander(perf, end)!), perf, 0.5, 0, profile);
      out(`PROFILE ${name} laptop ${variant}: hits ${r.hits}/${r.correctPlayed} (${((r.hits / r.correctPlayed) * 100).toFixed(1)}%) falseWrong ${r.falseWrong} (${((r.falseWrong / r.correctPlayed) * 100).toFixed(1)}%) uncertain ${r.uncertain} caught ${r.mistakesCaught}/${r.mistakes} acc=${r.take.accuracy.toFixed(3)} extras=${r.take.extraCount}`);
    }
  }
});
