function LibraryScreen({ openSong }) {
  const { SubNav, FilterSidebar, FilterChip, SongCard } = DS; const D = window.OK_DATA;
  const [hidden, setHidden] = React.useState(false);
  const [level, setLevel] = React.useState(null);
  const [genre, setGenre] = React.useState(null);
  const list = D.songs.filter(s => (!level || s.level === level) && (!genre || s.genre === genre));
  const count = (k, v) => D.songs.filter(s => s[k] === v).length;
  const groups = [
    { title: 'Level', options: ['Beginner', 'Intermediate'].map(v => ({ label: v, count: count('level', v), active: level === v })) },
    { title: 'Style', options: ['Classical', 'Folk', 'Jazz'].map(v => ({ label: v, count: count('genre', v), active: genre === v })) },
    { title: 'Hands', options: ['Right hand', 'Both hands'].map(v => ({ label: v, count: count('hands', v) })) },
  ];
  const toggle = (g, o) => { if (g === 'Level') setLevel(level === o ? null : o); if (g === 'Style') setGenre(genre === o ? null : o); };
  return <div>
    <SubNav breadcrumb={['Songs', genre || 'All']} title={(genre || 'All songs') + ' (' + list.length + ')'} filtersHidden={hidden} onToggleFilters={() => setHidden(!hidden)} />
    <div style={{ display: 'flex', gap: 48, padding: '24px var(--gutter-desktop) 48px' }}>
      {hidden ? null : <FilterSidebar groups={groups} onToggle={toggle} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Beginner', 'Intermediate'].map(l => <FilterChip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>{l}</FilterChip>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '48px 8px' }}>
          {list.map(s => <SongCard key={s.id} {...songCardProps(s, D)} onClick={() => openSong(s.id)} />)}
        </div>
      </div>
    </div>
  </div>;
}
window.LibraryScreen = LibraryScreen;
