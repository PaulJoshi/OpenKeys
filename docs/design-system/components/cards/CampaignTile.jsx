import React from 'react';
import { Button } from '../buttons/Button.jsx';

export function CampaignTile({ headline, tone = 'light', image, background = 'var(--ok-ink)', cta, onCta, height = 520, displaySize = 96, children, style }) {
  const lines = String(headline || '').split('\n');
  return (
    <section style={{ position: 'relative', height, background, overflow: 'hidden', borderRadius: 0, ...style }}>
      {image ? <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      {children}
      <div style={{ position: 'absolute', left: 48, right: 48, bottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-medium)', fontSize: displaySize, lineHeight: 'var(--type-display-lh)',
          textTransform: 'uppercase', letterSpacing: 0, color: tone === 'light' ? 'var(--ok-white)' : 'var(--ok-ink)' }}>
          {lines.map((l, i) => <React.Fragment key={i}>{l}{i < lines.length - 1 ? <br /> : null}</React.Fragment>)}
        </h2>
        {cta ? <Button variant="onImage" onClick={onCta}>{cta}</Button> : null}
      </div>
    </section>
  );
}
