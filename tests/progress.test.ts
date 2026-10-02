import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { sm2, SM2_INITIAL, qualityFromAccuracy, streakDays, localDateKey, DAY_MS } from '../src/core/progress/sm2';
import { OpenKeysDB, setDb, getDb } from '../src/core/progress/db';
import { recordTake, gradeReview, dueReviews, measureMastery, exportBackup, importBackup } from '../src/core/progress/progress';
import { summarizeTake } from '../src/core/judge/scoring';
import { odeRH } from './synth';

describe('SM-2', () => {
  it('grows intervals on success and resets on failure', () => {
    let s = SM2_INITIAL;
    s = sm2(s, 5);
    expect(s.interval).toBe(1);
    s = sm2(s, 5);
    expect(s.interval).toBe(3);
    s = sm2(s, 4);
    expect(s.interval).toBeGreaterThan(6);
    s = sm2(s, 1);
    expect(s.interval).toBe(1);
    expect(s.repetitions).toBe(0);
    expect(qualityFromAccuracy(0.99)).toBe(5);
    expect(qualityFromAccuracy(0.4)).toBe(0);
  });
  it('counts streak days', () => {
    const now = Date.now();
    const days = [0, 1, 2, 4].map((d) => ({ date: localDateKey(now - d * DAY_MS), seconds: 300 }));
    expect(streakDays(days, now)).toBe(3);
  });
});

describe('progress store', () => {
  it('records takes, mastery, reviews and round-trips a backup', async () => {
    setDb(new OpenKeysDB('test-' + Math.random()));
    const score = odeRH();
    const results = score.notes.map((n) => ({ noteId: n.id, midi: n.midi, hand: n.hand, measure: n.measure, startBeat: n.startBeat, verdict: n.measure === 2 ? ('wrong' as const) : ('perfect' as const), offsetMs: 0, confidence: 1 }));
    const take = summarizeTake(score, results, [], { scoreId: score.id, mode: 'playalong', hands: 'R', tempoFactor: 1, source: 'virtual', startedAt: Date.now(), durationSec: 120, timingJudged: true });
    expect(take.troubleSpots.length).toBeGreaterThan(0);
    await recordTake(score, take, { lessonId: 'L1:piece' });
    const m = await measureMastery(score.id);
    expect(m.get(0)!).toBeGreaterThan(m.get(2) ?? 0);
    const reviews = await getDb().reviews.toArray();
    expect(reviews.length).toBe(take.troubleSpots.length);
    expect((await dueReviews(Date.now() + DAY_MS)).length).toBe(reviews.length);
    await gradeReview(reviews[0].id, 1);
    expect((await getDb().reviews.get(reviews[0].id))!.repetitions).toBe(1);
    expect((await getDb().lessons.get('L1:piece'))!.stars).toBe(take.stars);
    const backup = await exportBackup();
    setDb(new OpenKeysDB('test-' + Math.random()));
    const r = await importBackup(backup);
    expect(r.sessions).toBe(1);
    expect(await getDb().measureStats.count()).toBeGreaterThan(0);
  });
});
