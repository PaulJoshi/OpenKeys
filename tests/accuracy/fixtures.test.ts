import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { renderSalamander, ffmpegAvailable } from '../audio/salamander';
import { synthPiano, SR } from '../audio/synth';
import { writeWav } from '../audio/wav';

/** Generates the WAV used by the Playwright fake-microphone test (e2e/mic.spec.ts). */
describe('fixture generation', () => {
  it('writes the e2e mic WAV', () => {
    // C4 D4 E4 F4 G4, then E4 repeated 4x quickly; then 1 s silence (Chrome loops the file).
    const seq = [60, 62, 64, 65, 67].map((m, i) => ({ midi: m, start: 0.5 + i * 0.45, dur: 0.35, velocity: 0.7 }));
    for (let i = 0; i < 4; i++) seq.push({ midi: 64, start: 3 + i * 0.15, dur: 0.1, velocity: 0.7 });
    const total = 4.6;
    const audio = (ffmpegAvailable() && renderSalamander(seq, total)) || synthPiano(seq, total);
    writeWav(join(process.cwd(), 'tests', 'fixtures', 'generated', 'mic-melody.wav'), audio, SR);
    expect(audio.length).toBeGreaterThan(0);
  });
});
