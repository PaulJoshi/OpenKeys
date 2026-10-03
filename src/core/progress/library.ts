import type { Score } from '../types';
import { BUILT_IN_SONGS, SONG_LICENSE, type BuiltInSong } from '../content/songs';
import { parseAbc } from '../score/abc';
import { parseMusicXml } from '../score/musicxml';
import { estimateDifficulty } from '../score/difficulty';
import { getDb, type StoredScore } from './db';

export type Variant = 'R' | 'easy' | 'full';

export const VARIANT_LABEL: Record<Variant, string> = { R: 'Right hand', easy: 'Easy (both hands)', full: 'Full' };

const cache = new Map<string, Score>();

export function builtInId(songId: string, variant: Variant): string {
  return `builtin-${songId}-${variant}`;
}

export function builtInScore(song: BuiltInSong, variant: Variant): Score {
  const id = builtInId(song.id, variant);
  const hit = cache.get(id);
  if (hit) return hit;
  const xml = variant === 'full' ? song.fullMusicXml : undefined;
  const abc = variant === 'full' && song.full ? song.full : song.easy;
  const base = xml ? parseMusicXml(xml) : parseAbc(abc, { id });
  const license = xml ? song.fullLicense ?? SONG_LICENSE : SONG_LICENSE;
  let score: Score = { ...base, id, title: song.title, composer: song.composer, license, tags: ['built-in', ...song.tags], pieceId: song.id, variant: VARIANT_LABEL[variant] };
  if (variant === 'R') {
    const notes = score.notes.filter((n) => n.hand === 'R');
    score = { ...score, notes, abc: undefined };
  }
  cache.set(id, score);
  return score;
}

export function builtInVariants(song: BuiltInSong): Variant[] {
  return song.full || song.fullMusicXml ? ['R', 'easy', 'full'] : ['R', 'easy'];
}

export interface LibraryEntry {
  id: string;
  title: string;
  composer?: string;
  builtIn: boolean;
  difficulty: number;
  pieceId?: string;
  variants?: { variant: Variant; id: string; difficulty: number }[];
  blurb?: string;
  addedAt?: number;
  lastPlayedAt?: number;
  measures: number;
  durationSec?: number;
}

const diffCache = new Map<string, number>();

function difficultyOf(score: Score): number {
  const d = diffCache.get(score.id);
  if (d !== undefined) return d;
  const v = estimateDifficulty(score).level;
  diffCache.set(score.id, v);
  return v;
}

export function builtInEntries(): LibraryEntry[] {
  return BUILT_IN_SONGS.map((song) => {
    const variants = builtInVariants(song).map((variant) => {
      const s = builtInScore(song, variant);
      return { variant, id: s.id, difficulty: difficultyOf(s) };
    });
    const easy = builtInScore(song, 'easy');
    return {
      id: builtInId(song.id, 'easy'),
      title: song.title,
      composer: song.composer,
      builtIn: true,
      difficulty: variants.find((v) => v.variant === 'easy')!.difficulty,
      pieceId: song.id,
      variants,
      blurb: song.blurb,
      measures: easy.measures.length,
    };
  });
}

export async function importedEntries(): Promise<LibraryEntry[]> {
  const rows = await getDb().scores.where('builtIn').equals(0).toArray();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    composer: r.composer,
    builtIn: false,
    difficulty: r.difficulty,
    addedAt: r.addedAt,
    lastPlayedAt: r.lastPlayedAt,
    measures: r.score.measures.length,
  }));
}

export async function saveImportedScore(score: Score): Promise<void> {
  const rec: StoredScore = {
    id: score.id,
    title: score.title,
    composer: score.composer,
    builtIn: 0,
    addedAt: Date.now(),
    difficulty: estimateDifficulty(score).level,
    score,
  };
  const prev = await getDb().scores.get(score.id);
  if (prev) rec.addedAt = prev.addedAt;
  await getDb().scores.put(rec);
}

export async function deleteImportedScore(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.scores, db.measureStats, db.reviews], async () => {
    await db.scores.delete(id);
    await db.measureStats.where('scoreId').equals(id).delete();
    await db.reviews.where('scoreId').equals(id).delete();
  });
}

/** Any score by id: built-in (parsed on demand) or imported. */
export async function loadScore(id: string): Promise<Score | null> {
  const m = /^builtin-(.+)-(R|easy|full)$/.exec(id);
  if (m) {
    const song = BUILT_IN_SONGS.find((s) => s.id === m[1]);
    return song ? builtInScore(song, m[2] as Variant) : null;
  }
  const row = await getDb().scores.get(id);
  return row?.score ?? null;
}
