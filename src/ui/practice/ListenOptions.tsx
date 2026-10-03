import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { liveKeys } from '../live';
import { Icon } from '../components/Icon';

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

function Switch({ on, label, title, disabled, onChange }: { on: boolean; label: string; title: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch" title={title} disabled={disabled} onClick={() => onChange(!on)}>
      {label}
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

/**
 * Listen-mode options behind a small settings button; the menu opens upwards over the keyboard.
 * Each option is a row with a switch, so more can be added as rows.
 */
export function ListenOptions() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const outputs = useMidiOutputs();
  const speakers = outputs.length > 0;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div className="listen-options" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Listen options"
        title="Listen options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="settings" size={18} />
      </button>
      {open && (
        <div className="listen-menu" role="group" aria-label="Listen options">
          <div className="listen-menu-title">Listen options</div>
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
          <Switch
            on={settings.listenHandColours}
            label="Hand colours"
            title="Light the keys blue for the right hand and purple for the left"
            disabled={!settings.listenKeyAnimation}
            onChange={(on) => update({ listenHandColours: on })}
          />
        </div>
      )}
    </div>
  );
}
