import { getDb, type SessionRecord } from './db';
import { DAY_MS, localDateKey, streakDays } from './sm2';

export interface ProgressOverview {
  days: { date: string; minutes: number }[];
  todayMinutes: number;
  streak: number;
  sessions: SessionRecord[];
  skills: { key: 'reading' | 'rhythm' | 'accuracy' | 'dynamics' | 'independence'; label: string; value: number | null; samples: number }[];
  totalMinutes: number;
}

const SKILL_LABELS = { reading: 'Reading', rhythm: 'Rhythm', accuracy: 'Accuracy', dynamics: 'Dynamics', independence: 'Hand independence' } as const;

export async function progressOverview(dayCount = 14, now = Date.now()): Promise<ProgressOverview> {
  const db = getDb();
  const daily = await db.daily.toArray();
  const map = new Map(daily.map((d) => [d.date, d.seconds]));
  const days: { date: string; minutes: number }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const key = localDateKey(now - i * DAY_MS);
    days.push({ date: key, minutes: Math.round(((map.get(key) ?? 0) / 60) * 10) / 10 });
  }
  const sessions = await db.sessions.orderBy('startedAt').reverse().limit(200).toArray();
  // Skills: mean over the last 30 days, recent sessions weighted more.
  const recent = sessions.filter((s) => s.startedAt > now - 30 * DAY_MS);
  const skills = (Object.keys(SKILL_LABELS) as (keyof typeof SKILL_LABELS)[]).map((key) => {
    let num = 0;
    let den = 0;
    let n = 0;
    recent.forEach((s, i) => {
      const v = s.skills?.[key];
      if (v === undefined || v === null) return;
      const w = 1 / (1 + i * 0.1);
      num += v * w;
      den += w;
      n++;
    });
    return { key, label: SKILL_LABELS[key], value: den ? num / den : null, samples: n };
  });
  return {
    days,
    todayMinutes: days[days.length - 1].minutes,
    streak: streakDays(daily, now),
    sessions,
    skills,
    totalMinutes: Math.round(daily.reduce((s, d) => s + d.seconds, 0) / 60),
  };
}
