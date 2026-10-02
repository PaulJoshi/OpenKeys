import { useEffect, useState } from 'react';
import { KEY_NAMES_MAJOR, arpeggioDrill, progressionDrill, rhythmDrill, scaleDrill, sightReadingDrill, type Progression } from '../../core/learn/drills';
import { kvGet } from '../../core/progress/db';
import { openPractice } from '../learn/open';
import { NoteReadingGame } from '../learn/NoteReadingGame';
import { EarTraining } from '../learn/EarTraining';

type Tab = 'scales' | 'chords' | 'sight' | 'reading' | 'ear' | 'rhythm';

export function Drills() {
  const [tab, setTab] = useState<Tab>('scales');
  return (
    <div className="page">
      <h1>Drills</h1>
      <p className="muted">Unlimited practice material, judged by the same engine as your pieces.</p>
      <div className="seg" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {(
          [
            ['scales', 'Scales & arpeggios'],
            ['chords', 'Chord progressions'],
            ['sight', 'Sight-reading'],
            ['reading', 'Note reading'],
            ['ear', 'Ear training'],
            ['rhythm', 'Rhythm'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>
      <div className="card">
        {tab === 'scales' && <ScalesForm />}
        {tab === 'chords' && <ChordsForm />}
        {tab === 'sight' && <SightForm />}
        {tab === 'reading' && <NoteReadingGame />}
        {tab === 'ear' && <EarTraining />}
        {tab === 'rhythm' && <RhythmForm />}
      </div>
    </div>
  );
}

const KEYS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

function KeySelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      Key
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {KEYS.map((k) => (
          <option key={k} value={k}>
            {KEY_NAMES_MAJOR[k]} major
          </option>
        ))}
      </select>
    </label>
  );
}

function ScalesForm() {
  const [fifths, setFifths] = useState(0);
  const [mode, setMode] = useState<'major' | 'minor'>('major');
  const [hands, setHands] = useState<'R' | 'L' | 'both'>('R');
  const [octaves, setOctaves] = useState(1);
  const [bpm, setBpm] = useState(72);
  const go = (kind: 'scale' | 'arpeggio', practiceMode: 'wait' | 'playalong') => {
    const o = { fifths, mode, hands, octaves, bpm };
    openPractice(kind === 'scale' ? scaleDrill(o) : arpeggioDrill(o), { mode: practiceMode, hands });
  };
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KeySelect value={fifths} onChange={setFifths} />
        <label className="field">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as 'major' | 'minor')}>
            <option value="major">Major</option>
            <option value="minor">Minor (relative, harmonic)</option>
          </select>
        </label>
        <label className="field">
          Hands
          <select value={hands} onChange={(e) => setHands(e.target.value as 'R' | 'L' | 'both')}>
            <option value="R">Right</option>
            <option value="L">Left</option>
            <option value="both">Together</option>
          </select>
        </label>
        <label className="field">
          Octaves: {octaves}
          <input type="range" min={1} max={4} value={octaves} onChange={(e) => setOctaves(Number(e.target.value))} />
        </label>
        <label className="field">
          Tempo: {bpm} bpm (eighths)
          <input type="range" min={40} max={160} step={4} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </label>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Standard fingering is shown on the music. Minor uses the relative minor of the selected key signature.
      </p>
      <div className="row">
        <button className="btn primary" onClick={() => go('scale', 'wait')}>
          Scale · Wait mode
        </button>
        <button className="btn" onClick={() => go('scale', 'playalong')}>
          Scale · Play along
        </button>
        <button className="btn" onClick={() => go('arpeggio', 'wait')}>
          Arpeggio · Wait mode
        </button>
        <button className="btn" onClick={() => go('arpeggio', 'playalong')}>
          Arpeggio · Play along
        </button>
      </div>
    </div>
  );
}

function ChordsForm() {
  const [fifths, setFifths] = useState(0);
  const [progression, setProgression] = useState<Progression>('I-IV-V-I');
  const [inversion, setInversion] = useState<'root' | 'smooth'>('smooth');
  const [pattern, setPattern] = useState<'block' | 'broken'>('block');
  const [hands, setHands] = useState<'R' | 'L' | 'both'>('both');
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KeySelect value={fifths} onChange={setFifths} />
        <label className="field">
          Progression
          <select value={progression} onChange={(e) => setProgression(e.target.value as Progression)}>
            {(['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'ii-V-I'] as Progression[]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Voicing
          <select value={inversion} onChange={(e) => setInversion(e.target.value as 'root' | 'smooth')}>
            <option value="smooth">Smooth (nearest inversions)</option>
            <option value="root">Root position</option>
          </select>
        </label>
        <label className="field">
          Pattern
          <select value={pattern} onChange={(e) => setPattern(e.target.value as 'block' | 'broken')}>
            <option value="block">Block chords</option>
            <option value="broken">Broken chords</option>
          </select>
        </label>
        <label className="field">
          Hands
          <select value={hands} onChange={(e) => setHands(e.target.value as 'R' | 'L' | 'both')}>
            <option value="both">Chords + bass</option>
            <option value="R">Right hand chords</option>
            <option value="L">Left hand bass</option>
          </select>
        </label>
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => openPractice(progressionDrill({ fifths, progression, inversion, hands, bpm: 70, pattern }), { mode: 'wait', hands })}>
          Wait mode
        </button>
        <button className="btn" onClick={() => openPractice(progressionDrill({ fifths, progression, inversion, hands, bpm: 70, pattern }), { mode: 'playalong', hands })}>
          Play along
        </button>
      </div>
    </div>
  );
}

function SightForm() {
  const [level, setLevel] = useState(1);
  useEffect(() => void kvGet<number>('sightLevel').then((l) => l && setLevel(l)), []);
  return (
    <div className="col">
      <p style={{ margin: 0 }}>
        A fresh melody every time, matched to your level. Play it once at sight in <b>play-along</b>: your level goes up after a clean read (90%+) and down if it was too hard.
      </p>
      <div className="row">
        <span className="big-number">Level {level}</span>
        <input type="range" min={1} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Sight-reading level" />
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => openPractice(sightReadingDrill(level, Date.now() & 0xffffff), { mode: 'playalong', hands: level >= 5 ? 'both' : 'R', tempo: 1 })}>
          New melody
        </button>
      </div>
    </div>
  );
}

function RhythmForm() {
  const [level, setLevel] = useState(1);
  return (
    <div className="col">
      <p style={{ margin: 0 }}>Tap any key along with the written rhythm. Only timing is judged.</p>
      <label className="field">
        Level {level}
        <input type="range" min={1} max={5} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
      </label>
      <div className="row">
        <button className="btn primary" onClick={() => openPractice(rhythmDrill(level, Date.now() & 0xffffff), { mode: 'playalong', hands: 'R', anyPitch: true })}>
          Start a rhythm
        </button>
      </div>
    </div>
  );
}
