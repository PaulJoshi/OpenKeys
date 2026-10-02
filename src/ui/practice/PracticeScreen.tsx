import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HandSelection, PracticeMode, Score } from '../../core/types';
import type { TakeResult } from '../../core/judge/types';
import { measureAtBeat, scoreEndBeat } from '../../core/score/tempo';
import { noteRange } from '../../core/score/validate';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { useDark } from '../hooks';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { InputMeter } from '../components/InputMeter';
import { SheetView } from './SheetView';
import { FallingNotes } from './FallingNotes';
import { ResultsPanel } from './ResultsPanel';
import { practice } from './controller';
import { practiceLive } from './live';
import { feedbackText } from './feedbackCopy';
import { measureMastery, pieceMastery } from '../../core/progress/progress';

const MODES: { id: PracticeMode; label: string; hint: string }[] = [
  { id: 'listen', label: 'Listen', hint: 'Hear the piece; the cursor follows.' },
  { id: 'wait', label: 'Wait', hint: 'The music waits for the right notes. Best for learning.' },
  { id: 'playalong', label: 'Play along', hint: 'Keep up with the music at your chosen tempo.' },
  { id: 'followme', label: 'Follow me', hint: 'Play at your own pace; the app follows you.' },
  { id: 'loop', label: 'Loop drill', hint: 'Repeat a passage; tempo rises with each clean pass.' },
];

export function PracticeScreen() {
  const score = useApp((s) => s.score);
  if (!score) return <NoScore />;
  return <Practice key={score.id} score={score} />;
}

function NoScore() {
  const go = useApp((s) => s.go);
  return (
    <div className="page">
      <h1>Practice</h1>
      <p className="muted">Choose a piece from the library or a lesson from the course to start practising.</p>
      <div className="row">
        <button className="btn primary big" onClick={() => go('library')}>
          Open the library
        </button>
        <button className="btn big" onClick={() => go('course')}>
          Go to the course
        </button>
      </div>
    </div>
  );
}

function Practice({ score }: { score: Score }) {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const go = useApp((s) => s.go);
  const dark = useDark();
  const hasL = score.notes.some((n) => n.hand === 'L');
  const hasR = score.notes.some((n) => n.hand !== 'L');
  const [mode, setMode] = useState<PracticeMode>('wait');
  const [hands, setHands] = useState<HandSelection>(hasL && hasR ? 'R' : hasL ? 'L' : 'R');
  const [tempo, setTempo] = useState(1);
  const [range, setRange] = useState<{ startMeasure: number; endMeasure: number } | null>(null);
  const [loopOn, setLoopOn] = useState(false);
  const [state, setState] = useState<string>('idle');
  const [result, setResult] = useState<TakeResult | null>(null);
  const [line, setLine] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const [rampTempo, setRampTempo] = useState<number | null>(null);
  const [nameOpacity, setNameOpacity] = useState(settings.noteNames === 'on' ? 1 : 0);
  const [baseC, setBaseC] = useState(runtime.virtual.baseC);
  const pulseRef = useRef<HTMLDivElement>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const running = state !== 'idle' && state !== 'finished';
  const micMode = settings.inputSource === 'mic';
  const r = noteRange(score.notes);
  const low = Math.min(settings.range.low, r.low);
  const high = Math.max(settings.range.high, r.high);

  useEffect(() => {
    practice.setScore(score);
    return () => practice.setScore(null);
  }, [score]);

  // Pending "practise this" requests from Today / Library (review items).
  useEffect(() => {
    const pending = useApp.getState().pendingDrill;
    if (pending) {
      useApp.getState().set({ pendingDrill: null });
      setRange({ startMeasure: pending.start, endMeasure: pending.end });
      setLoopOn(true);
      setMode('loop');
      setTempo(pending.tempo);
      setReviewId(pending.reviewId ?? null);
      practice.setIdleBeat(score.measures[pending.start]?.startBeat ?? 0);
    }
  }, [score]);

  // Note names fade out as mastery grows (auto mode).
  useEffect(() => {
    if (settings.noteNames !== 'auto') {
      setNameOpacity(settings.noteNames === 'on' ? 1 : 0);
      return;
    }
    void measureMastery(score.id).then((m) => setNameOpacity(Math.max(0, 1 - pieceMastery(m, score.measures.length) / 0.7)));
  }, [score, settings.noteNames, result]);

  useEffect(() => runtime.virtual.octaveChange.on(setBaseC), []);

  useEffect(() => {
    const offs = [
      practice.stateChange.on(setState),
      practice.takeEnded.on((res) => {
        setResult(res);
        setRampTempo(null);
        if (res) setLine('');
      }),
      practice.feedback.on((fb) => {
        const st = practice.session?.stats.streak ?? 0;
        setStreak(st);
        const t = feedbackText(fb, score, st);
        if (t) setLine(t);
        if (practice.session?.mode === 'loop') setRampTempo(practice.session.stats.currentTempo);
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [score]);

  // Visual metronome pulse.
  useEffect(() => {
    const eng = runtime.engine;
    if (!eng) return;
    return eng.player.pulse.on((p) => {
      const delay = Math.max(0, (p.time - eng.now()) * 1000);
      window.setTimeout(() => {
        const el = pulseRef.current;
        if (!el) return;
        el.classList.add(p.accent ? 'accent' : 'on');
        window.setTimeout(() => el.classList.remove('accent', 'on'), 110);
      }, delay);
    });
  }, [state]);

  const start = useCallback(
    (over?: Partial<{ mode: PracticeMode; range: typeof range; tempo: number; loop: boolean }>) => {
      setResult(null);
      setLine('');
      setStreak(0);
      const m = over?.mode ?? mode;
      const rg = over?.range !== undefined ? over.range : range;
      const startM = rg?.startMeasure ?? measureAtBeat(score, practice.idle);
      const effRange = rg ?? (startM > 0 ? { startMeasure: startM, endMeasure: score.measures.length - 1 } : null);
      void practice.start({ mode: m, hands, tempoFactor: over?.tempo ?? tempo, range: effRange, loop: over?.loop ?? (loopOn && !!rg), reviewId });
    },
    [mode, range, score, hands, tempo, loopOn, reviewId],
  );

  const stop = useCallback(() => practice.stop(), []);

  const toggle = useCallback(() => (practice.running ? stop() : start()), [start, stop]);

  const setLoopRange = (a: number, b: number) => {
    setRange({ startMeasure: a, endMeasure: b });
    setLoopOn(true);
    practice.setIdleBeat(score.measures[a].startBeat);
    practiceLive.loop = { startBeat: score.measures[a].startBeat, endBeat: score.measures[b].startBeat + score.measures[b].lengthBeats };
    practiceLive.changed();
  };

  const clearLoop = () => {
    setRange(null);
    setLoopOn(false);
    practiceLive.loop = null;
    practiceLive.changed();
  };

  const jumpMeasure = (m: number) => {
    const mm = Math.max(0, Math.min(score.measures.length - 1, m));
    if (practice.running) practice.stop(false);
    practice.setIdleBeat(score.measures[mm].startBeat);
    if (range && (mm < range.startMeasure || mm > range.endMeasure)) clearLoop();
  };

  // Keyboard shortcuts (letters need Shift while the computer keyboard plays notes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const letterOk = e.shiftKey || settings.inputSource !== 'virtual';
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const cur = measureAtBeat(score, practice.idle);
        jumpMeasure(cur + (e.code === 'ArrowRight' ? 1 : -1));
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        setTempo((x) => Math.min(1.5, Math.round((x + 0.05) * 100) / 100));
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        setTempo((x) => Math.max(0.25, Math.round((x - 0.05) * 100) / 100));
      } else if (e.code === 'KeyL' && letterOk) {
        e.preventDefault();
        if (range) clearLoop();
        else {
          const cur = measureAtBeat(score, practice.idle);
          setLoopRange(cur, Math.min(score.measures.length - 1, cur + 1));
        }
      } else if (e.code === 'KeyH' && letterOk) {
        e.preventDefault();
        if (hasL && hasR) setHands((h) => (h === 'R' ? 'L' : h === 'L' ? 'both' : 'R'));
      } else if (e.code === 'Enter' && practice.session?.mode === 'wait') {
        practice.skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggle, range, score, hasL, hasR, settings.inputSource]);

  // MIDI "restart loop" key.
  useEffect(() => {
    if (settings.restartKey === null) return;
    return runtime.bus.events.on((e) => {
      if (e.kind === 'noteOn' && e.source === 'midi' && e.midi === settings.restartKey) {
        practice.stop(false);
        window.setTimeout(() => start(), 50);
      }
    });
  }, [settings.restartKey, start]);

  const showSheet = settings.view !== 'falling';
  const showFalling = settings.view !== 'sheet';
  const modeHint = MODES.find((m) => m.id === mode)?.hint;
  const totalBeats = useMemo(() => scoreEndBeat(score), [score]);
  void totalBeats;
  const twoHandsInMic = micMode && hands === 'both' && hasL && hasR;
  const measureNo = (i: number) => score.measures[i]?.number ?? i + 1;

  return (
    <div className="practice">
      <div className="toolbar" role="toolbar" aria-label="Practice controls">
        <button className={`btn big ${running ? '' : 'primary'}`} onClick={toggle} aria-keyshortcuts="Space" style={{ minWidth: 120 }}>
          {running ? '■ Stop' : '▶ Start'}
        </button>
        <div className="seg" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} aria-pressed={mode === m.id} disabled={running} onClick={() => setMode(m.id)} title={m.hint}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="seg" aria-label="Hands">
          {(['L', 'R', 'both'] as const).map((h) => (
            <button
              key={h}
              aria-pressed={hands === h}
              disabled={running || (h === 'L' && !hasL) || (h === 'R' && !hasR) || (h === 'both' && !(hasL && hasR))}
              onClick={() => setHands(h)}
              aria-keyshortcuts="Shift+H"
            >
              {h === 'L' ? 'Left' : h === 'R' ? 'Right' : 'Both'}
            </button>
          ))}
        </div>
        <label className="row" style={{ gap: 6 }} title="Tempo (+/−)">
          <span className="small muted">Tempo</span>
          <input type="range" min={25} max={150} step={5} value={Math.round(tempo * 100)} disabled={running} onChange={(e) => setTempo(Number(e.target.value) / 100)} aria-label="Tempo percent" />
          <b style={{ minWidth: 48 }}>{Math.round((rampTempo ?? tempo) * 100)}%</b>
        </label>
        <button className={`btn small ${settings.metronome ? 'active' : ''}`} onClick={() => update({ metronome: !settings.metronome })} disabled={running} aria-pressed={settings.metronome}>
          Metronome
        </button>
        <div ref={pulseRef} className="pulse-dot" aria-hidden="true" title="Beat" />
        {range ? (
          <span className="pill">
            Loop bars {measureNo(range.startMeasure)}–{measureNo(range.endMeasure)}
            <button className="btn ghost small" onClick={clearLoop} disabled={running} aria-label="Clear loop">
              ✕
            </button>
          </span>
        ) : (
          <span className="small muted">Drag across bars to loop · <kbd>Shift</kbd>+<kbd>L</kbd></span>
        )}
        <div className="grow" />
        <div className="seg" aria-label="View">
          {(['sheet', 'both', 'falling'] as const).map((v) => (
            <button key={v} aria-pressed={settings.view === v} onClick={() => update({ view: v })}>
              {v === 'sheet' ? 'Sheet' : v === 'falling' ? 'Notes' : 'Both'}
            </button>
          ))}
        </div>
      </div>

      <div className="stage">
        {showSheet && (
          <SheetView
            score={score}
            showFingering={settings.showFingering}
            noteNameOpacity={nameOpacity}
            dark={dark}
            onMeasureClick={(m) => jumpMeasure(m)}
            onLoopSelect={(a, b) => !running && setLoopRange(a, b)}
          />
        )}
        {showFalling && <FallingNotes score={score} low={low} high={high} hands={hands} lookAheadSec={settings.lookAheadSec} dark={dark} showNames={nameOpacity > 0.3} />}
        {result && (
          <ResultsPanel
            score={score}
            result={result}
            micMode={micMode}
            onClose={() => setResult(null)}
            onRetry={() => start()}
            onPractise={(a, b, t) => {
              setLoopRange(a, b);
              setMode('loop');
              setTempo(t);
              setResult(null);
            }}
          />
        )}
      </div>

      <div className="bottom">
        <div className="row" style={{ marginBottom: 8 }}>
          <InputMeter />
          <div className="grow feedback-line" aria-live="polite">
            {line || (running ? '' : modeHint)}
          </div>
          {streak >= 3 && <span className="streak" title="Hit streak">🔥 {streak}</span>}
          <span className="small muted">
            {score.title}
            {score.variant ? ` · ${score.variant}` : ''}
          </span>
          <button className="btn small" onClick={() => go('library')} disabled={running}>
            Library
          </button>
        </div>
        {twoHandsInMic && <div className="notice info small" style={{ marginBottom: 6 }}>Chord detection is approximate in mic mode; unclear notes are marked “?” and never count against you.</div>}
        {micMode && !settings.micAllowSpeakerPlayback && mode !== 'listen' && hands !== 'both' && settings.accompaniment && (
          <div className="notice small" style={{ marginBottom: 6 }}>
            App accompaniment is muted in mic mode so the microphone only hears you. Use headphones and enable “speaker playback” in Settings to hear it.
          </div>
        )}
        <PianoKeyboard
          low={low}
          high={high}
          height={110}
          labels={nameOpacity > 0.5 ? 'all' : 'c'}
          keyHintsBase={settings.inputSource === 'virtual' ? baseC : null}
          onPress={(m, v, t) => {
            void runtime.ensureAudio();
            runtime.virtual.press(m, t, v);
          }}
          onRelease={(m, t) => runtime.virtual.release(m, t)}
        />
      </div>
    </div>
  );
}
