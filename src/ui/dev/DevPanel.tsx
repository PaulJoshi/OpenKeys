import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { practice } from '../practice/controller';
import type { AnalysisFrame } from '../../core/input/mic/frames';
import { LOG_BIN_COUNT, freqToLogBin } from '../../core/input/mic/spectrum';
import { DEFAULT_DETECTOR_PARAMS, type DetectorParams } from '../../core/input/mic/params';
import { midiToFreq, midiToName } from '../../core/music';
import type { MicStats } from '../../core/input/mic/mic';
import type { MidiMonitorEntry } from '../../core/input/midi/midi';
import { formatBytes } from '../../core/input/midi/parse';
import { downloadText } from '../importer';
import { TakesTab } from './TakesTab';

type Tab = 'signal' | 'events' | 'detector' | 'stats' | 'midi' | 'takes';

const FRAMES = 600;

/** Developer panel (?debug or Settings → Display → Developer). */
export function DevPanel() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('signal');
  if (!open)
    return (
      <button className="btn small" style={{ position: 'fixed', right: 12, top: 12, zIndex: 120 }} onClick={() => setOpen(true)}>
        Dev
      </button>
    );
  return (
    <div className="card dev-panel" style={{ position: 'fixed', right: 12, top: 12, width: 'min(620px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 24px)', overflow: 'auto', zIndex: 120 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="seg">
          {(['signal', 'events', 'detector', 'stats', 'midi', 'takes'] as Tab[]).map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Hide dev panel">
          <Icon name="x" size={14} />
        </button>
      </div>
      {tab === 'signal' && <SignalTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'detector' && <DetectorTab />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'midi' && <MidiTab />}
      {tab === 'takes' && <TakesTab />}
    </div>
  );
}

function SignalTab() {
  const spec = useRef<HTMLCanvasElement>(null);
  const odf = useRef<HTMLCanvasElement>(null);
  const pitch = useRef<HTMLCanvasElement>(null);
  const [evidence, setEvidence] = useState<string>('');
  useEffect(() => {
    const frames: AnalysisFrame[] = [];
    const mic = runtime.mic;
    if (!mic) return;
    const sc = spec.current!;
    const sctx = sc.getContext('2d')!;
    sc.width = 560;
    sc.height = 240;
    const img = sctx.createImageData(1, sc.height);
    const off = mic.frames.on((f) => {
      frames.push(f);
      if (frames.length > FRAMES) frames.shift();
      if (f.spectrum) {
        // Scroll the spectrogram one column.
        sctx.drawImage(sc, -1, 0);
        for (let y = 0; y < sc.height; y++) {
          const b = Math.floor(((sc.height - 1 - y) / sc.height) * LOG_BIN_COUNT);
          const db = f.spectrum[b];
          const v = Math.max(0, Math.min(1, (db + 100) / 80));
          const i = y * 4;
          img.data[i] = Math.round(255 * Math.min(1, v * 1.6));
          img.data[i + 1] = Math.round(255 * Math.max(0, v - 0.35) * 1.5);
          img.data[i + 2] = Math.round(255 * Math.max(0, 0.6 - v));
          img.data[i + 3] = 255;
        }
        sctx.putImageData(img, sc.width - 1, 0);
        // Expected notes' partials as cyan ticks.
        const exp = practice.session?.expectedNear(runtime.engine?.now() ?? 0) ?? [];
        sctx.fillStyle = '#0ff';
        for (const e of exp) {
          for (let k = 1; k <= 8; k++) {
            const bin = freqToLogBin(k * midiToFreq(e.midi));
            if (bin < 0 || bin >= LOG_BIN_COUNT) continue;
            const y = sc.height - 1 - (bin / LOG_BIN_COUNT) * sc.height;
            sctx.fillRect(sc.width - 3, y, 3, 1);
          }
        }
      }
    });
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const oc = odf.current;
      const pc = pitch.current;
      if (!oc || !pc) return;
      for (const c of [oc, pc]) {
        c.width = 560;
        c.height = 110;
      }
      const o = oc.getContext('2d')!;
      o.fillStyle = '#000';
      o.fillRect(0, 0, 560, 110);
      const maxV = Math.max(0.3, ...frames.map((f) => f.odf));
      const x = (i: number) => (i / FRAMES) * 560;
      const y = (v: number) => 105 - (v / maxV) * 100;
      o.strokeStyle = '#3ccf91';
      o.beginPath();
      frames.forEach((f, i) => (i ? o.lineTo(x(i), y(f.odf)) : o.moveTo(x(i), y(f.odf))));
      o.stroke();
      o.strokeStyle = '#f0b04a';
      o.beginPath();
      frames.forEach((f, i) => (i ? o.lineTo(x(i), y(f.threshold)) : o.moveTo(x(i), y(f.threshold))));
      o.stroke();
      o.fillStyle = '#ff6b74';
      frames.forEach((f, i) => f.onset && o.fillRect(x(i) - 1, 0, 2, 110));
      o.fillStyle = '#fff';
      o.fillText('onset function (green), threshold (amber), onsets (red)', 6, 12);
      const p = pc.getContext('2d')!;
      p.fillStyle = '#000';
      p.fillRect(0, 0, 560, 110);
      const lo = 21;
      const hi = 108;
      for (const [i, f] of frames.entries()) {
        if (!f.f0) continue;
        const m = 69 + 12 * Math.log2(f.f0 / 440);
        p.fillStyle = f.octaveAmbiguous ? `rgba(255,107,116,${f.clarity})` : `rgba(107,156,255,${f.clarity})`;
        p.fillRect(x(i), 105 - ((m - lo) / (hi - lo)) * 100, 2, 2);
      }
      p.fillStyle = '#fff';
      const live = runtime.mic?.tracker.live;
      p.fillText(`pitch track (blue = clarity, red = octave unsure) ${live && live.midi ? `${midiToName(Math.round(live.midi))} ${live.cents > 0 ? '+' : ''}${Math.round(live.cents)}¢` : ''}`, 6, 12);
      const ev = practice.evidenceDebug();
      setEvidence((prev) => (prev === ev ? prev : ev));
    };
    raf = requestAnimationFrame(draw);
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);
  if (!runtime.mic) return <p className="muted">Start the microphone to see the signal.</p>;
  return (
    <div className="col" style={{ gap: 6, marginTop: 8 }}>
      <canvas ref={spec} style={{ height: 240 }} aria-label="Spectrogram" />
      <div className="small muted">Spectrogram (log frequency, A0–G9). Cyan ticks: expected notes' partials.</div>
      <canvas ref={odf} style={{ height: 110 }} />
      <canvas ref={pitch} style={{ height: 110 }} />
      {evidence && <div className="log">{evidence}</div>}
    </div>
  );
}

function EventsTab() {
  const [, force] = useState(0);
  useEffect(() => {
    const offs = [runtime.allEvents.on(() => force((x) => x + 1)), practice.feedback.on(() => force((x) => x + 1))];
    return () => offs.forEach((o) => o());
  }, []);
  const log = runtime.bus.log.slice(-200);
  return (
    <div className="col" style={{ marginTop: 8 }}>
      <div className="row">
        <button className="btn small" onClick={() => downloadText(`openkeys-events-${Date.now()}.json`, JSON.stringify(runtime.bus.log, null, 1))}>
          Export JSON
        </button>
        <button className="btn small" onClick={() => runtime.bus.log.splice(0)}>
          Clear
        </button>
      </div>
      <div className="log">
        {log
          .slice()
          .reverse()
          .map((e, i) => (
            <div key={i}>
              {e.time.toFixed(3)} {e.source.padEnd(7)} {e.kind.padEnd(7)} {e.kind === 'pedal' ? `CC${e.midi}` : midiToName(e.midi).padEnd(4)} v={e.velocity?.toFixed(2) ?? '-'} c={e.confidence.toFixed(2)}
              {e.cents !== undefined ? ` ${e.cents}¢` : ''}
              {e.octaveUncertain ? ' oct?' : ''}
            </div>
          ))}
      </div>
    </div>
  );
}

const SLIDERS: { key: keyof DetectorParams; label: string; min: number; max: number; step: number }[] = [
  { key: 'yinThreshold', label: 'YIN threshold', min: 0.05, max: 0.3, step: 0.01 },
  { key: 'mpmK', label: 'MPM k', min: 0.8, max: 0.99, step: 0.01 },
  { key: 'onsetDelta', label: 'Onset delta', min: 0.02, max: 0.5, step: 0.01 },
  { key: 'onsetMultiplier', label: 'Onset multiplier', min: 1, max: 4, step: 0.1 },
  { key: 'onsetMedianFrames', label: 'Onset median frames', min: 8, max: 64, step: 1 },
  { key: 'onsetMinSnrDb', label: 'Noise gate (dB above floor)', min: 4, max: 30, step: 1 },
  { key: 'onsetWeakRatio', label: 'Weak onset ratio', min: 0.2, max: 1, step: 0.05 },
  { key: 'onsetMinGap', label: 'Onset min gap (s)', min: 0.01, max: 0.1, step: 0.005 },
  { key: 'medianFrames', label: 'Pitch median frames', min: 1, max: 7, step: 1 },
  { key: 'hysteresisCents', label: 'Hysteresis (cents)', min: 0, max: 45, step: 1 },
  { key: 'pitchWaitMax', label: 'Max pitch wait (s)', min: 0.03, max: 0.2, step: 0.005 },
  { key: 'partials', label: 'Template partials', min: 4, max: 16, step: 1 },
  { key: 'inharmonicity', label: 'Inharmonicity B', min: 0, max: 0.002, step: 0.00005 },
  { key: 'partialToleranceCents', label: 'Partial tolerance (cents)', min: 10, max: 80, step: 1 },
  { key: 'presenceThreshold', label: 'Presence threshold', min: 0.1, max: 0.9, step: 0.01 },
  { key: 'confidenceThreshold', label: 'Confidence threshold (uncertain below)', min: 0.2, max: 0.9, step: 0.01 },
  { key: 'wrongNoteThreshold', label: 'Wrong-note threshold', min: 0.2, max: 0.9, step: 0.01 },
];

function DetectorTab() {
  const d = useApp((s) => s.settings.detector);
  const update = useApp((s) => s.updateSettings);
  return (
    <div className="col" style={{ marginTop: 8 }}>
      <label className="row small">
        Pitch algorithm
        <select value={d.pitchAlgorithm} onChange={(e) => update({ detector: { ...d, pitchAlgorithm: e.target.value as 'yin' | 'mpm' } })}>
          <option value="yin">YIN</option>
          <option value="mpm">MPM</option>
        </select>
      </label>
      {SLIDERS.map((s) => (
        <label key={s.key} className="field small">
          {s.label}: {String(d[s.key])}
          <input type="range" min={s.min} max={s.max} step={s.step} value={Number(d[s.key])} onChange={(e) => update({ detector: { ...d, [s.key]: Number(e.target.value) } })} />
        </label>
      ))}
      <button className="btn small" onClick={() => update({ detector: DEFAULT_DETECTOR_PARAMS })}>
        Reset to defaults
      </button>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<MicStats | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const off = runtime.mic?.stats.on(setStats);
    const id = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => {
      off?.();
      window.clearInterval(id);
    };
  }, []);
  const eng = runtime.engine;
  const cal = runtime.calibration;
  const ms = (x?: number) => (x === undefined ? '—' : `${(x * 1000).toFixed(1)} ms`);
  return (
    <table className="table small" style={{ marginTop: 8 }}>
      <tbody>
        <tr>
          <td>AudioContext</td>
          <td>
            {eng ? `${eng.ctx.state}, ${eng.ctx.sampleRate} Hz, base ${ms(eng.ctx.baseLatency)}, output ${ms(eng.ctx.outputLatency)}` : 'not started'}
          </td>
        </tr>
        <tr>
          <td>Judging offset</td>
          <td>
            mic {ms(runtime.mic?.tracker.opts.latency)} · MIDI {ms(runtime.midi?.latency)}
          </td>
        </tr>
        <tr>
          <td>Loopback</td>
          <td>{cal.loopback ? `total ${ms(cal.loopback.totalSec)} (output ${ms(cal.loopback.outputSec)}, input ${ms(cal.loopback.inputSec)})` : '—'}</td>
        </tr>
        <tr>
          <td>Worklet CPU</td>
          <td>{stats ? `avg ${stats.avgCostMs.toFixed(2)} ms / max ${stats.maxCostMs.toFixed(1)} ms per ${stats.budgetMs.toFixed(2)} ms quantum (${((stats.avgCostMs / stats.budgetMs) * 100).toFixed(0)}%)` : '—'}</td>
        </tr>
        <tr>
          <td>Audio underruns</td>
          <td>{stats ? stats.underruns : '—'}</td>
        </tr>
        <tr>
          <td>Noise floor</td>
          <td>{stats ? `${stats.floorDb.toFixed(1)} dB` : '—'}</td>
        </tr>
        <tr>
          <td>Mic processing</td>
          <td>{runtime.mic?.warnings ? (runtime.mic.warnings.ignored.length ? `browser kept: ${runtime.mic.warnings.ignored.join(', ')}` : 'raw (all off)') : '—'}</td>
        </tr>
      </tbody>
    </table>
  );
}

function MidiTab() {
  const [entries, setEntries] = useState<MidiMonitorEntry[]>([]);
  useEffect(() => runtime.midi?.monitor.on((e) => setEntries((prev) => [...prev.slice(-150), e])), []);
  if (!runtime.midi) return <p className="muted">Connect a MIDI keyboard to see raw messages.</p>;
  return (
    <div className="log" style={{ marginTop: 8 }}>
      {entries
        .slice()
        .reverse()
        .map((e, i) => (
          <div key={i}>
            {e.perfMs.toFixed(1)}ms → {e.audioTime.toFixed(4)}s [{formatBytes(e.bytes)}] {e.parsed ? JSON.stringify(e.parsed) : '(ignored)'}
          </div>
        ))}
    </div>
  );
}
