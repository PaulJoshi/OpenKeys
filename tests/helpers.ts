import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function fixturePath(rel: string): string {
  return join(process.cwd(), 'tests', 'fixtures', rel);
}

export function readFixture(rel: string): string {
  return readFileSync(fixturePath(rel), 'utf8');
}

export function readFixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(fixturePath(rel)));
}
