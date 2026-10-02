/**
 * Offline polyphonic transcription with Spotify's Basic Pitch (Apache-2.0), lazy-loaded with
 * TF.js. Only for "transcribe what I just played" in free play and take review: never used
 * for real-time judging.
 */
export interface TranscribedNote {
  midi: number;
  start: number;
  duration: number;
  velocity: number;
}

const MODEL_RATE = 22050;

async function resample(samples: Float32Array, sampleRate: number): Promise<Float32Array> {
  if (sampleRate === MODEL_RATE) return samples;
  const length = Math.ceil((samples.length * MODEL_RATE) / sampleRate);
  const ctx = new OfflineAudioContext(1, length, MODEL_RATE);
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.copyToChannel(new Float32Array(samples), 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  return out.getChannelData(0).slice();
}

export async function transcribe(samples: Float32Array, sampleRate: number, modelUrl: string, onProgress?: (p: number) => void): Promise<TranscribedNote[]> {
  const bp = await import('@spotify/basic-pitch');
  const audio = await resample(samples, sampleRate);
  const model = new bp.BasicPitch(modelUrl);
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  await model.evaluateModel(
    audio,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => onProgress?.(p),
  );
  const notes = bp.noteFramesToTime(bp.addPitchBendsToNoteEvents(contours, bp.outputToNotesPoly(frames, onsets, 0.5, 0.3, 11)));
  return notes
    .map((n) => ({ midi: n.pitchMidi, start: n.startTimeSeconds, duration: n.durationSeconds, velocity: Math.min(1, Math.max(0.1, n.amplitude)) }))
    .sort((a, b) => a.start - b.start);
}
