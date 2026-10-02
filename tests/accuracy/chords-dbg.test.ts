import { it } from 'vitest';
import { parseAbc } from '../../src/core/score/abc';
import { renderSalamander } from '../audio/salamander';
import { perform } from '../audio/micjudge';
import { MicAnalyzer, defaultAnalyzerConfig } from '../../src/core/input/mic/analyzer';
import { MonoTracker } from '../../src/core/input/mic/mono';
import { ScoreInformedDetector } from '../../src/core/input/mic/scoreinformed';
import { DEFAULT_DETECTOR_PARAMS as P } from '../../src/core/input/mic/params';
import { TempoMap } from '../../src/core/score/tempo';
import { SR, quanta } from '../audio/synth';
import { midiToName } from '../../src/core/music';

const out = (s: string) => process.stdout.write(s + '\n');
const CHORDS = `X:1
T:Chord drill
M:4/4
L:1/2
Q:1/4=80
K:C
V:1
[CEG] [CFA] | [B,DG] [CEG] |]
V:2 clef=bass
C, F, | G,, C, |]
`;

it.runIf(!!process.env.DIAG)('chords dbg', () => {
  const score = parseAbc(CHORDS);
  const t0 = 0.5;
  const perf = perform(score, t0);
  const audio = renderSalamander(perf, 7)!;
  const tm = new TempoMap(score.tempoMap);
  const analyzer = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 2 });
  const mono = new MonoTracker({});
  const exp = score.notes.map((n) => ({ id: n.id, midi: n.midi, time: t0 + tm.beatToSec(n.startBeat) }));
  const det = new ScoreInformedDetector({ a4: 440, octaveOffset: 0, latency: 0, partials: P.partials, inharmonicity: P.inharmonicity, partialToleranceCents: P.partialToleranceCents, presenceThreshold: P.presenceThreshold, wrongNoteThreshold: P.wrongNoteThreshold, expected: (now) => exp.filter((e) => Math.abs(e.time - now) < 0.35) });
  for (const q of quanta(audio)) {
    for (const fr of analyzer.push(q.block, q.endTime)) {
      if (fr.onset) out(`ONSET ${fr.onsetTime.toFixed(3)} s=${fr.onsetStrength.toFixed(2)}`);
      for (const e of mono.push(fr)) det.onMonoEvent(e);
      const { evidence, wrong } = det.push(fr);
      for (const ev of evidence) out(`  EV ${midiToName(ev.midi)} p=${ev.presence.toFixed(2)} fresh=${det.debug.get(ev.scoreNoteId)?.fresh} trap=${det.debug.get(ev.scoreNoteId)?.octaveTrap.toFixed(2)} t=${ev.onsetTime?.toFixed(3)}`);
      for (const w of wrong) out(`  WRONG ${midiToName(w.midi)} c=${w.confidence.toFixed(2)} t=${w.time.toFixed(3)}`);
    }
  }
  for (const e of exp) { const d = det.debug.get(e.id); out(`expected ${midiToName(e.midi)} @${e.time.toFixed(3)} -> ${d ? `p=${d.presence.toFixed(2)} fresh=${d.fresh}` : 'no evidence'}`); }
});

it.runIf(!!process.env.DIAG)('g4 partials', () => {
  const score = parseAbc(CHORDS);
  const perf = perform(score, 0.5);
  const audio = renderSalamander(perf, 2)!;
  const analyzer = new MicAnalyzer({ ...defaultAnalyzerConfig(SR), spectrumEvery: 2 });
  const det = new ScoreInformedDetector({ a4: 440, octaveOffset: 0, latency: 0, partials: P.partials, inharmonicity: P.inharmonicity, partialToleranceCents: P.partialToleranceCents, presenceThreshold: P.presenceThreshold, wrongNoteThreshold: P.wrongNoteThreshold, expected: () => [] });
  for (const q of quanta(audio)) for (const fr of analyzer.push(q.block, q.endTime)) det.push(fr);
  const f = det.frameAt(0.56)!;
  for (const m of [67, 79, 64, 60, 48]) out(`${midiToName(m)} levels: ${det.partialLevels(m, f).map((v) => (v === null ? '  -  ' : v.toFixed(0).padStart(5))).join(' ')} | max ${f.max.toFixed(0)}`);
  const bins = (hz: number) => (69 + 12 * Math.log2(hz / 440) - 20) * 3;
  for (const hz of [392, 784, 1176, 1568]) { const b = Math.round(bins(hz)); out(`${hz}Hz bin ${b}: ${Array.from(f.db.slice(b - 3, b + 4)).map((v) => v.toFixed(0)).join(' ')}`); }
});
