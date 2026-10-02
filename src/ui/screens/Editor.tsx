import { useEffect, useMemo, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { parseAbcDetailed } from '../../core/score/abc';
import { saveImportedScore } from '../../core/progress/library';
import { hashId } from '../../core/score/ids';
import { useApp } from '../store';
import { runtime } from '../runtime';
import { kvGet, kvSet } from '../../core/progress/db';
import { Icon } from '../components/Icon';

const TEMPLATES: Record<string, string> = {
  'C major scale (hands separately)': `X:1
T:C major scale
M:4/4
L:1/8
Q:1/4=80
K:C
V:1 clef=treble
!1!C D E !1!F G A B !5!c | c B A G !3!F E D !1!C |]
V:2 clef=bass
z8 | z8 |]
`,
  'Two-bar drill': `X:1
T:My tricky passage
M:3/4
L:1/8
Q:1/4=72
K:G
V:1 clef=treble
d2 GABc | d2 G2 G2 |]
V:2 clef=bass
[G,B,D]4 A,2 | B,6 |]
`,
  'Five-finger pattern': `X:1
T:Five-finger pattern
M:4/4
L:1/4
Q:1/4=90
K:C
!1!C !2!D !3!E !4!F | !5!G !4!F !3!E !2!D | !1!C4 |]
`,
};

const DEFAULT = TEMPLATES['Five-finger pattern'];

/** ABC script editor: text on the left, live notation and a play button on the right. */
export function Editor() {
  const [text, setText] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<ReturnType<typeof abcjs.renderAbc>[number] | null>(null);
  const toast = useApp((s) => s.toast);
  const setScore = useApp((s) => s.setScore);
  const go = useApp((s) => s.go);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    void kvGet<string>('editorText').then((t) => {
      if (t) setText(t);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => void kvSet('editorText', text), 400);
    return () => window.clearTimeout(id);
  }, [text, loaded]);

  const parsed = useMemo(() => parseAbcDetailed(text, { id: hashId(text, 'abc') }), [text]);

  useEffect(() => {
    if (!paperRef.current) return;
    try {
      const v = abcjs.renderAbc(paperRef.current, text, { responsive: 'resize', add_classes: true, staffwidth: 640 });
      visualRef.current = v[0] ?? null;
    } catch {
      visualRef.current = null;
    }
  }, [text]);

  // Highlight the note being played in the notation.
  useEffect(() => {
    if (!playing) return;
    const eng = runtime.engine;
    const score = parsed.score;
    if (!eng || !score) return;
    let raf = 0;
    let lastEls: Element[] = [];
    const notes = [...score.notes].sort((a, b) => a.startBeat - b.startBeat);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const beat = eng.player.beat;
      const cur = notes.filter((n) => n.startBeat <= beat && n.startBeat + n.durationBeats > beat);
      for (const el of lastEls) el.classList.remove('abc-playing');
      lastEls = [];
      for (const n of cur) {
        const ch = parsed.noteChars.get(n.id);
        if (ch === undefined) continue;
        const el = (visualRef.current as unknown as { getElementFromChar?: (c: number) => { abselem?: { elemset?: Element[] } } | null })?.getElementFromChar?.(ch);
        for (const e of el?.abselem?.elemset ?? []) {
          e.classList.add('abc-playing');
          lastEls.push(e);
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      for (const el of lastEls) el.classList.remove('abc-playing');
    };
  }, [playing, parsed]);

  const play = async () => {
    const score = parsed.score;
    if (!score) return;
    const eng = await runtime.ensureAudio();
    if (eng.player.playing) {
      eng.player.stop();
      setPlaying(false);
      return;
    }
    eng.player.setScore(score);
    eng.player.configure({ tempoFactor: 1, audibleHands: 'both', metronome: false, countInBars: 0, loop: null });
    eng.player.start(0);
    setPlaying(true);
    const off = eng.player.stateChange.on((s) => {
      if (s === 'stopped') {
        setPlaying(false);
        off();
      }
    });
  };

  const gotoIssue = (line?: number, column?: number) => {
    const ta = taRef.current;
    if (!ta || line === undefined) return;
    const lines = text.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(line, lines.length); i++) pos += lines[i].length + 1;
    pos += column ?? 0;
    ta.focus();
    ta.setSelectionRange(pos, pos + 1);
  };

  const practise = () => {
    if (!parsed.score) return;
    setScore(parsed.score);
    go('practice');
  };

  const save = async () => {
    if (!parsed.score) return;
    await saveImportedScore({ ...parsed.score, id: hashId(text, 'abc') });
    toast(`Saved “${parsed.score.title}” to your library.`, 'good');
  };

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Script editor</h1>
        <div className="row">
          <select
            aria-label="Start from a template"
            value=""
            onChange={(e) => {
              if (e.target.value) setText(TEMPLATES[e.target.value]);
            }}
          >
            <option value="">Start from a template…</option>
            {Object.keys(TEMPLATES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button className="btn" onClick={() => void play()} disabled={!parsed.score}>
            {playing ? <><Icon name="square" size={16} /> Stop</> : <><Icon name="play" size={16} /> Play it</>}
          </button>
          <button className="btn" onClick={() => void save()} disabled={!parsed.score}>
            Save to library
          </button>
          <button className="btn primary" onClick={practise} disabled={!parsed.score}>
            Practise it
          </button>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Write exercises in <a href="https://abcnotation.com/wiki/abc:standard:v2.1" target="_blank" rel="noreferrer">ABC notation</a>. Use <code>V:1</code> for the right hand and <code>V:2 clef=bass</code> for the left;{' '}
        <code>!1!</code>–<code>!5!</code> before a note adds fingering, <code>!p!</code>/<code>!f!</code> add dynamics.
      </p>
      <div className="editor">
        <div className="col">
          <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="ABC text" />
          {parsed.issues.length > 0 ? (
            <div className="notice bad small" role="alert">
              {parsed.issues.slice(0, 6).map((i, k) => (
                <div key={k}>
                  <button className="btn ghost small" onClick={() => gotoIssue(i.line, i.column)}>
                    {i.line !== undefined ? `Line ${i.line + 1}, col ${(i.column ?? 0) + 1}` : 'Error'}
                  </button>{' '}
                  {i.message}
                </div>
              ))}
            </div>
          ) : (
            <div className="notice good small">
              {parsed.score ? `${parsed.score.notes.length} notes · ${parsed.score.measures.length} bars · no errors` : 'No notes yet'}
            </div>
          )}
        </div>
        <div className="abc-paper" ref={paperRef} aria-label="Notation preview" />
      </div>
    </div>
  );
}
