import Dexie, { type Table } from 'dexie';
import type { Score } from '../types';

export interface StoredScore {
  id: string;
  title: string;
  composer?: string;
  builtIn: 0 | 1;
  addedAt: number;
  lastPlayedAt?: number;
  difficulty: number;
  score: Score;
}

export interface KV {
  key: string;
  value: unknown;
}

/** Calibration per input-device profile ("mic:<deviceLabel>", "midi:<portName>", "virtual"). */
export interface CalibrationRecord {
  profile: string;
  updatedAt: number;
  data: unknown;
}

export interface SessionRecord {
  id?: number;
  scoreId: string;
  scoreTitle: string;
  startedAt: number;
  durationSec: number;
  mode: string;
  hands: string;
  tempoFactor: number;
  source: string;
  accuracy: number; // 0-1
  timing: number; // 0-1
  dynamics: number | null;
  stars: number;
  notesPlayed: number;
  /** Per-skill contributions for the skills view. */
  skills?: Partial<Record<'reading' | 'rhythm' | 'accuracy' | 'dynamics' | 'independence', number>>;
}

export interface MeasureStatRecord {
  scoreId: string;
  measure: number;
  attempts: number;
  /** Exponential moving average of accuracy 0-1. */
  mastery: number;
  lastAccuracy: number;
  updatedAt: number;
}

export interface ReviewRecord {
  id: string; // scoreId:startMeasure-endMeasure
  scoreId: string;
  scoreTitle: string;
  startMeasure: number;
  endMeasure: number;
  tempoFactor: number;
  easiness: number;
  interval: number; // days
  repetitions: number;
  due: number; // ms epoch
  createdAt: number;
}

export interface LessonRecord {
  lessonId: string;
  stars: number;
  completedAt?: number;
}

export interface TakeRecord {
  id?: number;
  createdAt: number;
  scoreId?: string;
  title: string;
  sampleRate: number;
  /** Mono PCM float32 audio (mic). */
  audio?: Blob;
  /** JSON: detected events, MIDI ground truth, verdicts, settings. */
  meta: unknown;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  seconds: number;
}

export class OpenKeysDB extends Dexie {
  scores!: Table<StoredScore, string>;
  kv!: Table<KV, string>;
  calibration!: Table<CalibrationRecord, string>;
  sessions!: Table<SessionRecord, number>;
  measureStats!: Table<MeasureStatRecord, [string, number]>;
  reviews!: Table<ReviewRecord, string>;
  lessons!: Table<LessonRecord, string>;
  takes!: Table<TakeRecord, number>;
  daily!: Table<DailyRecord, string>;

  constructor(name = 'openkeys') {
    super(name);
    this.version(1).stores({
      scores: 'id, title, builtIn, addedAt, lastPlayedAt, difficulty',
      kv: 'key',
      calibration: 'profile',
      sessions: '++id, scoreId, startedAt',
      measureStats: '[scoreId+measure], scoreId',
      reviews: 'id, scoreId, due',
      lessons: 'lessonId',
      takes: '++id, createdAt, scoreId',
      daily: 'date',
    });
  }
}

let db: OpenKeysDB | null = null;

export function getDb(): OpenKeysDB {
  if (!db) db = new OpenKeysDB();
  return db;
}

/** For tests. */
export function setDb(d: OpenKeysDB): void {
  db = d;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await getDb().kv.get(key);
  return row?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await getDb().kv.put({ key, value });
}
