function WhyPage({ go }) {
  const { CampaignTile, Button, DisclosureRow } = DS;
  return <main style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 48 }}>
    <CampaignTile headline={"Free.\nForever."} cta="Read the code" height={480} background="var(--ok-accent-pink-deep)" />
    <section style={{ padding: '0 var(--gutter-desktop)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 48 }}>
      <h2 className="ok-heading-xl" style={{ margin: 0 }}>Music education shouldn't come with a subscription.</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <p className="ok-body" style={{ margin: 0 }}>OpenKeys is built by volunteers and funded by donations. Every lesson, every song and every line of code is free to use, copy and improve.</p>
        <div style={{ display: 'flex', gap: 12 }}><Button onClick={() => { location.href = '../app/index.html'; }}>Start learning</Button><Button variant="secondary" icon="github">View on GitHub</Button></div>
      </div>
    </section>
    <section style={{ padding: '0 var(--gutter-desktop)', maxWidth: 960 }}>
      <h2 className="ok-heading-xl" style={{ margin: '0 0 18px' }}>Questions</h2>
      <div style={{ borderTop: '1px solid var(--ok-hairline)' }}>
        <DisclosureRow variant="faq" title="Is it really free?" defaultOpen>Yes. No trials, no premium tier, no ads. The project is MIT licensed.</DisclosureRow>
        <DisclosureRow variant="faq" title="Do I need a piano?">No. Start with your computer keyboard or the on-screen keys. Any MIDI keyboard works when you're ready.</DisclosureRow>
        <DisclosureRow variant="faq" title="Can I add my own songs?">Yes. Songs are plain files in the repository. Open a pull request.</DisclosureRow>
        <DisclosureRow variant="faq" title="Does it track me?">No accounts required, no analytics. Progress is stored on your device.</DisclosureRow>
      </div>
    </section>
  </main>;
}
window.WhyPage = WhyPage;
