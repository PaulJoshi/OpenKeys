import { useMemo, useRef, useState } from 'react';
import type { TakeResult } from '../../core/judge/types';
import type { Score } from '../../core/types';
import { PianoRoll, type RollNote } from '../components/PianoRoll';
import { runtime } from '../runtime';
import { practice } from './controller';
import { verdictHex } from './live';
import { useDark } from '../hooks';
import { TempoMap } from '../../core/score/tempo';
import { Icon } from '../components/Icon';

/** Take replay: the learner's take next to the reference, with a piano-roll overlay. */
export function TakeReplay({ score, result, onClose }: { score: Score; result: TakeResult; onClose: () => void }) {
  const dark = useDark();
  const played = practice.lastTakePlayed;
  const startT = useRef(0);
  const [playing, setPlaying] = useState(false);
  const { expected, mine, t0 } = useMemo(() => {
    const byId = new Map(score.notes.map((n) => [n.id, n]));
    const tm = new TempoMap(score.tempoMap, result.tempoFactor);
    // Place expected notes at their scheduled time (play-along) or where the learner reached them.
    const hits = result.notes.filter((r) => r.expectedTime !== undefined || r.playedTime !== undefined);
    const anchor = hits.find((r) => r.expectedTime !== undefined);
    const base = Math.min(...[...played.map((p) => p.time), ...hits.map((r) => r.expectedTime ?? r.playedTime ?? Infinity)]);
    const exp: RollNote[] = result.notes.map((r) => {
      const n = byId.get(r.noteId)!;
      let t: number;
      if (r.expectedTime !== undefined) t = r.expectedTime;
      else if (r.playedTime !== undefined) t = r.playedTime;
      else if (anchor) t = anchor.expectedTime! + tm.beatToSec(n.startBeat) - tm.beatToSec(byId.get(anchor.noteId)!.startBeat);
      else t = base + tm.beatToSec(n.startBeat);
      return { midi: n.midi, start: t - base, duration: Math.max(0.1, tm.durationSec(n.startBeat, n.durationBeats)), color: verdictHex(r.verdict, dark), hand: n.hand };
    });
    const mineN: RollNote[] = played.map((p) => ({ midi: p.midi, start: p.time - base, duration: p.duration, hand: p.midi < 60 ? 'L' : 'R' }));
    return { expected: exp, mine: mineN, t0: base };
  }, [score, result, played, dark]);
  void t0;
  const end = Math.max(1, ...expected.map((n) => n.start + n.duration), ...mine.map((n) => n.start + n.duration));

  const play = async (which: 'mine' | 'ref' | 'both') => {
    const eng = await runtime.ensureAudio();
    eng.piano.stopAll();
    const s = eng.now() + 0.15;
    startT.current = s;
    if (which !== 'ref') for (const n of mine) eng.piano.play(n.midi, 0.65, s + n.start, n.duration);
    if (which !== 'mine') for (const n of expected) eng.piano.play(n.midi, which === 'both' ? 0.35 : 0.6, s + n.start, n.duration);
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), (end + 0.5) * 1000);
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Take replay">
      <div className="modal" style={{ maxWidth: 980 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Your take vs. the score</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close replay">
            <Icon name="x" />
          </button>
        </div>
        <p className="small muted">Outlines are the written notes (coloured by verdict); filled bars are what you played.</p>
        <PianoRoll expected={expected} played={mine} height={300} cursor={() => (playing && runtime.engine ? runtime.engine.now() - startT.current : null)} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void play('mine')}>
            <Icon name="play" size={16} /> My take
          </button>
          <button className="btn" onClick={() => void play('ref')}>
            <Icon name="play" size={16} /> Reference
          </button>
          <button className="btn" onClick={() => void play('both')}>
            <Icon name="play" size={16} /> Both together
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              runtime.engine?.piano.stopAll();
              setPlaying(false);
            }}
          >
            <Icon name="square" size={16} /> Stop
          </button>
        </div>
      </div>
    </div>
  );
}
