/**
 * Simple SM-2 style scheduling for review items (trouble spots).
 * quality: 0-5 (5 = perfect recall / clean pass, < 3 = failed).
 */
export interface Sm2State {
  easiness: number;
  interval: number; // days
  repetitions: number;
}

export const SM2_INITIAL: Sm2State = { easiness: 2.5, interval: 0, repetitions: 0 };

export function sm2(state: Sm2State, quality: number): Sm2State {
  const q = Math.max(0, Math.min(5, quality));
  let { easiness, interval, repetitions } = state;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(interval * easiness);
  }
  easiness = Math.max(1.3, easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { easiness, interval, repetitions };
}

/** Maps a pass accuracy (0-1) to an SM-2 quality grade. */
export function qualityFromAccuracy(acc: number): number {
  if (acc >= 0.98) return 5;
  if (acc >= 0.93) return 4;
  if (acc >= 0.85) return 3;
  if (acc >= 0.7) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

export const DAY_MS = 86400000;

export function localDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Consecutive days (ending today or yesterday) with practice meeting `minSeconds`. */
export function streakDays(days: { date: string; seconds: number }[], today: number, minSeconds = 60): number {
  const set = new Map(days.map((d) => [d.date, d.seconds]));
  let streak = 0;
  let t = today;
  // Today not yet practised doesn't break the streak.
  if ((set.get(localDateKey(t)) ?? 0) < minSeconds) t -= DAY_MS;
  while ((set.get(localDateKey(t)) ?? 0) >= minSeconds) {
    streak++;
    t -= DAY_MS;
  }
  return streak;
}
