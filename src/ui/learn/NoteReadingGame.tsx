import { useEffect, useRef, useState } from 'react';
import { runtime } from '../runtime';
import { kvGet, kvSet } from '../../core/progress/db';
import { nextReadingNote, recordReading, rng, type NoteReadingStats } from '../../core/learn/drills';
import { midiToName } from '../../core/music';
import { Staff } from './Staff';
import { InputStatus } from '../components/InputStatus';

/** A note appears on the staff; play it as fast as you can. Reaction time is tracked per note. */
export function NoteReadingGame() {
  const [clef, setClef] = useState<'treble' | 'bass'>('treble');
  const [naturals, setNaturals] = useState(true);
  const [note, setNote] = useState<number | null>(null);
  const [mark, setMark] = useState<'good' | 'bad' | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, lastMs: 0 });
  const [running, setRunning] = useState(false);
  const stats = useRef<NoteReadingStats>({ perNote: {} });
  const shownAt = useRef(0);
  const r = useRef(rng(Date.now() & 0xffff));

  useEffect(() => {
    void kvGet<NoteReadingStats>('noteReading').then((s) => s && (stats.current = s));
  }, []);

  const next = () => {
    const c = clef;
    let m = nextReadingNote(c, stats.current, r.current, naturals);
    if (c === 'treble' && m < 57) m += 12;
    setNote(m);
    setMark(null);
    shownAt.current = performance.now();
  };

  useEffect(() => {
    if (!running) return;
    return runtime.bus.events.on((e) => {
      if (e.kind !== 'noteOn' || note === null || mark === 'good' || e.confidence < 0.5) return;
      const ms = performance.now() - shownAt.current;
      // Mic: an octave slip counts as wrong, but enharmonic spelling never matters.
      const ok = e.midi === note;
      stats.current = recordReading(stats.current, note, ok, ms);
      void kvSet('noteReading', stats.current);
      setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0, lastMs: ok ? ms : s.lastMs }));
      setMark(ok ? 'good' : 'bad');
      if (ok) window.setTimeout(next, 350);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, note, mark]);

  const slowest = Object.entries(stats.current.perNote)
    .filter(([, s]) => s.correct > 0)
    .sort((a, b) => b[1].meanMs - a[1].meanMs)
    .slice(0, 4);

  return (
    <div className="col">
      <div className="row">
        <div className="seg">
          {(['treble', 'bass'] as const).map((c) => (
            <button key={c} aria-pressed={clef === c} onClick={() => setClef(c)}>
              {c === 'treble' ? 'Treble clef' : 'Bass clef'}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={!naturals} onChange={(e) => setNaturals(!e.target.checked)} /> Include sharps
        </label>
        <button
          className="btn primary"
          onClick={() => {
            void runtime.ensureAudio();
            setRunning(true);
            next();
          }}
        >
          {running ? 'Restart' : 'Start'}
        </button>
      </div>
      <InputStatus />
      <div className="row" style={{ alignItems: 'center', gap: 24 }}>
        <Staff midi={note} clef={clef} mark={mark} />
        <div>
          <div className="big-number">
            {score.right}/{score.total}
          </div>
          <div className="muted small">right · streak {score.streak}</div>
          {score.lastMs > 0 && <div className="small">last: {(score.lastMs / 1000).toFixed(2)} s</div>}
          {mark === 'bad' && note !== null && <div className="small" style={{ color: 'var(--bad)' }}>Not that one. Try again.</div>}
          {mark === 'good' && note !== null && <div className="small" style={{ color: 'var(--good)' }}>Correct: {midiToName(note, false)}</div>}
        </div>
      </div>
      {slowest.length > 0 && (
        <div className="small muted">
          Your slowest notes: {slowest.map(([m, s]) => `${midiToName(Number(m))} (${(s.meanMs / 1000).toFixed(1)} s)`).join(', ')}. They come up more often.
        </div>
      )}
      <div className="small muted">Tip: name the note in your head before you look for the key.</div>
    </div>
  );
}
