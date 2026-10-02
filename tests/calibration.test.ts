import { describe, expect, it } from 'vitest';
import { computeDynamics, computeLatency, computeLoopback, computeNoiseFloor, computeRange, computeTuning, velocityCurve } from '../src/core/calibration/compute';

describe('calibration', () => {
  it('noise floor flags noisy rooms', () => {
    expect(computeNoiseFloor(Array(100).fill(-70)).tooNoisy).toBe(false);
    expect(computeNoiseFloor(Array(100).fill(-40)).tooNoisy).toBe(true);
    expect(computeNoiseFloor([...Array(90).fill(-70), ...Array(10).fill(-30)]).unsteady).toBe(true);
  });

  it('latency: median offset, outliers discarded', () => {
    const clicks = Array.from({ length: 8 }, (_, i) => 1 + i * 0.667);
    const taps = clicks.map((c, i) => c + 0.06 + (i === 3 ? 0.2 : 0) + (i % 2 ? 0.005 : -0.004));
    const r = computeLatency(clicks, taps, 0.667);
    expect(r.offsetSec).toBeCloseTo(0.06, 2);
    expect(r.discarded).toBe(1);
    expect(r.ok).toBe(true);
    expect(computeLatency(clicks, clicks.map((c) => c + 0.15), 0.667).tooHigh).toBe(true);
  });

  it('tuning detects cents and transpose', () => {
    const r = computeTuning(Array(30).fill(69.12));
    expect(r.cents).toBe(12);
    expect(r.semitones).toBe(0);
    const t = computeTuning(Array(30).fill(71.03));
    expect(t.semitones).toBe(2);
    expect(t.cents).toBe(3);
  });

  it('range detects a 61-key keyboard with octave shift', () => {
    expect(computeRange(36, 96)).toMatchObject({ low: 36, high: 96, octaveOffset: 0, keys: 61 });
    expect(computeRange(48, 108)).toMatchObject({ low: 36, high: 96, octaveOffset: 1 });
    expect(computeRange(40, 70)).toMatchObject({ low: 40, high: 70, octaveOffset: 0 });
  });

  it('dynamics and velocity curve', () => {
    const d = computeDynamics([0.2, 0.25, 0.22], [0.45, 0.5, 0.48], [0.8, 0.85, 0.82], 0.08);
    expect(d.ok).toBe(true);
    const curve = velocityCurve(d);
    expect(curve(0.22)).toBeCloseTo(0.3);
    expect(curve(0.48)).toBeCloseTo(0.6);
    expect(curve(0.82)).toBeCloseTo(0.9);
    expect(curve(1)).toBe(1);
  });

  it('loopback total latency', () => {
    const clicks = [1, 2, 3, 4, 5];
    expect(computeLoopback(clicks, clicks.map((c) => c + 0.085))!.totalSec).toBeCloseTo(0.085);
  });
});
