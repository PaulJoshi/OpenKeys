const DS = window.OpenKeysDesignSystem_dedd02;
const { PrimaryNav, SearchPill, IconButton, PianoKeyboard, SongCard } = DS;

function KeysPreview({ notes }) {
  const ks = {}; (notes || []).slice(0, 4).forEach(n => { ks[n] = 'target'; });
  const start = (notes || []).some(n => /5$/.test(n)) ? 4 : 4;
  return <div style={{ width: '78%', pointerEvents: 'none' }}><PianoKeyboard startOctave={start} octaves={2} showLabels="none" height={84} keyStates={ks} /></div>;
}

function songCardProps(s, D) {
  return {
    title: s.title, subtitle: s.composer + ' · ' + s.level, badge: s.badge,
    meta: s.progress === 100 ? 'Completed' : s.progress > 0 ? s.progress + '% complete' : s.mins + ' min',
    metaVariant: s.progress === 100 ? 'success' : undefined,
    swatches: [{ color: D.genreColor[s.genre], label: s.genre }],
    media: <KeysPreview notes={s.notes} />, aspectRatio: '4 / 3',
  };
}

function AppNav({ route, go }) {
  return <PrimaryNav links={[{ id: 'home', label: 'Learn' }, { id: 'library', label: 'Songs' }, { id: 'practice', label: 'Practice' }]}
    active={route === 'song' || route === 'player' ? 'library' : route} onNavigate={id => go(id === 'practice' ? 'library' : id)}
    style={{ boxShadow: 'var(--elevation-inset)' }}
    right={<><SearchPill placeholder="Search songs" /><IconButton icon="user" label="Profile" variant="ghost" /></>} />;
}

function SectionHead({ title, action, onAction }) {
  return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
    <h2 className="ok-heading-xl" style={{ margin: 0 }}>{title}</h2>
    {action ? <a href="#" className="ok-link" onClick={e => { e.preventDefault(); onAction && onAction(); }}>{action}</a> : null}
  </div>;
}

Object.assign(window, { DS, KeysPreview, songCardProps, AppNav, SectionHead });
