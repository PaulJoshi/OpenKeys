import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { InputMeter } from '../components/InputMeter';
import { InputStatus } from '../components/InputStatus';
import { PianoRoll, type RollNote } from '../components/PianoRoll';
import { midiToName } from '../../core/music';
import { liveKeys } from '../live';
import { notesToMidiFile, notesToScore, type TimedNote } from '../../core/score/fromNotes';
import type { TranscribedNote } from '../../core/input/mic/transcribe';
import { Icon } from '../components/Icon';

const MODEL_URL = `${import.meta.env.BASE_URL}models/basic-pitch/model.json`;

/** Free play: no score; detected notes shown live with a piano roll; takes can be transcribed. */
export function FreePlay() {
  const range = useApp((s) => s.settings.range);
  const source = useApp((s) => s.settings.inputSource);
  const audioReady = useApp((s) => s.audioReady);
  const progress = useApp((s) => s.pianoProgress);
  const set = useApp((s) => s.set);
  const toast = useApp((s) => s.toast);
  const [baseC, setBaseC] = useState(runtime.virtual.baseC);
  const [recent, setRecent] = useState<string[]>([]);
  const live = useRef<RollNote[]>([]);
  const open = useRef(new Map<number, RollNote>());
  const t0 = useRef(performance.now() / 1000);
  const [recording, setRecording] = useState(false);
  const recStart = useRef(0);
  const recNotes = useRef<TimedNote[]>([]);
  const audio = useRef<Float32Array[]>([]);
  const audioRate = useRef(48000);
  const [take, setTake] = useState<{ notes: TimedNote[]; audio: Float32Array | null; rate: number } | null>(null);
  const [transcribed, setTranscribed] = useState<TranscribedNote[] | null>(null);
  const [transcribing, setTranscribing] = useState<number | null>(null);

  useEffect(() => runtime.virtual.octaveChange.on(setBaseC), []);
  useEffect(
    () =>
      runtime.bus.events.on((e) => {
        const now = runtime.engine?.now() ?? performance.now() / 1000;
        const t = e.time;
        if (e.kind === 'noteOn') {
          setRecent((r) => [...r.slice(-23), midiToName(e.midi)]);
          const n: RollNote = { midi: e.midi, start: t - t0.current, duration: 0.15, hand: e.midi < 60 ? 'L' : 'R' };
          live.current.push(n);
          open.current.set(e.midi, n);
          if (live.current.length > 400) live.current.splice(0, 100);
          if (recording) recNotes.current.push({ midi: e.midi, start: t - recStart.current, duration: 0.3, velocity: e.velocity });
        } else if (e.kind === 'noteOff') {
          const n = open.current.get(e.midi);
          if (n) n.duration = Math.max(0.05, t - t0.current - n.start);
          open.current.delete(e.midi);
          if (recording) {
            const r = [...recNotes.current].reverse().find((x) => x.midi === e.midi);
            if (r) r.duration = Math.max(0.05, t - recStart.current - r.start);
          }
        }
        void now;
      }),
    [recording],
  );
  useEffect(() => {
    t0.current = runtime.engine?.now() ?? 0;
    return () => liveKeys.clear();
  }, [audioReady]);

  const cursor = useMemo(() => () => (runtime.engine?.now() ?? 0) - t0.current, []);

  const startRec = async () => {
    const eng = await runtime.ensureAudio();
    recStart.current = eng.now();
    recNotes.current = [];
    audio.current = [];
    setTake(null);
    setTranscribed(null);
    const mic = runtime.mic;
    if (mic && source === 'mic') {
      const off = mic.recorded.on(({ samples, sampleRate }) => {
        audio.current.push(samples);
        audioRate.current = sampleRate;
      });
      (startRec as unknown as { off?: () => void }).off = off;
      mic.record(true);
    }
    setRecording(true);
  };

  const stopRec = async () => {
    setRecording(false);
    const mic = runtime.mic;
    let samples: Float32Array | null = null;
    if (mic && source === 'mic') {
      mic.record(false);
      await new Promise((r) => setTimeout(r, 300));
      (startRec as unknown as { off?: () => void }).off?.();
      const len = audio.current.reduce((s, c) => s + c.length, 0);
      samples = new Float32Array(len);
      let o = 0;
      for (const c of audio.current) {
        samples.set(c, o);
        o += c.length;
      }
    }
    setTake({ notes: [...recNotes.current], audio: samples, rate: audioRate.current });
  };

  const playBack = async (notes: TimedNote[]) => {
    const eng = await runtime.ensureAudio();
    const s = eng.now() + 0.1;
    for (const n of notes) eng.piano.play(n.midi, n.velocity ?? 0.6, s + n.start, n.duration);
  };

  const runTranscription = async () => {
    if (!take?.audio) return;
    setTranscribing(0);
    try {
      const { transcribe } = await import('../../core/input/mic/transcribe');
      const notes = await transcribe(take.audio, take.rate, MODEL_URL, (p) => setTranscribing(p));
      setTranscribed(notes);
    } catch (e) {
      toast(`Transcription failed: ${(e as Error).message}`, 'bad');
    }
    setTranscribing(null);
  };

  const best: TimedNote[] | null = transcribed ? transcribed.map((n) => ({ midi: n.midi, start: n.start, duration: n.duration, velocity: n.velocity })) : take?.notes ?? null;

  return (
    <div className="page">
      <h1>Free play</h1>
      <p className="muted">
        Play anything. Use your instrument, click the keys, or type: <kbd>A</kbd>–<kbd>'</kbd> are white keys, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd> are
        black keys, <kbd>Z</kbd>/<kbd>X</kbd> shift the octave (now {midiToName(baseC)}).
      </p>
      {!audioReady && <div className="notice info">Press any key or click to start the sound.</div>}
      {audioReady && progress < 1 && (
        <div className="col" style={{ margin: '8px 0' }}>
          <span className="small muted">Loading piano samples… {Math.round(progress * 100)}% (a light synth plays meanwhile)</span>
          <div className="progress">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      <div className="card" style={{ margin: '16px 0' }}>
        <InputStatus />
        <div className="row">
          <div className="grow">
            <InputMeter />
          </div>
          {!recording ? (
            <button className="btn primary" onClick={() => void startRec()}>
              <Icon name="circle" size={16} /> Record
            </button>
          ) : (
            <button className="btn" onClick={() => void stopRec()}>
              <Icon name="square" size={16} /> Stop
            </button>
          )}
        </div>
      </div>
      <PianoRoll played={live.current} cursor={cursor} follow windowSec={10} height={180} />
      <div style={{ height: 12 }} />
      <PianoKeyboard
        low={range.low}
        high={range.high}
        height={150}
        labels="c"
        keyHintsBase={source === 'virtual' ? baseC : null}
        onPress={(m, v, t) => {
          void runtime.ensureAudio();
          runtime.virtual.press(m, t, v);
        }}
        onRelease={(m, t) => runtime.virtual.release(m, t)}
      />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent notes</h3>
        <div style={{ fontSize: 'var(--type-heading-lg-size)', fontWeight: 500, minHeight: '2em' }} data-testid="recent-notes">
          {recent.join(' ')}
        </div>
      </div>
      {take && (
        <div className="card col" style={{ marginTop: 16 }}>
          <h3 style={{ margin: 0 }}>Your recording {transcribed ? '(transcribed by Basic Pitch)' : ''}</h3>
          <PianoRoll played={best ?? []} height={200} />
          <div className="row">
            <button className="btn" onClick={() => best && void playBack(best)} disabled={!best?.length}>
              <Icon name="play" size={16} /> Play it back
            </button>
            {take.audio && (
              <button className="btn" onClick={() => void runTranscription()} disabled={transcribing !== null}>
                {transcribing !== null ? `Transcribing… ${Math.round(transcribing * 100)}%` : 'Transcribe chords too (offline AI, Basic Pitch)'}
              </button>
            )}
            <button className="btn" disabled={!best?.length} onClick={() => best && set({ pendingImport: notesToScore(best, { title: `My recording ${new Date().toLocaleTimeString()}` }) })}>
              Save as a score
            </button>
            <button
              className="btn"
              disabled={!best?.length}
              onClick={() => {
                if (!best) return;
                const blob = new Blob([notesToMidiFile(best).slice().buffer], { type: 'audio/midi' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'openkeys-recording.mid';
                a.click();
              }}
            >
              Download MIDI
            </button>
          </div>
          {take.audio && !transcribed && <p className="small muted" style={{ margin: 0 }}>The live detector follows single notes. Basic Pitch runs on this device (it downloads its ~1 MB model once) and can transcribe chords, but takes a few seconds.</p>}
        </div>
      )}
    </div>
  );
}
