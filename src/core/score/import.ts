import type { Score } from '../types';
import { parseMusicXml, ImportError } from './musicxml';
import { unzipMxl } from './mxl';
import { parseMidiFile } from './midi';
import { parseAbc } from './abc';
import { parseOpenKeysJson } from './json';

export { ImportError };

export type DetectedFormat = 'musicxml' | 'mxl' | 'midi' | 'abc' | 'json';

export interface ImportOptions {
  splitPoint?: number;
}

export function detectFormat(name: string, head: Uint8Array): DetectedFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.openkeys.json') || lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.mxl')) return 'mxl';
  if (lower.endsWith('.musicxml') || lower.endsWith('.xml')) return 'musicxml';
  if (lower.endsWith('.mid') || lower.endsWith('.midi')) return 'midi';
  if (lower.endsWith('.abc')) return 'abc';
  // Sniff content.
  if (head[0] === 0x4d && head[1] === 0x54 && head[2] === 0x68 && head[3] === 0x64) return 'midi'; // MThd
  if (head[0] === 0x50 && head[1] === 0x4b) return 'mxl'; // PK zip
  const text = new TextDecoder().decode(head.slice(0, 512));
  if (/<score-(partwise|timewise)/.test(text) || text.trimStart().startsWith('<?xml')) return 'musicxml';
  if (text.trimStart().startsWith('{')) return 'json';
  if (/^X:\s*\d/m.test(text)) return 'abc';
  return null;
}

/** Imports any supported file into the internal Score. */
export async function importScoreFile(name: string, data: ArrayBuffer, opts: ImportOptions = {}): Promise<Score> {
  const bytes = new Uint8Array(data);
  const fmt = detectFormat(name, bytes);
  const baseTitle = name.replace(/\.(openkeys\.json|json|mxl|musicxml|xml|midi?|abc)$/i, '');
  switch (fmt) {
    case 'musicxml': {
      const s = parseMusicXml(new TextDecoder().decode(bytes), opts);
      if (s.title === 'Untitled') s.title = baseTitle;
      return s;
    }
    case 'mxl': {
      const s = parseMusicXml(await unzipMxl(bytes), opts);
      if (s.title === 'Untitled') s.title = baseTitle;
      return s;
    }
    case 'midi': {
      const s = parseMidiFile(bytes, opts);
      if (s.title === 'Untitled MIDI') s.title = baseTitle;
      return s;
    }
    case 'abc':
      return parseAbc(new TextDecoder().decode(bytes), opts);
    case 'json':
      return parseOpenKeysJson(new TextDecoder().decode(bytes));
    default:
      throw new ImportError(`Unsupported file "${name}". Use MusicXML (.musicxml/.xml/.mxl), MIDI (.mid), ABC (.abc) or .openkeys.json.`);
  }
}
