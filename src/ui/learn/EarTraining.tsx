import { useEffect, useRef, useState } from 'react';
import { runtime } from '../runtime';
import { compareEar, earPhrase, type EarPhrase } from '../../core/learn/drills';
import { midiToName } from '../../core/music';
import { InputStatus } from '../components/InputStatus';
import { useApp } from '../store';
import { Icon } from '../components/Icon';

/** The app plays a short phrase or interval; the learner plays it back. */
export function EarTraining() {
  const [level, setLevel] = useState(1);
  const [phrase, setPhrase] = useState<EarPhrase | null>(null);
  const [played, setPlayed] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof compareEar> | null>(null);
  const [tally, setTally] = useState({ right: 0, total: 0 });
  const seed = useRef(Date.now() & 0xffff);
  const micMode = useApp((s) => s.settings.inputSource === 'mic');

  const play = async (p: EarPhrase | null = phrase) => {
    if (!p) return;
    const eng = await runtime.ensureAudio();
    const t0 = eng.now() + 0.1;
    p.notes.forEach((m, i) => {
      eng.piano.play(m, 0.65, t0 + i * 0.6, 0.55);
      eng.log.addNote(m, t0 + i * 0.6, t0 + i * 0.6 + 0.55);
    });
  };

  const fresh = () => {
    const p = earPhrase(level, ++seed.current);
    setPhrase(p);
    setPlayed([]);
    setResult(null);
    void play(p);
  };

  useEffect(
    () =>
      runtime.bus.events.on((e) => {
        if (e.kind !== 'noteOn' || !phrase || result || e.confidence < 0.5) return;
        // Ignore the app's own sound in mic mode.
        if (e.source === 'mic' && runtime.engine?.log.soundingAt(e.time, 0.2).includes(e.midi)) return;
        setPlayed((prev) => {
          const next = [...prev, e.midi];
          if (next.length >= phrase.notes.length) {
            const r = compareEar(phrase.notes, next);
            setResult(r);
            setTally((t) => ({ right: t.right + (r.allRight ? 1 : 0), total: t.total + 1 }));
          }
          return next;
        });
      }),
    [phrase, result],
  );

  return (
    <div className="col">
      <div className="row">
        <label className="row small">
          Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            <option value={1}>1 · simple intervals</option>
            <option value={2}>2 · all intervals</option>
            <option value={3}>3 · short phrases</option>
            <option value={4}>4 · longer phrases</option>
          </select>
        </label>
        <button className="btn primary" onClick={fresh}>
          {phrase ? 'Next' : 'Start'}
        </button>
        <button className="btn" onClick={() => void play()} disabled={!phrase}>
          <Icon name="play" size={16} /> Hear it again
        </button>
        <span className="muted small">
          {tally.right}/{tally.total} right
        </span>
      </div>
      <InputStatus />
      {micMode && <div className="notice small">Mic mode: use headphones so the microphone doesn't hear the app's phrase.</div>}
      {phrase && (
        <div className="card">
          <div className="muted small">{level <= 2 ? 'Play the two notes you heard, starting on the first one.' : 'Play the phrase back.'} The first note is {midiToName(phrase.notes[0])}.</div>
          <div style={{ fontSize: 'var(--type-heading-lg-size)', fontWeight: 500, margin: '8px 0' }}>
            {phrase.notes.map((_, i) => (
              <span key={i} style={{ marginRight: 14, color: result ? (result.correct[i] ? 'var(--good)' : 'var(--bad)') : undefined }}>
                {played[i] !== undefined ? midiToName(played[i]) : '·'}
              </span>
            ))}
          </div>
          {result && (
            <div className={`notice ${result.allRight ? 'good' : 'warn'}`}>
              {result.allRight
                ? `Yes! ${phrase.description}.`
                : result.transposedBy !== null
                  ? `Right shape, but started ${Math.abs(result.transposedBy)} semitone${Math.abs(result.transposedBy) > 1 ? 's' : ''} ${result.transposedBy > 0 ? 'high' : 'low'}. It was ${phrase.notes.map((m) => midiToName(m)).join(' ')}.`
                  : `It was ${phrase.notes.map((m) => midiToName(m)).join(' ')} (${phrase.description}). Listen again and try once more.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
