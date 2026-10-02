function PlayerScreen({ songId, go }) {
  const { IconButton, Button, Badge, PianoKeyboard } = DS; const D = window.OK_DATA;
  const s = D.songs.find(x => x.id === songId) || D.songs[0];
  const [i, setI] = React.useState(0);
  const [wrong, setWrong] = React.useState(null);
  const [misses, setMisses] = React.useState(0);
  const [tempo, setTempo] = React.useState(100);
  const done = i >= s.notes.length;
  const target = s.notes[i];
  const press = n => {
    if (done) return;
    if (n === target) { setWrong(null); setI(i + 1); }
    else { setWrong(n); setMisses(m => m + 1); setTimeout(() => setWrong(w => (w === n ? null : w)), 400); }
  };
  const restart = () => { setI(0); setMisses(0); setWrong(null); };
  const ks = {};
  if (i > 0) ks[s.notes[i - 1]] = 'correct';
  if (target) ks[target] = 'target';
  if (wrong) ks[wrong] = 'wrong';
  return <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ok-white)' }}>
    <header style={{ height: 56, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 var(--gutter-desktop)', boxShadow: 'var(--elevation-inset)' }}>
      <div><IconButton icon="x" label="Exit lesson" variant="ghost" onClick={() => go('song', s.id)} /></div>
      <div className="ok-body-strong">{s.title} <span style={{ color: 'var(--text-secondary)' }}>· {s.composer}</span></div>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton icon="minus" label="Slower" onClick={() => setTempo(t => Math.max(50, t - 10))} />
        <span className="ok-caption-md" style={{ width: 56, textAlign: 'center' }}>{tempo}%</span>
        <IconButton icon="plus" label="Faster" onClick={() => setTempo(t => Math.min(150, t + 10))} />
      </div>
    </header>
    <div style={{ height: 2, background: 'var(--ok-hairline-soft)' }}><div style={{ height: 2, width: (i / s.notes.length * 100) + '%', background: 'var(--ok-ink)', transition: 'width var(--duration-base) var(--ease-standard)' }} /></div>
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: '48px var(--gutter-desktop)' }}>
      {done ? <>
        <Badge variant="success">Completed</Badge>
        <h1 className="ok-heading-xl" style={{ margin: 0 }}>You played {s.title}.</h1>
        <div className="ok-body" style={{ color: 'var(--text-soft)' }}>{s.notes.length} notes · {misses === 0 ? 'no mistakes' : misses + (misses === 1 ? ' missed note' : ' missed notes')}</div>
        <div style={{ display: 'flex', gap: 12 }}><Button onClick={() => go('library')}>Next song</Button><Button variant="secondary" icon="rotate-ccw" onClick={restart}>Play again</Button></div>
      </> : <>
        <div className="ok-caption-md" style={{ color: 'var(--text-secondary)' }}>Note {i + 1} of {s.notes.length}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900 }}>
          {s.notes.map((n, k) => <span key={k} style={{ minWidth: 48, height: 40, padding: '8px 12px', borderRadius: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: '500 16px/1.5 var(--font-sans)', background: k === i ? 'var(--ok-ink)' : 'var(--ok-white)', color: k === i ? 'var(--ok-white)' : k < i ? 'var(--ok-green)' : 'var(--ok-ink)',
            border: '1px solid ' + (k === i ? 'var(--ok-ink)' : 'var(--ok-hairline)') }}>{n.replace(/\d/, '')}</span>)}
        </div>
        <div className="ok-heading-lg">Play <span style={{ textDecoration: 'underline', textUnderlineOffset: 6 }}>{target}</span></div>
        {misses ? <Badge variant="error">{misses} missed {misses === 1 ? 'note' : 'notes'}</Badge> : <Badge variant="muted">Tap the blue key</Badge>}
      </>}
    </main>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 0 18px' }}>
      <IconButton icon="skip-back" label="Restart" onClick={restart} />
      <IconButton icon="play" label="Play demo" variant="inverse" size={56} />
      <IconButton icon="repeat" label="Loop" />
    </div>
    <PianoKeyboard startOctave={4} octaves={2} height={220} keyStates={ks} onKeyPress={press} />
  </div>;
}
window.PlayerScreen = PlayerScreen;
