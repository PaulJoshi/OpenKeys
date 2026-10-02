import type { Score } from '../types';
import type { TakeResult } from '../judge/types';
import { getDb, type MeasureStatRecord, type ReviewRecord, type SessionRecord } from './db';
import { DAY_MS, SM2_INITIAL, localDateKey, qualityFromAccuracy, sm2 } from './sm2';

/** EMA weight of the newest take in per-measure mastery. */
const MASTERY_ALPHA = 0.35;

/** Saves a finished take: session log, practice time, per-measure mastery, review items, lesson stars. */
export async function recordTake(score: Score, take: TakeResult, opts: { lessonId?: string | null; minStarsToUnlock?: number } = {}): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const session: SessionRecord = {
    scoreId: score.id,
    scoreTitle: score.title,
    startedAt: take.startedAt || now,
    durationSec: take.durationSec,
    mode: take.mode,
    hands: take.hands,
    tempoFactor: take.tempoFactor,
    source: take.source,
    accuracy: take.accuracy,
    timing: take.timing,
    dynamics: take.dynamics,
    stars: take.stars,
    notesPlayed: take.notes.length,
    skills: skillContributions(score, take),
  };
  await db.transaction('rw', [db.sessions, db.daily, db.measureStats, db.reviews, db.lessons, db.scores], async () => {
    await db.sessions.add(session);
    await addPracticeTime(take.durationSec, now);
    // Per-measure mastery (EMA), scaled by tempo: practising at 50% counts less towards mastery.
    const tempoWeight = Math.min(1, 0.4 + 0.6 * Math.min(1, take.tempoFactor));
    for (const [m, acc] of take.measureAccuracy) {
      const key: [string, number] = [score.id, m];
      const prev = await db.measureStats.get(key);
      const value = acc * tempoWeight;
      const rec: MeasureStatRecord = prev
        ? { ...prev, attempts: prev.attempts + 1, mastery: prev.mastery * (1 - MASTERY_ALPHA) + value * MASTERY_ALPHA, lastAccuracy: acc, updatedAt: now }
        : { scoreId: score.id, measure: m, attempts: 1, mastery: value * 0.6, lastAccuracy: acc, updatedAt: now };
      await db.measureStats.put(rec);
    }
    // Trouble spots become review items; practising an existing item grades it.
    for (const t of take.troubleSpots) {
      const id = `${score.id}:${t.startMeasure}-${t.endMeasure}`;
      const prev = await db.reviews.get(id);
      if (!prev) {
        const rec: ReviewRecord = {
          id,
          scoreId: score.id,
          scoreTitle: score.title,
          startMeasure: t.startMeasure,
          endMeasure: t.endMeasure,
          tempoFactor: t.suggestedTempo,
          ...SM2_INITIAL,
          due: now + DAY_MS * 0.5,
          createdAt: now,
        };
        await db.reviews.put(rec);
      }
    }
    if (opts.lessonId) {
      const prev = await db.lessons.get(opts.lessonId);
      if (!prev || prev.stars < take.stars) await db.lessons.put({ lessonId: opts.lessonId, stars: take.stars, completedAt: take.stars >= (opts.minStarsToUnlock ?? 2) ? now : prev?.completedAt });
    }
    const stored = await db.scores.get(score.id);
    if (stored) await db.scores.update(score.id, { lastPlayedAt: now });
  });
  await kvLastPiece(score.id);
}

async function kvLastPiece(scoreId: string) {
  await getDb().kv.put({ key: 'lastPiece', value: scoreId });
}

/** Grades a review item after a loop drill on its measures. */
export async function gradeReview(id: string, accuracy: number): Promise<void> {
  const db = getDb();
  const r = await db.reviews.get(id);
  if (!r) return;
  const next = sm2(r, qualityFromAccuracy(accuracy));
  // Retire items that are solid: three good repetitions with a long interval.
  if (next.repetitions >= 4 && next.interval >= 14) {
    await db.reviews.delete(id);
    return;
  }
  await db.reviews.put({ ...r, ...next, due: Date.now() + next.interval * DAY_MS });
}

export async function addPracticeTime(seconds: number, now = Date.now()): Promise<void> {
  const db = getDb();
  const date = localDateKey(now);
  const prev = await db.daily.get(date);
  await db.daily.put({ date, seconds: (prev?.seconds ?? 0) + Math.max(0, Math.min(seconds, 4 * 3600)) });
}

export async function dueReviews(now = Date.now()): Promise<ReviewRecord[]> {
  return getDb().reviews.where('due').belowOrEqual(now).sortBy('due');
}

export async function measureMastery(scoreId: string): Promise<Map<number, number>> {
  const rows = await getDb().measureStats.where('scoreId').equals(scoreId).toArray();
  return new Map(rows.map((r) => [r.measure, r.mastery]));
}

/** Mean mastery over a piece's measures (unplayed measures count 0). */
export function pieceMastery(mastery: Map<number, number>, measureCount: number): number {
  if (!measureCount) return 0;
  let s = 0;
  for (let i = 0; i < measureCount; i++) s += mastery.get(i) ?? 0;
  return s / measureCount;
}

function skillContributions(score: Score, take: TakeResult): SessionRecord['skills'] {
  const twoHands = take.hands === 'both' && score.notes.some((n) => n.hand === 'L') && score.notes.some((n) => n.hand === 'R');
  const skills: NonNullable<SessionRecord['skills']> = { accuracy: take.accuracy };
  if (take.mode !== 'wait') skills.rhythm = take.timing;
  if (take.mode === 'wait' || take.mode === 'playalong') skills.reading = take.accuracy;
  if (take.dynamics !== null) skills.dynamics = take.dynamics;
  if (twoHands) skills.independence = (take.accuracy + take.timing) / 2;
  return skills;
}

/** Full JSON backup of all progress (and imported scores). */
export async function exportBackup(): Promise<string> {
  const db = getDb();
  const data = {
    format: 'openkeys-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    scores: await db.scores.where('builtIn').equals(0).toArray(),
    kv: await db.kv.toArray(),
    calibration: await db.calibration.toArray(),
    sessions: await db.sessions.toArray(),
    measureStats: await db.measureStats.toArray(),
    reviews: await db.reviews.toArray(),
    lessons: await db.lessons.toArray(),
    daily: await db.daily.toArray(),
  };
  return JSON.stringify(data);
}

export async function importBackup(json: string): Promise<{ sessions: number; scores: number }> {
  const data = JSON.parse(json) as Record<string, unknown>;
  if (data.format !== 'openkeys-backup') throw new Error('Not an OpenKeys backup file.');
  const db = getDb();
  const arr = <T,>(k: string) => (Array.isArray(data[k]) ? (data[k] as T[]) : []);
  await db.transaction('rw', [db.scores, db.kv, db.calibration, db.sessions, db.measureStats, db.reviews, db.lessons, db.daily], async () => {
    await db.scores.bulkPut(arr('scores'));
    await db.kv.bulkPut(arr('kv'));
    await db.calibration.bulkPut(arr('calibration'));
    // Sessions have auto-increment ids: drop ids to avoid clobbering.
    await db.sessions.bulkAdd(arr<SessionRecord>('sessions').map(({ id: _id, ...rest }) => rest as SessionRecord));
    await db.measureStats.bulkPut(arr('measureStats'));
    await db.reviews.bulkPut(arr('reviews'));
    await db.lessons.bulkPut(arr('lessons'));
    await db.daily.bulkPut(arr('daily'));
  });
  return { sessions: arr('sessions').length, scores: arr('scores').length };
}
