import { describe, expect, it } from 'vitest';
import { parseMidiMessage } from '../src/core/input/midi/parse';
import { ClockMapper } from '../src/core/clock';

describe('MIDI parsing', () => {
  it('parses note on/off, velocity-0 note on, sustain, and ignores realtime', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: 'noteOn', channel: 1, note: 60, velocity: 100 });
    expect(parseMidiMessage([0x93, 60, 0])).toEqual({ type: 'noteOff', channel: 4, note: 60, velocity: 0 });
    expect(parseMidiMessage([0x80, 62, 40])).toEqual({ type: 'noteOff', channel: 1, note: 62, velocity: 40 });
    expect(parseMidiMessage([0xb0, 64, 127])).toEqual({ type: 'cc', channel: 1, controller: 64, value: 127 });
    expect(parseMidiMessage([0xf8])).toBeNull();
    expect(parseMidiMessage([0xfe])).toBeNull();
    expect(parseMidiMessage([0xf0, 0x7e, 0x7f, 0xf7])).toBeNull();
  });
});

describe('clock mapping', () => {
  it('maps performance.now() to the AudioContext clock robustly', () => {
    const m = new ClockMapper(5);
    // context = perf/1000 - 2.0 s, with one outlier sample (main thread stall)
    for (const [ctx, perf] of [
      [1, 3000],
      [2, 4000],
      [3.2, 5000],
      [4, 6000],
      [5, 7000],
    ]) m.addSample(ctx, perf);
    expect(m.perfToAudio(8000)).toBeCloseTo(6, 3);
    expect(m.audioToPerf(6)).toBeCloseTo(8000, 0);
  });
});
