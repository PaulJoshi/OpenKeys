function SongScreen({ songId, go }) {
  const { Button, IconButton, DisclosureRow, SwatchDot, Badge, PianoKeyboard } = DS; const D = window.OK_DATA;
  const s = D.songs.find(x => x.id === songId) || D.songs[0];
  const [arr, setArr] = React.useState(0);
  const arrangements = ['Melody only', 'Melody + bass', 'Full arrangement'];
  const ks = {}; s.notes.slice(0, 4).forEach(n => { ks[n] = 'target'; });
  return <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 48, padding: '24px var(--gutter-desktop) 48px', maxWidth: 1440, margin: '0 auto' }}>
    <div style={{ position: 'relative', background: 'var(--ok-soft-cloud)', aspectRatio: '1 / 1', maxHeight: 640, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 18, left: 18, display: 'flex', gap: 8 }}><IconButton icon="arrow-left" label="Back" variant="onImage" onClick={() => go('library')} /></div>
      <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', gap: 8 }}><IconButton icon="heart" label="Save" variant="onImage" /><IconButton icon="share-2" label="Share" variant="onImage" /></div>
      <div style={{ width: '82%', pointerEvents: 'none' }}><PianoKeyboard octaves={2} height={150} keyStates={ks} /></div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {s.badge ? <div style={{ marginBottom: 8 }}><Badge>{s.badge}</Badge></div> : null}
        <h1 className="ok-heading-xl" style={{ margin: 0 }}>{s.title}</h1>
        <div className="ok-body-strong">{s.composer}</div>
        <div className="ok-caption-md" style={{ color: 'var(--text-secondary)' }}>{s.level} · {s.hands} · {s.bpm} bpm · {s.mins} min</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ok-body-strong">Arrangement: {arrangements[arr]}</div>
        <div style={{ display: 'flex', gap: 14 }}>{[D.genreColor[s.genre], 'var(--ok-ink)', 'var(--ok-accent-pink-deep)'].map((c, i) => <SwatchDot key={i} color={c} size={16} active={arr === i} label={arrangements[i]} onClick={() => setArr(i)} />)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button fullWidth icon="play" onClick={() => go('player', s.id)}>{s.progress > 0 && s.progress < 100 ? 'Resume lesson' : 'Start lesson'}</Button>
        <Button fullWidth variant="secondary" icon="headphones">Listen first</Button>
      </div>
      <div style={{ borderTop: '1px solid var(--ok-hairline)' }}>
        <DisclosureRow title="What you'll learn" defaultOpen>The right-hand melody in {s.notes.length} notes, at your own pace. Keys light up blue when it's their turn.</DisclosureRow>
        <DisclosureRow title="Sheet music">Download the PDF or view it alongside the keyboard.</DisclosureRow>
        <DisclosureRow title="Practice tips">Play slowly first. Speed comes later.</DisclosureRow>
      </div>
    </div>
  </main>;
}
window.SongScreen = SongScreen;
