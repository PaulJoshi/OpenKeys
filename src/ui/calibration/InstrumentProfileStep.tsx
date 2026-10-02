import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { buildProfile, measureKeyTemplate, profileKeys } from '../../core/calibration/profile';
import { saveCalibration } from '../../core/calibration/store';
import { midiToName } from '../../core/music';
import { Result } from './CalibrationWizard';

/**
 * Optional (~2 minutes): one key every minor third at medium force. Each key's measured partial
 * strengths (through your keyboard's speakers and your room) replace the generic harmonic model
 * for chord detection.
 */
export function InstrumentProfileStep({ onNext }: { onNext: () => void }) {
  const range = useApp((s) => s.settings.range);
  const detector = useApp((s) => s.settings.detector);
  const keys = profileKeys(range.low, range.high);
  const [i, setI] = useState(-1);
  const [done, setDone] = useState(false);
  const results = useRef<{ midi: number; partialsDb: number[] }[]>([]);
  const capturing = useRef<{ midi: number; onset: number; spectra: Float32Array[] } | null>(null);

  useEffect(() => {
    const mic = runtime.mic;
    if (!mic || i < 0 || i >= keys.length) return;
    const target = keys[i];
    const offset = 12 * mic.tracker.opts.octaveOffset;
    const offFrames = mic.frames.on((f) => {
      const c = capturing.current;
      if (!c) return;
      if (f.spectrum && f.time > c.onset + 0.08 && f.time < c.onset + 0.4) c.spectra.push(new Float32Array(f.spectrum));
      if (f.time >= c.onset + 0.4) {
        capturing.current = null;
        results.current.push({ midi: c.midi, partialsDb: measureKeyTemplate(c.spectra, c.midi + offset, detector.partials, detector.inharmonicity, mic.tracker.opts.a4) });
        setI((x) => x + 1);
      }
    });
    const offNotes = runtime.bus.events.on((e) => {
      if (e.kind !== 'noteOn' || e.source !== 'mic' || capturing.current) return;
      // Accept the target (or its octave in the bass, where pitch is less certain).
      if (e.midi === target || (target < 48 && Math.abs(e.midi - target) === 12)) {
        capturing.current = { midi: target, onset: e.time + mic.tracker.opts.latency, spectra: [] };
      }
    });
    return () => {
      offFrames();
      offNotes();
    };
  }, [i, keys, detector]);

  useEffect(() => {
    if (i < keys.length || done) return;
    const profile = buildProfile(results.current, detector.partials);
    void saveCalibration(runtime.profile, { instrumentProfile: profile }).then(() => runtime.reloadCalibration());
    setDone(true);
  }, [i, keys.length, done, detector.partials]);

  if (!runtime.mic) return <Result kind="info">This step needs the microphone.</Result>;
  return (
    <div>
      <p>
        Play each key OpenKeys shows, <b>at medium strength</b>, and let it ring for a moment. That's {keys.length} keys, one every three semitones. It teaches OpenKeys how your keyboard
        actually sounds through its speakers and your room, which makes chord detection noticeably more reliable.
      </p>
      {i < 0 && (
        <button className="btn primary big" onClick={() => setI(0)}>
          Start
        </button>
      )}
      {i >= 0 && i < keys.length && (
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="big-number">{midiToName(keys[i])}</span>
          <span className="muted">
            key {i + 1} of {keys.length}
          </span>
          <button className="btn small" onClick={() => setI(i + 1)}>
            Skip this key
          </button>
        </div>
      )}
      {i >= 0 && (
        <div className="progress" style={{ marginTop: 12 }}>
          <div style={{ width: `${(Math.min(i, keys.length) / keys.length) * 100}%` }} />
        </div>
      )}
      {done && (
        <>
          <Result kind="good">Instrument profile saved ({results.current.length} keys).</Result>
          <button className="btn big" style={{ marginTop: 12 }} onClick={onNext}>
            Next
          </button>
        </>
      )}
    </div>
  );
}
