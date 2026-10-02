import type { Score } from '../types';
import { ImportError } from './musicxml';
import { validateScore } from './validate';

export const OPENKEYS_FORMAT = 'openkeys-score';
export const OPENKEYS_SCHEMA_VERSION = 1;

export interface OpenKeysFile {
  format: typeof OPENKEYS_FORMAT;
  version: number;
  score: Score;
}

export function serializeScore(score: Score): string {
  const file: OpenKeysFile = { format: OPENKEYS_FORMAT, version: OPENKEYS_SCHEMA_VERSION, score };
  return JSON.stringify(file);
}

/** Upgrades older .openkeys.json files to the current schema. */
export function migrate(data: unknown): OpenKeysFile {
  if (!data || typeof data !== 'object') throw new ImportError('Not an OpenKeys score file.');
  const obj = data as Record<string, unknown>;
  // Version 0: a bare Score object without the envelope.
  if (!('format' in obj) && 'notes' in obj && 'measures' in obj) {
    return migrate({ format: OPENKEYS_FORMAT, version: 1, score: obj });
  }
  if (obj.format !== OPENKEYS_FORMAT) throw new ImportError('Not an OpenKeys score file.');
  const version = Number(obj.version);
  if (!(version >= 1)) throw new ImportError('Unknown OpenKeys file version.');
  if (version > OPENKEYS_SCHEMA_VERSION) throw new ImportError('This file was made by a newer version of OpenKeys.');
  const score = obj.score as Score;
  // v1 is current. Future migrations go here: if (version < 2) { ... }
  return { format: OPENKEYS_FORMAT, version: OPENKEYS_SCHEMA_VERSION, score };
}

export function parseOpenKeysJson(text: string): Score {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('The file is not valid JSON.');
  }
  const { score } = migrate(data);
  const errors = validateScore(score).filter((i) => i.level === 'error');
  if (errors.length) throw new ImportError(errors.map((e) => e.message).join(' '));
  return { ...score, source: score.source ?? 'json' };
}
