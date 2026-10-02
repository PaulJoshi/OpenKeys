import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { InputMeter } from '../components/InputMeter';
import { listMicDevices } from '../../core/input/mic/mic';
import { webMidiSupported } from '../../core/input/midi/midi';
import type { InputSource } from '../../core/types';
import type { MicPreset } from '../../core/settings';
import { Result } from './CalibrationWizard';
import { midiToName } from '../../core/music';
import { Icon } from '../components/Icon';

const PRESETS: { id: MicPreset; label: string; hint: string }[] = [
  { id: 'line', label: 'Line-in cable (most accurate)', hint: "Connect the keyboard's headphone/line out to an audio interface or line input. No room noise, no speaker colouring." },
  { id: 'usb', label: 'USB microphone', hint: 'Place it 30–60 cm from the keyboard speakers.' },
  { id: 'laptop', label: 'Laptop microphone', hint: 'Put the laptop on the music stand. Low notes are weaker on laptop mics.' },
  { id: 'phone', label: 'Phone / tablet microphone', hint: 'Keep the device close to the keyboard speakers and away from walls.' },
];

/** Step 1: choose the input, grant permission, verify processing is off, play any key. */
export function DeviceStep({ onNext }: { onNext: () => void }) {
  const s = useApp((x) => x.settings);
  const update = useApp((x) => x.updateSettings);
  const [micStatus, setMicStatus] = useState(runtime.mic?.status ?? 'idle');
  const [midiStatus, setMidiStatus] = useState(runtime.midi?.status ?? 'idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [midiInputs, setMidiInputs] = useState<string[]>([]);
  const [heard, setHeard] = useState<string | null>(null);

  useEffect(() => {
    const offs = [runtime.micStatus.on((x) => setMicStatus(x as typeof micStatus)), runtime.midiStatus.on((x) => setMidiStatus(x as typeof midiStatus))];
    return () => offs.forEach((o) => o());
  }, []);
  useEffect(() => {
    if (micStatus === 'running') void listMicDevices().then(setDevices);
  }, [micStatus]);
  useEffect(() => {
    const m = runtime.midi;
    if (!m) return;
    setMidiInputs(m.inputs().map((i) => i.name));
    return m.ports.on((p) => setMidiInputs(p.inputs.map((i) => i.name)));
  }, [midiStatus]);
  useEffect(
    () =>
      runtime.bus.events.on((e) => {
        if (e.kind === 'noteOn' && e.source === s.inputSource) setHeard(midiToName(e.midi));
      }),
    [s.inputSource],
  );

  const choose = (src: InputSource) => {
    setHeard(null);
    update({ inputSource: src });
    if (src !== 'mic') runtime.stopMic();
  };

  return (
    <div className="col">
      <div className="seg" role="radiogroup" aria-label="Input">
        <button aria-pressed={s.inputSource === 'mic'} onClick={() => choose('mic')}>
          <Icon name="mic" size={16} /> Microphone
        </button>
        <button aria-pressed={s.inputSource === 'midi'} onClick={() => choose('midi')}>
          <Icon name="piano" size={16} /> MIDI / USB cable
        </button>
        <button aria-pressed={s.inputSource === 'virtual'} onClick={() => choose('virtual')}>
          <Icon name="keyboard" size={16} /> No instrument
        </button>
      </div>

      {s.inputSource === 'mic' && (
        <>
          <label className="field">
            How is the sound getting in?
            <select value={s.micPreset} onChange={(e) => update({ micPreset: e.target.value as MicPreset })}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="hint">{PRESETS.find((p) => p.id === s.micPreset)?.hint}</span>
          </label>
          {micStatus !== 'running' && (
            <div className="notice info">
              <p style={{ marginTop: 0 }}>
                OpenKeys listens to your keyboard through the microphone to hear which notes you play. <b>The audio is analysed on this device and never recorded or sent anywhere.</b>
              </p>
              <button className="btn primary" onClick={() => void runtime.startMic()} disabled={micStatus === 'starting'}>
                {micStatus === 'starting' ? 'Waiting for permission…' : 'Allow the microphone'}
              </button>
            </div>
          )}
          {micStatus === 'denied' && <Result kind="bad">Microphone access was blocked. Click the lock icon in the address bar, allow the microphone, then try again.</Result>}
          {(micStatus === 'error' || micStatus === 'unsupported') && <Result kind="bad">{runtime.mic?.statusMessage ?? 'The microphone could not start.'}</Result>}
          {micStatus === 'running' && (
            <>
              {devices.length > 1 && (
                <label className="field">
                  Microphone
                  <select
                    value={s.micDeviceId ?? ''}
                    onChange={(e) => {
                      update({ micDeviceId: e.target.value || null });
                      void runtime.startMic();
                    }}
                  >
                    <option value="">System default</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Microphone'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {runtime.mic?.warnings?.ignored.length ? (
                <Result kind="warn">
                  The browser kept {runtime.mic.warnings.ignored.join(', ')} switched on even though OpenKeys asked to turn it off. This can swallow soft notes. If your system has
                  “audio enhancements” or “voice isolation” settings, turn them off.
                </Result>
              ) : (
                <Result kind="good">Raw audio: echo cancellation, noise suppression and auto gain are off.</Result>
              )}
              <InputMeter />
            </>
          )}
        </>
      )}

      {s.inputSource === 'midi' && (
        <>
          {!webMidiSupported() ? (
            <Result kind="warn">This browser has no Web MIDI (Safari and iOS don't support it). Use Chrome, Edge or Firefox for a MIDI keyboard, or choose the microphone instead.</Result>
          ) : midiStatus !== 'running' ? (
            <div className="notice info">
              <p style={{ marginTop: 0 }}>
                Connect your keyboard with a USB cable (the Casio CT-S1 uses its USB-B “to host” port; no driver needed). OpenKeys will then ask your permission to read the keys you play.
              </p>
              <button className="btn primary" onClick={() => void runtime.startMidi()}>
                Connect MIDI keyboard
              </button>
            </div>
          ) : (
            <>
              {midiInputs.length === 0 ? (
                <Result kind="warn">No MIDI keyboard found yet. Plug it in and switch it on; it will appear automatically.</Result>
              ) : (
                <label className="field">
                  Keyboard
                  <select
                    value={s.midiInputName ?? midiInputs[0]}
                    onChange={(e) => {
                      update({ midiInputName: e.target.value });
                      runtime.midi?.select(e.target.value);
                    }}
                  >
                    {midiInputs.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <InputMeter />
            </>
          )}
          {midiStatus === 'denied' && <Result kind="bad">MIDI access was blocked. Allow it in the site settings (lock icon in the address bar).</Result>}
        </>
      )}

      {s.inputSource === 'virtual' && <p>No problem: you can play with your computer keyboard (A–' for white keys, W E T Y U O P for black keys) or by clicking the on-screen piano.</p>}

      {(s.inputSource === 'virtual' || micStatus === 'running' || midiStatus === 'running') && (
        <div className="notice">
          <b>Play any key.</b> {heard ? <span style={{ color: 'var(--good)' }}>Heard {heard}. It works.</span> : 'Waiting for a note…'}
        </div>
      )}
      <div className="row">
        <button className="btn primary big" onClick={onNext} disabled={s.inputSource === 'mic' ? micStatus !== 'running' : s.inputSource === 'midi' ? midiStatus !== 'running' : false}>
          Next
        </button>
      </div>
    </div>
  );
}
