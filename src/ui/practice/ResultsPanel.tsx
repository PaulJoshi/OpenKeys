import type { TakeResult } from '../../core/judge/types';
import type { Score } from '../../core/types';
import { VERDICT_STYLE } from './live';
import { Icon, Stars } from '../components/Icon';

interface Props {
  score: Score;
  result: TakeResult;
  micMode: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPractise: (startMeasure: number, endMeasure: number, tempo: number) => void;
  onReplay?: () => void;
}

/** Bar accuracy as design-system feedback colours: green = solid, red = needs work, greys between. */
export function heatColor(acc: number): { background: string; color: string } {
  if (acc >= 0.95) return { background: 'var(--ok-green)', color: 'var(--ok-white)' };
  if (acc >= 0.85) return { background: 'var(--ok-green-bright)', color: 'var(--ok-white)' };
  if (acc >= 0.7) return { background: 'var(--ok-hairline)', color: 'var(--ok-ink)' };
  if (acc >= 0.5) return { background: 'var(--ok-accent-pink-soft)', color: 'var(--ok-ink)' };
  return { background: 'var(--ok-red)', color: 'var(--ok-white)' };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ResultsPanel({ score, result, micMode, onClose, onRetry, onPractise, onReplay }: Props) {
  const measureNo = (i: number) => score.measures[i]?.number ?? i + 1;
  const counts = new Map<string, number>();
  for (const r of result.notes) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1);
  const headline =
    result.stars === 3 ? 'Excellent!' : result.stars === 2 ? 'Well played!' : result.stars === 1 ? 'Good progress.' : 'Keep at it: slow it down and try again.';
  return (
    <div className="card results" role="dialog" aria-label="Take results">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Stars earned={result.stars} size={24} />
          <h2 style={{ margin: 0 }}>{headline}</h2>
        </div>
        <button className="btn ghost" onClick={onClose} aria-label="Close results">
          <Icon name="x" />
        </button>
      </div>
      <div className="row" style={{ gap: 28, margin: '16px 0' }}>
        <Stat label="Notes" value={pct(result.accuracy)} />
        {result.mode !== 'wait' && <Stat label="Timing" value={pct(result.timing)} />}
        {result.dynamics !== null && <Stat label={micMode ? 'Dynamics (approx.)' : 'Dynamics'} value={pct(result.dynamics)} />}
        <Stat label="Best streak" value={String(result.longestStreak)} />
        <Stat label="Tempo" value={pct(result.tempoFactor)} />
      </div>
      <div className="row small" style={{ gap: 14, marginBottom: 12 }}>
        {(['perfect', 'good', 'ok', 'early', 'late', 'wrong', 'missed', 'uncertain'] as const)
          .filter((v) => counts.get(v))
          .map((v) => (
            <span key={v} className="pill" style={{ color: VERDICT_STYLE[v].color }}>
              <span aria-hidden="true">{VERDICT_STYLE[v].icon}</span> {VERDICT_STYLE[v].label} {counts.get(v)}
            </span>
          ))}
        {result.extraCount > 0 && <span className="pill bad">+ Extra {result.extraCount}</span>}
      </div>
      {result.uncertainCount > 0 && (
        <div className="notice info small" style={{ marginBottom: 12 }}>
          {result.uncertainCount} note{result.uncertainCount === 1 ? ' was' : 's were'} too unclear to judge through the microphone and did not count against you.
        </div>
      )}
      {result.coaching.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h3>Tips</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.coaching.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <h3>Bar by bar</h3>
      <div className="heatmap" style={{ marginBottom: 14 }}>
        {score.measures.map((m) => {
          const acc = result.measureAccuracy.get(m.index);
          return (
            <button
              key={m.index}
              className="cell"
              style={acc === undefined ? { background: 'var(--bg-3)', color: 'var(--fg-3)' } : heatColor(acc)}
              title={acc === undefined ? `Bar ${measureNo(m.index)}: not played` : `Bar ${measureNo(m.index)}: ${pct(acc)}`}
              onClick={() => onPractise(m.index, m.index, Math.min(result.tempoFactor, 0.8))}
            >
              {measureNo(m.index)}
            </button>
          );
        })}
      </div>
      {result.troubleSpots.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h3>Trouble spots</h3>
          <div className="col">
            {result.troubleSpots.map((t) => (
              <div key={`${t.startMeasure}-${t.endMeasure}`} className="row">
                <span className="grow">
                  <b>{t.startMeasure === t.endMeasure ? `Bar ${measureNo(t.startMeasure)}` : `Bars ${measureNo(t.startMeasure)}–${measureNo(t.endMeasure)}`}</b>
                  <span className="muted">
                    {' '}
                    · {pct(t.accuracy)} · {t.reason}
                  </span>
                </span>
                <button className="btn small primary" onClick={() => onPractise(t.startMeasure, t.endMeasure, t.suggestedTempo)}>
                  Practise this at {pct(t.suggestedTempo)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="row">
        <button className="btn primary big" onClick={onRetry}>
          Try again
        </button>
        {onReplay && (
          <button className="btn" onClick={onReplay}>
            Replay my take
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="big-number">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}
