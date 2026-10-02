import { useMemo, useState } from 'react';
import type { Score, Section } from '../../core/types';
import { summarize, formatDuration } from '../../core/score/summary';
import { checkRange, octaveFold, transposeScore } from '../../core/score/validate';
import { assignHandsBySplit } from '../../core/score/hands';
import { midiToName } from '../../core/music';
import { saveImportedScore } from '../../core/progress/library';
import { useApp } from '../store';

/**
 * Shown after import (and from "Edit" in the library): title, length, tempo, key, hands, range
 * and difficulty; lets the learner fix range problems, edit metadata, hand split, tempo and
 * section labels before saving.
 */
export function ImportSummary({ initial, existing = false }: { initial: Score; existing?: boolean }) {
  const settings = useApp((s) => s.settings);
  const set = useApp((s) => s.set);
  const toast = useApp((s) => s.toast);
  const [score, setScore] = useState<Score>(initial);
  const [title, setTitle] = useState(initial.title);
  const [composer, setComposer] = useState(initial.composer ?? '');
  const [bpm, setBpm] = useState(Math.round(initial.tempoMap[0]?.bpm ?? 100));
  const [split, setSplit] = useState(settings.splitPoint);
  const [sections, setSections] = useState<Section[]>(initial.sections ?? []);
  const sum = useMemo(() => summarize(score), [score]);
  const range = useMemo(() => checkRange(score, settings.range), [score, settings.range]);
  const singleStaff = initial.source === 'midi' || initial.source === 'abc' || score.notes.every((n) => n.hand !== 'L');

  const close = () => set({ pendingImport: null });

  const final = (): Score => {
    const ratio = bpm / (score.tempoMap[0]?.bpm || bpm);
    return {
      ...score,
      title: title.trim() || 'Untitled',
      composer: composer.trim() || undefined,
      tempoMap: score.tempoMap.map((t) => ({ ...t, bpm: Math.round(t.bpm * ratio * 100) / 100 })),
      sections: sections.length ? sections : undefined,
    };
  };

  const save = async (open: boolean) => {
    const s = final();
    try {
      await saveImportedScore(s);
      toast(`Saved “${s.title}” to your library.`, 'good');
      close();
      if (open) {
        useApp.getState().setScore(s);
        useApp.getState().go('practice');
      }
    } catch (e) {
      toast(`Could not save: ${(e as Error).message}`, 'bad');
    }
  };

  const resplit = (value: number) => {
    setSplit(value);
    const notes = score.notes.map((n) => ({ ...n }));
    assignHandsBySplit(notes, value);
    setScore({ ...score, notes, musicxml: undefined });
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Import summary">
      <div className="modal">
        <h2>{existing ? 'Edit piece' : 'Imported'}: {sum.title}</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 14 }}>
          <Info k="Length" v={`${formatDuration(sum.durationSec)} · ${sum.measures} bars`} />
          <Info k="Tempo" v={`${sum.bpm} bpm · ${sum.timeSignature}`} />
          <Info k="Key" v={sum.key} />
          <Info k="Hands" v={sum.hands} />
          <Info k="Range" v={sum.range} />
          <Info k="Difficulty" v={`${sum.difficulty} / 10`} />
        </div>
        {range.outOfRange.length > 0 && (
          <div className="notice warn" style={{ marginBottom: 14 }}>
            <p style={{ marginTop: 0 }}>
              {range.outOfRange.length} note{range.outOfRange.length === 1 ? '' : 's'} fall outside your keyboard ({midiToName(settings.range.low)}–{midiToName(settings.range.high)}). You can still
              practise, but those notes can’t be played.
            </p>
            <div className="row">
              {range.suggestedTranspose !== null && (
                <button className="btn small" onClick={() => setScore(transposeScore(score, range.suggestedTranspose!))}>
                  Move the piece {range.suggestedTranspose > 0 ? 'up' : 'down'} {Math.abs(range.suggestedTranspose / 12)} octave{Math.abs(range.suggestedTranspose) > 12 ? 's' : ''}
                </button>
              )}
              <button className="btn small" onClick={() => setScore(octaveFold(score, settings.range))}>
                Fold the out-of-range notes by octaves
              </button>
            </div>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <label className="field">
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            Composer
            <input type="text" value={composer} onChange={(e) => setComposer(e.target.value)} />
          </label>
          <label className="field">
            Written tempo (bpm)
            <input type="number" min={20} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value) || 100)} />
          </label>
          {singleStaff && (
            <label className="field">
              Hand split point: {midiToName(split)}
              <input type="range" min={48} max={72} value={split} onChange={(e) => resplit(Number(e.target.value))} />
              <span className="hint">Notes at or above go to the right hand.</span>
            </label>
          )}
        </div>
        <h3 style={{ marginTop: 16 }}>Sections</h3>
        <div className="col">
          {sections.map((s, i) => (
            <div className="row" key={i}>
              <input type="text" value={s.name} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Section name" />
              <span className="small muted">bars</span>
              <input type="number" style={{ width: 70 }} min={1} max={sum.measures} value={s.startMeasure + 1} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, startMeasure: Number(e.target.value) - 1 } : x)))} aria-label="From bar" />
              <span>–</span>
              <input type="number" style={{ width: 70 }} min={1} max={sum.measures} value={s.endMeasure + 1} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, endMeasure: Number(e.target.value) - 1 } : x)))} aria-label="To bar" />
              <button className="btn ghost small" onClick={() => setSections(sections.filter((_, j) => j !== i))} aria-label="Remove section">
                ✕
              </button>
            </div>
          ))}
          <div>
            <button className="btn small" onClick={() => setSections([...sections, { name: `Section ${String.fromCharCode(65 + sections.length)}`, startMeasure: 0, endMeasure: sum.measures - 1 }])}>
              + Add section
            </button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn primary big" onClick={() => void save(true)}>
            Save and practise
          </button>
          <button className="btn" onClick={() => void save(false)}>
            Save
          </button>
          <button className="btn ghost" onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="muted small">{k}</div>
      <div style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
