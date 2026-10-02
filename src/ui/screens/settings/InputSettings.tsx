import { useEffect, useState } from 'react';
import { useApp } from '../../store';
import { runtime } from '../../runtime';
import { midiToName } from '../../../core/music';
import type { InputSource } from '../../../core/types';
import type { CalibrationData } from '../../../core/calibration/types';
import { clearCalibration } from '../../../core/calibration/store';
import { webMidiSupported } from '../../../core/input/midi/midi';
import { Section } from '../Settings';
import { InputMeter } from '../../components/InputMeter';
import { InputStatus } from '../../components/InputStatus';
import { CalibrationWizard } from '../../calibration/CalibrationWizard';

type Step = 'noise' | 'latency' | 'tuning' | 'range' | 'dynamics' | 'profile';

export function InputSettings() {
  const s = useApp((x) => x.settings);
  const update = useApp((x) => x.updateSettings);
  const set = useApp((x) => x.set);
  const [cal, setCal] = useState<CalibrationData>(runtime.calibration);
  const [only, setOnly] = useState<Step | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);

  useEffect(() => {
    void runtime.reloadCalibration();
    return runtime.calibrationChanged.on(setCal);
  }, [s.inputSource]);
  useEffect(() => {
    const m = runtime.midi;
    if (!m) return;
    setOutputs(m.outputs().map((o) => o.name));
    return m.ports.on((p) => setOutputs(p.outputs.map((o) => o.name)));
  }, [s.inputSource]);

  const ms = (x?: number) => (x === undefined ? '—' : `${Math.round(x * 1000)} ms`);

  return (
    <div className="col" style={{ gap: 20 }}>
      <Section title="How do you play?">
        <div className="seg">
          {(['mic', 'midi', 'virtual'] as InputSource[]).map((src) => (
            <button key={src} aria-pressed={s.inputSource === src} onClick={() => update({ inputSource: src })}>
              {src === 'mic' ? '🎤 Microphone' : src === 'midi' ? '🎹 MIDI keyboard' : '⌨ Computer keys'}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {s.inputSource === 'mic'
            ? 'Works with any instrument, no cable. Single notes are accurate; chords are approximate, and unclear notes are marked “?” instead of wrong.'
            : s.inputSource === 'midi'
              ? 'Exact notes, timing, velocity and pedal. The recommended mode once your keyboard is connected by USB.'
              : 'Computer keyboard and on-screen piano, for trying things out without an instrument.'}
          {s.inputSource === 'midi' && !webMidiSupported() && ' This browser has no Web MIDI.'}
        </p>
        <InputStatus />
        <InputMeter />
        <div className="row">
          <button className="btn primary" onClick={() => set({ calibrationOpen: true })}>
            Run the setup wizard
          </button>
        </div>
      </Section>

      {s.inputSource !== 'virtual' && (
        <Section title="Calibration for this device">
          <table className="table small">
            <tbody>
              {s.inputSource === 'mic' && (
                <CalRow label="Room noise" value={cal.noiseFloorDb === undefined ? '—' : `${Math.round(cal.noiseFloorDb)} dB`} onRun={() => setOnly('noise')} />
              )}
              <CalRow label="Timing offset" value={ms(cal.latencySec)} extra={cal.loopback ? `loopback ${ms(cal.loopback.totalSec)}` : undefined} onRun={() => setOnly('latency')} />
              {s.inputSource === 'mic' && (
                <CalRow
                  label="Tuning"
                  value={cal.tuningCents === undefined ? '—' : `${cal.tuningCents > 0 ? '+' : ''}${cal.tuningCents} cents${cal.transposeSemitones ? `, transpose ${cal.transposeSemitones}` : ''}`}
                  onRun={() => setOnly('tuning')}
                />
              )}
              <CalRow label="Range" value={cal.range ? `${midiToName(cal.range.low)}–${midiToName(cal.range.high)}${cal.octaveOffset ? ` (octave ${cal.octaveOffset > 0 ? '+' : ''}${cal.octaveOffset})` : ''}` : '—'} onRun={() => setOnly('range')} />
              <CalRow label="Soft / loud" value={cal.dynamics ? 'calibrated' : '—'} onRun={() => setOnly('dynamics')} />
              {s.inputSource === 'mic' && <CalRow label="Instrument profile" value={cal.instrumentProfile ? `${cal.instrumentProfile.keys.length} keys` : '—'} onRun={() => setOnly('profile')} />}
            </tbody>
          </table>
          <div>
            <button
              className="btn small ghost"
              onClick={async () => {
                if (!confirm('Forget the calibration for this device?')) return;
                await clearCalibration(runtime.profile);
                await runtime.reloadCalibration();
              }}
            >
              Reset calibration
            </button>
          </div>
        </Section>
      )}

      {s.inputSource === 'mic' && (
        <Section title="Microphone">
          <label className="field">
            Keyboard octave shift
            <select value={s.octaveOffset} onChange={(e) => update({ octaveOffset: Number(e.target.value) })}>
              {[-2, -1, 0, 1, 2].map((o) => (
                <option key={o} value={o}>
                  {o === 0 ? 'None' : `${o > 0 ? '+' : ''}${o} octave${Math.abs(o) > 1 ? 's' : ''}`}
                </option>
              ))}
            </select>
            <span className="hint">If your keyboard's octave-shift button is on, the microphone hears a different octave than the key you press.</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={s.micAllowSpeakerPlayback} onChange={(e) => update({ micAllowSpeakerPlayback: e.target.checked })} /> Allow app accompaniment through speakers in mic mode
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            Off by default so the microphone hears only you. If you turn it on, use headphones for the app: OpenKeys ignores the notes it plays itself, but speaker sound still makes
            detection less sure.
          </p>
        </Section>
      )}

      {s.inputSource === 'midi' && (
        <Section title="MIDI">
          <label className="field">
            Channel
            <select value={s.midiChannel} onChange={(e) => update({ midiChannel: Number(e.target.value) })}>
              <option value={0}>All channels</option>
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Channel {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={s.monitorMidi} onChange={(e) => update({ monitorMidi: e.target.checked })} /> Play the app's piano sound for my keys (for keyboards without speakers)
          </label>
          <label className="check">
            <input type="checkbox" checked={s.midiOutPlayback} onChange={(e) => update({ midiOutPlayback: e.target.checked })} disabled={!outputs.length} /> Send demos and accompaniment to the
            keyboard (it plays them through its own speakers)
          </label>
          {s.midiOutPlayback && (
            <>
              <label className="field">
                MIDI output
                <select value={s.midiOutputName ?? outputs[0] ?? ''} onChange={(e) => update({ midiOutputName: e.target.value })}>
                  {outputs.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <div className="notice warn small">
                Notes may sound twice (app + keyboard). Turn the app volume down, and if your keys also double, switch the keyboard's <i>Local Control</i> off.
              </div>
            </>
          )}
          <label className="field">
            Restart-loop key (a spare low key)
            <select value={s.restartKey ?? ''} onChange={(e) => update({ restartKey: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">Off</option>
              {Array.from({ length: 6 }, (_, i) => s.range.low + i).map((m) => (
                <option key={m} value={m}>
                  {midiToName(m)}
                </option>
              ))}
            </select>
          </label>
        </Section>
      )}

      <Section title="Keyboard range">
        <div className="row">
          <label className="field">
            Lowest key: {midiToName(s.range.low)}
            <input type="range" min={21} max={60} value={s.range.low} onChange={(e) => update({ range: { ...s.range, low: Number(e.target.value) } })} />
          </label>
          <label className="field">
            Highest key: {midiToName(s.range.high)}
            <input type="range" min={60} max={108} value={s.range.high} onChange={(e) => update({ range: { ...s.range, high: Number(e.target.value) } })} />
          </label>
          <button className="btn small" onClick={() => update({ range: { low: 36, high: 96 } })}>
            61 keys (C2–C7)
          </button>
          <button className="btn small" onClick={() => update({ range: { low: 21, high: 108 } })}>
            88 keys
          </button>
        </div>
      </Section>
      {only && <CalibrationWizard only={only} onClose={() => setOnly(null)} />}
    </div>
  );
}

function CalRow({ label, value, extra, onRun }: { label: string; value: string; extra?: string; onRun: () => void }) {
  return (
    <tr>
      <td>{label}</td>
      <td>
        <b>{value}</b> {extra && <span className="muted">· {extra}</span>}
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="btn small" onClick={onRun}>
          {value === '—' ? 'Measure' : 'Re-run'}
        </button>
      </td>
    </tr>
  );
}
