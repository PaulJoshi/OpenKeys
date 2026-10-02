const DS = window.OpenKeysDesignSystem_dedd02;
function SiteHeader({ page, go }) {
  const { UtilityBar, PrimaryNav, SearchPill, IconButton, Button } = DS;
  return <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--ok-white)', boxShadow: 'var(--elevation-inset)' }}>
    <UtilityBar left="Free and open-source. Forever." links={[{ label: 'GitHub' }, { label: 'Docs' }, { label: 'Help' }, { label: 'Sign in' }]} />
    <PrimaryNav links={[{ id: 'home', label: 'Learn piano' }, { id: 'songs', label: 'Songs' }, { id: 'why', label: 'Why free' }, { id: 'contribute', label: 'Contribute' }]} active={page} onNavigate={id => go(id === 'songs' || id === 'contribute' ? page : id)}
      right={<><SearchPill placeholder="Search songs" /><IconButton icon="github" label="GitHub" variant="ghost" /></>} />
  </div>;
}
function SiteFooter() {
  const { Footer } = DS;
  return <Footer columns={[{ title: 'Learn', links: ['Lessons', 'Songs', 'Practice tools', 'MIDI keyboards'] }, { title: 'Project', links: ['GitHub', 'Roadmap', 'Contribute', 'Translations'] }, { title: 'Help', links: ['FAQ', 'Getting started', 'Report a bug'] }, { title: 'Community', links: ['Forum', 'Discord', 'Newsletter'] }]}
    legal={['© 2026 OpenKeys contributors', 'MIT License', 'Privacy', 'No tracking. No ads.']} />;
}
Object.assign(window, { DS, SiteHeader, SiteFooter });
