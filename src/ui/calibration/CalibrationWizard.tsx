import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { InputMeter } from '../components/InputMeter';
import { saveCalibration } from '../../core/calibration/store';
import { computeDynamics, computeLatency, computeLoopback, computeNoiseFloor, computeRange, computeTuning } from '../../core/calibration/compute';
import { midiToName } from '../../core/music';
import type { NoteEvent } from '../../core/types';
import { DeviceStep } from './DeviceStep';
import { InstrumentProfileStep } from './InstrumentProfileStep';
import { Icon } from '../components/Icon';

type StepId = 'device' | 'noise' | 'latency' | 'tuning' | 'range' | 'dynamics' | 'profile' | 'done';

const STEPS: { id: StepId; title: string; mic: boolean; midi: boolean }[] = [
  { id: 'device', title: 'Your instrument', mic: true, midi: true },
  { id: 'noise', title: 'Room noise', mic: true, midi: false },
  { id: 'latency', title: 'Timing', mic: true, midi: true },
  { id: 'tuning', title: 'Tuning', mic: true, midi: false },
  { id: 'range', title: 'Keyboard range', mic: true, midi: true },
  { id: 'dynamics', title: 'Soft and loud', mic: true, midi: true },
  { id: 'profile', title: 'Instrument profile (optional)', mic: true, midi: false },
  { id: 'done', title: 'All set', mic: true, midi: true },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * First-run calibration (~2-3 minutes). Every step is skippable and re-runnable from
 * Settings; results are stored per input-device profile.
 */
export function CalibrationWizard({ onClose, only }: { onClose: () => void; only?: StepId }) {
  const source = useApp((s) => s.settings.inputSource);
  const steps = STEPS.filter((s) => (source === 'mic' ? s.mic : source === 'midi' ? s.midi : s.id === 'device' || s.id === 'latency' || s.id === 'done'));
  const [idx, setIdx] = useState(only ? Math.max(0, steps.findIndex((s) => s.id === only)) : 0);
  const step = steps[idx] ?? steps[steps.length - 1];
  const next = () => (only ? onClose() : setIdx((i) => Math.min(steps.length - 1, i + 1)));

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Calibration">
      <div className="modal" style={{ maxWidth: 760 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted small">
            {only ? 'Calibration' : `Step ${idx + 1} of ${steps.length}`} · {source === 'mic' ? 'Microphone' : source === 'midi' ? 'MIDI keyboard' : 'Computer keys'}
          </span>
          <button className="btn ghost small" onClick={onClose} aria-label="Close calibration">
            <Icon name="x" />
          </button>
        </div>
        {!only && (
          <div className="progress" style={{ margin: '8px 0 16px' }}>
            <div style={{ width: `${(idx / (steps.length - 1)) * 100}%` }} />
          </div>
        )}
        <h2>{step.title}</h2>
        {step.id === 'device' && <DeviceStep onNext={next} />}
        {step.id === 'noise' && <NoiseStep onNext={next} />}
        {step.id === 'latency' && <LatencyStep onNext={next} />}
        {step.id === 'tuning' && <TuningStep onNext={next} />}
        {step.id === 'range' && <RangeStep onNext={next} />}
        {step.id === 'dynamics' && <DynamicsStep onNext={next} />}
        {step.id === 'profile' && <InstrumentProfileStep onNext={next} />}
        {step.id === 'done' && <DoneStep onClose={onClose} />}
        {step.id !== 'done' && step.id !== 'device' && (
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn ghost" onClick={next}>
              Skip this step
            </button>
            {idx > 0 && !only && (
              <button className="btn ghost" onClick={() => setIdx(idx - 1)}>
                Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function useNoteOns(active: boolean, cb: (e: NoteEvent) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    return runtime.bus.events.on((e) => {
      if (e.kind === 'noteOn') ref.current(e);
    });
  }, [active]);
}

export function Result({ kind, children }: { kind: 'good' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  return <div className={`notice ${kind}`} style={{ marginTop: 12 }}>{children}</div>;
}

function NoiseStep({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'measuring' | 'done'>('idle');
  const [res, setRes] = useState<ReturnType<typeof computeNoiseFloor> | null>(null);
  const run = async () => {
    const mic = runtime.mic;
    if (!mic) return;
    setPhase('measuring');
    const levels: number[] = [];
    const off = mic.frames.on((f) => levels.push(f.levelDb));
    await sleep(3000);
    off();
    const r = computeNoiseFloor(levels);
    setRes(r);
    setPhase('done');
    if (!r.unsteady) await saveCalibration(runtime.profile, { noiseFloorDb: r.floorDb });
    await runtime.reloadCalibration();
  };
  return (
    <div>
      <p>Stay quiet for three seconds so OpenKeys can measure the background noise of your room.</p>
      <InputMeter />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary big" onClick={() => void run()} disabled={phase === 'measuring' || !runtime.mic}>
          {phase === 'measuring' ? 'Listening… shh' : phase === 'done' ? 'Measure again' : 'Start'}
        </button>
        {phase === 'done' && (
          <button className="btn big" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      {res && res.unsteady && <Result kind="warn">Something loud happened while measuring. Please try again in silence.</Result>}
      {res && !res.unsteady && res.tooNoisy && (
        <Result kind="warn">
          Your room is quite noisy ({Math.round(res.floorDb)} dB). Detection will be less reliable: try a quieter room, move the computer closer to the keyboard, or use a line cable.
        </Result>
      )}
      {res && !res.unsteady && !res.tooNoisy && <Result kind="good">Nice and quiet ({Math.round(res.floorDb)} dB). Saved.</Result>}
    </div>
  );
}

function LatencyStep({ onNext }: { onNext: () => void }) {
  const source = useApp((s) => s.settings.inputSource);
  const [phase, setPhase] = useState<'idle' | 'loopback' | 'tapping' | 'done'>('idle');
  const [beat, setBeat] = useState(-1);
  const [res, setRes] = useState<ReturnType<typeof computeLatency> | null>(null);
  const [loop, setLoop] = useState<{ totalSec: number; outputSec: number; inputSec: number } | null>(null);
  const taps = useRef<number[]>([]);
  useNoteOns(phase === 'tapping', (e) => {
    // Raw time on the input clock: undo the latency currently applied to mic events.
    const applied = e.source === 'mic' ? runtime.mic?.tracker.opts.latency ?? 0 : 0;
    taps.current.push(e.time + applied);
  });

  const clicks = async (n: number, bpm: number, lead: number) => {
    const eng = await runtime.ensureAudio();
    const beatSec = 60 / bpm;
    const t0 = eng.now() + 0.6;
    const times: number[] = [];
    for (let i = 0; i < n + lead; i++) {
      const t = t0 + i * beatSec;
      eng.metronome.click(t, i % 4 === 0, false);
      if (i >= lead) times.push(t);
      window.setTimeout(() => setBeat(i - lead), (t - eng.now()) * 1000);
    }
    await sleep((t0 - eng.now() + (n + lead) * beatSec + 0.5) * 1000);
    return { times, beatSec };
  };

  const runLoopback = async () => {
    const mic = runtime.mic;
    const eng = await runtime.ensureAudio();
    if (!mic) return;
    setPhase('loopback');
    const onsets: number[] = [];
    const off = mic.frames.on((f) => f.onset && onsets.push(f.onsetTime));
    const wasVisual = eng.metronome.visualOnly;
    eng.metronome.visualOnly = false;
    eng.metronome.volume = 1;
    const { times } = await clicks(6, 100, 0);
    eng.metronome.visualOnly = wasVisual;
    eng.metronome.volume = useApp.getState().settings.metronomeVolume;
    off();
    const lb = computeLoopback(times, onsets);
    if (lb) {
      const outputSec = eng.outputLatency;
      const v = { totalSec: lb.totalSec, outputSec, inputSec: Math.max(0, lb.totalSec - outputSec) };
      setLoop(v);
      await saveCalibration(runtime.profile, { loopback: v });
    } else setLoop(null);
  };

  const run = async () => {
    if (source === 'mic') await runLoopback();
    taps.current = [];
    setPhase('tapping');
    const { times, beatSec } = await clicks(8, 90, 4);
    const r = computeLatency(times, taps.current, beatSec);
    setRes(r);
    setPhase('done');
    setBeat(-1);
    if (r.ok) {
      await saveCalibration(runtime.profile, { latencySec: r.offsetSec });
      await runtime.reloadCalibration();
    }
  };

  return (
    <div>
      <p>
        You'll hear four count-in clicks, then eight more. <b>Play any one key exactly with each of the eight clicks.</b> This measures the delay between your keyboard and OpenKeys so your
        timing is judged fairly.
      </p>
      {source === 'mic' && <p className="muted small">First, OpenKeys plays a few clicks by itself to measure the speaker-to-microphone delay. Keep your speakers on.</p>}
      <div className="row" style={{ gap: 8, margin: '12px 0' }} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`pulse-dot ${beat === i ? 'accent' : beat > i ? 'on' : ''}`} style={{ width: 22, height: 22 }} />
        ))}
      </div>
      <div className="row">
        <button className="btn primary big" onClick={() => void run()} disabled={phase === 'loopback' || phase === 'tapping'}>
          {phase === 'loopback' ? 'Measuring speakers…' : phase === 'tapping' ? (beat < 0 ? 'Get ready…' : 'Play with the clicks!') : phase === 'done' ? 'Try again' : 'Start'}
        </button>
        {phase === 'done' && (
          <button className="btn big" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      {loop && (
        <p className="small muted">
          Speaker → microphone round trip: {Math.round(loop.totalSec * 1000)} ms (output ≈ {Math.round(loop.outputSec * 1000)} ms, input ≈ {Math.round(loop.inputSec * 1000)} ms).
        </p>
      )}
      {res && !res.ok && <Result kind="warn">I couldn't hear enough steady notes. Make sure your keyboard is audible, then try again.</Result>}
      {res && res.ok && (
        <Result kind={res.tooHigh ? 'warn' : 'good'}>
          Your timing offset is {Math.round(res.offsetSec * 1000)} ms{res.discarded ? ` (${res.discarded} stray note${res.discarded > 1 ? 's' : ''} ignored)` : ''}. Saved.
          {res.tooHigh && ' That is high: Bluetooth headphones or speakers add a lot of delay. A wired connection will make timing feedback much more accurate.'}
        </Result>
      )}
    </div>
  );
}

function TuningStep({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'done'>('idle');
  const [res, setRes] = useState<ReturnType<typeof computeTuning> | null>(null);
  const run = async () => {
    const mic = runtime.mic;
    if (!mic) return;
    setPhase('listening');
    const prev = mic.tracker.opts.a4;
    mic.setTracker({ a4: 440 });
    const readings: number[] = [];
    const start = performance.now();
    const off = mic.frames.on((f) => {
      const live = mic.tracker.live;
      if (live.midi > 0 && live.clarity > 0.85 && f.levelDb - f.floorDb > 15) readings.push(live.midi);
    });
    // Up to 6 s, stop after 2 s of good readings (~190 frames/s).
    while (performance.now() - start < 6000 && readings.length < 380) await sleep(100);
    off();
    mic.setTracker({ a4: prev });
    const r = computeTuning(readings);
    setRes(r);
    setPhase('done');
    if (r.ok) {
      await saveCalibration(runtime.profile, { tuningCents: r.cents, transposeSemitones: r.semitones });
      await runtime.reloadCalibration();
    }
  };
  return (
    <div>
      <p>
        Hold the <b>A above middle C (A4)</b> for two seconds.
      </p>
      <InputMeter />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary big" onClick={() => void run()} disabled={phase === 'listening'}>
          {phase === 'listening' ? 'Listening… hold A4' : phase === 'done' ? 'Try again' : 'Start'}
        </button>
        {phase === 'done' && (
          <button className="btn big" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      {res && !res.ok && <Result kind="warn">I couldn't hear a steady note. Hold A4 down (or use the sustain pedal) and try again.</Result>}
      {res && res.ok && res.semitones === 0 && <Result kind="good">Your keyboard is {Math.abs(res.cents) <= 3 ? 'in tune' : `${Math.abs(res.cents)} cents ${res.cents > 0 ? 'sharp' : 'flat'}; OpenKeys will allow for that`}. Saved.</Result>}
      {res && res.ok && res.semitones !== 0 && (
        <Result kind="warn">
          That sounded like {midiToName(69 + res.semitones)} instead of A4: {Math.abs(res.semitones)} semitone{Math.abs(res.semitones) > 1 ? 's' : ''} {res.semitones > 0 ? 'higher' : 'lower'}. Is your
          keyboard's <b>transpose</b> on? Turn it off and try again, or keep it: OpenKeys saved the offset.
        </Result>
      )}
    </div>
  );
}

function RangeStep({ onNext }: { onNext: () => void }) {
  const source = useApp((s) => s.settings.inputSource);
  const update = useApp((s) => s.updateSettings);
  const [phase, setPhase] = useState<'idle' | 'low' | 'high' | 'done'>('idle');
  const [low, setLow] = useState<number | null>(null);
  const [res, setRes] = useState<ReturnType<typeof computeRange> | null>(null);
  const heard = (e: NoteEvent) => e.midi + (e.source === 'mic' ? 12 * (runtime.mic?.tracker.opts.octaveOffset ?? 0) : 0);
  useNoteOns(phase === 'low' || phase === 'high', (e) => {
    if (e.confidence < 0.5) return;
    if (phase === 'low') {
      setLow(heard(e));
      window.setTimeout(() => setPhase('high'), 400);
    } else if (phase === 'high' && low !== null) {
      const r = computeRange(low, heard(e));
      setRes(r);
      setPhase('done');
      update({ range: { low: r.low, high: r.high } });
      void saveCalibration(runtime.profile, { range: { low: r.low, high: r.high }, octaveOffset: source === 'mic' ? r.octaveOffset : 0 }).then(() => runtime.reloadCalibration());
    }
  });
  return (
    <div>
      <p>{phase === 'high' ? 'Now play your highest key.' : 'Play the lowest key on your keyboard.'}</p>
      <div className="row">
        <button className="btn primary big" onClick={() => setPhase('low')} disabled={phase === 'low' || phase === 'high'}>
          {phase === 'idle' ? 'Start' : phase === 'done' ? 'Again' : 'Listening…'}
        </button>
        {phase === 'done' && (
          <button className="btn big" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      {low !== null && <p className="small muted">Lowest: {midiToName(low)}</p>}
      {res && (
        <Result kind="good">
          {res.keys}-key range {midiToName(res.low)}–{midiToName(res.high)} saved.
          {res.octaveOffset !== 0 && ` Your keyboard's octave shift seems to be ${res.octaveOffset > 0 ? '+' : ''}${res.octaveOffset}; OpenKeys will compensate.`}
        </Result>
      )}
    </div>
  );
}

function DynamicsStep({ onNext }: { onNext: () => void }) {
  const source = useApp((s) => s.settings.inputSource);
  const LEVELS = ['softly', 'medium', 'loudly'] as const;
  const [level, setLevel] = useState(-1);
  const [vals, setVals] = useState<number[][]>([[], [], []]);
  const [res, setRes] = useState<ReturnType<typeof computeDynamics> | null>(null);
  useNoteOns(level >= 0 && level < 3, (e) => {
    if (e.midi !== 60 && e.source !== 'mic') return;
    const v = e.source === 'mic' ? runtime.mic?.tracker.lastOnsetSnrDb ?? 0 : runtime.rawVelocity(e);
    setVals((prev) => {
      const next = prev.map((a) => [...a]);
      next[level].push(v);
      if (next[level].length >= 3) {
        if (level === 2) {
          const r = computeDynamics(next[0], next[1], next[2], source === 'mic' ? 3 : 0.06);
          setRes(r);
          void saveCalibration(runtime.profile, { dynamics: { soft: r.soft, medium: r.medium, loud: r.loud } }).then(() => runtime.reloadCalibration());
          setLevel(3);
        } else setLevel(level + 1);
      }
      return next;
    });
  });
  return (
    <div>
      <p>
        Play <b>middle C</b> three times {level >= 0 && level < 3 ? <b>{LEVELS[level]}</b> : 'softly, then three times medium, then three times loudly'}.
      </p>
      <div className="row">
        {LEVELS.map((l, i) => (
          <span key={l} className={`pill ${vals[i].length >= 3 ? 'good' : level === i ? 'warn' : ''}`}>
            {l}: {vals[i].length}/3
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn primary big"
          onClick={() => {
            setVals([[], [], []]);
            setRes(null);
            setLevel(0);
          }}
          disabled={level >= 0 && level < 3}
        >
          {level < 0 ? 'Start' : level >= 3 ? 'Again' : 'Listening…'}
        </button>
        {level >= 3 && (
          <button className="btn big" onClick={onNext}>
            Next
          </button>
        )}
      </div>
      {res && (res.ok ? <Result kind="good">Got your soft, medium and loud. Saved.</Result> : <Result kind="warn">Those sounded quite similar. Saved anyway; try a bigger difference between soft and loud for better dynamics feedback.</Result>)}
    </div>
  );
}

function DoneStep({ onClose }: { onClose: () => void }) {
  const update = useApp((s) => s.updateSettings);
  return (
    <div>
      <p>OpenKeys is tuned to your instrument and room. You can re-run any step from Settings → Input &amp; calibration.</p>
      <button
        className="btn primary big"
        onClick={() => {
          update({ onboarded: true });
          onClose();
        }}
      >
        Start playing
      </button>
    </div>
  );
}
