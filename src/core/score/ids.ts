let counter = 0;

/** Short random-ish id, stable enough for local storage keys. */
export function makeId(prefix = 's'): string {
  counter = (counter + 1) % 1e6;
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${rand}${counter.toString(36)}`;
}

/** Deterministic id from a string (FNV-1a), used for bundled content. */
export function hashId(text: string, prefix = 's'): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${prefix}-${(h >>> 0).toString(36)}`;
}
