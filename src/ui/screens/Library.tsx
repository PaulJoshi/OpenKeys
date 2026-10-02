import { useEffect, useMemo, useState } from 'react';
import { builtInEntries, importedEntries, loadScore, deleteImportedScore, VARIANT_LABEL, type LibraryEntry } from '../../core/progress/library';
import { measureMastery } from '../../core/progress/progress';
import { serializeScore } from '../../core/score/json';
import { useApp } from '../store';
import { pickFiles, downloadText } from '../importer';
import { heatColor } from '../practice/ResultsPanel';

type Filter = 'all' | 'built-in' | 'imported';
type Sort = 'difficulty' | 'title' | 'recent';

export function Library() {
  const setScore = useApp((s) => s.setScore);
  const go = useApp((s) => s.go);
  const toast = useApp((s) => s.toast);
  const set = useApp((s) => s.set);
  const pendingImport = useApp((s) => s.pendingImport);
  const [imported, setImported] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('difficulty');
  const [maxDiff, setMaxDiff] = useState(10);
  const [mastery, setMastery] = useState<Map<string, Map<number, number>>>(new Map());
  const builtIns = useMemo(() => builtInEntries(), []);

  const refresh = () => void importedEntries().then(setImported).catch(() => setImported([]));
  useEffect(refresh, [pendingImport]);

  const all = useMemo(() => [...imported, ...builtIns], [imported, builtIns]);
  useEffect(() => {
    void (async () => {
      const m = new Map<string, Map<number, number>>();
      for (const e of all) {
        const ids = e.variants ? e.variants.map((v) => v.id) : [e.id];
        const merged = new Map<number, number>();
        for (const id of ids) for (const [k, v] of await measureMastery(id)) merged.set(k, Math.max(merged.get(k) ?? 0, v));
        if (merged.size) m.set(e.id, merged);
      }
      setMastery(m);
    })();
  }, [all]);

  const list = all
    .filter((e) => filter === 'all' || (filter === 'built-in') === e.builtIn)
    .filter((e) => e.difficulty <= maxDiff)
    .filter((e) => !query || `${e.title} ${e.composer ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === 'difficulty' ? a.difficulty - b.difficulty : sort === 'title' ? a.title.localeCompare(b.title) : (b.lastPlayedAt ?? b.addedAt ?? 0) - (a.lastPlayedAt ?? a.addedAt ?? 0)));

  const open = async (id: string) => {
    const s = await loadScore(id);
    if (!s) return toast('Could not open that piece.', 'bad');
    setScore(s);
    go('practice');
  };

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Library</h1>
        <div className="row">
          <button className="btn primary" onClick={pickFiles}>
            Import a file…
          </button>
          <button className="btn" onClick={() => go('editor')}>
            Paste or write ABC
          </button>
        </div>
      </div>
      <div className="dropzone" style={{ marginBottom: 16 }}>
        Drop MusicXML (.musicxml, .xml, .mxl), MIDI (.mid), ABC (.abc) or .openkeys.json files anywhere on this page. Export from MuseScore with <i>File → Export → MusicXML</i>.
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <input type="search" placeholder="Search title or composer" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" style={{ minWidth: 240 }} />
        <div className="seg" aria-label="Filter">
          {(['all', 'built-in', 'imported'] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'built-in' ? 'Built-in' : 'My imports'}
            </button>
          ))}
        </div>
        <label className="row small">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="difficulty">Easiest first</option>
            <option value="title">Title</option>
            <option value="recent">Recently played</option>
          </select>
        </label>
        <label className="row small">
          Max difficulty {maxDiff}
          <input type="range" min={1} max={10} value={maxDiff} onChange={(e) => setMaxDiff(Number(e.target.value))} />
        </label>
      </div>
      <div className="grid">
        {list.map((e) => (
          <div className="card" key={e.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{e.title}</h3>
                <div className="muted small">{e.composer}</div>
              </div>
              <span className={`pill ${e.difficulty <= 3 ? 'good' : e.difficulty <= 6 ? 'warn' : 'bad'}`} title="Difficulty (1–10)">
                {e.difficulty}/10
              </span>
            </div>
            {e.blurb && <p className="small muted" style={{ margin: '8px 0' }}>{e.blurb}</p>}
            <MasteryStrip measures={e.measures} mastery={mastery.get(e.id)} />
            <div className="row" style={{ marginTop: 10 }}>
              {e.variants ? (
                e.variants.map((v) => (
                  <button key={v.id} className="btn small" onClick={() => void open(v.id)} title={`Difficulty ${v.difficulty}/10`}>
                    {VARIANT_LABEL[v.variant]}
                  </button>
                ))
              ) : (
                <>
                  <button className="btn small primary" onClick={() => void open(e.id)}>
                    Practise
                  </button>
                  <button
                    className="btn small"
                    onClick={async () => {
                      const s = await loadScore(e.id);
                      if (s) set({ pendingImport: s });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn small"
                    onClick={async () => {
                      const s = await loadScore(e.id);
                      if (s) downloadText(`${s.title.replace(/[^\w\- ]+/g, '')}.openkeys.json`, serializeScore(s));
                    }}
                  >
                    Export
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={async () => {
                      if (!confirm(`Remove “${e.title}” and its progress from your library?`)) return;
                      await deleteImportedScore(e.id);
                      refresh();
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="muted">Nothing matches. Try clearing the search.</p>}
    </div>
  );
}

export function MasteryStrip({ measures, mastery }: { measures: number; mastery?: Map<number, number> }) {
  if (!mastery || mastery.size === 0) return <div className="small muted">Not practised yet</div>;
  const n = Math.min(measures, 64);
  return (
    <div style={{ display: 'flex', gap: 1, height: 10 }} aria-label="Mastery by bar" title="Mastery by bar">
      {Array.from({ length: n }, (_, i) => {
        const v = mastery.get(i);
        return <div key={i} style={{ flex: 1, background: v === undefined ? 'var(--bg-3)' : heatColor(v).background }} />;
      })}
    </div>
  );
}
