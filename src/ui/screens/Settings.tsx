import { useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { midiToName } from '../../core/music';
import type { Settings } from '../../core/settings';
import { exportBackup, importBackup } from '../../core/progress/progress';
import { downloadText } from '../importer';
import { runtime } from '../runtime';
import { InputSettings } from './settings/InputSettings';
import { About } from './settings/About';

export function SettingsScreen() {
  const s = useApp((x) => x.settings);
  const update = useApp((x) => x.updateSettings);
  const toast = useApp((x) => x.toast);
  const [tab, setTab] = useState<'input' | 'practice' | 'display' | 'data' | 'about'>('input');
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => update({ [k]: Number(e.target.value) } as Partial<Settings>);
  const bool = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => update({ [k]: e.target.checked } as Partial<Settings>);

  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="seg" style={{ marginBottom: 20 }} role="tablist">
        {(['input', 'practice', 'display', 'data', 'about'] as const).map((t) => (
          <button key={t} role="tab" aria-pressed={tab === t} aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'input' ? 'Input & calibration' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'input' && <InputSettings />}

      {tab === 'practice' && (
        <div className="col" style={{ gap: 20 }}>
          <Section title="Judging">
            <label className="field">
              Timing windows
              <select value={s.timingPreset} onChange={(e) => update({ timingPreset: e.target.value as Settings['timingPreset'] })}>
                <option value="relaxed">Relaxed (±60 / 130 / 220 ms)</option>
                <option value="standard">Standard (±40 / 90 / 150 ms)</option>
                <option value="strict">Strict (±25 / 60 / 100 ms)</option>
              </select>
              <span className="hint">Windows widen automatically at slower tempos and in mic mode.</span>
            </label>
            <label className="field">
              Chord window: {s.chordWindowMs} ms
              <input type="range" min={40} max={400} step={10} value={s.chordWindowMs} onChange={num('chordWindowMs')} />
              <span className="hint">Notes struck within this time count as one chord (raise it for rolled chords).</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={s.errorSound} onChange={bool('errorSound')} /> Subtle sound on mistakes
            </label>
          </Section>
          <Section title="Accompaniment and metronome">
            <label className="check">
              <input type="checkbox" checked={s.accompaniment} onChange={bool('accompaniment')} /> The app plays the hand I'm not practising
            </label>
            <label className="check">
              <input type="checkbox" checked={s.metronome} onChange={bool('metronome')} /> Metronome on
            </label>
            <label className="check">
              <input type="checkbox" checked={s.metronomeVisualOnly} onChange={(e) => { update({ metronomeVisualOnly: e.target.checked }); if (runtime.engine) runtime.engine.metronome.visualOnly = e.target.checked; }} /> Visual-only metronome (no click)
            </label>
            <label className="field">
              Metronome subdivision
              <select value={s.subdivision} onChange={(e) => update({ subdivision: Number(e.target.value) })}>
                <option value={1}>Beats</option>
                <option value={2}>Eighths</option>
                <option value={3}>Triplets</option>
                <option value={4}>Sixteenths</option>
              </select>
            </label>
            <label className="field">
              Metronome volume
              <input type="range" min={0} max={1} step={0.05} value={s.metronomeVolume} onChange={(e) => { update({ metronomeVolume: Number(e.target.value) }); if (runtime.engine) runtime.engine.metronome.volume = Number(e.target.value); }} />
            </label>
            <label className="field">
              Count-in
              <select value={s.countInBars} onChange={(e) => update({ countInBars: Number(e.target.value) })}>
                <option value={0}>None</option>
                <option value={1}>One bar</option>
                <option value={2}>Two bars</option>
              </select>
            </label>
            <label className="field">
              App volume
              <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => { update({ volume: Number(e.target.value) }); runtime.engine?.setVolume(Number(e.target.value)); }} />
            </label>
          </Section>
          <Section title="Practice goal">
            <label className="field">
              Daily goal: {s.dailyGoalMin} minutes
              <input type="range" min={5} max={60} step={5} value={s.dailyGoalMin} onChange={num('dailyGoalMin')} />
            </label>
            <label className="field">
              Hand split point for single-track MIDI / ABC: {midiToName(s.splitPoint)}
              <input type="range" min={48} max={72} value={s.splitPoint} onChange={num('splitPoint')} />
            </label>
          </Section>
        </div>
      )}

      {tab === 'display' && (
        <div className="col" style={{ gap: 20 }}>
          <Section title="Look">
            <label className="field">
              Theme
              <select value={s.theme} onChange={(e) => update({ theme: e.target.value as Settings['theme'] })}>
                <option value="system">Follow the system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="field">
              Practice view
              <select value={s.view} onChange={(e) => update({ view: e.target.value as Settings['view'] })}>
                <option value="both">Sheet music and falling notes</option>
                <option value="sheet">Sheet music</option>
                <option value="falling">Falling notes</option>
              </select>
            </label>
          </Section>
          <Section title="Beginner aids">
            <label className="check">
              <input type="checkbox" checked={s.showFingering} onChange={bool('showFingering')} /> Show fingering numbers
            </label>
            <label className="field">
              Note names on the music
              <select value={s.noteNames} onChange={(e) => update({ noteNames: e.target.value as Settings['noteNames'] })}>
                <option value="auto">Automatic: fade out as I master a piece</option>
                <option value="on">Always</option>
                <option value="off">Never</option>
              </select>
            </label>
            <label className="field">
              Falling-notes look-ahead: {s.lookAheadSec} s
              <input type="range" min={1} max={8} step={0.5} value={s.lookAheadSec} onChange={num('lookAheadSec')} />
            </label>
          </Section>
          <Section title="Developer">
            <label className="check">
              <input type="checkbox" checked={s.debug} onChange={bool('debug')} /> Show the dev panel (spectrogram, event log, detector tuning). Also <code>?debug</code> in the URL.
            </label>
          </Section>
        </div>
      )}

      {tab === 'data' && (
        <Section title="Your data stays on this device">
          <p className="muted" style={{ marginTop: 0 }}>
            OpenKeys has no server and no account. Progress, imported pieces and calibration are stored in this browser. Export a backup to move them to another device.
          </p>
          <div className="row">
            <button className="btn primary" onClick={async () => downloadText(`openkeys-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup())}>
              Export backup
            </button>
            <button
              className="btn"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async () => {
                  const f = input.files?.[0];
                  if (!f) return;
                  try {
                    const r = await importBackup(await f.text());
                    toast(`Restored ${r.sessions} sessions and ${r.scores} pieces.`, 'good');
                  } catch (e) {
                    toast((e as Error).message, 'bad');
                  }
                };
                input.click();
              }}
            >
              Import backup
            </button>
          </div>
        </Section>
      )}

      {tab === 'about' && <About />}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card col">
      <h2 style={{ marginBottom: 0 }}>{title}</h2>
      {children}
    </section>
  );
}
