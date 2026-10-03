import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { liveKeys } from '../live';

/** Names of the connected MIDI outputs (empty until MIDI is in use). */
function useMidiOutputs(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let offPorts = () => {};
    const attach = () => {
      offPorts();
      const midi = runtime.midi;
      if (!midi) return;
      const read = () => setNames(midi.outputs().filter((o) => o.state === 'connected').map((o) => o.name));
      read();
      offPorts = midi.ports.on(read);
    };
    attach();
    const offStatus = runtime.midiStatus.on(attach);
    return () => {
      offPorts();
      offStatus();
    };
  }, []);
  return names;
}

function Switch({ on, label, title, onChange }: { on: boolean; label: string; title: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch" title={title} onClick={() => onChange(!on)}>
      {label}
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

/** Listen-mode options: play through the MIDI keyboard's speakers, and animate the on-screen keys. */
export function ListenOptions() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const outputs = useMidiOutputs();
  const speakers = outputs.length > 0;
  return (
    <div className="listen-options" role="group" aria-label="Listen options">
      {speakers && (
        <Switch
          on={settings.midiOutPlayback}
          label="Keyboard speakers"
          title={`Play through ${settings.midiOutputName && outputs.includes(settings.midiOutputName) ? settings.midiOutputName : outputs[0]}`}
          onChange={(on) =>
            update({
              midiOutPlayback: on,
              // The remembered output is gone: use the one that is connected.
              ...(on && !(settings.midiOutputName && outputs.includes(settings.midiOutputName)) ? { midiOutputName: outputs[0] } : {}),
            })
          }
        />
      )}
      <Switch
        on={settings.listenKeyAnimation}
        label="Animate keys"
        title="Press the on-screen keys as the notes play"
        onChange={(on) => {
          update({ listenKeyAnimation: on });
          if (!on) liveKeys.clearPlaying();
        }}
      />
    </div>
  );
}
