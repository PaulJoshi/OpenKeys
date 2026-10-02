function HomePage({ go }) {
  const { CampaignTile, SongCard, CategoryIconCard, BenefitCard, DisclosureRow, Button, PianoKeyboard } = DS;
  const songs = [['Ode to Joy','Beethoven · Beginner','3 min',['E4','F4','G4'],'var(--ok-accent-purple-soft)'],['Twinkle, Twinkle','Traditional · Beginner','2 min',['C4','G4','A4'],'var(--ok-accent-teal)'],['Für Elise','Beethoven · Intermediate','4 min',['E5','D#5','B4'],'var(--ok-accent-purple-soft)'],['When the Saints','Traditional · Beginner','3 min',['C4','E4','F4'],'var(--ok-accent-pink)']];
  return <main style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 48 }}>
    <CampaignTile headline={"Learn piano.\nFor free."} cta="Start learning" onCta={() => { location.href = '../app/index.html'; }} height={600}>
      <div className="ok-caption-sm" style={{ position: 'absolute', top: 18, right: 24, color: 'var(--ok-stone)' }}>Photography slot — hands on keys</div>
    </CampaignTile>
    <section style={{ padding: '0 var(--gutter-desktop)' }}>
      <h2 className="ok-heading-xl" style={{ margin: '0 0 18px' }}>Start with these</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
        {songs.map(([t, sub, m, n, c], i) => {
          const ks = {}; n.forEach(x => { ks[x] = 'target'; });
          return <SongCard key={t} title={t} subtitle={sub} meta={m} badge={i === 2 ? 'Popular' : undefined} swatches={[{ color: c }]} aspectRatio="1 / 1"
            media={<div style={{ width: '82%', pointerEvents: 'none' }}><PianoKeyboard octaves={2} showLabels="none" height={72} keyStates={ks} /></div>} />;
        })}
      </div>
    </section>
    <section style={{ padding: '0 var(--gutter-desktop)' }}>
      <h2 className="ok-heading-xl" style={{ margin: '0 0 18px' }}>Learn the basics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', borderTop: '1px solid var(--ok-hairline)' }}>
        {[['book-open','Reading notes'],['hand','Hand position'],['timer','Rhythm'],['keyboard','Scales'],['list-music','Chords'],['headphones','Ear training']].map(([i, l]) => <CategoryIconCard key={l} icon={i} label={l} />)}
      </div>
    </section>
    <section style={{ padding: '0 var(--gutter-desktop)' }}>
      <h2 className="ok-heading-xl" style={{ margin: '0 0 18px' }}>Why OpenKeys</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        <BenefitCard title="Free. No ads, no trials, no paywall." cta="Our pledge" onCta={() => go('why')} />
        <BenefitCard title="Plug in any MIDI keyboard. Or use your laptop keys." background="var(--ok-charcoal)" />
        <BenefitCard title="Open-source. Read the code, fix a bug, add a song." background="var(--ok-accent-pink-deep)" cta="Contribute" />
      </div>
    </section>
  </main>;
}
window.HomePage = HomePage;
