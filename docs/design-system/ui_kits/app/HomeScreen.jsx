function HomeScreen({ go, openSong }) {
  const { SongCard, CategoryIconCard, Button } = DS; const D = window.OK_DATA;
  const current = D.songs[1];
  return <main style={{ padding: '48px var(--gutter-desktop)', display: 'flex', flexDirection: 'column', gap: 48, maxWidth: 1440, margin: '0 auto' }}>
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 8 }}>
      <div style={{ background: 'var(--ok-soft-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}><KeysPreview notes={current.notes} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 18, padding: '0 0 0 40px' }}>
        <div className="ok-caption-md" style={{ color: 'var(--text-secondary)' }}>Continue where you left off</div>
        <h1 className="ok-heading-xl" style={{ margin: 0 }}>{current.title}</h1>
        <div className="ok-body" style={{ color: 'var(--text-soft)' }}>{current.composer} · {current.level} · {current.hands}</div>
        <div style={{ height: 2, background: 'var(--ok-hairline-soft)' }}><div style={{ width: current.progress + '%', height: 2, background: 'var(--ok-ink)' }} /></div>
        <div className="ok-caption-md">{current.progress}% complete</div>
        <div style={{ display: 'flex', gap: 12 }}><Button icon="play" onClick={() => go('player', current.id)}>Resume</Button><Button variant="secondary" onClick={() => openSong(current.id)}>Details</Button></div>
      </div>
    </section>
    <section>
      <SectionHead title="Start with these" action="All songs" onAction={() => go('library')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {D.songs.filter(s => s.progress < 100).slice(1, 4).map(s => <SongCard key={s.id} {...songCardProps(s, D)} onClick={() => openSong(s.id)} />)}
      </div>
    </section>
    <section>
      <SectionHead title="Browse by skill" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', borderTop: '1px solid var(--ok-hairline)' }}>
        {[['book-open','Reading notes'],['hand','Hand position'],['timer','Rhythm'],['keyboard','Scales'],['list-music','Chords'],['music','Songs']].map(([i,l]) => <CategoryIconCard key={l} icon={i} label={l} onClick={() => go('library')} />)}
      </div>
    </section>
  </main>;
}
window.HomeScreen = HomeScreen;
