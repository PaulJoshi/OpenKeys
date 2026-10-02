import { useEffect, useState } from 'react';
import { progressOverview, type ProgressOverview } from '../../core/progress/stats';
import { useApp } from '../store';
import { BarChart, TrendChart } from '../charts/Charts';
import { exportBackup } from '../../core/progress/progress';
import { downloadText } from '../importer';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ProgressScreen() {
  const goal = useApp((s) => s.settings.dailyGoalMin);
  const [p, setP] = useState<ProgressOverview | null>(null);
  const [table, setTable] = useState(false);
  useEffect(() => void progressOverview().then(setP), []);
  if (!p) return <div className="page muted">Loading…</div>;
  const judged = p.sessions.filter((s) => s.mode !== 'listen').slice(0, 40).reverse();
  return (
    <div className="page">
      <h1>Progress</h1>
      <div className="grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="big-number">{p.streak}</div>
          <div className="muted">day streak</div>
        </div>
        <div className="card">
          <div className="big-number">
            {Math.round(p.todayMinutes)}/{goal}
          </div>
          <div className="muted">minutes today</div>
        </div>
        <div className="card">
          <div className="big-number">{p.totalMinutes}</div>
          <div className="muted">minutes in total</div>
        </div>
        <div className="card">
          <div className="big-number">{p.sessions.length}</div>
          <div className="muted">takes logged</div>
        </div>
      </div>
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Practice time, last 14 days</h2>
        <BarChart data={p.days.map((d) => ({ x: d.date, y: d.minutes, tick: d.date.slice(8) }))} goal={goal} unit="min" label="Minutes practised per day" />
      </section>
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Accuracy and timing</h2>
          <button className="btn small" onClick={() => setTable(!table)}>
            {table ? 'Chart' : 'Table'}
          </button>
        </div>
        {table ? (
          <table className="table small">
            <thead>
              <tr>
                <th>When</th>
                <th>Piece</th>
                <th>Mode</th>
                <th>Tempo</th>
                <th>Notes</th>
                <th>Timing</th>
                <th>Stars</th>
              </tr>
            </thead>
            <tbody>
              {p.sessions.slice(0, 40).map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.startedAt).toLocaleString()}</td>
                  <td>{s.scoreTitle}</td>
                  <td>{s.mode}</td>
                  <td>{pct(s.tempoFactor)}</td>
                  <td>{pct(s.accuracy)}</td>
                  <td>{s.mode === 'wait' ? '–' : pct(s.timing)}</td>
                  <td>{'★'.repeat(s.stars)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TrendChart points={judged.map((s) => ({ label: `${new Date(s.startedAt).toLocaleDateString()} · ${s.scoreTitle}`, a: s.accuracy, b: s.mode === 'wait' ? s.accuracy : s.timing }))} label="Note accuracy and timing per take" />
        )}
      </section>
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Skills (last 30 days)</h2>
        <div className="col">
          {p.skills.map((s) => (
            <div key={s.key} className="row">
              <span style={{ width: 160 }}>{s.label}</span>
              <div className="progress grow" aria-label={`${s.label} ${s.value === null ? 'no data' : pct(s.value)}`}>
                <div style={{ width: `${(s.value ?? 0) * 100}%` }} />
              </div>
              <span className="small" style={{ width: 90, textAlign: 'right' }}>
                {s.value === null ? 'not yet' : pct(s.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="small muted">Reading comes from wait-mode and play-along accuracy, rhythm from timing, hand independence from two-hand takes, dynamics from MIDI or mic takes on pieces with dynamics.</p>
      </section>
      <button className="btn" onClick={async () => downloadText(`openkeys-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup())}>
        Export all progress (JSON)
      </button>
    </div>
  );
}
