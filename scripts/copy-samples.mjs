// Copies a trimmed set of Salamander Grand Piano samples (CC-BY 3.0, Alexander Holm)
// from the @audio-samples npm packages into public/samples so they are self-hosted
// and precached for offline use. The repository itself does not contain the audio.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Salamander V3 has 16 velocity layers; we ship 4 (soft, medium, loud, very loud).
const LAYERS = [4, 8, 12, 16];
const out = join(process.cwd(), 'public', 'samples', 'piano');
mkdirSync(out, { recursive: true });

let copied = 0;
for (const v of LAYERS) {
  const pkg = `@audio-samples/piano-mp3-velocity${v}`;
  let dir;
  try {
    dir = join(dirname(require.resolve(`${pkg}/package.json`)), 'audio');
  } catch {
    console.warn(`[samples] ${pkg} not installed; skipping (the app falls back to a synth).`);
    continue;
  }
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mp3')) continue;
    // "D#4v8.mp3" -> "Ds4v8.mp3" ("#" is unsafe in URLs)
    const target = join(out, f.replace('#', 's'));
    if (!existsSync(target)) {
      copyFileSync(join(dir, f), target);
      copied++;
    }
  }
}
console.log(`[samples] ${copied} new sample files copied to public/samples/piano`);
