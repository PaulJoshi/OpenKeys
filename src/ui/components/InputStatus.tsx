import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { webMidiSupported } from '../../core/input/midi/midi';

/**
 * Small banner shown where input is needed: turns the chosen input on (a user gesture is
 * required for the mic / MIDI permission) and explains problems instead of failing silently.
 */
export function InputStatus() {
  const source = useApp((s) => s.settings.inputSource);
  const set = useApp((s) => s.set);
  const [mic, setMic] = useState(runtime.mic?.status ?? 'idle');
  const [midi, setMidi] = useState(runtime.midi?.status ?? 'idle');
  const [device, setDevice] = useState<string | null>(runtime.midi?.current?.name ?? null);
  useEffect(() => {
    const offs = [runtime.micStatus.on((x) => setMic(x as typeof mic)), runtime.midiStatus.on((x) => setMidi(x as typeof midi))];
    return () => offs.forEach((o) => o());
  }, []);
  useEffect(() => runtime.midi?.deviceChanged.on(setDevice), [midi]);

  if (source === 'mic' && mic !== 'running') {
    return (
      <div className="notice info small row" style={{ marginBottom: 6 }}>
        <span className="grow">
          {mic === 'denied'
            ? 'Microphone access is blocked: allow it from the lock icon in the address bar.'
            : mic === 'error' || mic === 'unsupported'
              ? runtime.mic?.statusMessage ?? 'The microphone could not start.'
              : 'Microphone mode: OpenKeys needs your permission to listen (audio never leaves this device).'}
        </span>
        <button className="btn small primary" onClick={() => void runtime.startMic()}>
          Turn on the microphone
        </button>
        <button className="btn small" onClick={() => set({ calibrationOpen: true })}>
          Set up
        </button>
      </div>
    );
  }
  if (source === 'midi') {
    if (!webMidiSupported())
      return <div className="notice warn small" style={{ marginBottom: 6 }}>This browser has no Web MIDI (Safari/iOS). Switch to the microphone in Settings, or use Chrome, Edge or Firefox.</div>;
    if (midi !== 'running')
      return (
        <div className="notice info small row" style={{ marginBottom: 6 }}>
          <span className="grow">{midi === 'denied' ? 'MIDI access is blocked: allow it in the site settings.' : 'MIDI mode: connect your keyboard by USB.'}</span>
          <button className="btn small primary" onClick={() => void runtime.startMidi()}>
            Connect MIDI keyboard
          </button>
        </div>
      );
    if (!device) return <div className="notice warn small" style={{ marginBottom: 6 }}>No MIDI keyboard connected. Plug it in; OpenKeys picks it up automatically.</div>;
  }
  return null;
}
